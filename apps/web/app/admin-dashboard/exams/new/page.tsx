"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ChevronRight, FileText, Target, LayoutList, Settings,
  Check, Loader2, AlertCircle, Save, Rocket, UploadCloud, FileCheck,
  Trash2, Eye, Download, FileUp, Sparkles, HelpCircle,
} from "lucide-react";
import { QuestionSelectionWorkspace } from "@/components/admin/exams/QuestionSelectionWorkspace";
import { adminExamApi, Examination, ExaminationType, ObjectiveCategory } from "@/lib/api/admin-exams";
import { adminSyllabusApi } from "@/lib/api/admin-syllabus";
import toast from "react-hot-toast";

const STEPS = [
  { id: 1, title: "Basic Information", icon: FileText },
  { id: 2, title: "Academic Targeting", icon: Target },
  { id: 3, title: "Question Selection", icon: LayoutList },
  { id: 4, title: "Configuration", icon: Settings },
];

const EXAM_TYPES: { value: ExaminationType; label: string }[] = [
  { value: "mock", label: "Mock Test" },
  { value: "practice", label: "Practice Test" },
  { value: "full", label: "Full-Length Exam" },
  { value: "position", label: "Position-Based Exam" },
  { value: "subject", label: "Subject Test" },
  { value: "custom", label: "Custom Exam" },
  { value: "subjective", label: "Subjective Exam" },
];

/** The four finalized Objective Exam categories — "Create Your Own Exam" is
 * always system-generated from the student custom-builder, never authored
 * here, so it's intentionally left out of this admin-facing list. */
const OBJECTIVE_CATEGORIES: { value: Exclude<ObjectiveCategory, null | "custom">; label: string; hint: string }[] = [
  { value: "old_past", label: "Old Past Exam", hint: "An original historical paper — questions stay fixed, never shuffled or replaced." },
  { value: "model", label: "Model Exam", hint: "Student starts whenever they like; fixed duration and paper once started." },
  { value: "live", label: "Live Exam", hint: "Fixed start/end window shared by every student; no pause or restart once begun." },
];

/** Django accepts ISO-8601; <input type="datetime-local"> gives "YYYY-MM-DDTHH:mm". */
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);
const toLocal = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function CreateExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftParam = searchParams?.get("draft");
  // "Use in Mock Exam" from the admin Collections page arrives here.
  const collectionParam = searchParams?.get("collection");
  const defaultCollectionId = collectionParam ? Number(collectionParam) : null;

  const [step, setStep] = useState(1);
  const [examId, setExamId] = useState<number | null>(draftParam ? Number(draftParam) : null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(draftParam));
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [selection, setSelection] = useState({ count: 0, marks: 0 });

  // ── Step 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [examType, setExamType] = useState<ExaminationType>("mock");
  const [objectiveCategory, setObjectiveCategory] = useState<Exclude<ObjectiveCategory, null | "custom"> | "">("");
  const [instructions, setInstructions] = useState("");

  // ── Step 2 (canonical hierarchy: ExamCategory → Exam → Subject)
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [positionId, setPositionId] = useState<number | undefined>();
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [categories, setCategories] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // ── Step 4
  const [timeLimit, setTimeLimit] = useState(60);
  const [passingMarks, setPassingMarks] = useState(0);
  const [marksPerQuestion, setMarksPerQuestion] = useState(1);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeValue, setNegativeValue] = useState(0.25);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [allowResume, setAllowResume] = useState(true);
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [resultVisibility, setResultVisibility] = useState<Examination["result_visibility"]>("immediate");
  const [showAnswers, setShowAnswers] = useState(false);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // ── Subjective Examination Specifics
  const [hasQuestionPaper, setHasQuestionPaper] = useState(false);
  const [questionPaperPageCount, setQuestionPaperPageCount] = useState(0);
  const [questionPaperFileSize, setQuestionPaperFileSize] = useState(0);
  const [uploadDeadlineMinutes, setUploadDeadlineMinutes] = useState(15);
  const [allowedFileTypes, setAllowedFileTypes] = useState("pdf,image");
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(25);
  const [evaluationType, setEvaluationType] = useState<"manual" | "ai_assisted" | "hybrid">("manual");
  const [subjectiveTotalMarks, setSubjectiveTotalMarks] = useState(100);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyExam = useCallback((e: Examination) => {
    setTitle(e.title || "");
    setDescription(e.description || "");
    setExamType(e.exam_type);
    setObjectiveCategory((e.objective_category as Exclude<ObjectiveCategory, null | "custom">) || "");
    setInstructions(e.instructions || "");
    setCategoryId(e.category || undefined);
    setPositionId(e.exam || undefined);
    setSubjectId(e.subject || undefined);
    setTimeLimit(e.time_limit ?? 60);
    setPassingMarks(e.passing_marks ?? 0);
    setMarksPerQuestion(e.marks_per_question ?? 1);
    setNegativeMarking(Boolean(e.negative_marking));
    setNegativeValue(e.negative_marking_value ?? 0.25);
    setMaxAttempts(e.max_attempts ?? 1);
    setAllowResume(Boolean(e.allow_resume));
    setAutoSubmit(Boolean(e.auto_submit));
    setResultVisibility(e.result_visibility || "immediate");
    setShowAnswers(Boolean(e.show_correct_answers));
    setRandomizeQuestions(Boolean(e.randomize_questions));
    setRandomizeOptions(Boolean(e.randomize_options));
    setStartTime(toLocal(e.start_time));
    setEndTime(toLocal(e.end_time));
    setSelection({ count: e.total_questions ?? 0, marks: e.total_marks ?? 0 });

    if (e.upload_deadline_minutes !== undefined && e.upload_deadline_minutes !== null) {
      setUploadDeadlineMinutes(e.upload_deadline_minutes);
    }
    if (e.allowed_file_types) setAllowedFileTypes(e.allowed_file_types);
    if (e.max_upload_size_mb) setMaxUploadSizeMb(e.max_upload_size_mb);
    if (e.evaluation_type) setEvaluationType(e.evaluation_type);
    if (e.total_marks) setSubjectiveTotalMarks(e.total_marks);
    setHasQuestionPaper(Boolean(e.question_paper_pdf));
    setQuestionPaperPageCount(e.question_paper_page_count || 0);
    setQuestionPaperFileSize(e.question_paper_file_size || 0);
  }, []);

  // Recover an existing draft after a refresh.
  useEffect(() => {
    if (!draftParam) return;
    let cancelled = false;
    (async () => {
      try {
        const e = await adminExamApi.getExam(Number(draftParam));
        if (!cancelled) applyExam(e);
      } catch {
        if (!cancelled) toast.error("Could not recover that draft.");
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();
    return () => { cancelled = true; };
  }, [draftParam, applyExam]);

  // ── Dependent academic dropdowns, straight from the admin academic APIs ───
  useEffect(() => {
    adminSyllabusApi.getCategories()
      .then(r => setCategories(Array.isArray(r) ? r : []))
      .catch(() => toast.error("Could not load exam categories."));
  }, []);

  useEffect(() => {
    setPositions([]);
    if (!categoryId) return;
    adminSyllabusApi.getPositions(categoryId)
      .then(r => setPositions(Array.isArray(r) ? r : []))
      .catch(() => { });
  }, [categoryId]);

  useEffect(() => {
    setSubjects([]);
    if (!positionId) return;
    adminSyllabusApi.getSubjects(positionId)
      .then(r => setSubjects(Array.isArray(r) ? r : []))
      .catch(() => { });
  }, [positionId]);

  const buildPayload = () => ({
    title: title.trim(),
    description,
    exam_type: examType,
    objective_category: objectiveCategory || null,
    instructions,
    category: categoryId,
    exam: positionId,
    subject: subjectId ?? null,
    time_limit: timeLimit,
    passing_marks: passingMarks,
    marks_per_question: marksPerQuestion,
    negative_marking: negativeMarking,
    negative_marking_value: negativeValue,
    max_attempts: maxAttempts,
    allow_resume: allowResume,
    auto_submit: autoSubmit,
    result_visibility: resultVisibility,
    show_correct_answers: showAnswers,
    // Hard-blocked for Old Past Exams — the backend enforces this too, but
    // the saved value should reflect reality rather than a checkbox the UI
    // has since disabled.
    randomize_questions: objectiveCategory === "old_past" ? false : randomizeQuestions,
    randomize_options: randomizeOptions,
    start_time: toIso(startTime),
    end_time: toIso(endTime),
    ...(examType === "subjective"
      ? {
        total_marks: subjectiveTotalMarks,
        upload_deadline_minutes: uploadDeadlineMinutes,
        allowed_file_types: allowedFileTypes,
        max_upload_size_mb: maxUploadSizeMb,
        evaluation_type: evaluationType,
      }
      : {}),
  });

  const handleQuestionPaperFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a valid PDF file.");
      return;
    }
    let targetExamId = examId;
    if (!targetExamId) {
      targetExamId = await persist({ silent: true });
      if (!targetExamId) return;
    }

    setUploadingPdf(true);
    try {
      const res = await adminExamApi.uploadQuestionPaper(targetExamId, file);
      setHasQuestionPaper(true);
      setQuestionPaperPageCount(res.page_count);
      setQuestionPaperFileSize(res.file_size);
      toast.success("Question Paper PDF uploaded successfully!");
    } catch (err: any) {
      const msg = err?.data?.error || err?.data?.detail || "Failed to upload question paper.";
      toast.error(msg);
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteQuestionPaper = async () => {
    if (!examId) return;
    if (!confirm("Are you sure you want to remove the question paper PDF?")) return;
    try {
      await adminExamApi.deleteQuestionPaper(examId);
      setHasQuestionPaper(false);
      setQuestionPaperPageCount(0);
      setQuestionPaperFileSize(0);
      toast.success("Question paper removed.");
    } catch {
      toast.error("Failed to remove question paper.");
    }
  };

  const handleViewQuestionPaper = async () => {
    if (!examId) return;
    try {
      const blob = await adminExamApi.getQuestionPaperBlob(examId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast.error("Could not preview question paper PDF.");
    }
  };

  /** Creates the Examination on first save, then PATCHes. Returns its id. */
  const persist = async (opts: { silent?: boolean } = {}): Promise<number | null> => {
    if (!title.trim()) { toast.error("The exam needs a title."); setStep(1); return null; }
    if (!categoryId || !positionId) {
      toast.error("Choose a category and a position first.");
      setStep(2);
      return null;
    }

    setSaving(true);
    try {
      const payload = buildPayload() as Partial<Examination>;
      if (examId) {
        await adminExamApi.updateExam(examId, payload);
        if (!opts.silent) toast.success("Draft saved");
        return examId;
      }
      const created = await adminExamApi.createExam(payload);
      setExamId(created.id);
      // Put the id in the URL so a refresh recovers the draft.
      router.replace(`/admin-dashboard/exams/new?draft=${created.id}`);
      if (!opts.silent) toast.success("Draft saved");
      return created.id;
    } catch (error: any) {
      const data = error?.data;
      const firstField = data && typeof data === "object" ? Object.keys(data)[0] : null;
      const msg =
        data?.error ||
        data?.detail ||
        (firstField ? `${firstField}: ${Array.isArray(data[firstField]) ? data[firstField][0] : data[firstField]}` : null) ||
        "Could not save the exam.";
      toast.error(msg);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    // Step 3 needs a real Examination to attach questions to.
    if (step === 2 && !examId) {
      const id = await persist({ silent: true });
      if (!id) return;
    }
    if (step === 2 && examId) await persist({ silent: true });
    setStep(s => Math.min(4, s + 1));
  };

  const publish = async () => {
    setPublishErrors([]);
    const id = await persist({ silent: true });
    if (!id) return;

    setPublishing(true);
    try {
      await adminExamApi.publishExam(id);
      toast.success("Exam published");
      router.push(`/admin-dashboard/exams/${id}`);
    } catch (error: any) {
      const data = error?.data;
      if (Array.isArray(data?.details)) {
        setPublishErrors(data.details);
        toast.error("Exam cannot be published. Please complete the required configuration.");
      } else {
        toast.error(data?.error || data?.detail || "Publishing failed.");
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleSelectionChange = useCallback((count: number, marks: number) => {
    setSelection({ count, marks });
  }, []);

  const field = "w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20";
  const label = "block text-sm font-medium text-slate-700 mb-1.5";

  if (loadingDraft) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#0B2545]" />
        <p className="text-sm text-slate-500">Recovering draft...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link
            href="/admin-dashboard/exams"
            className="p-2 rounded-full text-slate-500 hover:text-[#0B2545] hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545]">
              {examId ? "Edit Exam Draft" : "Create Exam"}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {examId
                ? `Draft #${examId} — changes are saved to the server.`
                : "The draft is created on the server once you reach Question Selection."}
            </p>
          </div>
        </div>
        {saving && (
          <span className="text-xs text-slate-500 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
          </span>
        )}
      </div>

      {/* Stepper */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {STEPS.map((s) => (s.id === 3 && examType === "subjective" ? { ...s, title: "Question Paper" } : s)).map((s, i) => {
            const active = step === s.id;
            const done = step > s.id;
            // Step 3 is unreachable until a draft exists to attach questions to.
            const locked = s.id === 3 && !examId;
            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => !locked && setStep(s.id)}
                  disabled={locked}
                  className={`flex items-center gap-2.5 disabled:cursor-not-allowed ${locked ? "opacity-40" : ""}`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${active ? "bg-[#0B2545] text-white"
                    : done ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-400"
                    }`}>
                    {done ? <Check className="w-4 h-4" /> : s.id}
                  </span>
                  <span className="text-left hidden sm:block">
                    <span className={`block text-[10px] font-bold uppercase tracking-wider ${active ? "text-[#0B2545]" : done ? "text-emerald-600" : "text-slate-400"
                      }`}>Step {s.id}</span>
                    <span className={`block text-sm font-medium ${active ? "text-slate-900" : "text-slate-500"}`}>
                      {s.title}
                    </span>
                  </span>
                </button>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200 min-w-[12px]" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {publishErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="font-semibold text-red-800 flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" /> Exam cannot be published
          </p>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-0.5">
            {publishErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* ── Step 1 ─────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <h2 className="font-bold text-[#0B2545]">Basic Information</h2>
          <div>
            <label className={label}>Exam Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={field}
              placeholder="e.g. Loksewa Section Officer — Full Mock Test 1" />
          </div>
          <div>
            <label className={label}>Exam Type *</label>
            <select value={examType} onChange={e => setExamType(e.target.value as ExaminationType)} className={field}>
              {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Objective Exam Category</label>
            <select
              value={objectiveCategory}
              onChange={e => setObjectiveCategory(e.target.value as typeof objectiveCategory)}
              className={field}
            >
              <option value="">Not applicable (e.g. subjective exam)</option>
              {OBJECTIVE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {objectiveCategory && (
              <p className="text-xs text-slate-500 mt-1.5">
                {OBJECTIVE_CATEGORIES.find(c => c.value === objectiveCategory)?.hint}
              </p>
            )}
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className={`${field} resize-y`} placeholder="Shown to students in the exam list." />
          </div>
          <div>
            <label className={label}>Instructions</label>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={4}
              className={`${field} resize-y`} placeholder="Rules shown before the exam starts." />
          </div>
        </div>
      )}

      {/* ── Step 2 ─────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-bold text-[#0B2545]">Academic Targeting</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              This scopes the Master Question Bank in the next step.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={label}>Exam Category *</label>
              <select
                value={categoryId ?? ""}
                onChange={e => {
                  setCategoryId(e.target.value ? Number(e.target.value) : undefined);
                  setPositionId(undefined); setSubjectId(undefined);
                }}
                className={field}
              >
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Position / Level *</label>
              <select
                value={positionId ?? ""}
                onChange={e => { setPositionId(e.target.value ? Number(e.target.value) : undefined); setSubjectId(undefined); }}
                disabled={!categoryId}
                className={`${field} disabled:bg-slate-50`}
              >
                <option value="">Select position</option>
                {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Subject</label>
              <select
                value={subjectId ?? ""}
                onChange={e => setSubjectId(e.target.value ? Number(e.target.value) : undefined)}
                disabled={!positionId}
                className={`${field} disabled:bg-slate-50`}
              >
                <option value="">All subjects</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3 ─────────────────────────────────────────────────────────── */}
      {step === 3 && (
        examType === "subjective" ? (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0B2545] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Subjective Question Paper (PDF)
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Upload the official Loksewa PSC question paper PDF that students will read during their exam.
                  </p>
                </div>
                {hasQuestionPaper && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <FileCheck className="w-3.5 h-3.5" /> PDF Attached ({questionPaperPageCount} {questionPaperPageCount === 1 ? "page" : "pages"})
                  </span>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleQuestionPaperFileChange}
              />

              {hasQuestionPaper ? (
                <div className="bg-gradient-to-r from-emerald-50/60 to-blue-50/40 border border-emerald-200/80 rounded-xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-emerald-200 flex items-center justify-center shrink-0">
                        <FileCheck className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">Official Question Paper PDF</h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="bg-white/80 px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">
                            {questionPaperPageCount} {questionPaperPageCount === 1 ? "Page" : "Pages"}
                          </span>
                          {questionPaperFileSize > 0 && (
                            <span className="bg-white/80 px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">
                              {(questionPaperFileSize / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          )}
                          <span className="text-emerald-700 font-medium">Ready for examination</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleViewQuestionPaper}
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium shadow-sm flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-4 h-4 text-slate-500" /> Preview PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPdf}
                        className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <FileUp className="w-4 h-4" /> Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteQuestionPaper}
                        disabled={uploadingPdf}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                        title="Remove Question Paper"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !uploadingPdf && fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/20 rounded-xl p-8 text-center cursor-pointer transition-all group"
                >
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform mb-3">
                    {uploadingPdf ? (
                      <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                    ) : (
                      <UploadCloud className="w-7 h-7 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-800 text-base">
                    {uploadingPdf ? "Uploading and processing question paper..." : "Click to upload Question Paper PDF"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Supported format: Adobe PDF (.pdf) up to 25MB. Page count and metadata will be parsed automatically.
                  </p>
                  <button
                    type="button"
                    disabled={uploadingPdf}
                    className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm group-hover:border-indigo-300"
                  >
                    Select PDF Document
                  </button>
                </div>
              )}
            </div>

            {/* Subjective Submission Rules */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#0B2545] flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  Answer Submission &amp; Evaluation Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure the mobile upload window and evaluator workflow.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={label}>Upload Deadline Window (minutes) *</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={uploadDeadlineMinutes}
                    onChange={(e) => setUploadDeadlineMinutes(Math.max(1, Number(e.target.value) || 15))}
                    className={field}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Extra time granted after writing timer expires for students to photograph and upload answer sheets.
                  </p>
                </div>
                <div>
                  <label className={label}>Total Marks *</label>
                  <input
                    type="number"
                    min={1}
                    value={subjectiveTotalMarks}
                    onChange={(e) => setSubjectiveTotalMarks(Math.max(1, Number(e.target.value) || 100))}
                    className={field}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Total examination marks (used for percentage and pass criteria).
                  </p>
                </div>
                <div>
                  <label className={label}>Passing Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(Number(e.target.value) || 0)}
                    className={field}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Minimum marks required to pass (default 40%).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
                <div>
                  <label className={label}>Allowed Upload Types</label>
                  <select
                    value={allowedFileTypes}
                    onChange={(e) => setAllowedFileTypes(e.target.value)}
                    className={field}
                  >
                    <option value="pdf,image">Camera Photos &amp; PDF (Recommended)</option>
                    <option value="pdf">PDF Document Only</option>
                    <option value="image">Camera Photos Only</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Max Upload File Size (MB)</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={maxUploadSizeMb}
                    onChange={(e) => setMaxUploadSizeMb(Math.max(5, Number(e.target.value) || 25))}
                    className={field}
                  />
                </div>
                <div>
                  <label className={label}>Evaluation Workflow</label>
                  <select
                    value={evaluationType}
                    onChange={(e) => setEvaluationType(e.target.value as any)}
                    className={field}
                  >
                    <option value="manual">Manual Examiner Evaluation</option>
                    <option value="ai_assisted">AI-Assisted OCR + Examiner Verification</option>
                    <option value="hybrid">Hybrid (AI First Pass + Manual Review)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ) : examId ? (
          <QuestionSelectionWorkspace
            examinationId={examId}
            defaultSubjectId={subjectId ?? null}
            defaultCollectionId={defaultCollectionId}
            onSelectionChange={handleSelectionChange}
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="font-semibold text-slate-700">Save the draft first.</p>
            <p className="text-sm text-slate-500 mt-1">
              Questions attach to a real examination record, so complete steps 1 and 2.
            </p>
          </div>
        )
      )}

      {/* ── Step 4 ─────────────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <h2 className="font-bold text-[#0B2545]">
              {examType === "subjective" ? "Writing Timing & Scoring" : "Scoring & Timing"}
            </h2>
            <div className={`grid grid-cols-1 ${examType === "subjective" ? "md:grid-cols-3" : "md:grid-cols-3"} gap-5`}>
              <div>
                <label className={label}>
                  {examType === "subjective" ? "Writing Time Limit (minutes) *" : "Time Limit (minutes) *"}
                </label>
                <input
                  type="number"
                  min={1}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Math.max(1, Number(e.target.value) || 1))}
                  className={field}
                />
                {examType === "subjective" && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Time allocated for handwriting answers on physical paper.
                  </p>
                )}
              </div>
              {examType === "subjective" ? (
                <>
                  <div>
                    <label className={label}>Total Exam Marks *</label>
                    <input
                      type="number"
                      min={1}
                      value={subjectiveTotalMarks}
                      onChange={(e) => setSubjectiveTotalMarks(Math.max(1, Number(e.target.value) || 100))}
                      className={field}
                    />
                  </div>
                  <div>
                    <label className={label}>Passing Marks</label>
                    <input
                      type="number"
                      min={0}
                      value={passingMarks}
                      onChange={(e) => setPassingMarks(Number(e.target.value) || 0)}
                      className={field}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={label}>Marks Per Question</label>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={marksPerQuestion}
                      onChange={(e) => setMarksPerQuestion(Number(e.target.value) || 1)}
                      className={field}
                    />
                  </div>
                  <div>
                    <label className={label}>Passing Marks</label>
                    <input
                      type="number"
                      min={0}
                      value={passingMarks}
                      onChange={(e) => setPassingMarks(Number(e.target.value) || 0)}
                      className={field}
                    />
                  </div>
                </>
              )}
            </div>

            {examType === "subjective" ? (
              <p className="text-sm text-indigo-900 bg-indigo-50/70 border border-indigo-100 rounded-lg px-4 py-2.5">
                Subjective Examination · Writing Time: <strong>{timeLimit} mins</strong> · Upload Window:{" "}
                <strong>{uploadDeadlineMinutes} mins</strong> · Total Marks: <strong>{subjectiveTotalMarks}</strong>.
              </p>
            ) : (
              <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                {selection.count} question(s) assigned · <strong>{selection.marks}</strong> total marks.
                Totals come from the questions on the exam and are recalculated server-side.
              </p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-bold text-[#0B2545]">Attempt Rules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={label}>
                  Max Attempts <span className="text-slate-400">(0 = unlimited)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Math.max(0, Number(e.target.value) || 0))}
                  className={field}
                />
              </div>
              <div>
                <label className={label}>Result Visibility</label>
                <select
                  value={examType === "subjective" ? "manual" : resultVisibility}
                  disabled={examType === "subjective"}
                  onChange={(e) => setResultVisibility(e.target.value as Examination["result_visibility"])}
                  className={`${field} disabled:bg-slate-50`}
                >
                  <option value="manual">After manual review &amp; publishing</option>
                  <option value="immediate">Immediately</option>
                  <option value="after_end">After exam ends</option>
                </select>
                {examType === "subjective" && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Subjective exams require manual evaluation by an evaluator before publishing results to students.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {(
                examType === "subjective"
                  ? [
                    [
                      "Allow resume",
                      allowResume,
                      setAllowResume,
                      "Allows students to reconnect and resume if their browser disconnects during writing time.",
                    ],
                    ["Auto-submit on timeout", autoSubmit, setAutoSubmit, "Moves attempt to upload window when writing timer reaches zero."],
                  ]
                  : [
                    [
                      "Allow resume",
                      allowResume,
                      setAllowResume,
                      objectiveCategory === "live"
                        ? "Live Exams never allow resume — leaving mid-attempt forfeits it, regardless of this setting."
                        : null,
                    ],
                    ["Auto-submit on timeout", autoSubmit, setAutoSubmit, null],
                    ["Show correct answers", showAnswers, setShowAnswers, null],
                    [
                      "Randomize question order",
                      randomizeQuestions,
                      setRandomizeQuestions,
                      objectiveCategory === "old_past"
                        ? "Old Past Exams must keep their original, fixed question order."
                        : null,
                    ],
                    ["Randomize MCQ options", randomizeOptions, setRandomizeOptions, null],
                    ["Negative marking", negativeMarking, setNegativeMarking, null],
                  ]
              ).map(([text, value, setter, note]: any) => (
                <label
                  key={text}
                  className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setter(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0B2545] mt-0.5"
                  />
                  <span>
                    {text}
                    {note && <span className="block text-xs text-slate-400 mt-0.5">{note}</span>}
                  </span>
                </label>
              ))}
            </div>

            {examType !== "subjective" && negativeMarking && (
              <div className="pt-1">
                <label className={label}>Negative Marking Value</label>
                <input
                  type="number"
                  min={0}
                  step={0.05}
                  value={negativeValue}
                  onChange={(e) => setNegativeValue(Number(e.target.value) || 0)}
                  className={`${field} md:w-48`}
                />
              </div>
            )}
          </div>


          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-bold text-[#0B2545]">Availability</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className={label}>Opens</label>
                <input type="datetime-local" value={startTime}
                  onChange={e => setStartTime(e.target.value)} className={field} />
              </div>
              <span className="text-slate-400 pb-3">to</span>
              <div>
                <label className={label}>Closes</label>
                <input type="datetime-local" value={endTime}
                  onChange={e => setEndTime(e.target.value)} className={field} />
              </div>
            </div>
            {startTime && endTime && new Date(endTime) <= new Date(startTime) && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> The closing time must be after the opening time.
              </p>
            )}
            <p className="text-xs text-slate-500">
              Leave both blank to make the exam available as soon as it is published.
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-200">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="px-5 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Back
        </button>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => persist()}
            disabled={saving || publishing}
            className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          {step < 4 ? (
            <button
              onClick={goNext}
              disabled={saving}
              className="px-6 py-2.5 bg-[#0B2545] hover:bg-[#163E6C] disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-1"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={publish}
              disabled={publishing || saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Publish Exam
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

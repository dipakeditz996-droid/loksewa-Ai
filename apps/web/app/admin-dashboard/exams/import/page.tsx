"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, AlertCircle, CheckCircle, FileText, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";
import { adminQuestionApi, ImportReport, ImportRow } from "@/lib/api/admin-questions";
import { adminExamApi, ObjectiveCategory } from "@/lib/api/admin-exams";
import { AcademicDependentSelect } from "@/components/admin/syllabus/AcademicDependentSelect";

type ImportCategory = Exclude<ObjectiveCategory, null | "custom">;

const MISSING_LABELS: Record<string, string> = {
  options: "Options A–D",
  correct_answer: "Correct answer",
  explanation: "Explanation",
};

const inputCls =
  "w-full p-2.5 border border-gray-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20";

const rowTone = (status: ImportRow["status"]) => {
  if (status === "valid") return "bg-green-50/50 border-green-100";
  if (status === "incomplete") return "bg-blue-50/50 border-blue-100";
  if (status === "duplicate") return "bg-amber-50/50 border-amber-100";
  return "bg-red-50/50 border-red-100";
};

export default function ImportExamPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  // Exam details
  const [title, setTitle] = useState("");
  const [objectiveCategory, setObjectiveCategory] = useState<ImportCategory>("model");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionType, setQuestionType] = useState<"mcq" | "true_false">("mcq");

  // Canonical hierarchy. The exam takes category/position/subject; the
  // imported questions land in the chosen topic.
  const [category, setCategory] = useState<number | undefined>();
  const [position, setPosition] = useState<number | undefined>();
  const [subject, setSubject] = useState<number | undefined>();
  const [chapter, setChapter] = useState<number | undefined>();
  const [topic, setTopic] = useState<number | undefined>();

  // Result of the two-part finish (import questions, then create the exam).
  const [importedIds, setImportedIds] = useState<number[] | null>(null);
  const [skippedDuplicates, setSkippedDuplicates] = useState(0);
  const [examId, setExamId] = useState<number | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);

  const handleAcademicChange = (field: string, value: any) => {
    if (field === "category") {
      setCategory(value); setPosition(undefined); setSubject(undefined); setChapter(undefined); setTopic(undefined);
    } else if (field === "position" || field === "exam") {
      setPosition(value); setSubject(undefined); setChapter(undefined); setTopic(undefined);
    } else if (field === "subject") {
      setSubject(value); setChapter(undefined); setTopic(undefined);
    } else if (field === "chapter" || field === "unit") {
      setChapter(value); setTopic(undefined);
    } else if (field === "topic") {
      setTopic(value);
    }
  };

  const errMessage = (error: any, fallback: string) => {
    const data = error?.data;
    const firstField = data && typeof data === "object" ? Object.keys(data)[0] : null;
    return (
      data?.error ||
      data?.detail ||
      (firstField ? `${firstField}: ${Array.isArray(data[firstField]) ? data[firstField][0] : data[firstField]}` : null) ||
      error?.message ||
      fallback
    );
  };

  const canAnalyze = Boolean(file && title.trim() && category && position && topic);

  const handleUpload = async () => {
    if (!file || !topic) return;
    setBusy(true);
    try {
      const res = await adminQuestionApi.uploadCSV(file, { topic, question_type: questionType, difficulty });
      setReport(res);
      setStep(2);
      toast.success(`Analyzed ${res.total_rows} rows`);
    } catch (error: any) {
      toast.error(errMessage(error, "Failed to analyze the file"));
    } finally {
      setBusy(false);
    }
  };

  const handleAiFill = async () => {
    if (!report) return;
    setBusy(true);
    try {
      setReport(await adminQuestionApi.aiFillImport(report.import_id));
      toast.success("AI filled the missing fields");
    } catch (error: any) {
      toast.error(errMessage(error, "AI could not fill the missing fields"));
    } finally {
      setBusy(false);
    }
  };

  /** Create the draft exam and attach the imported questions to it. */
  const createExamWith = async (questionIds: number[]) => {
    setFinishError(null);
    let createdId: number | null = examId;
    try {
      if (!createdId) {
        const created = await adminExamApi.createExam({
          title: title.trim(),
          exam_type: "mock",
          objective_category: objectiveCategory,
          category,
          exam: position,
          subject: subject ?? null,
        } as any);
        createdId = created.id;
        setExamId(created.id);
      }
      await adminExamApi.addQuestions(createdId, questionIds);
      setStep(3);
    } catch (error: any) {
      setFinishError(errMessage(error, "Could not create the exam."));
    }
  };

  const handleCommit = async () => {
    if (!report) return;
    setBusy(true);
    try {
      const res = await adminQuestionApi.commitCSV(report.import_id);
      const ids = res.question_ids ?? [];
      setImportedIds(ids);
      setSkippedDuplicates(res.skipped_duplicates?.length ?? 0);
      if (ids.length === 0) {
        setFinishError("No new questions were imported, so no exam was created.");
        return;
      }
      await createExamWith(ids);
    } catch (error: any) {
      toast.error(errMessage(error, "Failed to import"));
    } finally {
      setBusy(false);
    }
  };

  const retryCreateExam = async () => {
    if (!importedIds?.length) return;
    setBusy(true);
    try {
      await createExamWith(importedIds);
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setStep(1); setFile(null); setReport(null); setImportedIds(null);
    setSkippedDuplicates(0); setExamId(null); setFinishError(null);
  };

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin-dashboard/exams" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Exam</h1>
          <p className="text-gray-500 mt-1">
            Upload an Excel (.xlsx) file of questions. They are added to the Question Bank and attached to a new
            draft exam you can finish setting up.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8 px-4">
        {[
          { n: 1, label: "Details & Upload" },
          { n: 2, label: "Review & Import" },
          { n: 3, label: "Draft Exam Created" },
        ].map((s, i) => (
          <div key={s.n} className={i === 0 ? "flex items-center flex-1" : "flex items-center flex-1 justify-end"}>
            {i > 0 && <div className={`flex-1 h-1 mx-4 rounded ${step >= s.n ? "bg-[#0B2545]" : "bg-gray-100"}`} />}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                step >= s.n ? "bg-[#0B2545] text-white" : "bg-gray-100 text-gray-400"
              }`}>{s.n}</div>
              <span className={`text-sm font-medium whitespace-nowrap ${step >= s.n ? "text-[#0B2545]" : "text-gray-400"}`}>
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Exam details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="import-title" className="block text-sm font-medium text-gray-700 mb-1">Exam title</label>
                <input
                  id="import-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. PSC 5th Level Civil Engineering – Model Exam 02"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="import-cat" className="block text-sm font-medium text-gray-700 mb-1">Exam category</label>
                <select
                  id="import-cat"
                  value={objectiveCategory}
                  onChange={(e) => setObjectiveCategory(e.target.value as ImportCategory)}
                  className={inputCls}
                >
                  <option value="old_past">Old Past Exam</option>
                  <option value="model">Model Exam</option>
                  <option value="live">Live Exam</option>
                </select>
              </div>
              <div>
                <label htmlFor="import-type" className="block text-sm font-medium text-gray-700 mb-1">Question type</label>
                <select
                  id="import-type"
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as "mcq" | "true_false")}
                  className={inputCls}
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                </select>
              </div>
              <div>
                <label htmlFor="import-diff" className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  id="import-diff"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className={inputCls}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Category, position and topic</h3>
              <p className="text-sm text-gray-500 mb-4">
                The exam is created under this category, position and subject; the questions are stored in the topic.
              </p>
              <AcademicDependentSelect
                category={category}
                position={position}
                subject={subject}
                chapter={chapter}
                topic={topic}
                onChange={handleAcademicChange}
                maxLevel="topic"
                layout="grid"
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
            <div className="max-w-xl mx-auto flex flex-col items-center">
              <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <UploadCloud className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Excel File</h2>
              <p className="text-gray-500 text-center mb-6 text-sm">
                Same format as the Question Bank import: SN, Questions, Mark, Option A–D, Correct Answer (1–4 or A–D),
                Explanation, Hint.
              </p>
              <button
                type="button"
                onClick={() => adminQuestionApi.downloadTemplate(questionType).catch((e: any) => toast.error(e?.message || "Failed to download template"))}
                className="text-[#0B2545] font-medium hover:underline flex items-center gap-2 mb-6"
              >
                <FileText className="w-4 h-4" /> Download Excel Template
              </button>

              <div className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-gray-50 transition-colors text-center relative">
                <input
                  type="file"
                  aria-label="Excel file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {!file ? (
                  <div>
                    <p className="font-medium text-gray-700">Click to browse or drag and drop</p>
                    <p className="text-sm text-gray-500 mt-1">.xlsx format (legacy .csv also supported)</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="font-medium text-gray-900">{file.name}</span>
                  </div>
                )}
              </div>

              {!canAnalyze && (
                <p className="text-sm text-amber-600 mt-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Enter a title, choose category, position and topic, and select a file.
                </p>
              )}

              <button
                disabled={!canAnalyze || busy}
                onClick={handleUpload}
                className="w-full mt-6 bg-[#0B2545] hover:bg-[#163E6C] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                {busy ? "Analyzing..." : "Analyze File"}
                {!busy && <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Total Rows", value: report.total_rows, tone: "border-gray-100 text-gray-900", lbl: "text-gray-500" },
              { label: "Ready", value: report.valid_rows, tone: "border-green-100 text-green-700", lbl: "text-green-600" },
              { label: "Needs Info", value: report.incomplete_rows, tone: "border-blue-100 text-blue-700", lbl: "text-blue-600" },
              { label: "Duplicates", value: report.duplicate_rows, tone: "border-amber-100 text-amber-700", lbl: "text-amber-600" },
              { label: "Errors", value: report.error_rows, tone: "border-red-100 text-red-700", lbl: "text-red-600" },
            ].map((c) => (
              <div key={c.label} className={`bg-white p-6 rounded-xl border text-center ${c.tone.split(" ")[0]}`}>
                <p className={`text-sm font-medium ${c.lbl}`}>{c.label}</p>
                <p className={`text-3xl font-bold mt-2 ${c.tone.split(" ")[1]}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {report.incomplete_rows > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                <p className="font-semibold text-blue-900">
                  {report.incomplete_rows} row{report.incomplete_rows === 1 ? " is" : "s are"} missing information — the AI can fill it in.
                </p>
              </div>
              <button
                onClick={handleAiFill}
                disabled={busy}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium whitespace-nowrap"
              >
                {busy ? "Filling..." : "Fill missing fields with AI"}
              </button>
            </div>
          )}

          {report.duplicate_rows > 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
              Duplicate rows already exist in the Question Bank and are not re-imported. They are also not added to
              this exam automatically — add them from the exam&apos;s question picker afterwards.
            </p>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Validation Report</h3>
              <p className="text-sm text-gray-500">Only rows marked ready are imported.</p>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
              {report.report_data.map((row) => (
                <div key={row.row_index} className={`p-3 border rounded-lg ${rowTone(row.status)}`}>
                  <p className="text-sm font-medium text-gray-900">
                    Row {row.row_index}: {row.data.question || "(no question text)"}
                  </p>
                  {row.missing?.length > 0 && (
                    <p className="mt-1 text-sm text-blue-700">
                      Missing: {row.missing.map((m) => MISSING_LABELS[m] || m).join(", ")}
                    </p>
                  )}
                  {row.errors?.length > 0 && (
                    <ul className="mt-1 list-disc list-inside text-sm text-red-600">
                      {row.errors.map((err, j) => <li key={j}>{err}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          {finishError && (
            <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex flex-wrap items-center justify-between gap-3">
              <span>
                {importedIds?.length
                  ? `${importedIds.length} question(s) were imported into the Question Bank, but the exam could not be finished: `
                  : ""}
                {finishError}
              </span>
              {importedIds?.length ? (
                <button onClick={retryCreateExam} disabled={busy} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium disabled:opacity-50">
                  {busy ? "Retrying..." : "Retry creating exam"}
                </button>
              ) : null}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={resetAll} className="px-6 py-3 font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              Cancel &amp; Start Over
            </button>
            {!importedIds?.length && (
              <button
                disabled={report.valid_rows === 0 || busy}
                onClick={handleCommit}
                className="px-8 py-3 font-medium text-white bg-[#0B2545] hover:bg-[#163E6C] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
              >
                {busy ? "Importing..." : `Import ${report.valid_rows} Question${report.valid_rows === 1 ? "" : "s"} & Create Exam`}
              </button>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Draft exam created</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            &ldquo;{title.trim()}&rdquo; was created as a draft with {importedIds?.length ?? 0} imported question
            {importedIds?.length === 1 ? "" : "s"}
            {skippedDuplicates > 0 ? ` (${skippedDuplicates} already in the Question Bank were skipped)` : ""}.
            Finish the time limit, marking and schedule, then publish.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/admin-dashboard/exams"
              className="px-6 py-3 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Back to Exams
            </Link>
            <Link
              href={`/admin-dashboard/exams/new?draft=${examId}`}
              className="px-6 py-3 font-medium text-white bg-[#0B2545] hover:bg-[#163E6C] rounded-xl transition-colors"
            >
              Continue setting up
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileSpreadsheet,
  Upload,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  FileCheck,
  RefreshCw,
  HelpCircle,
  Layers,
  BookOpen,
  Filter,
  Eye,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getTeacherImportHierarchy,
  downloadTeacherTemplate,
  uploadTeacherQuestionFile,
  commitTeacherQuestions,
  downloadTeacherErrorReport,
  getTeacherImportHistory,
  TeacherHierarchyCategory,
  TeacherHierarchyExam,
  TeacherHierarchySubject,
  TeacherHierarchyChapter,
  TeacherHierarchyTopic,
  TeacherImportReport,
  TeacherImportRow,
  TeacherImportHistoryItem,
} from "@/lib/api/teacher-questions";
import toast from "react-hot-toast";

export default function TeacherQuestionImportPage() {
  const router = useRouter();

  // Hierarchy Data & Cascade Selection
  const [hierarchy, setHierarchy] = useState<TeacherHierarchyCategory[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
  const [selectedLevelId, setSelectedLevelId] = useState<number | "">("");
  const [selectedPrepId, setSelectedPrepId] = useState<number | "">("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");
  const [selectedChapterId, setSelectedChapterId] = useState<number | "">("");
  const [selectedTopicId, setSelectedTopicId] = useState<number | "">("");
  const [questionType, setQuestionType] = useState<string>("mcq");
  const [difficulty, setDifficulty] = useState<string>("medium");

  // Upload & File State
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Preview & Report State
  const [report, setReport] = useState<TeacherImportReport | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "valid" | "duplicate" | "error">("all");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Success State
  const [submittedResult, setSubmittedResult] = useState<{
    count: number;
    status: string;
    subjectName: string;
  } | null>(null);

  // Recent Uploads History
  const [history, setHistory] = useState<TeacherImportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch initial hierarchy and history
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingHierarchy(true);
        const data = await getTeacherImportHierarchy();
        setHierarchy(data);

        // Auto-select first Category and Level if available
        const firstCat = data[0];
        if (firstCat) {
          setSelectedCategoryId(firstCat.id);
          const firstLevel = firstCat.positions?.[0];
          if (firstLevel) {
            setSelectedLevelId(firstLevel.id);
            const firstPrep = firstLevel.children?.[0];
            if (firstPrep) {
              setSelectedPrepId(firstPrep.id);
              const subjects = firstPrep.papers?.flatMap((p) => p.subjects) || [];
              const firstSubject = subjects[0];
              if (firstSubject) {
                setSelectedSubjectId(firstSubject.id);
              }
            } else {
              const subjects = firstLevel.papers?.flatMap((p) => p.subjects) || [];
              const firstSubject = subjects[0];
              if (firstSubject) {
                setSelectedSubjectId(firstSubject.id);
              }
            }
          }
        }
      } catch (err) {
        toast.error("Failed to load your assigned courses and syllabus hierarchy.");
      } finally {
        setLoadingHierarchy(false);
      }

      try {
        setLoadingHistory(true);
        const historyData = await getTeacherImportHistory();
        setHistory(historyData);
      } catch {
        // history failure is non-blocking
      } finally {
        setLoadingHistory(false);
      }
    }

    loadData();
  }, []);

  // Cascading Derivations
  const activeCategory = useMemo(
    () => hierarchy.find((c) => c.id === selectedCategoryId) || null,
    [hierarchy, selectedCategoryId]
  );

  const availableLevels = useMemo(
    () => activeCategory?.positions || [],
    [activeCategory]
  );

  const activeLevel = useMemo(
    () => availableLevels.find((l) => l.id === selectedLevelId) || null,
    [availableLevels, selectedLevelId]
  );

  const availablePreparations = useMemo(
    () => activeLevel?.children || [],
    [activeLevel]
  );

  const activePreparation = useMemo(
    () => availablePreparations.find((p) => p.id === selectedPrepId) || null,
    [availablePreparations, selectedPrepId]
  );

  const availableSubjects: TeacherHierarchySubject[] = useMemo(() => {
    if (activePreparation) {
      return activePreparation.papers?.flatMap((p) => p.subjects) || [];
    }
    if (activeLevel) {
      return activeLevel.papers?.flatMap((p) => p.subjects) || [];
    }
    return [];
  }, [activePreparation, activeLevel]);

  const activeSubject = useMemo(
    () => availableSubjects.find((s) => s.id === selectedSubjectId) || null,
    [availableSubjects, selectedSubjectId]
  );

  const availableChapters: TeacherHierarchyChapter[] = useMemo(
    () => activeSubject?.chapters || [],
    [activeSubject]
  );

  const activeChapter = useMemo(
    () => availableChapters.find((c) => c.id === selectedChapterId) || null,
    [availableChapters, selectedChapterId]
  );

  const availableTopics: TeacherHierarchyTopic[] = useMemo(
    () => activeChapter?.topics || [],
    [activeChapter]
  );

  // Template Download Handler
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      await downloadTeacherTemplate(questionType);
      toast.success("Excel template downloaded.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download Excel template.");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Drag and Drop File Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        validateFileChoice(droppedFile);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const inputFile = e.target.files[0];
      if (inputFile) {
        validateFileChoice(inputFile);
      }
    }
  };

  const validateFileChoice = (selectedFile: File) => {
    const ext = selectedFile.name.toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
      toast.error("Please upload an Excel spreadsheet (.xlsx or .xls).");
      return;
    }
    setFile(selectedFile);
    setReport(null);
  };

  // Validate & Preview Handler
  const handleValidateAndPreview = async () => {
    if (!file) {
      toast.error("Please select an Excel file first.");
      return;
    }
    if (!selectedSubjectId) {
      toast.error("Please select a Subject in the Academic Context first.");
      return;
    }

    try {
      setIsValidating(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subject_id", selectedSubjectId.toString());
      if (selectedChapterId) formData.append("chapter_id", selectedChapterId.toString());
      if (selectedTopicId) formData.append("topic_id", selectedTopicId.toString());
      formData.append("question_type", questionType);
      formData.append("difficulty", difficulty);

      const res = await uploadTeacherQuestionFile(formData);
      setReport(res);
      setFilterTab("all");

      if (res.error_rows > 0) {
        toast.error(`Found ${res.error_rows} row(s) with errors. Please review the table below.`);
      } else if (res.valid_rows > 0) {
        toast.success(`Validation complete! ${res.valid_rows} question(s) are valid and ready to submit.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to parse and validate Excel file.");
    } finally {
      setIsValidating(false);
    }
  };

  // Commit for Review Handler
  const handleCommitQuestions = async () => {
    if (!report) return;
    if (report.valid_rows === 0) {
      toast.error("No valid questions to submit. Please correct errors and re-upload.");
      return;
    }

    try {
      setIsCommitting(true);
      const res = await commitTeacherQuestions(report.import_id);
      setSubmittedResult({
        count: res.imported_count,
        status: "pending_review",
        subjectName: report.subject?.name || "Subject",
      });
      toast.success(`${res.imported_count} questions submitted for Admin review!`);

      // Refresh history in background
      getTeacherImportHistory().then(setHistory).catch(() => {});
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit questions for review.");
    } finally {
      setIsCommitting(false);
    }
  };

  // Download Error Report Handler
  const handleDownloadErrorReport = async () => {
    if (!report) return;
    try {
      await downloadTeacherErrorReport(report.import_id);
      toast.success("Error spreadsheet downloaded.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download error report.");
    }
  };

  // Filtered rows in report table
  const displayedRows = useMemo(() => {
    if (!report) return [];
    if (filterTab === "all") return report.report_data;
    return report.report_data.filter((r) => r.status === filterTab);
  }, [report, filterTab]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-16 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg border border-border"
            onClick={() => router.push("/teacher/questions")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
              Teacher Question Bank Excel Upload
            </h1>
            <p className="text-sm text-muted-foreground">
              Bulk import MCQ questions into your authorized subjects. Submissions enter Admin Review.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="gap-2 rounded-[9px] border-border text-foreground shadow-sm hover:bg-muted"
          onClick={handleDownloadTemplate}
          disabled={isDownloadingTemplate}
        >
          {isDownloadingTemplate ? (
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Download className="h-4 w-4 text-primary" />
          )}
          Download Excel Template
        </Button>
      </div>

      {/* SUCCESS CONFIRMATION STATE */}
      {submittedResult ? (
        <Card className="overflow-hidden border border-[#0F7A69]/30 bg-gradient-to-b from-[#0F7A69]/10 to-card shadow-md">
          <CardContent className="p-8 text-center sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0F7A69]/20 text-[#0F7A69] dark:text-[#4ADE9C]">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="mt-4 font-heading text-2xl font-extrabold text-foreground">
              {submittedResult.count} Questions Submitted for Admin Review
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Your questions for <strong className="text-foreground">{submittedResult.subjectName}</strong> have been
              securely saved with teacher attribution. Once approved by an Admin, they will become part of the canonical
              Master Question Bank for Practice, Mock Exams, and Games.
            </p>

            <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>Current Status:</span>
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                Pending Admin Review
              </Badge>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                className="rounded-[9px] border-border text-foreground"
                onClick={() => {
                  setSubmittedResult(null);
                  setReport(null);
                  setFile(null);
                }}
              >
                Upload Another File
              </Button>
              <Button
                className="gap-2 rounded-[9px] bg-[#0B2545] dark:bg-[#D4A72C] hover:bg-[#163E6C] dark:hover:bg-[#bfa228] text-white dark:text-[#0A1118] font-bold"
                onClick={() => router.push("/teacher/questions?status=pending_review")}
              >
                View in Question Bank <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* STEP 1: ACADEMIC CONTEXT SELECTOR */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Layers className="h-4 w-4" />
                <span>Step 1: Select Academic Context</span>
              </div>
              <CardTitle className="text-lg">Target Course & Subject</CardTitle>
              <CardDescription>
                Choose the course and subject you are authorized to teach. Chapter and Topic are optional.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingHierarchy ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" /> Loading assigned courses and
                  syllabus...
                </div>
              ) : hierarchy.length === 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle className="mx-auto mb-2 h-6 w-6" />
                  <p className="font-semibold">No assigned courses found.</p>
                  <p className="mt-1 text-xs">
                    You have not been assigned to teach any courses yet. Please contact an administrator to assign
                    courses to your account before uploading questions.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Category
                    </label>
                    <select
                      className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={selectedCategoryId}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setSelectedCategoryId(val);
                        setSelectedLevelId("");
                        setSelectedPrepId("");
                        setSelectedSubjectId("");
                        setSelectedChapterId("");
                        setSelectedTopicId("");
                      }}
                    >
                      <option value="">-- Select Category --</option>
                      {hierarchy.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Level / Position */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Level / Position
                    </label>
                    <select
                      className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={selectedLevelId}
                      disabled={!selectedCategoryId}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setSelectedLevelId(val);
                        setSelectedPrepId("");
                        setSelectedSubjectId("");
                        setSelectedChapterId("");
                        setSelectedTopicId("");
                      }}
                    >
                      <option value="">-- Select Level --</option>
                      {availableLevels.map((lvl) => (
                        <option key={lvl.id} value={lvl.id}>
                          {lvl.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preparation / Course */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Preparation / Course
                    </label>
                    <select
                      className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={selectedPrepId}
                      disabled={!selectedLevelId || availablePreparations.length === 0}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setSelectedPrepId(val);
                        setSelectedSubjectId("");
                        setSelectedChapterId("");
                        setSelectedTopicId("");
                      }}
                    >
                      <option value="">
                        {availablePreparations.length > 0 ? "-- Select Preparation --" : "None (Direct Subject)"}
                      </option>
                      {availablePreparations.map((prep) => (
                        <option key={prep.id} value={prep.id}>
                          {prep.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject (REQUIRED) */}
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <span>Subject</span>
                      <span className="text-destructive">* Required</span>
                    </label>
                    <select
                      className="w-full rounded-lg border border-primary/40 bg-card px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={selectedSubjectId}
                      disabled={availableSubjects.length === 0}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setSelectedSubjectId(val);
                        setSelectedChapterId("");
                        setSelectedTopicId("");
                      }}
                    >
                      <option value="">-- Select Subject (Required) --</option>
                      {availableSubjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} {sub.code ? `(${sub.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chapter (OPTIONAL) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Chapter (Optional)
                    </label>
                    <select
                      className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={selectedChapterId}
                      disabled={!selectedSubjectId || availableChapters.length === 0}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setSelectedChapterId(val);
                        setSelectedTopicId("");
                      }}
                    >
                      <option value="">-- All Chapters (Optional) --</option>
                      {availableChapters.map((chap) => (
                        <option key={chap.id} value={chap.id}>
                          {chap.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Topic (OPTIONAL) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Topic (Optional)
                    </label>
                    <select
                      className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={selectedTopicId}
                      disabled={!selectedChapterId || availableTopics.length === 0}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setSelectedTopicId(val);
                      }}
                    >
                      <option value="">-- All Topics (Optional) --</option>
                      {availableTopics.map((top) => (
                        <option key={top.id} value={top.id}>
                          {top.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Question Type & Difficulty */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Question Type
                    </label>
                    <select
                      className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={questionType}
                      onChange={(e) => setQuestionType(e.target.value)}
                    >
                      <option value="mcq">Multiple Choice (MCQ)</option>
                      <option value="true_false">True / False</option>
                      <option value="subjective">Subjective / Model Answer</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Default Difficulty
                    </label>
                    <select
                      className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* STEP 2: EXCEL UPLOAD AREA */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Step 2: Upload Excel File</span>
              </div>
              <CardTitle className="text-lg">Select or Drag & Drop Excel Spreadsheet</CardTitle>
              <CardDescription>
                File must follow the canonical template format: SN, Questions, Mark, Option A-D, Correct Answer.
                Explanation and Hint are optional.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : file
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border bg-muted/20 hover:border-primary/50"
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileInput}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileSpreadsheet className="h-7 w-7" />
                </div>

                <div className="mt-4">
                  {file ? (
                    <div>
                      <p className="font-heading text-base font-bold text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB • Click or drag to replace file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-heading text-base font-bold text-foreground">
                        Drop your Excel file here or browse
                      </p>
                      <p className="text-xs text-muted-foreground">Supports .xlsx and .xls files</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-border text-xs pointer-events-none"
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {file ? "Change File" : "Choose File"}
                  </Button>
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Validation runs first. Nothing is imported to database without preview.</span>
                </div>

                <Button
                  onClick={handleValidateAndPreview}
                  disabled={!file || !selectedSubjectId || isValidating}
                  className="gap-2 rounded-[9px] bg-[#0B2545] dark:bg-[#D4A72C] hover:bg-[#163E6C] dark:hover:bg-[#bfa228] text-white dark:text-[#0A1118] font-bold"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Parsing & Validating...
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4" />
                      Validate & Preview Questions
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* STEP 3: PREVIEW & ROW-LEVEL AUDIT */}
          {report && (
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                      <Sparkles className="h-4 w-4" />
                      <span>Step 3: Review & Submit</span>
                    </div>
                    <CardTitle className="text-lg">Import Preview ({report.total_rows} Questions)</CardTitle>
                    <CardDescription>
                      Review validation results below before submitting into Admin Review Queue.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {report.error_rows > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 text-xs"
                        onClick={handleDownloadErrorReport}
                      >
                        <Download className="h-3.5 w-3.5" /> Download Errors Excel
                      </Button>
                    )}
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div
                    onClick={() => setFilterTab("all")}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      filterTab === "all"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-xs font-semibold text-muted-foreground">Total Rows</p>
                    <p className="mt-1 font-heading text-2xl font-extrabold text-foreground">{report.total_rows}</p>
                  </div>

                  <div
                    onClick={() => setFilterTab("valid")}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      filterTab === "valid"
                        ? "border-[#0F7A69] bg-[#0F7A69]/10 ring-1 ring-[#0F7A69]/30"
                        : "border-border bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-xs font-semibold text-[#0F7A69] dark:text-[#4ADE9C]">Valid Questions</p>
                    <p className="mt-1 font-heading text-2xl font-extrabold text-[#0F7A69] dark:text-[#4ADE9C]">
                      {report.valid_rows}
                    </p>
                  </div>

                  <div
                    onClick={() => setFilterTab("duplicate")}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      filterTab === "duplicate"
                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "border-border bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Duplicates Detected</p>
                    <p className="mt-1 font-heading text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                      {report.duplicate_rows}
                    </p>
                  </div>

                  <div
                    onClick={() => setFilterTab("error")}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      filterTab === "error"
                        ? "border-destructive bg-destructive/10 ring-1 ring-destructive/30"
                        : "border-border bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-xs font-semibold text-destructive">Errors</p>
                    <p className="mt-1 font-heading text-2xl font-extrabold text-destructive">
                      {report.error_rows}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 pl-4 pr-2">#</th>
                        <th className="py-3 px-3">Question</th>
                        <th className="py-3 px-3">Marks</th>
                        <th className="py-3 px-3">Correct Ans</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Validation Message</th>
                        <th className="py-3 pr-4 pl-2 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground">
                            No rows matching the "{filterTab}" filter.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((r) => {
                          const isExpanded = expandedRow === r.row_index;
                          return (
                            <React.Fragment key={r.row_index}>
                              <tr
                                className={`hover:bg-muted/30 transition-colors ${
                                  r.status === "error"
                                    ? "bg-destructive/5"
                                    : r.status === "duplicate"
                                    ? "bg-amber-500/5"
                                    : ""
                                }`}
                              >
                                <td className="py-3 pl-4 pr-2 font-mono text-muted-foreground">{r.row_index}</td>
                                <td className="py-3 px-3 font-medium text-foreground max-w-xs truncate">
                                  {r.data.question || <span className="italic text-muted-foreground">(blank)</span>}
                                </td>
                                <td className="py-3 px-3 text-muted-foreground">{r.data.marks || "1.0"}</td>
                                <td className="py-3 px-3 font-semibold text-foreground">
                                  {r.data.correct_answer || (
                                    <span className="italic text-destructive text-[11px]">Missing</span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {r.status === "valid" ? (
                                    <Badge className="bg-[#0F7A69]/15 text-[#0F7A69] dark:text-[#4ADE9C] border-[#0F7A69]/30">
                                      Valid
                                    </Badge>
                                  ) : r.status === "duplicate" ? (
                                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                      Duplicate
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-destructive/15 text-destructive border-destructive/30">
                                      Error
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-3 px-3 max-w-sm truncate text-xs">
                                  {r.errors.length > 0 ? (
                                    <span className="text-destructive font-medium">{r.errors.join("; ")}</span>
                                  ) : (
                                    <span className="text-[#0F7A69] dark:text-[#4ADE9C]">Ready for submission</span>
                                  )}
                                </td>
                                <td className="py-3 pr-4 pl-2 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setExpandedRow(isExpanded ? null : r.row_index)}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </td>
                              </tr>

                              {/* Expanded Row Detail */}
                              {isExpanded && (
                                <tr className="bg-muted/30">
                                  <td colSpan={7} className="px-6 py-4">
                                    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                      <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                          Full Question
                                        </p>
                                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                                          {r.data.question}
                                        </p>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                                        <div className="rounded-lg border border-border p-2">
                                          <span className="font-bold text-muted-foreground">Option A: </span>
                                          <span>{r.data.option_a || <span className="italic text-muted-foreground">none</span>}</span>
                                        </div>
                                        <div className="rounded-lg border border-border p-2">
                                          <span className="font-bold text-muted-foreground">Option B: </span>
                                          <span>{r.data.option_b || <span className="italic text-muted-foreground">none</span>}</span>
                                        </div>
                                        <div className="rounded-lg border border-border p-2">
                                          <span className="font-bold text-muted-foreground">Option C: </span>
                                          <span>{r.data.option_c || <span className="italic text-muted-foreground">none</span>}</span>
                                        </div>
                                        <div className="rounded-lg border border-border p-2">
                                          <span className="font-bold text-muted-foreground">Option D: </span>
                                          <span>{r.data.option_d || <span className="italic text-muted-foreground">none</span>}</span>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                        <div>
                                          <span className="font-bold text-muted-foreground">Explanation: </span>
                                          <span>{r.data.explanation || <span className="italic text-muted-foreground">(blank - optional)</span>}</span>
                                        </div>
                                        <div>
                                          <span className="font-bold text-muted-foreground">Hint: </span>
                                          <span>{r.data.hint || <span className="italic text-muted-foreground">(blank - optional)</span>}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Final Submission Footer */}
                <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between bg-muted/10">
                  <div className="text-xs text-muted-foreground">
                    <span>
                      Ready to submit <strong className="text-foreground">{report.valid_rows}</strong> valid question(s).
                    </span>
                    {report.error_rows > 0 && (
                      <span className="ml-1 text-destructive">
                        ({report.error_rows} error row(s) will not be imported).
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="rounded-[9px] border-border text-foreground"
                      onClick={() => setReport(null)}
                    >
                      Re-upload File
                    </Button>

                    <Button
                      onClick={handleCommitQuestions}
                      disabled={report.valid_rows === 0 || isCommitting}
                      className="gap-2 rounded-[9px] bg-[#0B2545] dark:bg-[#D4A72C] hover:bg-[#163E6C] dark:hover:bg-[#bfa228] text-white dark:text-[#0A1118] font-bold"
                    >
                      {isCommitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Submitting for Admin Review...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" />
                          Submit {report.valid_rows} Questions for Admin Review
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* RECENT UPLOADS HISTORY */}
          {history.length > 0 && (
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base font-bold">Recent Uploads</CardTitle>
                <CardDescription>Your recent question bank import batches.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-2.5 px-4">File Name</th>
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3">Total Rows</th>
                        <th className="py-2.5 px-3">Valid / Imported</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 pr-4 pl-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {history.slice(0, 5).map((h) => (
                        <tr key={h.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-4 font-medium text-foreground">{h.file_name}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{h.subject_name || "—"}</td>
                          <td className="py-2.5 px-3">{h.total_rows}</td>
                          <td className="py-2.5 px-3 text-[#0F7A69] dark:text-[#4ADE9C] font-semibold">
                            {h.valid_rows}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={
                                h.status === "imported"
                                  ? "border-[#0F7A69]/30 text-[#0F7A69] dark:text-[#4ADE9C]"
                                  : "border-amber-500/30 text-amber-600 dark:text-amber-400"
                              }
                            >
                              {h.status === "imported" ? "Submitted for Review" : "Validated"}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-4 pl-3 text-muted-foreground">
                            {new Date(h.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import React, { useState, useRef } from "react";
import {
  Download,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Layers,
  Loader2,
  FileText,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  ChevronRight,
  ShieldCheck,
  Target,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { adminQuestionApi, ImportReport, ImportRow } from "@/lib/api/admin-questions";
import { adminExamApi, ExaminationType } from "@/lib/api/admin-exams";

interface Props {
  examinationId: number;
  examTitle: string;
  examType: ExaminationType;
  categoryId?: number;
  positionId?: number;
  subjectId?: number;
  chapterId?: number;
  topicId?: number;
  categoryName?: string;
  positionName?: string;
  subjectName?: string;
  chapterName?: string;
  topicName?: string;
  onQuestionsAttached?: (count: number, allIds: number[]) => void;
  onSwitchToBank?: () => void;
}

const MISSING_LABELS: Record<string, string> = {
  options: "Options A–D",
  correct_answer: "Correct answer",
  explanation: "Explanation",
};

const rowTone = (status: ImportRow["status"]) => {
  if (status === "valid") return "bg-green-50/70 border-green-200 text-green-900";
  if (status === "incomplete") return "bg-blue-50/70 border-blue-200 text-blue-900";
  if (status === "duplicate") return "bg-amber-50/70 border-amber-200 text-amber-900";
  return "bg-rose-50/70 border-rose-200 text-rose-900";
};

const badgeTone = (status: ImportRow["status"]) => {
  if (status === "valid") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "incomplete") return "bg-blue-100 text-blue-800 border-blue-200";
  if (status === "duplicate") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function ExamExcelQuestionImport({
  examinationId,
  examTitle,
  examType,
  categoryId,
  positionId,
  subjectId,
  chapterId,
  topicId,
  categoryName,
  positionName,
  subjectName,
  chapterName,
  topicName,
  onQuestionsAttached,
  onSwitchToBank,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "valid" | "incomplete" | "duplicate" | "error">("all");
  const [committed, setCommitted] = useState(false);
  const [attachedCount, setAttachedCount] = useState(0);
  const [reusedCount, setReusedCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [finishError, setFinishError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTopicwise = examType === "subject";

  const handleDownloadTemplate = async () => {
    try {
      await adminQuestionApi.downloadTemplate("mcq");
      toast.success("Excel question template downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Failed to download Excel template");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const name = selected.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      toast.error("Please upload an Excel (.xlsx, .xls) or CSV file.");
      return;
    }
    setFile(selected);
    setReport(null);
    setCommitted(false);
    setFinishError(null);
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast.error("Please select an Excel or CSV file first.");
      return;
    }

    setBusy(true);
    setFinishError(null);
    try {
      const res = await adminQuestionApi.uploadCSV(file, {
        category: categoryId,
        position: positionId,
        subject: subjectId,
        chapter: chapterId,
        topic: topicId,
        question_type: "mcq",
        difficulty: "medium",
      });
      setReport(res);
      toast.success(`Analyzed ${res.total_rows} row(s) from ${file.name}`);
    } catch (err: any) {
      const msg = err?.data?.error || err?.data?.detail || err?.message || "Failed to analyze Excel file";
      toast.error(msg);
      setFinishError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleAiFill = async () => {
    if (!report) return;
    setBusy(true);
    try {
      const updated = await adminQuestionApi.aiFillImport(report.import_id);
      setReport(updated);
      toast.success("AI filled the missing fields");
    } catch (err: any) {
      const msg = err?.data?.error || err?.data?.detail || err?.message || "AI could not fill missing fields";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!report) return;
    if (report.valid_rows === 0 && report.duplicate_rows === 0) {
      toast.error("No valid or reusable questions to attach.");
      return;
    }

    setBusy(true);
    setFinishError(null);
    try {
      const res = await adminQuestionApi.commitCSV(report.import_id);
      const createdIds = res.question_ids || [];
      const dupCount = res.skipped_duplicates?.length || 0;
      const allIds = res.all_question_ids ?? [...createdIds, ...(res.existing_question_ids || [])];

      if (allIds.length === 0) {
        setFinishError("No questions were imported or found for attachment.");
        return;
      }

      // Attach questions to Examination via backend
      await adminExamApi.addQuestions(examinationId, allIds);

      setCommitted(true);
      setAttachedCount(allIds.length);
      setNewCount(createdIds.length);
      setReusedCount(dupCount);

      if (onQuestionsAttached) {
        onQuestionsAttached(allIds.length, allIds);
      }
      toast.success(`Successfully attached ${allIds.length} question(s) to this exam!`);
    } catch (err: any) {
      const msg = err?.data?.error || err?.data?.detail || err?.message || "Failed to import and attach questions.";
      setFinishError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setReport(null);
    setCommitted(false);
    setFinishError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredRows = (report?.report_data || []).filter((r) => {
    if (filterTab === "all") return true;
    return r.status === filterTab;
  });

  return (
    <div className="space-y-6">
      {/* ── Context & Instructions Bar ──────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border border-blue-200/80 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0B2545]">
              <Target className="w-4 h-4 text-indigo-600" />
              <span>
                {isTopicwise ? "Topicwise Test Academic Scope" : "Examination Academic Scope"}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {[categoryName, positionName, subjectName, chapterName, topicName].filter(Boolean).join(" → ") ||
                "Academic hierarchy targeted"}
            </p>
            {isTopicwise && (
              <p className="text-[11px] text-indigo-700 font-medium">
                Target Topic: <strong>{topicName || "All Topics in Chapter (Optional)"}</strong>. {topicName ? "All imported questions will be categorized under this topic." : "Imported questions will be scoped to this chapter."}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg shadow-sm transition-colors shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Download Excel Template (.xlsx)
          </button>
        </div>
      </div>

      {/* ── Success Banner when Committed ─────────────────────────────────── */}
      {committed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3 shadow-sm animate-in fade-in duration-300">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-emerald-950">
            {attachedCount} Question(s) Attached to Examination!
          </h3>
          <p className="text-sm text-emerald-800 max-w-lg mx-auto">
            {newCount} new question(s) saved into the Master Question Bank, and {reusedCount} existing question(s) reused.
            Your Topicwise Test is ready for configuration!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onSwitchToBank && (
              <button
                type="button"
                onClick={onSwitchToBank}
                className="px-4 py-2 bg-white border border-emerald-300 hover:bg-emerald-100/50 text-emerald-900 text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Review Assigned Questions in Bank
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              Upload Another Excel File
            </button>
          </div>
        </div>
      )}

      {/* ── File Upload / Analysis Section ─────────────────────────────────── */}
      {!committed && !report && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="text-center max-w-md mx-auto space-y-1">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Upload Objective Questions Spreadsheet
            </h3>
            <p className="text-xs text-slate-500">
              Upload an Excel (.xlsx, .xls) or CSV file filled using the standard Objective template.
              Questions will be validated against the targeted topic and added to the Master Question Bank.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
            id="excel-question-input"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20 rounded-xl p-8 text-center cursor-pointer transition-all group"
          >
            {file ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                  <div className="text-left">
                    <p className="font-semibold text-slate-900 text-sm">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <div className="flex justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Change File
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto group-hover:text-indigo-600 transition-colors" />
                <p className="text-sm font-semibold text-slate-700">
                  Click to select or drag and drop Excel workbook
                </p>
                <p className="text-xs text-slate-400">
                  Supported formats: .xlsx, .xls, .csv (Max 15MB)
                </p>
              </div>
            )}
          </div>

          {/* Master Question Bank Architecture Safety Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Master Question Bank Architecture:</strong> Questions are validated and ingested directly into the canonical Master Question Bank. Any questions that already exist under this topic are automatically reused, ensuring zero redundant duplicates.
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={!file || busy}
              onClick={handleAnalyze}
              className="px-6 py-2.5 bg-[#0B2545] hover:bg-[#133E6D] disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              {busy ? "Analyzing Questions..." : "Analyze & Validate Questions"}
            </button>
          </div>
        </div>
      )}

      {/* ── Validation Report Preview ───────────────────────────────────────── */}
      {!committed && report && (
        <div className="space-y-5">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total Rows", value: report.total_rows, tone: "text-slate-900 border-slate-200" },
              { label: "Ready", value: report.valid_rows, tone: "text-emerald-700 border-emerald-200 bg-emerald-50/40" },
              { label: "Needs Info", value: report.incomplete_rows, tone: "text-blue-700 border-blue-200 bg-blue-50/40" },
              { label: "Duplicates", value: report.duplicate_rows, tone: "text-amber-700 border-amber-200 bg-amber-50/40" },
              { label: "Errors", value: report.error_rows, tone: "text-rose-700 border-rose-200 bg-rose-50/40" },
            ].map((stat) => (
              <div key={stat.label} className={`bg-white border rounded-xl p-4 text-center ${stat.tone}`}>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Incomplete / AI Fill Banner */}
          {report.incomplete_rows > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-blue-900">
                    {report.incomplete_rows} question(s) have missing fields (options or explanations).
                  </p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Our AI tutor can complete missing options, correct answers, or rationales automatically.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAiFill}
                disabled={busy}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shrink-0 transition-colors"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Fill with AI
              </button>
            </div>
          )}

          {/* Duplicate Reuse Notice */}
          {report.duplicate_rows > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2.5">
              <Layers className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <strong>Duplicate Reuse Enabled:</strong> {report.duplicate_rows} question(s) already exist in the Question Bank under this topic. They will be linked to this exam directly, preserving existing IDs and usage analytics without duplicating data.
              </div>
            </div>
          )}

          {/* Errors Notice */}
          {report.error_rows > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 leading-relaxed">
                <strong>{report.error_rows} row(s) contain blocking validation errors</strong> (such as missing question text, invalid option references, negative marks, or questions conflicting with another topic). These rows will be skipped during import.
              </div>
            </div>
          )}

          {/* Row Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {[
              { id: "all" as const, label: `All (${report.total_rows})` },
              { id: "valid" as const, label: `Ready (${report.valid_rows})` },
              { id: "incomplete" as const, label: `Needs Info (${report.incomplete_rows})` },
              { id: "duplicate" as const, label: `Duplicates (${report.duplicate_rows})` },
              { id: "error" as const, label: `Errors (${report.error_rows})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filterTab === tab.id
                    ? "bg-white text-[#0B2545] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Validation Rows List */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-100 p-3 space-y-2">
              {filteredRows.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No questions match this filter tab.
                </div>
              ) : (
                filteredRows.map((row) => (
                  <div
                    key={row.row_index}
                    className={`p-3.5 rounded-lg border ${rowTone(row.status)} transition-all`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            Row {row.row_index}
                          </span>
                          {row.sn && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              (SN: {row.sn})
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${badgeTone(
                              row.status
                            )}`}
                          >
                            {row.status === "valid"
                              ? "Ready"
                              : row.status === "incomplete"
                              ? "Needs Info"
                              : row.status === "duplicate"
                              ? "Duplicate (Reusable)"
                              : "Error"}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 line-clamp-2">
                          {row.data.question || "(Empty question text)"}
                        </p>
                      </div>
                      {row.data.marks && (
                        <span className="text-[11px] font-semibold text-slate-600 bg-white/80 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          {row.data.marks} Mark(s)
                        </span>
                      )}
                    </div>

                    {/* Missing Fields Details */}
                    {row.missing?.length > 0 && (
                      <div className="mt-2 text-[11px] text-blue-700 bg-blue-50/80 px-2.5 py-1.5 rounded border border-blue-200">
                        <strong>Missing:</strong>{" "}
                        {row.missing.map((m) => MISSING_LABELS[m] || m).join(", ")}
                      </div>
                    )}

                    {/* Duplicate Detail */}
                    {row.duplicate_of && (
                      <div className="mt-2 text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-1.5 rounded border border-amber-200">
                        Matches existing question: <strong>{row.duplicate_of}</strong>
                      </div>
                    )}

                    {/* Blocking Errors */}
                    {row.errors?.length > 0 && row.status === "error" && (
                      <div className="mt-2 space-y-1 text-[11px] text-rose-700 bg-rose-50/80 px-2.5 py-1.5 rounded border border-rose-200">
                        <ul className="list-disc list-inside space-y-0.5">
                          {row.errors.map((err, j) => (
                            <li key={j}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {finishError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{finishError}</span>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel &amp; Choose Another File
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy || (report.valid_rows === 0 && report.duplicate_rows === 0)}
                onClick={handleCommit}
                className="px-6 py-2.5 bg-[#0B2545] hover:bg-[#133E6D] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {busy
                  ? "Attaching Questions..."
                  : `Confirm & Attach (${report.valid_rows + report.duplicate_rows} Questions)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

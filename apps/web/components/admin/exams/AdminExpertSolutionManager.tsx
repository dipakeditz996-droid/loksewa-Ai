"use client";

import React, { useState, useRef } from "react";
import {
  FileText, UploadCloud, CheckCircle2, AlertCircle, Eye, Download,
  Trash2, RefreshCw, Loader2, Sparkles, Send, ShieldCheck, Check,
  Edit3, Plus, X, AlertTriangle, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Examination,
  adminExamApi,
  QuestionRubricData,
  RubricCriterion
} from "@/lib/api/admin-exams";
import toast from "react-hot-toast";

interface AdminExpertSolutionManagerProps {
  exam: Examination;
  onUpdated?: () => void;
}

export function AdminExpertSolutionManager({ exam, onUpdated }: AdminExpertSolutionManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRubricsModal, setShowRubricsModal] = useState(false);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(false);
  const [isSavingRubrics, setIsSavingRubrics] = useState(false);
  const [rubrics, setRubrics] = useState<QuestionRubricData[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPdf = Boolean(exam.expert_solution_pdf);
  const isPublished = Boolean(exam.is_expert_solution_published);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast.error("Please upload a valid PDF document.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size exceeds 25MB limit.");
      return;
    }

    setIsUploading(true);
    try {
      await adminExamApi.uploadExpertSolutionPdf(exam.id, file);
      toast.success("Expert Solution PDF uploaded successfully!");
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to upload Expert Solution PDF.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleProcessSolution = async () => {
    setIsProcessing(true);
    try {
      const res = await adminExamApi.processExpertSolution(exam.id, { generate_rubrics: true });
      toast.success(`Processed! Detected ${res.questions_detected} questions and generated rubrics.`);
      if (onUpdated) onUpdated();
      // Automatically load the generated rubrics for review
      await handleOpenRubrics();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to process expert solution.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenRubrics = async () => {
    setIsLoadingRubrics(true);
    setShowRubricsModal(true);
    try {
      const res = await adminExamApi.getRubrics(exam.id);
      setRubrics(res.rubrics || []);
      if (res.rubrics && res.rubrics.length > 0) {
        setActiveQuestionIdx(0);
      }
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to load marking rubrics.");
    } finally {
      setIsLoadingRubrics(false);
    }
  };

  const handleUpdateCriterion = (
    qIdx: number,
    cIdx: number,
    field: keyof RubricCriterion,
    value: any
  ) => {
    setRubrics((prev) => {
      const updated = [...prev];
      const q = updated[qIdx];
      if (!q) return prev;
      const crits = [...(q.rubric || [])];
      const targetCrit = crits[cIdx];
      if (!targetCrit) return prev;
      crits[cIdx] = { ...targetCrit, [field]: value };
      updated[qIdx] = { ...q, rubric: crits };
      return updated;
    });
  };

  const handleAddCriterion = (qIdx: number) => {
    setRubrics((prev) => {
      const updated = [...prev];
      const q = updated[qIdx];
      if (!q) return prev;
      const crits = [
        ...(q.rubric || []),
        {
          criterion: "New criterion",
          max_marks: 1.0,
          expected_concepts: [],
        },
      ];
      updated[qIdx] = { ...q, rubric: crits };
      return updated;
    });
  };

  const handleDeleteCriterion = (qIdx: number, cIdx: number) => {
    setRubrics((prev) => {
      const updated = [...prev];
      const q = updated[qIdx];
      if (!q) return prev;
      const crits = q.rubric || [];
      if (crits.length <= 1) {
        toast.error("A question must have at least one rubric criterion.");
        return prev;
      }
      updated[qIdx] = { ...q, rubric: crits.filter((_, idx) => idx !== cIdx) };
      return updated;
    });
  };

  const handleSaveAndApproveRubrics = async (approveAll: boolean = false) => {
    setIsSavingRubrics(true);
    try {
      const payload = rubrics.map((r) => ({
        question_id: r.question_id,
        rubric: r.rubric,
        model_solution: r.model_solution,
        rubric_approved: approveAll ? true : r.rubric_approved,
      }));
      await adminExamApi.updateRubrics(exam.id, payload);
      toast.success(approveAll ? "All marking rubrics approved successfully!" : "Rubrics updated successfully!");
      setShowRubricsModal(false);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to save rubrics.");
    } finally {
      setIsSavingRubrics(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await adminExamApi.publishExpertSolution(exam.id);
      toast.success("Expert Solution published! Authorized students can now access it.");
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to publish Expert Solution.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setIsUnpublishing(true);
    try {
      await adminExamApi.unpublishExpertSolution(exam.id);
      toast.success("Expert Solution unpublished.");
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to unpublish Expert Solution.");
    } finally {
      setIsUnpublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove the Expert Solution PDF for this exam?")) return;
    setIsDeleting(true);
    try {
      await adminExamApi.deleteExpertSolution(exam.id);
      toast.success("Expert Solution removed successfully.");
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to delete Expert Solution.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePreviewDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await adminExamApi.getExpertSolutionBlob(exam.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: any) {
      toast.error("Could not load expert solution PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const activeQuestion = rubrics[activeQuestionIdx];
  const activeQuestionRubricTotal = activeQuestion?.rubric?.reduce(
    (sum, c) => sum + (Number(c.max_marks) || 0),
    0
  ) ?? 0;
  const isRubricTotalValid = activeQuestion
    ? Math.abs(activeQuestionRubricTotal - activeQuestion.marks) < 0.05
    : true;

  return (
    <>
      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-[#0B2545]">Expert Solution &amp; Rubric</CardTitle>
              {hasPdf ? (
                isPublished ? (
                  <Badge className="bg-emerald-600 text-white text-xs">Published</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Draft (Unpublished)</Badge>
                )
              ) : (
                <Badge variant="secondary" className="text-slate-500 text-xs">Not Uploaded</Badge>
              )}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Official model answer reference used for question mapping, semantic grading, and rubric-based marking.
            </CardDescription>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
        </CardHeader>

        <CardContent className="p-5">
          {hasPdf ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {exam.expert_solution_pdf ? exam.expert_solution_pdf.split("/").pop() : "expert_solution.pdf"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {exam.expert_solution_page_count ? `${exam.expert_solution_page_count} pages • ` : ""}
                      {formatBytes(exam.expert_solution_file_size)}
                      {exam.expert_solution_published_at ? ` • Published on ${new Date(exam.expert_solution_published_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviewDownload}
                    disabled={isDownloading}
                    className="gap-1.5 text-xs text-slate-700"
                  >
                    {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5 text-indigo-600" />}
                    Preview / Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="gap-1.5 text-xs text-slate-700"
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Replace PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-2"
                    title="Remove Expert Solution"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Rubric Extraction & Quality Gate Controls */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                      AI Question Extraction &amp; Rubric Engine
                    </span>
                  </div>
                  <p className="text-xs text-indigo-800">
                    Extract question solutions from this PDF, map to exam questions, and generate a criterion-by-criterion partial-credit rubric.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenRubrics}
                    disabled={isLoadingRubrics}
                    className="bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold gap-1.5 shadow-sm"
                  >
                    {isLoadingRubrics ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                    View &amp; Edit Rubrics
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleProcessSolution}
                    disabled={isProcessing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                  >
                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isProcessing ? "Processing PDF..." : "Extract & Generate Rubric"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-500">
                  {isPublished
                    ? "Students authorized for this course can view and download this solution PDF."
                    : "Draft solution is hidden from students until you click Publish."}
                </p>
                {isPublished ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnpublish}
                    disabled={isUnpublishing}
                    className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    {isUnpublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Unpublish Solution
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                  >
                    {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Publish Expert Solution
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">No Expert Solution Uploaded</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Upload an official model answer or explanation PDF for this subjective exam. Max 25MB.
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white text-xs font-semibold gap-2 shadow-sm"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {isUploading ? "Uploading PDF..." : "Upload Expert Solution PDF"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rubric Review & Approval Modal */}
      {showRubricsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Marking Rubrics &amp; Model Solutions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review and approve question-wise partial marks breakdown. The sum of criteria marks must match each question&apos;s maximum marks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRubricsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {isLoadingRubrics ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-xs text-slate-500 font-medium">Loading question rubrics...</p>
                </div>
              ) : rubrics.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-2">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                  <h4 className="text-sm font-semibold text-slate-800">No Rubrics Configured</h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Click &apos;Extract &amp; Generate Rubric&apos; to automatically extract question solutions from the Expert Solution PDF.
                  </p>
                </div>
              ) : (
                <>
                  {/* Left Sidebar: Question Tabs */}
                  <div className="w-full md:w-56 border-r border-slate-200 bg-slate-50/50 p-3 overflow-y-auto space-y-1 shrink-0">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                      Questions ({rubrics.length})
                    </span>
                    {rubrics.map((r, idx) => (
                      <button
                        key={r.question_id}
                        type="button"
                        onClick={() => setActiveQuestionIdx(idx)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between gap-2 ${
                          activeQuestionIdx === idx
                            ? "bg-[#0B2545] text-white shadow-sm"
                            : "hover:bg-slate-200/60 text-slate-700"
                        }`}
                      >
                        <div className="truncate">
                          <span>{r.display_number || `Q${r.question_number}`}</span>
                          <span className="text-[10px] opacity-70 ml-1.5">({r.marks} pts)</span>
                        </div>
                        {r.rubric_approved ? (
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${activeQuestionIdx === idx ? "text-emerald-300" : "text-emerald-600"}`} />
                        ) : (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${activeQuestionIdx === idx ? "bg-amber-300" : "bg-amber-500"}`} />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Right Content: Active Question Rubric Editor */}
                  {activeQuestion && (
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              {activeQuestion.display_number || `Question ${activeQuestion.question_number}`}
                            </h4>
                            <Badge variant="outline" className="text-xs uppercase font-mono">
                              {activeQuestion.evaluation_type}
                            </Badge>
                            {activeQuestion.rubric_approved ? (
                              <Badge className="bg-emerald-600 text-white text-[10px]">
                                Approved (v{activeQuestion.rubric_version})
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px]">
                                Pending Approval
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Maximum Marks: <strong className="text-slate-800">{activeQuestion.marks}</strong>
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-500">Criteria Total: </span>
                          <strong
                            className={`text-sm ${
                              isRubricTotalValid ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {activeQuestionRubricTotal.toFixed(1)} / {activeQuestion.marks}
                          </strong>
                        </div>
                      </div>

                      {!isRubricTotalValid && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            Total criterion marks ({activeQuestionRubricTotal.toFixed(1)}) do not match question total ({activeQuestion.marks}). Please adjust criterion marks.
                          </span>
                        </div>
                      )}

                      {/* Model Solution Extract */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Extracted Model Solution
                        </label>
                        <textarea
                          rows={3}
                          value={activeQuestion.model_solution || ""}
                          onChange={(e) => {
                            setRubrics((prev) => {
                              const updated = [...prev];
                              const q = updated[activeQuestionIdx];
                              if (!q) return prev;
                              updated[activeQuestionIdx] = {
                                ...q,
                                model_solution: e.target.value,
                              };
                              return updated;
                            });
                          }}
                          placeholder="Reference answer content for this question..."
                          className="w-full text-xs p-3 border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-mono resize-y"
                        />
                      </div>

                      {/* Rubric Criteria Table */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Marking Criteria Breakdown ({activeQuestion.rubric?.length || 0})
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddCriterion(activeQuestionIdx)}
                            className="text-xs h-7 gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          >
                            <Plus className="w-3 h-3" /> Add Criterion
                          </Button>
                        </div>

                        <div className="space-y-2.5">
                          {activeQuestion.rubric?.map((c, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={c.criterion}
                                    onChange={(e) =>
                                      handleUpdateCriterion(activeQuestionIdx, cIdx, "criterion", e.target.value)
                                    }
                                    placeholder="Criterion description (e.g. Structure explanation)..."
                                    className="w-full text-xs font-semibold p-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-xs text-slate-500 font-medium">Marks:</span>
                                  <input
                                    type="number"
                                    min={0.5}
                                    step={0.5}
                                    value={c.max_marks}
                                    onChange={(e) =>
                                      handleUpdateCriterion(activeQuestionIdx, cIdx, "max_marks", Number(e.target.value))
                                    }
                                    className="w-16 text-xs font-bold p-1.5 bg-white border border-slate-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCriterion(activeQuestionIdx, cIdx)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                    title="Delete criterion"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Snapshotted on published evaluations to ensure historical consistency.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRubricsModal(false)}
                  disabled={isSavingRubrics}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSaveAndApproveRubrics(false)}
                  disabled={isSavingRubrics || rubrics.length === 0}
                  className="text-xs text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                >
                  {isSavingRubrics ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Save Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveAndApproveRubrics(true)}
                  disabled={isSavingRubrics || rubrics.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                >
                  {isSavingRubrics ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Approve All Rubrics
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

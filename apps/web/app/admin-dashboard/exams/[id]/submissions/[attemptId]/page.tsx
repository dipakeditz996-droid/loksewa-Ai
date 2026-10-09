"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Download, Eye, ExternalLink,
  Sparkles, Save, CheckCircle2, AlertCircle, Clock, ZoomIn, ZoomOut,
  Maximize2, Minimize2, FileText, Check, Loader2, Award, User, RefreshCw,
  BookOpen, Edit3, MessageSquare, Plus, Trash2, X, AlertTriangle, ShieldCheck
} from "lucide-react";
import { adminExamApi, AdminSubjectiveSubmissionDetail } from "@/lib/api/admin-exams";
import toast from "react-hot-toast";

interface QuestionScoreItem {
  question_number: number;
  question_id?: number;
  question_text?: string;
  max_marks: number | string;
  marks_obtained: number | string;
  feedback: string;
  evaluation_type?: string;
  status?: string;
  confidence_score?: number;
  review_reason?: string;
  admin_notes?: string;
  strengths?: string[];
  improvements?: string[];
  student_answer_text?: string;
  pages_referred?: number[];
  criterion_scores?: Array<{
    criterion: string;
    max_marks: number;
    awarded_marks: number;
    comment?: string;
  }>;
}

export default function SubmissionEvaluationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string; attemptId: string }>();
  const examId = Number(params?.id);
  const attemptId = Number(params?.attemptId);

  // Active view tab on mobile/small screens: 'viewer' | 'evaluation' | 'ocr'
  const [mobileTab, setMobileTab] = useState<"viewer" | "evaluation" | "ocr">("evaluation");
  // Active right column tab on desktop: 'evaluation' | 'ocr'
  const [activeTab, setActiveTab] = useState<"evaluation" | "ocr">("evaluation");

  // PDF Viewer state
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Form State
  const [evaluatorFeedback, setEvaluatorFeedback] = useState<string>("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [questionScores, setQuestionScores] = useState<QuestionScoreItem[]>([]);
  const [selectedQuestionForViewer, setSelectedQuestionForViewer] = useState<number | null>(null);

  // Publish Modal State
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [editPublishedConfirmed, setEditPublishedConfirmed] = useState<boolean>(false);

  // Fetch submission details by attempt ID
  // Fetch submission details by attempt ID or submission ID
  const {
    data: submission,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "subjective-submission", attemptId],
    queryFn: async () => {
      try {
        return await adminExamApi.getSubjectiveSubmissionByAttempt(attemptId);
      } catch (err: any) {
        return await adminExamApi.getSubjectiveSubmission(attemptId);
      }
    },
    enabled: Number.isFinite(attemptId) && attemptId > 0,
  });

  // Populate local form state when submission loads
  useEffect(() => {
    if (!submission) return;
    setEvaluatorFeedback(submission.evaluator_feedback ?? "");
    setExtractedText(submission.extracted_text || submission.raw_ocr_text || "");

    if (submission.question_scores && submission.question_scores.length > 0) {
      setQuestionScores(
        submission.question_scores.map((qs, idx) => ({
          question_number: qs.question_number || idx + 1,
          question_id: qs.question_id,
          question_text: qs.question_text,
          marks_obtained: qs.marks_obtained,
          max_marks: qs.max_marks > 0 ? qs.max_marks : 10,
          feedback: qs.feedback || "",
          evaluation_type: qs.evaluation_type,
          status: qs.status,
          confidence_score: qs.confidence_score,
          review_reason: qs.review_reason,
          admin_notes: qs.admin_notes || "",
          strengths: qs.strengths || [],
          improvements: qs.improvements || [],
          student_answer_text: qs.student_answer_text,
          pages_referred: qs.pages_referred,
          criterion_scores: qs.criterion_scores,
        }))
      );
    } else {
      // Default to 3 clean questions if none exist yet
      setQuestionScores([
        { question_number: 1, marks_obtained: 0, max_marks: 10, feedback: "" },
        { question_number: 2, marks_obtained: 0, max_marks: 10, feedback: "" },
        { question_number: 3, marks_obtained: 0, max_marks: 10, feedback: "" },
      ]);
    }
  }, [submission]);

  // Load Answer Sheet PDF Blob for streaming preview
  useEffect(() => {
    if (!submission?.id || !submission.has_answer_pdf) return;
    let active = true;
    setLoadingPdf(true);
    adminExamApi
      .getAnswerSheetBlob(submission.id)
      .then((blob) => {
        if (!active) return;
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      })
      .catch(() => {
        if (active) toast.error("Could not load answer sheet PDF preview.");
      })
      .finally(() => {
        if (active) setLoadingPdf(false);
      });

    return () => {
      active = false;
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [submission?.id, submission?.has_answer_pdf]);

  // Real-time authoritative calculation helpers
  const totalMaxMarks = useMemo(() => {
    return questionScores.reduce((sum, q) => sum + (Number(q.max_marks) || 0), 0);
  }, [questionScores]);

  const totalObtainedMarks = useMemo(() => {
    return questionScores.reduce((sum, q) => sum + (Number(q.marks_obtained) || 0), 0);
  }, [questionScores]);

  const calculatedPercentage = useMemo(() => {
    if (totalMaxMarks <= 0) return "0.00";
    return ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2);
  }, [totalObtainedMarks, totalMaxMarks]);

  const passMarks = useMemo(() => {
    return totalMaxMarks * 0.4;
  }, [totalMaxMarks]);

  const isPassing = useMemo(() => {
    return totalMaxMarks > 0 && totalObtainedMarks >= passMarks;
  }, [totalObtainedMarks, passMarks, totalMaxMarks]);

  // Question validation check
  const getQuestionError = (q: QuestionScoreItem) => {
    if (q.max_marks === "" || Number(q.max_marks) <= 0) return "Maximum marks must be greater than 0";
    if (q.marks_obtained !== "" && Number(q.marks_obtained) < 0) return "Obtained marks cannot be negative";
    if (q.marks_obtained !== "" && q.max_marks !== "" && Number(q.marks_obtained) > Number(q.max_marks)) {
      return `Obtained marks (${q.marks_obtained}) cannot exceed maximum marks (${q.max_marks})`;
    }
    return null;
  };

  const validationErrors = useMemo(() => {
    const errors: { index: number; qNum: number; error: string }[] = [];
    if (questionScores.length === 0) {
      errors.push({ index: -1, qNum: 0, error: "Please add at least one question." });
    }
    questionScores.forEach((q, idx) => {
      const err = getQuestionError(q);
      if (err) {
        errors.push({ index: idx, qNum: q.question_number, error: err });
      }
    });
    return errors;
  }, [questionScores]);

  const hasErrors = validationErrors.length > 0;

  // Question List Management Handlers
  const handleAddQuestion = () => {
    const nextQNum = questionScores.length + 1;
    // Sensible default: 10 marks
    setQuestionScores((prev) => [
      ...prev,
      {
        question_number: nextQNum,
        max_marks: 10,
        marks_obtained: 0,
        feedback: "",
      },
    ]);
    toast.success(`Question #${nextQNum} added`);
  };

  const handleDeleteQuestion = (indexToDelete: number) => {
    if (questionScores.length <= 1) {
      toast.error("An exam must have at least one question.");
      return;
    }
    setQuestionScores((prev) => {
      const filtered = prev.filter((_, idx) => idx !== indexToDelete);
      // Renumber questions sequentially: 1, 2, 3...
      return filtered.map((item, idx) => ({
        ...item,
        question_number: idx + 1,
      }));
    });
    toast.success("Question removed and numbering updated.");
  };

  const handleUpdateQuestion = (
    index: number,
    field: keyof QuestionScoreItem,
    value: string | number
  ) => {
    setQuestionScores((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return { ...item, [field]: value };
      })
    );
  };

  // OCR Mutation
  const ocrMutation = useMutation({
    mutationFn: () => adminExamApi.runOcr(submission!.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "subjective-submission", attemptId], updated);
      setExtractedText(updated.extracted_text || updated.raw_ocr_text || "");
      toast.success("AI handwriting transcription completed!");
    },
    onError: (err: any) => {
      toast.error(err?.data?.error || err?.data?.detail || "OCR transcription failed.");
    },
  });

  // Update Transcription text mutation
  const updateTranscriptionMutation = useMutation({
    mutationFn: () => adminExamApi.updateTranscription(submission!.id, extractedText),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "subjective-submission", attemptId], updated);
      toast.success("Transcription saved.");
    },
    onError: () => toast.error("Failed to save transcription."),
  });

  // Evaluate / Save Draft Mutation
  const evaluateMutation = useMutation({
    mutationFn: async (editPublished: boolean = false) => {
      const payload: any = {
        evaluator_feedback: evaluatorFeedback,
        question_scores: questionScores.map((q, idx) => ({
          question_number: q.question_number || idx + 1,
          max_marks: Number(q.max_marks),
          marks_obtained: Number(q.marks_obtained),
          feedback: q.feedback,
          criterion_scores: q.criterion_scores,
          admin_notes: q.admin_notes,
        })),
      };
      if (submission?.is_published || editPublished) {
        payload.edit_published = true;
      }
      return await adminExamApi.evaluateSubmission(submission!.id, payload);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "subjective-submission", attemptId], updated);
      queryClient.invalidateQueries({ queryKey: ["admin", "exam", examId, "submissions"] });
      toast.success("Evaluation draft saved successfully.");
    },
    onError: (err: any) => {
      toast.error(err?.data?.detail || err?.data?.error || "Failed to save evaluation draft.");
    },
  });

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      // 1. Ensure latest evaluation draft is saved
      const payload: any = {
        evaluator_feedback: evaluatorFeedback,
        question_scores: questionScores.map((q, idx) => ({
          question_number: q.question_number || idx + 1,
          max_marks: Number(q.max_marks),
          marks_obtained: Number(q.marks_obtained),
          feedback: q.feedback,
          criterion_scores: q.criterion_scores,
          admin_notes: q.admin_notes,
        })),
        edit_published: true,
      };
      await adminExamApi.evaluateSubmission(submission!.id, payload);
      // 2. Publish to student
      return await adminExamApi.publishSubmission(submission!.id);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "subjective-submission", attemptId], updated);
      queryClient.invalidateQueries({ queryKey: ["admin", "exam", examId, "submissions"] });
      setShowPublishModal(false);
      toast.success("Result published to student! Candidate has been notified.");
    },
    onError: (err: any) => {
      toast.error(err?.data?.detail || err?.data?.error || "Failed to publish result.");
    },
  });

  // Auto-Mark Mutation
  const autoMarkMutation = useMutation({
    mutationFn: (force: boolean = false) => adminExamApi.autoMarkSubmission(submission!.id, { force }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "subjective-submission", attemptId], updated);
      queryClient.invalidateQueries({ queryKey: ["admin", "exam", examId, "submissions"] });
      toast.success("AI Subjective Auto-marking completed!");
    },
    onError: (err: any) => {
      toast.error(err?.data?.detail || err?.data?.error || "AI evaluation failed.");
    },
  });

  // Confirm Evaluation Mutation
  const confirmEvaluationMutation = useMutation({
    mutationFn: () =>
      adminExamApi.confirmEvaluation(submission!.id, {
        notes: evaluatorFeedback || "Admin reviewed and approved AI marks.",
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "subjective-submission", attemptId], updated);
      queryClient.invalidateQueries({ queryKey: ["admin", "exam", examId, "submissions"] });
      toast.success("Evaluation confirmed! Ready for publication.");
    },
    onError: (err: any) => {
      toast.error(err?.data?.detail || err?.data?.error || "Failed to confirm evaluation.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
        <p className="text-sm text-slate-500 font-medium">Loading candidate submission &amp; answer sheets...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Submission Not Found</h2>
        <p className="text-sm text-slate-500">
          The requested subjective examination attempt does not exist or has no uploaded answer sheet.
        </p>
        <Link
          href={`/admin-dashboard/exams/${examId}/submissions`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2545] text-white text-sm font-medium rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Submissions
        </Link>
      </div>
    );
  }

  const isPublished = submission.is_published;
  const isEvaluated = submission.status === "evaluated";

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin-dashboard/exams/${examId}/submissions`}
            className="p-2 rounded-lg text-slate-500 hover:text-[#0B2545] hover:bg-slate-100 transition-colors"
            title="Back to Exam Submissions"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-[#0B2545]">{submission.student_name}</h1>
              {isPublished ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Published
                </span>
              ) : submission.evaluation_status === "needs_review" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Needs Admin Review
                </span>
              ) : submission.evaluation_status === "ai_evaluated" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" /> AI Evaluated
                </span>
              ) : submission.evaluation_status === "admin_confirmed" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Admin Confirmed
                </span>
              ) : isEvaluated ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Award className="w-3.5 h-3.5" /> Evaluated (Draft)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" /> Awaiting Grading
                </span>
              )}
              {isPublished && submission.published_at && (
                <span className="text-xs text-slate-400">
                  · Published on {new Date(submission.published_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Candidate: <span className="font-medium text-slate-700">{submission.student_email || `@${submission.student_username}`}</span> · Exam: <span className="font-semibold text-slate-800">{submission.examination_title}</span> · Attempt #{submission.attempt_id} · Submitted {new Date(submission.submitted_at || submission.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => autoMarkMutation.mutate(true)}
            disabled={autoMarkMutation.isPending || !submission.has_answer_pdf}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {autoMarkMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {autoMarkMutation.isPending ? "Auto-Marking..." : "Auto-Mark with AI"}
          </button>

          {(submission.evaluation_status === "needs_review" || submission.evaluation_status === "ai_evaluated") && (
            <button
              type="button"
              onClick={() => confirmEvaluationMutation.mutate()}
              disabled={confirmEvaluationMutation.isPending}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {confirmEvaluationMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              Confirm Evaluation
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (hasErrors) {
                toast.error(validationErrors[0]?.error || "Please fix validation errors first.");
                return;
              }
              evaluateMutation.mutate(isPublished);
            }}
            disabled={evaluateMutation.isPending || publishMutation.isPending}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {evaluateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Marks Draft
          </button>

          {!isPublished ? (
            <button
              type="button"
              onClick={() => {
                if (hasErrors) {
                  toast.error(validationErrors[0]?.error || "Cannot publish: complete question marks first.");
                  return;
                }
                setShowPublishModal(true);
              }}
              disabled={evaluateMutation.isPending || publishMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> Publish to Student
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (hasErrors) {
                  toast.error(validationErrors[0]?.error || "Cannot update: complete question marks first.");
                  return;
                }
                setShowPublishModal(true);
              }}
              disabled={evaluateMutation.isPending || publishMutation.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Published Result
            </button>
          )}
        </div>
      </div>

      {/* Quality Gate Flag Banner */}
      {submission.evaluation_status === "needs_review" && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start justify-between gap-3 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Quality Gate: Routed to Admin Review
              </h4>
              <p className="text-xs text-amber-800">
                AI evaluation completed with quality flags (OCR readability, ambiguous mapping, or criteria check). Review the question answers and criteria marks below, then click Confirm Evaluation.
              </p>
              {submission.quality_gate_details?.flags && submission.quality_gate_details.flags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {submission.quality_gate_details.flags.map((flag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-medium border border-amber-200"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => confirmEvaluationMutation.mutate()}
            disabled={confirmEvaluationMutation.isPending}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm shrink-0"
          >
            {confirmEvaluationMutation.isPending ? "Confirming..." : "Approve & Confirm"}
          </button>
        </div>
      )}

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden flex rounded-lg bg-slate-200 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMobileTab("evaluation")}
          className={`flex-1 py-1.5 rounded-md transition-colors ${
            mobileTab === "evaluation" ? "bg-white text-[#0B2545] shadow-sm" : "text-slate-600"
          }`}
        >
          Marking &amp; Feedback
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("viewer")}
          className={`flex-1 py-1.5 rounded-md transition-colors ${
            mobileTab === "viewer" ? "bg-white text-[#0B2545] shadow-sm" : "text-slate-600"
          }`}
        >
          Answer PDF ({submission.page_count})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("ocr")}
          className={`flex-1 py-1.5 rounded-md transition-colors ${
            mobileTab === "ocr" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
          }`}
        >
          AI OCR
        </button>
      </div>

      {/* Main Workspace (Split-screen) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Answer Sheet PDF Viewer (7 cols) */}
        <div
          className={`lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[82vh] ${
            mobileTab !== "viewer" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* PDF Viewer Top Controls */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Answer Sheet ({submission.page_count} {submission.page_count === 1 ? "page" : "pages"})
              </span>
              {submission.file_size_bytes > 0 && (
                <span className="text-[11px] text-slate-400">
                  · {(submission.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-medium text-slate-600 w-10 text-center">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {pdfUrl && (
                <>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors ml-1"
                    title="Open PDF in new window"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={pdfUrl}
                    download={`answer-sheet-${submission.student_name}.pdf`}
                    className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                    title="Download Answer Sheet PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* PDF Frame */}
          <div className="flex-1 bg-slate-900/90 relative overflow-auto flex items-center justify-center p-2">
            {loadingPdf ? (
              <div className="flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
                <span className="text-xs text-slate-300 font-medium">Rendering answer sheet...</span>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={`${pdfUrl}#zoom=${zoomLevel}`}
                className="w-full h-full rounded border-0 bg-white"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
                title="Candidate Answer Sheet"
              />
            ) : (
              <div className="text-center text-slate-400 p-8 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-500" />
                <p className="text-sm font-medium">Answer Sheet Not Available</p>
                <p className="text-xs text-slate-500">The student has not uploaded a valid answer sheet yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scoring & OCR Transcription (5 cols) */}
        <div
          className={`lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[82vh] ${
            mobileTab === "viewer" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Tab Bar */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50 px-2 pt-2">
            <button
              onClick={() => {
                setActiveTab("evaluation");
                setMobileTab("evaluation");
              }}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 text-center flex items-center justify-center gap-1.5 transition-colors ${
                (activeTab === "evaluation" && mobileTab !== "ocr")
                  ? "border-[#0B2545] text-[#0B2545] bg-white rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Award className="w-4 h-4 text-[#D4A72C]" /> Marking &amp; Feedback
            </button>
            <button
              onClick={() => {
                setActiveTab("ocr");
                setMobileTab("ocr");
              }}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 text-center flex items-center justify-center gap-1.5 transition-colors ${
                (activeTab === "ocr" || mobileTab === "ocr")
                  ? "border-indigo-600 text-indigo-700 bg-white rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-500" /> AI OCR Transcription
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {activeTab === "evaluation" && mobileTab !== "ocr" ? (
              <div className="space-y-5">
                {/* Overall Score Summary Card */}
                <div className="bg-gradient-to-br from-[#0B2545] to-[#163E6B] rounded-xl p-4 text-white shadow-sm border border-[#1a4a7e]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-[#D4A72C] uppercase tracking-wider">
                        Authoritative Marks
                      </span>
                      <p className="text-xs text-white/70 mt-0.5">
                        {questionScores.length} {questionScores.length === 1 ? "question" : "questions"} evaluated
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1.5">
                        <span className="text-3xl font-extrabold text-white">{totalObtainedMarks}</span>
                        <span className="text-sm font-semibold text-white/60">/ {totalMaxMarks}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs font-medium">
                    <span className="text-white/80">
                      Percentage: <strong className="text-white text-sm">{calculatedPercentage}%</strong>
                    </span>
                    <span>
                      Status:{" "}
                      {isPassing ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          Passed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                          Failed (Need {passMarks} pts)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Validation Banner if errors exist */}
                {hasErrors && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Please resolve marking errors before publishing:
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-rose-700">
                      {validationErrors.map((err, i) => (
                        <li key={i}>{err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dynamic Question-Wise Marks Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Question-Wise Evaluation ({questionScores.length})
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Admin manages questions, maximum marks, and obtained marks dynamically.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Question
                    </button>
                  </div>

                  <div className="space-y-3">
                    {questionScores.map((q, idx) => {
                      const qError = getQuestionError(q);
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border transition-all ${
                            qError
                              ? "bg-rose-50/60 border-rose-300 ring-1 ring-rose-300"
                              : "bg-slate-50/80 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-6 h-6 rounded-full bg-[#0B2545] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                {q.question_number}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                Question #{q.question_number}
                              </span>
                              {q.evaluation_type && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-200 text-slate-700">
                                  {q.evaluation_type}
                                </span>
                              )}
                              {q.status === "needs_review" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold border border-amber-300">
                                  Review: {q.review_reason || "Check marks"}
                                </span>
                              )}
                              {q.status === "ai_evaluated" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-medium">
                                  AI Graded
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title={`Delete Question #${q.question_number}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {q.question_text && (
                            <p className="text-xs text-slate-600 mb-2 italic">
                              &ldquo;{q.question_text}&rdquo;
                            </p>
                          )}

                          {/* Extracted student answer preview */}
                          {q.student_answer_text && (
                            <div className="mb-2.5 p-2 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-900 mb-1">
                                <span>Student Answer Snippet:</span>
                                {q.pages_referred && q.pages_referred.length > 0 && (
                                  <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-mono">
                                    Pages {q.pages_referred.join(", ")}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-700 font-mono text-[11px] line-clamp-3 hover:line-clamp-none transition-all leading-relaxed whitespace-pre-wrap">
                                {q.student_answer_text}
                              </p>
                            </div>
                          )}

                          {/* Criterion breakdown table */}
                          {q.criterion_scores && q.criterion_scores.length > 0 && (
                            <div className="mb-2.5 p-2.5 bg-white border border-slate-200 rounded-lg space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                Criterion-Level Partial Marks
                              </span>
                              {q.criterion_scores.map((crit, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-slate-100 first:border-0 first:pt-0"
                                >
                                  <span className="text-slate-700 flex-1">{crit.criterion}</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <input
                                      type="number"
                                      step={0.5}
                                      min={0}
                                      max={crit.max_marks}
                                      value={crit.awarded_marks}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        const updatedCrits = [...(q.criterion_scores || [])];
                                        const oldCrit = updatedCrits[cIdx];
                                        if (oldCrit) {
                                          updatedCrits[cIdx] = {
                                            criterion: oldCrit.criterion,
                                            max_marks: oldCrit.max_marks,
                                            awarded_marks: val,
                                            comment: oldCrit.comment,
                                          };
                                        }
                                        const newTotal = updatedCrits.reduce(
                                          (sum, c) => sum + (Number(c.awarded_marks) || 0),
                                          0
                                        );
                                        setQuestionScores((prev) =>
                                          prev.map((item, i) =>
                                            i === idx
                                              ? { ...item, criterion_scores: updatedCrits, marks_obtained: newTotal }
                                              : item
                                          )
                                        );
                                      }}
                                      className="w-14 text-center p-1 bg-slate-50 border rounded text-xs font-bold"
                                    />
                                    <span className="text-slate-400 text-[11px]">/ {crit.max_marks}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Strengths & Improvements tags */}
                          {((q.strengths && q.strengths.length > 0) || (q.improvements && q.improvements.length > 0)) && (
                            <div className="mb-2.5 flex flex-wrap gap-1 text-[11px]">
                              {q.strengths?.map((str, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
                                >
                                  ✓ {str}
                                </span>
                              ))}
                              {q.improvements?.map((imp, iIdx) => (
                                <span
                                  key={iIdx}
                                  className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium"
                                >
                                  △ {imp}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 mb-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Maximum Marks
                              </label>
                              <input
                                type="number"
                                min={1}
                                step={1}
                                value={q.max_marks}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  handleUpdateQuestion(idx, "max_marks", e.target.value);
                                }}
                                onBlur={() => {
                                  if (q.max_marks === "" || Number(q.max_marks) <= 0) {
                                    handleUpdateQuestion(idx, "max_marks", 10);
                                  }
                                }}
                                className={`w-full p-2 bg-white border rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                                  q.max_marks === "" || Number(q.max_marks) <= 0
                                    ? "border-rose-400 focus:ring-rose-200 text-rose-700"
                                    : "border-slate-300 focus:ring-indigo-200"
                                }`}
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Obtained Marks
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={Number(q.max_marks) || 10}
                                  step={0.5}
                                  value={q.marks_obtained}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    handleUpdateQuestion(idx, "marks_obtained", e.target.value);
                                  }}
                                  onBlur={() => {
                                    if (q.marks_obtained === "") {
                                      handleUpdateQuestion(idx, "marks_obtained", 0);
                                    }
                                  }}
                                  className={`w-full p-2 bg-white border rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                                    (q.marks_obtained !== "" && q.max_marks !== "" && Number(q.marks_obtained) > Number(q.max_marks)) ||
                                    (q.marks_obtained !== "" && Number(q.marks_obtained) < 0)
                                      ? "border-rose-400 focus:ring-rose-200 text-rose-700 bg-rose-50"
                                      : "border-slate-300 focus:ring-indigo-200"
                                  }`}
                                />
                                <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                                  / {q.max_marks || 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          {qError && (
                            <p className="text-[11px] text-rose-600 font-semibold mb-2 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {qError}
                            </p>
                          )}

                          <div className="space-y-1.5">
                            <input
                              type="text"
                              placeholder={`Student feedback for Question #${q.question_number}...`}
                              value={q.feedback}
                              onChange={(e) => handleUpdateQuestion(idx, "feedback", e.target.value)}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2545]/20"
                            />
                            <input
                              type="text"
                              placeholder="Private internal examiner note (not visible to candidate)..."
                              value={q.admin_notes || ""}
                              onChange={(e) => handleUpdateQuestion(idx, "admin_notes", e.target.value)}
                              className="w-full text-[11px] p-1.5 bg-slate-100 border border-slate-200 rounded text-slate-700 placeholder:text-slate-400 italic"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="w-full py-2.5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Another Question
                  </button>
                </div>

                {/* Overall Examiner Feedback */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    Overall Examiner Qualitative Feedback
                  </label>
                  <textarea
                    rows={4}
                    value={evaluatorFeedback}
                    onChange={(e) => setEvaluatorFeedback(e.target.value)}
                    placeholder="Provide constructive feedback, presentation remarks, or corrections for the student..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 text-slate-900 placeholder:text-slate-400 resize-y leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This overall feedback is saved with the evaluation and shown on the student's result portal after publication.
                  </p>
                </div>

                {/* Audit Trail Section */}
                {submission.audit_trail && submission.audit_trail.length > 0 && (
                  <div className="pt-3 border-t border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> Evaluation Audit Trail
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {submission.audit_trail.map((entry: any, aIdx: number) => (
                        <div
                          key={aIdx}
                          className="p-2 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold capitalize text-slate-800">
                              {entry.action.replace(/_/g, " ")}
                            </span>
                            {entry.by && <span className="text-slate-500 ml-1.5 font-medium">by {entry.by}</span>}
                            {entry.notes && (
                              <p className="text-[11px] text-slate-600 italic mt-0.5 truncate max-w-sm">
                                &ldquo;{entry.notes}&rdquo;
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {new Date(entry.at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* OCR Handwriting Transcription Tab */
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Multimodal Handwriting OCR
                    </h4>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      Extracts Nepali &amp; English handwritten script to assist evaluation. Final marks remain strictly admin-controlled.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => ocrMutation.mutate()}
                    disabled={ocrMutation.isPending || !submission.has_answer_pdf}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {ocrMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Transcribing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> Run AI OCR
                      </>
                    )}
                  </button>
                </div>

                {submission.ocr_status === "completed" && (
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Transcription Available
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(extractedText);
                        toast.success("Transcription copied to clipboard");
                      }}
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      Copy All Text
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Verified Transcription (Editable)</span>
                    <span className="text-[11px] text-slate-400 lowercase font-normal">
                      Correct any misrecognized words
                    </span>
                  </label>
                  <textarea
                    rows={15}
                    value={extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    placeholder="Click 'Run AI OCR' above to extract handwriting into text, or type notes here..."
                    className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder:text-slate-400 resize-y leading-relaxed"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => updateTranscriptionMutation.mutate()}
                    disabled={updateTranscriptionMutation.isPending}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {updateTranscriptionMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save Corrected Text
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result Publishing Confirmation Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isPublished ? "Update Published Result?" : "Publish Result to Candidate?"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Once published, the student will be immediately notified and able to view their final score, question-wise breakdown, and examiner feedback.
                </p>
              </div>

              {/* Summary details table */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2.5">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Candidate:</span>
                  <span className="font-bold text-slate-900">{submission.student_name}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Examination:</span>
                  <span className="font-medium text-slate-800 text-right max-w-[200px] truncate">
                    {submission.examination_title}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Questions Evaluated:</span>
                  <span className="font-semibold text-slate-900">{questionScores.length}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-700">Final Score:</span>
                  <span className="text-base font-extrabold text-[#0B2545]">
                    {totalObtainedMarks} / {totalMaxMarks} ({calculatedPercentage}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">Official Result:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                      isPassing ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {isPassing ? "Passed" : "Failed"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  disabled={publishMutation.isPending}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {publishMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Confirm &amp; Publish Result
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

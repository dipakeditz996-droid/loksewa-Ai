'use client';

import React, { useState } from 'react';
import { X, Flag, AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import {
  CreateReportPayload,
  IssueType,
  ISSUE_TYPE_LABELS,
  studentReportsApi,
} from '@/lib/api/question-reports';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ReportQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: number;
  questionText: string;
  /** Optional context — filled automatically from the exam/practice session. */
  context?: {
    examinationAttemptId?: number;
    practiceSessionId?: number;
    questionAttemptId?: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ISSUE_TYPES = Object.entries(ISSUE_TYPE_LABELS) as [IssueType, string][];

export function ReportQuestionModal({
  isOpen,
  onClose,
  questionId,
  questionText,
  context,
}: ReportQuestionModalProps) {
  const [issueType, setIssueType] = useState<IssueType | ''>('');
  const [description, setDescription] = useState('');
  const [suggestedCorrection, setSuggestedCorrection] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setIssueType('');
    setDescription('');
    setSuggestedCorrection('');
    setEvidenceFile(null);
    setSubmitting(false);
    setSubmitted(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueType) { toast.error('Please select an issue type.'); return; }
    if (description.trim().length < 10) {
      toast.error('Please describe the issue in at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateReportPayload = {
        question: questionId,
        issue_type: issueType,
        description: description.trim(),
        suggested_correction: suggestedCorrection.trim() || undefined,
        evidence_file: evidenceFile ?? undefined,
        examination_attempt_id: context?.examinationAttemptId ?? undefined,
        practice_session_id: context?.practiceSessionId ?? undefined,
        question_attempt_id: context?.questionAttemptId ?? undefined,
      };
      await studentReportsApi.create(payload);
      setSubmitted(true);
    } catch (err: any) {
      const detail =
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.detail ||
        'Failed to submit report. Please try again.';
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="relative w-full max-w-lg bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-red-600/10 to-orange-600/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Flag className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h2 id="report-modal-title" className="text-white font-semibold text-sm">
                  Report a Problem
                </h2>
                <p className="text-white/40 text-xs">Help us improve the question bank</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {submitted ? (
            /* Success state */
            <div className="flex flex-col items-center justify-center gap-4 px-8 py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base mb-1">Report Submitted</h3>
                <p className="text-white/50 text-sm">
                  Thank you for helping us improve. Our team will review your report shortly.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm font-medium border border-green-500/30 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
                {/* Question snippet */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/8">
                  <p className="text-white/40 text-[10px] uppercase tracking-wide font-medium mb-1">
                    Question
                  </p>
                  <p className="text-white/70 text-sm line-clamp-3">{questionText}</p>
                </div>

                {/* Issue type */}
                <div>
                  <label className="block text-white/70 text-xs font-medium mb-2">
                    What is the problem? <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ISSUE_TYPES.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setIssueType(value)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                          issueType === value
                            ? 'bg-red-500/20 border-red-500/50 text-red-300'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/8 hover:text-white/80'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="report-description" className="block text-white/70 text-xs font-medium mb-1.5">
                    Describe the issue <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="report-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain what is wrong with the question or answer..."
                    rows={3}
                    maxLength={2000}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/80 placeholder-white/30 text-sm resize-none focus:outline-none focus:border-red-500/50 focus:bg-white/8 transition-colors"
                  />
                  <p className="text-white/30 text-[10px] mt-1 text-right">{description.length}/2000</p>
                </div>

                {/* Suggested correction */}
                <div>
                  <label htmlFor="report-suggestion" className="block text-white/70 text-xs font-medium mb-1.5">
                    Suggested correction <span className="text-white/30 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="report-suggestion"
                    value={suggestedCorrection}
                    onChange={(e) => setSuggestedCorrection(e.target.value)}
                    placeholder="What should the correct answer/explanation be?"
                    rows={2}
                    maxLength={1000}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/80 placeholder-white/30 text-sm resize-none focus:outline-none focus:border-red-500/50 focus:bg-white/8 transition-colors"
                  />
                </div>

                {/* Evidence file */}
                <div>
                  <label className="block text-white/70 text-xs font-medium mb-1.5">
                    Evidence screenshot <span className="text-white/30 font-normal">(optional, max 10 MB)</span>
                  </label>
                  <label
                    htmlFor="report-evidence"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl border border-dashed border-white/15 bg-white/3 hover:bg-white/6 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 text-white/40 shrink-0" />
                    <span className="text-white/50 text-xs truncate">
                      {evidenceFile ? evidenceFile.name : 'Upload image or PDF'}
                    </span>
                  </label>
                  <input
                    id="report-evidence"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    className="sr-only"
                    onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                {/* Notice */}
                <div className="flex gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-amber-300/80 text-xs leading-relaxed">
                    Your report is reviewed by our admin team. Questions are only changed after expert verification — reports are not applied automatically.
                  </p>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/8">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-white/60 hover:text-white/80 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !issueType || description.trim().length < 10}
                  className="px-5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…</>
                  ) : (
                    <><Flag className="w-3.5 h-3.5" /> Submit Report</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

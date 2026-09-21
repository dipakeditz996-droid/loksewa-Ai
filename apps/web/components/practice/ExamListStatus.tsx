"use client";

import { AlertCircle } from "lucide-react";

export const EXAMS_LOAD_FAILED_MESSAGE = "No exams could be loaded. Please try again.";
export const NO_EXAMS_MESSAGE = "No exams are available for your enrolled course yet.";

/**
 * What to show in place of the Exam dropdown's data when there is none:
 * a load failure (with Retry) or a genuinely empty authorised list. Never a
 * fallback list of other exams.
 */
export function ExamListStatus({
  isError,
  isEmpty,
  onRetry,
}: {
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
}) {
  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 font-medium" role="alert">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{EXAMS_LOAD_FAILED_MESSAGE}</span>
        <button type="button" className="underline font-bold" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <p className="text-sm text-muted-foreground font-medium" role="status">
        {NO_EXAMS_MESSAGE}
      </p>
    );
  }
  return null;
}

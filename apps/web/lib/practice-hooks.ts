"use client";

import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { syllabusApi } from "@/lib/api/syllabus";
import { practiceApi, SavedQuestion } from "@/lib/api/practice";
import { notify } from "@/lib/notify";
import { practiceErrorMessage } from "@/lib/practice-errors";

// The syllabus tree and the saved-questions list are the same for every
// Practice screen, so they go through the app's existing React Query cache:
// Dashboard -> Practice -> Dashboard -> Practice shows the cached copy at
// once and revalidates it, instead of refetching from scratch each visit.
// Scoped to the signed-in student: the list is the exams THEIR purchase covers,
// so it must never be served from another account's cache entry.
export const practiceExamsKey = (userId: number | string | undefined) => ["practice-exams", userId] as const;
export const SAVED_QUESTIONS_KEY = ["saved-questions"] as const;
export const REVISION_SUMMARY_KEY = ["revision-summary"] as const;
export const practiceResultKey = (sessionId: number) => ["practice-result", sessionId] as const;

// The server returns only the exams this student is authorised to practise;
// nothing is fetched globally and filtered here. On failure there is no
// fallback list - callers show an error with Retry.
export function usePracticeExams() {
  const { user } = useAuth();
  return useQuery({
    queryKey: practiceExamsKey(user?.id),
    queryFn: () => syllabusApi.getExams(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// One shared query, so two components asking for the revision counts (or a
// StrictMode double-mount) produce a single request.
export function useRevisionSummary() {
  return useQuery({
    queryKey: REVISION_SUMMARY_KEY,
    queryFn: () => practiceApi.getRevisionSummary(),
    staleTime: 30 * 1000,
  });
}

export function useSavedQuestions() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SAVED_QUESTIONS_KEY,
    queryFn: () => practiceApi.listSavedQuestions(),
    staleTime: 60 * 1000,
  });

  const savedIds: Record<number, boolean> = {};
  (query.data ?? []).forEach((s: SavedQuestion) => {
    savedIds[s.question] = true;
  });

  // Optimistic toggle: flip the star immediately, put it back (and say why)
  // if the server refused.
  const toggle = useCallback(
    async (questionId: number) => {
      const previous = queryClient.getQueryData<SavedQuestion[]>(SAVED_QUESTIONS_KEY) ?? [];
      const wasSaved = previous.some((s) => s.question === questionId);
      queryClient.setQueryData<SavedQuestion[]>(
        SAVED_QUESTIONS_KEY,
        wasSaved
          ? previous.filter((s) => s.question !== questionId)
          : [...previous, { id: -questionId, question: questionId } as SavedQuestion]
      );
      try {
        await practiceApi.toggleBookmark(questionId);
      } catch (e) {
        queryClient.setQueryData(SAVED_QUESTIONS_KEY, previous);
        notify.error(practiceErrorMessage(e, "save"));
      }
    },
    [queryClient]
  );

  return { savedIds, toggle, isLoading: query.isLoading };
}

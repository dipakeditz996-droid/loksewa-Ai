"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";
import { studyPlanPageApi, PlanPreferences } from "@/lib/api/study-plan-page";

// Every Study Plan query is keyed by the signed-in student AND the preparation
// (exam) being planned, so one student's - or one course's - data can never be
// served for another. Returning to the page shows the cached copy at once and
// revalidates it in the background.
const key = (section: string, userId: unknown, exam: number | null) =>
  ["study-plan", section, userId, exam ?? "default"] as const;

const storageKey = (userId: unknown) => `loksewa.studyPlan.exam.${String(userId)}`;

function readStoredExam(userId: unknown): number | null {
  if (userId === undefined || userId === null) return null;
  try {
    const stored = Number(localStorage.getItem(storageKey(userId)));
    return stored > 0 ? stored : null;
  } catch {
    return null;
  }
}

/** The preparation the student picked (a per-viewer convenience, remembered in
 *  localStorage). null = let the server choose its default.
 *
 *  It is read synchronously as soon as the student is known, so the section
 *  queries start once with the right preparation. (Reading it in an effect made
 *  every query run twice - first for the default, then again for the stored
 *  choice - doubling the requests on a cold load.) */
export function useSelectedPreparation() {
  const { user } = useAuth();
  const userId = user?.id;
  const [chosen, setChosen] = useState<{ userId: unknown; exam: number | null } | null>(null);
  const exam = chosen && chosen.userId === userId ? chosen.exam : readStoredExam(userId);

  const choose = useCallback(
    (id: number | null) => {
      setChosen({ userId, exam: id });
      try {
        if (userId !== undefined && userId !== null) {
          if (id) localStorage.setItem(storageKey(userId), String(id));
          else localStorage.removeItem(storageKey(userId));
        }
      } catch {
        // storage unavailable - the choice just isn't remembered
      }
    },
    [userId]
  );
  return { exam, choose };
}

type Section = "preparations" | "plan" | "progress" | "week";

/** One Study Plan section query. Keyed by student + preparation, so nothing is
 *  ever served across students or courses.
 *
 *  When the student has not chosen a preparation yet the query asks the server
 *  for its default ("default" key). Once the answer says which preparation that
 *  was, the same data is also filed under that preparation's own key, so
 *  choosing it later (or switching back to it) is an instant cache hit instead
 *  of a second fetch of what is already on screen. */
function useSectionQuery<T>(
  section: Section,
  exam: number | null,
  fetcher: (exam: number | null) => Promise<T>,
  idOf: (data: T) => number | null | undefined,
  options: { staleTime: number; revalidateOnVisit: boolean }
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const query = useQuery({
    queryKey: key(section, userId, exam),
    queryFn: () => fetcher(exam),
    enabled: !!user,
    staleTime: options.staleTime,
    refetchOnMount: options.revalidateOnVisit ? "always" : true, // cached copy shows at once; "always" also refreshes it
    retry: false,
    // Keep the previous preparation's answer on screen only for the SAME student
    // (never across an identity change) while a switch loads.
    placeholderData: section === "preparations"
      ? (previous, previousQuery) => (previousQuery?.queryKey[2] === userId ? previous : undefined)
      : undefined,
  });

  const { data, dataUpdatedAt } = query;
  useEffect(() => {
    if (exam !== null || !data || userId === undefined || userId === null) return;
    const id = idOf(data);
    if (!id) return;
    const explicit = key(section, userId, id);
    if (!queryClient.getQueryData(explicit)) queryClient.setQueryData(explicit, data, { updatedAt: dataUpdatedAt });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dataUpdatedAt, exam, userId]);

  return query;
}

export function useStudyPreparations(exam: number | null) {
  return useSectionQuery("preparations", exam, (e) => studyPlanPageApi.preparations(e), (d) => d.selected,
    { staleTime: 2 * 60 * 1000, revalidateOnVisit: false });
}

export function useStudyPlan(exam: number | null) {
  return useSectionQuery("plan", exam, (e) => studyPlanPageApi.plan(e), (d) => d.exam?.id,
    { staleTime: 30 * 1000, revalidateOnVisit: true });
}

export function useStudyProgress(exam: number | null) {
  return useSectionQuery("progress", exam, (e) => studyPlanPageApi.progress(e), (d) => d.exam?.id,
    { staleTime: 60 * 1000, revalidateOnVisit: true });
}

export function useStudyWeek(exam: number | null) {
  return useSectionQuery("week", exam, (e) => studyPlanPageApi.week(e), (d) => d.exam?.id,
    { staleTime: 60 * 1000, revalidateOnVisit: true });
}

export function useSavePreferences(exam: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: Partial<Pick<PlanPreferences, "daily_minutes" | "daily_questions" | "study_days">>) =>
      studyPlanPageApi.savePreferences(prefs, exam),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study-plan"] }),
  });
}

/** A stored preparation the student no longer owns is refused (403) by the
 *  server; the page recovers by falling back to the server's default. */
export function isPreparationDenied(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && /preparation/i.test(error.message);
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { adminStudyPlanMonitorApi as api, StudentsParams } from "@/lib/api/admin-study-plan-monitor";

// Every query is keyed by the signed-in admin AND the exact filters, so cached
// student data is never shared between accounts or between different filters.
// Returning to the page shows the cached copy at once and revalidates it in
// the background (the query client purges everything when the identity changes).
const key = (section: string, adminId: unknown, ...rest: unknown[]) => ["admin-study-plan", section, adminId, ...rest] as const;

function useAdminQuery<T>(section: string, params: unknown[], fn: () => Promise<T>, options: { staleTime: number; keepPrevious?: boolean; enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: key(section, user?.id, ...params),
    queryFn: fn,
    enabled: !!user && (options.enabled ?? true),
    staleTime: options.staleTime,
    refetchOnMount: "always",
    retry: false,
    // Paging or filtering keeps the previous rows on screen (same admin only) while the next ones load.
    placeholderData: options.keepPrevious
      ? (previous, previousQuery) => (previousQuery?.queryKey[2] === user?.id ? previous : undefined)
      : undefined,
  });
}

export const useAdminPreparations = () =>
  useAdminQuery("preparations", [], () => api.preparations(), { staleTime: 5 * 60 * 1000 });

export const useAdminOverview = (exam: number | null) =>
  useAdminQuery("overview", [exam], () => api.overview(exam), { staleTime: 60 * 1000, keepPrevious: true });

export const useAdminStudents = (params: StudentsParams) =>
  useAdminQuery("students", [params], () => api.students(params), { staleTime: 60 * 1000, keepPrevious: true });

export const useAdminTopics = (exam: number | null) =>
  useAdminQuery("topics", [exam], () => api.topics(exam as number), { staleTime: 2 * 60 * 1000, enabled: exam !== null });

export const useAdminStudent = (id: number, exam: number | null) =>
  useAdminQuery("student", [id, exam], () => api.student(id, exam), { staleTime: 60 * 1000, keepPrevious: true });

export const useAdminStudentPlan = (id: number, exam: number | null) =>
  useAdminQuery("student-plan", [id, exam], () => api.plan(id, exam), { staleTime: 30 * 1000 });

export const useAdminStudentProgress = (id: number, exam: number | null) =>
  useAdminQuery("student-progress", [id, exam], () => api.progress(id, exam), { staleTime: 60 * 1000 });

export const useAdminStudentWeek = (id: number, exam: number | null) =>
  useAdminQuery("student-week", [id, exam], () => api.week(id, exam), { staleTime: 60 * 1000 });


"use client";

import React, { createContext, useContext, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AuthorizedCourse {
  id: number;
  title: string;
  short_description: string;
  slug: string;
  exam_id: number | null;
  exam_name: string | null;
  category_name: string | null;
  level_name: string | null;
  thumbnail: string | null;
}

export interface SubscriptionStatus {
  enforcementEnabled: boolean;
  hasActivePackage: boolean;
  isAdminGranted: boolean;
  planName: string | null;
  status: string | null;
  expiryDate: string | null;
  remainingDays: number | null;
  latestPayment?: {
    status: string;
    rejectionReason: string | null;
    planName: string;
    amount: string;
    submittedAt: string | null;
  } | null;
}

export interface StudentContextResponse {
  active_course: AuthorizedCourse | null;
  authorized_courses: AuthorizedCourse[];
  subscription: SubscriptionStatus | null;
  exam_schedule: any | null;
  schedule_message: string | null;
}

interface StudentContextValue {
  activeCourse: AuthorizedCourse | null;
  authorizedCourses: AuthorizedCourse[];
  subscription: SubscriptionStatus | null;
  examSchedule: any | null;
  scheduleMessage: string | null;
  isLoading: boolean;
  isFetching: boolean;
  isSwitching: boolean;
  selectCourse: (courseId: number) => Promise<void>;
  isCourseAuthorized: (courseId: number) => boolean;
  refetchContext: () => Promise<any>;
}

const LOCAL_STORAGE_ACTIVE_COURSE = "loksewa_student_active_course";

export function getStoredActiveCourse(userId?: number | string | null): AuthorizedCourse | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(`loksewa_student_active_course_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredActiveCourse(userId: number | string | null | undefined, course: AuthorizedCourse | null) {
  if (typeof window === "undefined" || !userId) return;
  try {
    if (course) {
      localStorage.setItem(`loksewa_student_active_course_${userId}`, JSON.stringify(course));
    } else {
      localStorage.removeItem(`loksewa_student_active_course_${userId}`);
    }
  } catch {}
}

const StudentContext = createContext<StudentContextValue | undefined>(undefined);

export function StudentContextProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const isStudent = user?.role === "student";
  const storedCourse = useMemo(() => getStoredActiveCourse(user?.id), [user?.id]);

  const {
    data,
    isLoading,
    isFetching,
    refetch: refetchContext,
  } = useQuery<StudentContextResponse>({
    queryKey: ["student-context"],
    queryFn: () => apiClient<StudentContextResponse>("/student/context/"),
    enabled: !!user && isStudent,
    staleTime: 60 * 1000,
  });

  const selectCourseMutation = useMutation({
    mutationFn: (courseId: number) =>
      apiClient<StudentContextResponse>("/student/context/select-course/", {
        method: "POST",
        body: JSON.stringify({ course_id: courseId }),
      }),
    onSuccess: (updatedContext) => {
      queryClient.setQueryData(["student-context"], updatedContext);
      if (updatedContext.active_course) {
        setStoredActiveCourse(user?.id, updatedContext.active_course);
      }
      // Invalidate all course-dependent queries so they immediately refresh in new context
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
      queryClient.invalidateQueries({ queryKey: ["syllabus-notes-portal"] });
      queryClient.invalidateQueries({ queryKey: ["student-exam-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["student-examinations"] });
      queryClient.invalidateQueries({ queryKey: ["student-exams"] });
      queryClient.invalidateQueries({ queryKey: ["practice-exams"] });
      queryClient.invalidateQueries({ queryKey: ["saved-questions"] });
      queryClient.invalidateQueries({ queryKey: ["revision-summary"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-mock-exam"] });
      queryClient.invalidateQueries({ queryKey: ["study-plan"] });

      if (updatedContext.active_course) {
        toast.success(`Active course switched to ${updatedContext.active_course.title}`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.detail || err?.message || "Failed to switch active course.");
    },
  });

  const activeCourse = data?.active_course ?? storedCourse ?? null;
  const authorizedCourses = data?.authorized_courses || (storedCourse ? [storedCourse] : []);
  const subscription = data?.subscription || null;
  const examSchedule = data?.exam_schedule || null;
  const scheduleMessage = data?.schedule_message || null;

  useEffect(() => {
    if (data?.active_course) {
      setStoredActiveCourse(user?.id, data.active_course);
    }
  }, [data?.active_course, user?.id]);

  const isCourseAuthorized = useMemo(() => {
    const ids = new Set(authorizedCourses.map((c) => c.id));
    return (courseId: number) => ids.has(courseId);
  }, [authorizedCourses]);

  const selectCourse = async (courseId: number) => {
    if (activeCourse?.id === courseId) return;
    await selectCourseMutation.mutateAsync(courseId);
  };

  // If we already have stored active course, we are not blocking dashboard rendering
  const isInitializing = authLoading || (isStudent && isLoading && !data && !storedCourse);

  const value: StudentContextValue = {
    activeCourse,
    authorizedCourses,
    subscription,
    examSchedule,
    scheduleMessage,
    isLoading: isStudent ? isInitializing : false,
    isFetching: isStudent ? isFetching : false,
    isSwitching: selectCourseMutation.isPending,
    selectCourse,
    isCourseAuthorized,
    refetchContext,
  };

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudentContext() {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error("useStudentContext must be used within a StudentContextProvider");
  }
  return context;
}

export function useOptionalStudentContext() {
  return useContext(StudentContext) ?? null;
}


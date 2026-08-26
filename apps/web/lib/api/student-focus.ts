import { apiClient } from "./client";

export interface FocusModePreference {
  focus_mode_enabled: boolean;
}

/**
 * The student's persistent Focus Mode preference.
 *
 * Backed by the existing canonical preference model (support.StudentProfile),
 * scoped to the authenticated user, defaulting to OFF.
 */
export const studentFocusApi = {
  getPreference: () =>
    apiClient<FocusModePreference>("/student/preferences/focus-mode/", {
      skipRedirect: true,
    }),

  updatePreference: (enabled: boolean) =>
    apiClient<FocusModePreference>("/student/preferences/focus-mode/", {
      method: "PATCH",
      body: JSON.stringify({ focus_mode_enabled: enabled }),
      skipRedirect: true,
    }),
};

/**
 * Exam-attempt probes used by FocusModeContext to decide whether the
 * temporary exam focus state should be on.
 *
 * These deliberately let errors propagate: the caller distinguishes "no
 * active attempt" from "couldn't ask", and must not drop a student out of the
 * exam environment because of a network blip or an endpoint that isn't
 * deployed yet.
 */
export interface ActiveAttemptSummary {
  id: number;
  examination: number;
  status: string;
  is_active?: boolean;
}

export interface AttemptStateSummary {
  id: number;
  status: string;
  is_active: boolean;
  is_expired: boolean;
  remaining_seconds: number | null;
  server_time: string;
}

export const examFocusApi = {
  activeAttempts: () =>
    apiClient<ActiveAttemptSummary[]>("/student/exam-attempts/active/", {
      skipRedirect: true,
    }),

  attemptState: (attemptId: number) =>
    apiClient<AttemptStateSummary>(`/student/exam-attempts/${attemptId}/state/`, {
      skipRedirect: true,
    }),
};

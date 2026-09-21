import { apiClient } from "./client";
import type { Countdown, Pace, PlanResponse, ProgressResponse, WeekResponse } from "./study-plan-page";

// Admin Study Plan monitoring. Every value is computed by the backend from the
// platform's real records (see apps/api/study_plan/admin_analytics.py); nothing
// is derived from a page of results in the browser.

export type PlanStatus = "on_track" | "slightly_behind" | "needs_attention" | "inactive" | "no_schedule";
export type ActivityState = "active_recently" | "low_activity" | "no_recent_activity";

export interface AttentionFlag {
  code: "inactive" | "behind_pace" | "low_accuracy" | "overdue_revision" | "failed_exams";
  label: string;
  action: string;
}

export interface StudentRef {
  id: number;
  name: string;
  username: string;
  email: string;
  joined: string | null;
}

export interface SubjectiveFigures {
  submitted: number;
  awaiting_evaluation: number;
  evaluated: number;
  average: number | null;
}

export interface StudentExams {
  objective: { attempts: number; passed: number; failed: number; average: number | null };
  subjective: SubjectiveFigures;
  subjective_sets: SubjectiveFigures;
}

export interface StudentRow {
  student: StudentRef;
  exam_id: number;
  preparation: string | null;
  course: string;
  enrolled_at: string;
  progress: number | null;
  topics_with_content: number;
  topics_started: number;
  attempts: number;
  correct: number;
  accuracy: number | null;
  today_questions: number;
  daily_target: number;
  study_day_today: boolean;
  target_met: boolean;
  tasks: { completed: number; total: number; percent: number | null } | null;
  revision: { due_today: number; reviewed_today: number; remaining: number; overdue: number; total: number };
  exams: StudentExams;
  practice_sessions: number;
  practice_sessions_completed: number;
  last_activity: string | null;
  idle_days: number | null;
  activity: ActivityState;
  streak: number;
  pace: Pace;
  countdown: Countdown | null;
  flags: AttentionFlag[];
  status: PlanStatus;
  status_label: string;
}

export interface StudentsResponse {
  results: StudentRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface StudentsParams {
  exam?: number | null;
  status?: string;
  activity?: string;
  progress?: string;
  search?: string;
  active_from?: string;
  active_to?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface ScheduleGroup {
  exam_id: number;
  name: string;
  students: number;
  without_schedule: number;
  countdown: Countdown | null;
}

export interface Overview {
  students: number;
  exam: number | null;
  status: { counts: Record<PlanStatus, number>; labels: Record<PlanStatus, string>; order: PlanStatus[] };
  activity: { active_recently: number; low_activity: number; no_recent_activity: number };
  average_progress: number | null;
  students_with_progress: number;
  accuracy: { percent: number | null; attempts: number; students: number };
  daily_target: { met: number; eligible: number; percent: number | null };
  practice: {
    active_today: number;
    questions_today: number;
    answers: number;
    correct: number;
    sessions: number;
    sessions_completed: number;
    students_with_practice: number;
  };
  revision: {
    due_today: number;
    completed: number;
    remaining: number;
    overdue: number;
    percent: number | null;
    students_with_revision: number;
  };
  tasks: { completed: number; total: number; percent: number | null; students_with_tasks: number; students_all_done: number };
  exams: {
    objective: { attempts: number; average: number | null; passed: number; failed: number; students: number };
    subjective: SubjectiveFigures;
    subjective_sets: { submitted: number; awaiting_evaluation: number; evaluated: number };
  };
  flagged: number;
  schedules: ScheduleGroup[];
  rules: Rules;
}

export interface Rules {
  status: string[];
  pace: string;
  warnings: string[];
  activity: string;
  topic: string;
  daily_target: string;
  revision: string;
  recommendations: string[];
  recommendation_events: string;
  recommendation_events_detail: string;
  weak_topic: string;
  tasks: string;
  exams: string;
  task_types: string[];
  defaults: { daily_minutes: number; daily_questions: number; max_tasks_per_day: number; study_days: string[] };
}

export interface PreparationOption {
  id: number;
  name: string;
  display_name: string;
  students: number;
  courses: string[];
}

export type TopicClass = "strong" | "moderate" | "weak" | "rarely_studied" | "no_content";

export interface TopicFigures {
  attempts: number;
  accuracy: number | null;
  insufficient_data: boolean;
  average_completion: number | null;
}

export interface TopicRow extends TopicFigures {
  id: number;
  name: string;
  students_attempted: number;
  students_started: number;
  available_questions: number;
  class: TopicClass;
}

export interface TopicChapter extends TopicFigures {
  id: number;
  title: string;
  topics: TopicRow[];
}

export interface TopicSubject extends TopicFigures {
  id: number;
  name: string;
  chapters: TopicChapter[];
}

export interface SubjectScore {
  id: number;
  name: string;
  accuracy: number;
  attempts: number;
}

export interface TopicsResponse {
  students: number;
  subjects: TopicSubject[];
  strong: SubjectScore[];
  needs_improvement: SubjectScore[];
  rule: string;
}

export interface StudentDetail {
  student: StudentRef;
  selected: number;
  preparations: { id: number; display_name: string; course: string; status: PlanStatus; status_label: string }[];
  detail: StudentRow & {
    recent_exams: {
      id: number;
      title: string;
      submitted_at: string | null;
      kind: "objective" | "subjective";
      state: "scored" | "awaiting_evaluation" | "evaluated";
      percentage: number | null;
      passed: boolean | null;
    }[];
  };
  rules: { warnings: string[]; weak_topic: string };
}

const qs = (params: Record<string, unknown>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "all") p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const adminStudyPlanMonitorApi = {
  preparations: () => apiClient<{ preparations: PreparationOption[]; students: number }>(`/admin/study-plan/preparations/`),
  overview: (exam?: number | null) => apiClient<Overview>(`/admin/study-plan/overview/${qs({ exam })}`),
  students: (params: StudentsParams) => apiClient<StudentsResponse>(`/admin/study-plan/students/${qs({ ...params })}`),
  topics: (exam: number) => apiClient<TopicsResponse>(`/admin/study-plan/topics/${qs({ exam })}`),
  student: (id: number, exam?: number | null) => apiClient<StudentDetail>(`/admin/study-plan/students/${id}/${qs({ exam })}`),
  plan: (id: number, exam?: number | null) => apiClient<PlanResponse>(`/admin/study-plan/students/${id}/plan/${qs({ exam })}`),
  progress: (id: number, exam?: number | null) =>
    apiClient<ProgressResponse>(`/admin/study-plan/students/${id}/progress/${qs({ exam })}`),
  week: (id: number, exam?: number | null) => apiClient<WeekResponse>(`/admin/study-plan/students/${id}/week/${qs({ exam })}`),
};

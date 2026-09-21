import { apiClient } from "./client";

// The Study Plan page. Every value below is computed by the backend from the
// student's own records (syllabus, practice, exams, notes, revision, admin exam
// schedule, gamification) - nothing here is stored or invented client-side.

export interface PlanExamRef {
  id: number;
  name: string;
  display_name: string;
}

export interface PlanPreferences {
  configured: boolean;
  daily_minutes: number;
  daily_questions: number;
  study_days: string[];
  target_date: string | null;
}

export interface PreparationChoice {
  id: number;
  display_name: string;
  course: { id: number; title: string } | null;
  enrolled: boolean;
}

export interface PreparationsResponse {
  has_preparation: boolean;
  selected: number | null;
  preparations: PreparationChoice[];
  preferences: PlanPreferences | null;
}

export interface PlanAction {
  label: string;
  url: string;
}

export type PlanTaskType = "STUDY" | "PRACTICE" | "REVISION" | "MOCK_EXAM" | "REVIEW";

export interface PlanTask {
  id: string;
  type: PlanTaskType;
  title: string;
  detail: string;
  reason: string;
  minutes: number;
  priority: number;
  topic: { id: number; name: string } | null;
  target: number | null;
  done: number | null;
  completed: boolean;
  action: PlanAction;
}

/** A section of the bundled plan response that failed on its own. */
export interface SectionError {
  error: string;
}

export const isSectionError = (v: unknown): v is SectionError =>
  !!v && typeof v === "object" && "error" in (v as Record<string, unknown>);

export interface TodayPlan {
  date: string;
  is_study_day: boolean;
  tasks: PlanTask[];
  progress: { completed: number; total: number; percent: number };
  tomorrow: { id: string; type: PlanTaskType; title: string; action: PlanAction }[];
  budget_minutes: number;
  planned_minutes: number;
  rules: string[];
}

export interface WeakTopic {
  id: number;
  name: string;
  subject: string;
  chapter: string;
  accuracy: number;
  attempts: number;
  exam_accuracy: number | null;
  exam_attempts: number;
  repeated_incorrect: number;
  available_questions: number;
  practice_url: string | null;
  notes_url: string | null;
  review_url: string;
}

export interface RevisionQueue {
  total: number;
  due_today: number;
  due_tomorrow: number;
  later: number;
  reviewed_today: number;
  due_total_today: number;
}

export interface Countdown {
  source: "schedule" | "student_target";
  title: string;
  exam_date: string;
  exam_time: string | null;
  days_remaining: number;
  notice_url: string | null;
}

export interface Pace {
  status: "on_track" | "slightly_behind" | "needs_attention" | null;
  label: string | null;
  reason: string;
  rule?: string;
  expected_percent?: number;
  actual_percent?: number;
  elapsed_days?: number;
  total_days?: number;
}

export interface ContinueLearning {
  topic_id: number;
  topic: string;
  chapter: string;
  subject: string;
  percent: number | null;
  last_activity: string;
  action: PlanAction;
}

export interface Recommendations {
  practice: { topic_id: number; topic: string; subject: string; questions: number; url: string; reason: string } | null;
  mock: {
    id: number;
    title: string;
    total_questions: number;
    time_limit: number;
    total_marks: number;
    available_now: boolean;
    starts_at: string | null;
    url: string;
  } | null;
}

export interface PlanResponse {
  has_preparation: boolean;
  exam?: PlanExamRef;
  preferences?: PlanPreferences;
  has_content?: boolean;
  today?: TodayPlan | SectionError;
  continue_learning?: ContinueLearning | null | SectionError;
  weak_topics?: { topics: WeakTopic[]; rule: string } | SectionError;
  revision?: RevisionQueue | SectionError;
  recommendations?: Recommendations | SectionError;
  countdown?: Countdown | null;
  pace?: Pace;
}

export type TopicStatus = "no_content" | "not_started" | "in_progress" | "completed";

export interface ProgressTopic {
  id: number;
  name: string;
  percent: number | null;
  status: TopicStatus;
  accuracy: number | null;
  attempts: number;
  available_questions: number;
  answered_questions: number;
  materials: number;
}

export interface ProgressChapter {
  id: number;
  title: string;
  percent: number | null;
  status: TopicStatus;
  topics: ProgressTopic[];
}

export interface ProgressSubject {
  id: number;
  name: string;
  percent: number | null;
  status: TopicStatus;
  topics_with_content: number;
  topics_started: number;
  chapters: ProgressChapter[];
}

export interface ProgressResponse {
  has_preparation: boolean;
  exam?: PlanExamRef;
  overall?: {
    percent: number | null;
    topics_with_content: number;
    topics_started: number;
    topics_completed: number;
    basis: string;
  };
  subjects?: ProgressSubject[];
  countdown?: Countdown | null;
  pace?: Pace;
}

export interface WeekDay {
  date: string;
  label: string;
  is_today: boolean;
  is_study_day: boolean;
  questions: number;
  percent: number | null;
  state: "none" | "done" | "partial" | "missed" | "open";
}

export interface WeekResponse {
  has_preparation: boolean;
  exam?: PlanExamRef;
  days?: WeekDay[];
  questions_this_week?: number;
  streak?: { current: number; highest: number };
  study_time?: { label?: string; recorded_minutes: number; available: boolean; note: string };
}

const q = (exam?: number | null) => (exam ? `?exam=${exam}` : "");

export const studyPlanPageApi = {
  preparations: (exam?: number | null) => apiClient<PreparationsResponse>(`/study-plan/preparations/${q(exam)}`),
  plan: (exam?: number | null) => apiClient<PlanResponse>(`/study-plan/plan/${q(exam)}`),
  progress: (exam?: number | null) => apiClient<ProgressResponse>(`/study-plan/progress/${q(exam)}`),
  week: (exam?: number | null) => apiClient<WeekResponse>(`/study-plan/week/${q(exam)}`),
  savePreferences: (
    prefs: Partial<Pick<PlanPreferences, "daily_minutes" | "daily_questions" | "study_days">>,
    exam?: number | null
  ) =>
    apiClient<PlanPreferences>(`/study-plan/preferences/${q(exam)}`, {
      method: "PATCH",
      body: JSON.stringify(prefs),
    }),
};

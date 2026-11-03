import { apiClient } from "./client";

// ── Types ──────────────────────────────────────────────────────────────

export interface PublicCourse {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  thumbnail: string | null;
  duration_months: number;
  subject_count: number;
  exam: { id: number; title: string } | null;
  featured: boolean;
  plans: {
    id: number;
    name: string;
    price: string;
    original_price: string | null;
    discount: string;
    duration: number;
    duration_unit: string;
    badge: string;
    features: string[];
  }[];
}

export type CourseAccessState =
  | "enrolled"
  | "active_subscription"
  | "free_trial"
  | "coin_unlocked"
  | "locked"
  | "not_enrolled";

export interface MyCourseProgress {
  total_topics: number;
  completed_topics: number;
  percentage: number;
}

export interface MyCourse {
  enrollment_id: number;
  enrolled_at: string | null;
  expires_at: string | null;
  access_state?: CourseAccessState;
  has_access?: boolean;
  is_registered_prep?: boolean;
  is_active_context?: boolean;
  course: {
    id: number;
    title: string;
    slug: string;
    short_description: string;
    thumbnail: string | null;
    category?: { id: number; name: string } | null;
    level?: { id: number; name: string } | null;
    exam: { id: number; title: string } | null;
  };
  progress: MyCourseProgress;
}

export interface MyLearningHierarchyItem {
  id: number;
  name: string;
}

export interface MyLearningData {
  registered_category: MyLearningHierarchyItem | null;
  registered_level: MyLearningHierarchyItem | null;
  selected_category: MyLearningHierarchyItem | null;
  selected_level: MyLearningHierarchyItem | null;
  is_preference_set: boolean;
  active_course_id: number | null;
  courses: MyCourse[];
  other_enrolled_courses: MyCourse[];
}
export interface EnrollmentStatus {
  has_active_enrollment: boolean;
  enrollment: {
    id: number;
    status: string;
    enrolled_at: string;
    expires_at: string | null;
    course: {
      id: number;
      title: string;
      slug: string;
      short_description: string;
      exam: { id: number; title: string } | null;
    };
  } | null;
  application: {
    id: number;
    status: "pending" | "approved" | "rejected" | "cancelled";
    applied_at: string;
    reviewed_at: string | null;
    note: string;
    course: { id: number; title: string };
  } | null;
  payment: {
    id: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
    plan_name: string;
    amount: string;
    submitted_at: string;
    rejection_reason: string | null;
  } | null;
  subscription: {
    id: number;
    plan_name: string;
    status: string;
    expiry_date: string;
  } | null;
}

export interface ApplicationResult {
  application_id: number;
  status: string;
  course: string;
  message: string;
}

// ── API functions ───────────────────────────────────────────────────────

export const courseEnrollmentApi = {
  /**
   * Public — no auth required.
   * Returns courses that are published + open for enrollment.
   * Pass examId to filter to courses linked to one specific Exam node
   * (e.g. a chosen PSC Level/Service - mirrors courses.views.PublicCourseListView's
   * `?exam=` filter, used by both student registration deep-links and the
   * Admin "Create Student" course picker).
   */
  getPublicCourses: (examId?: number): Promise<PublicCourse[]> =>
    apiClient<PublicCourse[]>(examId ? `/courses/public/?exam=${examId}` : "/courses/public/"),

  /**
   * Authenticated student — returns their enrollment/application/payment status.
   */
  getMyEnrollment: (): Promise<EnrollmentStatus> =>
    apiClient<EnrollmentStatus>("/courses/my-enrollment/"),

  /**
   * Submit a course application.
   */
  applyToCourse: (courseId: number): Promise<ApplicationResult> =>
    apiClient<ApplicationResult>("/courses/apply/", {
      method: "POST",
      body: JSON.stringify({ course_id: courseId }),
    }),

  /**
   * Authenticated student — returns all active courses they are enrolled in.
   */
  getMyCourses: (): Promise<MyCourse[]> =>
    apiClient<MyCourse[]>("/courses/my-courses/"),

  /**
   * Authenticated student — returns rich My Learning structured hierarchy context,
   * courses tailored to registered Exam Category and Level, access states, and other enrolled courses.
   */
  getMyLearning: (params?: { category_id?: number; level_id?: number; search?: string }): Promise<MyLearningData> => {
    const query = new URLSearchParams({ view_mode: "structured" });
    if (params?.category_id) query.set("category_id", String(params.category_id));
    if (params?.level_id) query.set("level_id", String(params.level_id));
    if (params?.search) query.set("search", params.search);
    return apiClient<MyLearningData>(`/courses/my-learning/?${query.toString()}`);
  },

  /**
   * Public — Returns detailed information about a course by ID or Slug.
   */
  getCourseDetails: (idOrSlug: number | string): Promise<any> =>
    apiClient<any>(`/courses/${idOrSlug}/`),
};

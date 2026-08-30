/**
 * Public API Adapter
 * ------------------
 * Wraps existing API clients for use on the PUBLIC homepage.
 * All functions are anonymous-friendly: they catch errors (including 401)
 * and return null so the homepage can display curated fallback data instead.
 *
 * When backend adds dedicated public endpoints (e.g. /packages/public/),
 * simply update the endpoint string here — no component changes needed.
 */

import { apiClient } from "./client";

// ── Courses (real, public) ───────────────────────────────────────────────────

export interface PublicCoursePlan {
  id: number;
  name: string;
  price: string;
  original_price: string | null;
  discount: string | null;
  duration: number;
  duration_unit: string;
  badge: string;
  features: string[];
}

export interface PublicCourse {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  thumbnail: string | null;
  duration_months: number;
  subject_count: number;
  enrolled_count: number;
  exam: { id: number; title: string } | null;
  featured: boolean;
  starting_price: string | null;
  plans: PublicCoursePlan[];
}

// ── Notes preview (real, public) ─────────────────────────────────────────────

export interface PublicNote {
  id: number;
  title: string;
  description: string;
  material_type: string;
  difficulty: string;
  estimated_reading_time: number;
  subject_name: string | null;
  exam_name: string | null;
  created_at: string | null;
}

// ── Marketplace preview (real, public) ───────────────────────────────────────

export interface PublicProduct {
  id: number;
  title: string;
  description: string;
  category: string;
  category_display: string;
  target_exam_name: string | null;
  is_free: boolean;
  price: string;
  discount_price: string | null;
  final_price: string;
  cover_image: string | null;
}

// ── Syllabus tree (real, public) ─────────────────────────────────────────────

export interface PublicSyllabusTopicGroup {
  id: number;
  name: string;
  topics: string[];
}

export interface PublicSyllabusSubject {
  id: number;
  name: string;
  topicsCount: number;
  questionsCount: number;
  topicGroups: PublicSyllabusTopicGroup[];
}

export interface PublicSyllabusPaper {
  id: number;
  name: string;
  title: string;
  subjects: PublicSyllabusSubject[];
}

export interface PublicSyllabusExam {
  id: number;
  name: string;
  level: string;
  description: string;
  papersCount: number;
  subjectsCount: number;
  papers: PublicSyllabusPaper[];
}

// ── Public examinations (real, public) ───────────────────────────────────────

export interface PublicExamination {
  id: number;
  title: string;
  level: string | null;
  type: string;
  paper: string;
  questions: number;
  duration: number;
  subjects: string[];
  status: "DRAFT" | "UPCOMING" | "LIVE" | "COMPLETED";
}

// ── Public subjects & practice sets (real, public) ───────────────────────────

export interface PublicPracticeSubject {
  id: number;
  name: string;
  questionsCount: number;
}

export interface PublicPracticeSet {
  id: number;
  name: string;
  exam: string | null;
  subject: string | null;
  difficulty: string;
  estimatedMinutes: number;
  questionsCount: number;
}

// ── Packages (integration-ready — endpoint TBD) ──────────────────────────────

export interface PublicPackage {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  duration_days: number;
  duration_label: string;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  course_access: boolean;
  practice_access: boolean;
  mock_exam_access: boolean;
  notes_access: boolean;
  ai_features: boolean;
  color_accent: string; // hex color for card styling
}

// ── Platform Stats (integration-ready — endpoint TBD) ────────────────────────

export interface PublicStats {
  total_aspirants: number;
  total_questions: number;
  practice_sets: number;
  content_accuracy: number;
  rating: string;
}

// ── Testimonials (integration-ready — endpoint TBD) ──────────────────────────

export interface PublicTestimonial {
  id: number;
  name: string;
  position: string;
  avatar: string | null;
  review: string;
  rating: number;
}

// ── API Functions ─────────────────────────────────────────────────────────────

async function safeGet<T>(endpoint: string): Promise<T | null> {
  try {
    return await apiClient<T>(endpoint, { skipRedirect: true } as any);
  } catch {
    return null;
  }
}

export const publicApi = {
  /** Get published, open-for-enrollment courses (real Course model). */
  getCourses: (): Promise<PublicCourse[] | null> =>
    safeGet<PublicCourse[]>("/courses/public/"),

  /** Get published free study materials. Pass a higher `limit` for full listing pages. */
  getNotesMaterials: (limit = 6): Promise<PublicNote[] | null> =>
    safeGet<PublicNote[]>(`/notes/public/?limit=${limit}`),

  /** Get published marketplace products. Pass a higher `limit` for full listing pages. */
  getProducts: (limit = 6): Promise<PublicProduct[] | null> =>
    safeGet<PublicProduct[]>(`/marketplace/public/products/?limit=${limit}`),

  /** Get the active exam > paper > subject > chapter > topic tree for the Syllabus page. */
  getSyllabusTree: (): Promise<PublicSyllabusExam[] | null> =>
    safeGet<PublicSyllabusExam[]>("/public/syllabus/"),

  /** Get published mock/practice examinations for the Exams page. */
  getExaminations: (): Promise<PublicExamination[] | null> =>
    safeGet<PublicExamination[]>("/public/exams/"),

  /** Get active subjects ranked by real question count, for the Practice page. */
  getPracticeSubjects: (): Promise<PublicPracticeSubject[] | null> =>
    safeGet<PublicPracticeSubject[]>("/public/subjects/"),

  /** Get published practice sets for the Practice page. */
  getPracticeSets: (): Promise<PublicPracticeSet[] | null> =>
    safeGet<PublicPracticeSet[]>("/public/practice-sets/"),

  /**
   * Get public subscription packages.
   * Integration-ready: backend must expose GET /packages/public/
   * Returns null until endpoint exists — UI shows empty/loading state.
   */
  getPackages: (): Promise<PublicPackage[] | null> =>
    safeGet<PublicPackage[]>("/packages/public/"),

  /**
   * Get platform statistics for social proof section.
   * Integration-ready: backend must expose GET /public/stats/
   * Returns null until endpoint exists — UI shows static fallback values.
   */
  getStats: (): Promise<PublicStats | null> =>
    safeGet<PublicStats>("/public/stats/"),

  /**
   * Get approved student testimonials.
   * Integration-ready: backend must expose GET /public/testimonials/
   */
  getTestimonials: (): Promise<PublicTestimonial[] | null> =>
    safeGet<PublicTestimonial[]>("/public/testimonials/"),
};

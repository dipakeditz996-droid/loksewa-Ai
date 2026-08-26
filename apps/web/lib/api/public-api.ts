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
import { ApiExamCategory, ApiExam } from "./admin-academic-api";
import { StudyMaterial } from "./notes";
import { Product } from "./marketplace";
import { ModelExam } from "./modelExam";

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
  /** Get published exam categories (used as "courses" on homepage) */
  getExamCategories: (): Promise<ApiExamCategory[] | null> =>
    safeGet<ApiExamCategory[]>("/admin/syllabus/categories/"),

  /** Get published exams (optionally filtered by category) */
  getExams: (categoryId?: number): Promise<ApiExam[] | null> =>
    safeGet<ApiExam[]>(
      `/admin/syllabus/exams/${categoryId ? `?category=${categoryId}` : ""}`
    ),

  /** Get recent study materials for notes showcase */
  getNotesMaterials: (): Promise<StudyMaterial[] | null> =>
    safeGet<StudyMaterial[]>("/notes/materials/"),

  /** Get marketplace products for homepage preview */
  getProducts: (): Promise<Product[] | null> =>
    safeGet<Product[]>("/marketplace/student/products/"),

  /** Get published model exams for exam preview */
  getModelExams: (): Promise<ModelExam[] | null> =>
    safeGet<ModelExam[]>("/model-exams/"),

  /** Get public courses from the courses module */
  getCourses: (): Promise<any[] | null> =>
    safeGet<any[]>("/courses/public/"),

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

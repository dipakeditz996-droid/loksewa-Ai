import { apiClient } from "./client";

export interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  status: string;
  featured: boolean;
  exam_details: ExamDetails | null;
  created_at: string;
  updated_at: string;
}

export interface ExamDetails {
  id: number;
  title: string;
  description: string;
  papers?: Paper[];
  subjects?: Subject[]; // fallback for legacy_subjects
}

export interface Paper {
  id: number;
  name: string;
  paper_number: string;
  subjects: Subject[];
}

export interface Subject {
  id: number;
  title: string;
  code: string;
  description: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: number;
  title: string;
  topics: Topic[];
}

export interface Topic {
  id: number;
  title: string;
  status: string;
  progress: number;
  accuracy: number | null;
}

export const teacherCourseService = {
  /**
   * Fetch all courses assigned to the authenticated teacher.
   */
  async getMyCourses(): Promise<Course[]> {
    return apiClient<Course[]>("/teacher/courses/");
  },

  /**
   * Fetch details for a specific course assigned to the teacher.
   */
  async getCourseDetail(courseId: string | number): Promise<Course> {
    return apiClient<Course>(`/teacher/courses/${courseId}/`);
  },

  /**
   * Partially update a course (e.g. description).
   */
  async updateCourse(courseId: string | number, data: Partial<Course>): Promise<Course> {
    return apiClient<Course>(`/teacher/courses/${courseId}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  }
};

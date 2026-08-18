import { apiClient } from './client';

export interface TeacherStudentList {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  avatar: string | null;
  enrolled_courses: number;
  completed_courses: number;
  average_score: number;
  last_active: string | null;
  status: 'Active' | 'Inactive' | 'At Risk';
  risk_reason?: string;
}

export interface TeacherStudentDetail {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  avatar: string | null;
  joined_date: string;
  enrolled_courses_count: number;
  completed_courses_count: number;
  total_study_time: number;
  average_score: number;
  best_score: number;
  practice_accuracy: number;
}

export interface TeacherStudentCourse {
  id: number;
  name: string;
  status: string;
  enrolled_at: string;
  progress: number;
  thumbnail: string | null;
}

export interface TeacherStudentAnalytics {
  exam_timeline: {
    date: string;
    score: number;
    exam: string;
  }[];
  total_exams_taken: number;
}

export interface TeacherStudentPerformance {
  strong_topics: {
    id: number;
    name: string;
    accuracy: number;
    progress: number;
  }[];
  weak_topics: {
    id: number;
    name: string;
    accuracy: number;
    progress: number;
  }[];
}

export interface TeacherStudentActivity {
  type: 'exam' | 'practice';
  title: string;
  date: string;
  status: string;
  score: number;
}

export interface TeacherStudentNote {
  id: number;
  teacher: number;
  teacher_name: string;
  student: number;
  note_text: string;
  created_at: string;
  updated_at: string;
}

export const teacherStudentsApi = {
  getStudents: () => 
    apiClient('/api/teacher/students/'),

  getStudentDetail: (id: number | string) => 
    apiClient(`/api/teacher/students/${id}/`),

  getStudentCourses: (id: number | string) => 
    apiClient(`/api/teacher/students/${id}/courses/`),

  getStudentAnalytics: (id: number | string) => 
    apiClient(`/api/teacher/students/${id}/analytics/`),

  getStudentPerformance: (id: number | string) => 
    apiClient(`/api/teacher/students/${id}/performance/`),

  getStudentActivity: (id: number | string) => 
    apiClient(`/api/teacher/students/${id}/activity/`),

  getAtRiskStudents: () => 
    apiClient('/api/teacher/students/at-risk/'),

  getStudentNotes: (id: number | string) => 
    apiClient(`/api/teacher/students/${id}/notes/`),

  addStudentNote: (id: number | string, note_text: string) => 
    apiClient(`/api/teacher/students/${id}/notes/`, {
      method: 'POST',
      body: JSON.stringify({ note_text }),
    }),

  sendMessage: (recipientId: number | string, subject: string, body: string) => 
    apiClient('/api/teacher/messages/', {
      method: 'POST',
      body: JSON.stringify({ recipient: recipientId, subject, body }),
    }),

  exportStudentsUrl: () => 
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/teacher/students/export/`
};

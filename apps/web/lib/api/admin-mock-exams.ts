import { apiClient } from './client';
import { MockExam } from './teacher-mock-exams';

export const adminMockExamsApi = {
  getReviewQueue: async () => {
    return apiClient<MockExam[]>('/admin/mock-exams/queue/');
  },

  getReviewExamById: async (id: number) => {
    return apiClient<MockExam>(`/admin/mock-exams/queue/${id}/`);
  },

  moderateExam: async (id: number, action: 'approve' | 'request_changes' | 'reject', comment: string) => {
    return apiClient<{ message: string; exam: MockExam }>(`/admin/mock-exams/queue/${id}/moderate/`, {
      method: 'POST',
      body: JSON.stringify({
        action,
        comment,
      }),
    });
  },
};

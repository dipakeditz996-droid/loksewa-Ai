import { apiClient } from "./client";

export type TopicStatus = "completed" | "in-progress" | "not-started";

export interface Topic {
  id: number;
  name: string;
  status: TopicStatus;
  progress: number;
  accuracy: number | null;
}

export interface Unit {
  id: number;
  title: string;
  topics: Topic[];
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  progress: number;
  description: string;
  units: Unit[];
}

export interface Exam {
  id: number;
  title: string;
  description: string;
  subjects: Subject[];
}

export const syllabusApi = {
  getExams: async (): Promise<Exam[]> => {
    return apiClient<Exam[]>("/exams/");
  },
  
  getExam: async (id: number): Promise<Exam> => {
    return apiClient<Exam>(`/exams/${id}/`);
  },

  updateTopicProgress: async (topicId: number, status: TopicStatus) => {
    return apiClient(`/topic-progress/`, {
      method: "POST",
      body: JSON.stringify({
        topic: topicId,
        status,
        progress: status === "completed" ? 100 : status === "in-progress" ? 50 : 0
      }),
    });
  }
};

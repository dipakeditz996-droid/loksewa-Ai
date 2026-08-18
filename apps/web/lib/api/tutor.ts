import { apiClient } from "./client";

export interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  title: string;
  mode: 'EXPLAIN' | 'PRACTICE' | 'REVISION' | 'EXAM_STRATEGY' | 'STUDY_PLAN';
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export const tutorApi = {
  getConversations: async (): Promise<Conversation[]> => {
    return apiClient<Conversation[]>("/tutor/conversations/");
  },
  
  getConversation: async (id: number): Promise<ConversationDetail> => {
    return apiClient<ConversationDetail>(`/tutor/conversations/${id}/`);
  },
  
  createConversation: async (data: { title?: string, mode?: string }): Promise<Conversation> => {
    return apiClient<Conversation>("/tutor/conversations/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  deleteConversation: async (id: number): Promise<void> => {
    return apiClient<void>(`/tutor/conversations/${id}/`, {
      method: "DELETE",
    });
  },

  sendMessage: async (id: number, content: string): Promise<{ user_message: Message, assistant_message: Message }> => {
    return apiClient<{ user_message: Message, assistant_message: Message }>(`/tutor/conversations/${id}/send/`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
};

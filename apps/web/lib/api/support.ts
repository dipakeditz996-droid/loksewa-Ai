import { apiClient } from "./client";

export interface SupportTicket {
  id: number;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  message_count: number;
  related_exam?: string;
  related_question?: string;
  related_page?: string;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: number;
  message: string;
  is_staff_reply: boolean;
  sender_name: string;
  sender_role: string;
  created_at: string;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  helpful_count: number;
  not_helpful_count: number;
}

export interface HelpCategory {
  key: string;
  name: string;
  icon: string;
  description: string;
}

export const supportApi = {
  // Tickets
  getTickets: () =>
    apiClient<SupportTicket[]>("/support/support/tickets/"),

  getTicket: (id: number) =>
    apiClient<SupportTicket>(`/support/support/tickets/${id}/`),

  createTicket: (data: {
    subject: string;
    category: string;
    priority?: string;
    description: string;
    related_exam?: string;
    related_question?: string;
    related_page?: string;
  }) =>
    apiClient<SupportTicket>("/support/support/tickets/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  closeTicket: (id: number) =>
    apiClient<SupportTicket>(`/support/support/tickets/${id}/close/`, {
      method: "PATCH",
    }),

  // Messages
  getMessages: (ticketId: number) =>
    apiClient<SupportMessage[]>(`/support/support/tickets/${ticketId}/messages/`),

  sendMessage: (ticketId: number, message: string) =>
    apiClient<SupportMessage>(`/support/support/tickets/${ticketId}/messages/`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  // FAQs
  getFAQs: (params?: { search?: string; category?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.category) searchParams.set("category", params.category);
    const query = searchParams.toString();
    return apiClient<FAQ[]>(`/support/help/faqs/${query ? `?${query}` : ""}`);
  },

  sendFAQFeedback: (faqId: number, is_helpful: boolean, feedback_text?: string) =>
    apiClient<{ detail: string }>(`/support/help/faqs/${faqId}/feedback/`, {
      method: "POST",
      body: JSON.stringify({ is_helpful, feedback_text: feedback_text || "" }),
    }),

  // Help categories
  getHelpCategories: () =>
    apiClient<HelpCategory[]>("/support/help/categories/"),
};

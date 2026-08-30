import { apiClient } from "./client";

export interface StudentFeedbackEntry {
  id: number;
  message: string;
  youtube_url: string;
  given_by: string | null;
  created_at: string;
}

export interface StudentFeedbackListResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  results: StudentFeedbackEntry[];
}

export const studentFeedbackApi = {
  list: async (page = 1) =>
    apiClient<StudentFeedbackListResponse>(`/student/feedback/?page=${page}`),
};

/** Extracts an 11-char YouTube video id from watch/short/embed URL forms.
 * Returns null for anything that doesn't match, so callers never build an
 * iframe src from unvalidated input. */
export function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

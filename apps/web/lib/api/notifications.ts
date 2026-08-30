import { apiClient } from "@/lib/api/client";

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  priority: "normal" | "important" | "critical";
  created_at: string;
  read_at: string | null;
}

export interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NotificationItem[];
}

export interface UnreadNotificationsResponse {
  unread_count: number;
  latest: NotificationItem[];
}

// The seven filter tabs the student notification center exposes. 'category'
// values (other than 'unread'/'important', which are handled by dedicated
// query params) map server-side to a group of Notification.type values -
// see core.notification_service.NOTIFICATION_CATEGORY_MAP.
export type NotificationFilter =
  | "all"
  | "unread"
  | "important"
  | "exam"
  | "learning"
  | "achievement"
  | "system";

export interface ListNotificationsParams {
  filter?: NotificationFilter;
  page?: number;
}

function buildListEndpoint({ filter = "all", page }: ListNotificationsParams): string {
  const params = new URLSearchParams();
  if (filter === "unread") {
    params.set("unread", "true");
  } else if (filter !== "all") {
    params.set("category", filter);
  }
  if (page && page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return `/notifications/${query ? `?${query}` : ""}`;
}

export const notificationsApi = {
  list: (params: ListNotificationsParams = {}): Promise<NotificationListResponse> =>
    apiClient<NotificationListResponse>(buildListEndpoint(params)),

  getUnread: (): Promise<UnreadNotificationsResponse> =>
    apiClient<UnreadNotificationsResponse>("/notifications/unread/"),

  markRead: (id: number): Promise<void> =>
    apiClient<void>(`/notifications/${id}/read/`, { method: "PATCH" }),

  markAllRead: (): Promise<void> =>
    apiClient<void>("/notifications/mark-all-read/", { method: "POST" }),
};

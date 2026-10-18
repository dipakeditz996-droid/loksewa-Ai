import type { DashboardData } from "@/lib/api/dashboard";
import type {
  ReferralProfile,
  ReferralStats,
  ReferralSettings,
  ReferralHistoryEntry,
} from "@/lib/api/gamification";

export type StudentReferralDashboardData = {
  profile: ReferralProfile;
  stats: ReferralStats;
  settings?: ReferralSettings;
};

export type { DashboardData, ReferralHistoryEntry };

export const FULL_WIDTH_WIDGETS = [
  "motivation",
  "quick-actions",
  "continue-study",
  "referral-card",
] as const;

export const GRID_WIDGETS = [
  "referrals-list",
  "your-progress",
  "upcoming-exams",
] as const;

export type FullWidthId = (typeof FULL_WIDTH_WIDGETS)[number];
export type GridId = (typeof GRID_WIDGETS)[number];

export const STORAGE_KEY_FULL = "dashboard-full-widget-order";
export const STORAGE_KEY_GRID = "dashboard-grid-widget-order";

export const WIDGET_LABELS: Record<string, string> = {
  motivation: "Quote of the Day",
  "quick-actions": "Quick Actions",
  "continue-study": "Continue Studying",
  "referral-card": "Invite & Earn",
  "referrals-list": "Recent Referrals",
  "your-progress": "Your Progress",
  "upcoming-exams": "Upcoming Exams",
};

export function loadOrder<T extends string>(key: string, defaults: readonly T[]): T[] {
  if (typeof window === "undefined") return [...defaults];
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    if (Array.isArray(saved) && saved.every((id) => (defaults as readonly string[]).includes(id))) {
      return saved as T[];
    }
  } catch {
    // Return defaults on localStorage read/parse failure
  }
  return [...defaults];
}

export function saveOrder<T extends string>(key: string, order: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(order));
  } catch {
    // Ignore localStorage write failures (e.g. private browsing quota)
  }
}

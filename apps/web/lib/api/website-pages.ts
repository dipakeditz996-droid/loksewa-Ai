import { apiClient, ApiError } from "./client";

/** Public shape of core.WebsitePage - matches core.website_page_serializers.PublicWebsitePageSerializer exactly (never updated_by, never the internal id, never draft content). */
export interface PublicWebsitePage {
  slug: string;
  title: string;
  content: string;
  updated_at: string;
}

export type WebsitePageResult =
  | { status: "found"; page: PublicWebsitePage }
  /** No published row for this slug - a real, distinct state from a network/server failure. */
  | { status: "not_published" }
  | { status: "error"; message: string };

/**
 * GET /api/public/pages/{slug}/ - never falls back to hardcoded content.
 * The three possible outcomes (found / not yet published / request failed)
 * are kept distinct so the page can render "this page hasn't been
 * published yet" instead of a generic error, and a generic error instead
 * of silently showing nothing.
 */
export async function getPublicWebsitePage(slug: string): Promise<WebsitePageResult> {
  try {
    const page = await apiClient<PublicWebsitePage>(`/public/pages/${slug}/`, { skipRedirect: true } as any);
    return { status: "found", page };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { status: "not_published" };
    }
    return { status: "error", message: err instanceof Error ? err.message : "Failed to load this page." };
  }
}

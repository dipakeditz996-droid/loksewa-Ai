/**
 * Anonymous, product-level event hooks for the Calm Down feature.
 *
 * The project has no analytics ingestion pipeline yet (no gtag/PostHog/etc.
 * wired into app/layout.tsx, and no backend "track event" endpoint) - so
 * this deliberately does not invent a new API or database table for it.
 * It logs to the console in development only, and is the single place a
 * real analytics call would be added later without touching any component
 * that calls it.
 *
 * Never pass anything beyond the event name and these plain flags -
 * no student identity, no answers, no inferred mental state.
 */
import { apiClient } from "@/lib/api/client";

export type CalmDownEvent =
  | "calm_down_prompt_shown"
  | "calm_down_started"
  | "calm_down_completed"
  | "calm_down_skipped"
  | "calm_down_audio_enabled";

export function trackCalmDownEvent(event: CalmDownEvent, meta?: Record<string, string | number | boolean>): void {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[calm-down]", event, meta || {});
  }
  
  // Clean prefix 'calm_down_' to match the EVENT_CHOICES in the backend CalmSessionLog model
  let backendEvent = event.replace('calm_down_', '');
  if (backendEvent === 'prompt_shown') {
      return; // Skip logging this simple impression if not needed, or add to backend enum
  }
  
  apiClient("/student/calm-session-log/", {
    method: "POST",
    body: JSON.stringify({
      event_type: backendEvent,
      meta_data: meta || {}
    })
  }).catch((err) => {
    // Silent fail for analytics
    console.warn("Failed to log calm session event", err);
  });
}

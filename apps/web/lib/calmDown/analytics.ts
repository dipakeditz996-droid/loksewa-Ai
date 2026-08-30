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
  // Real dispatch (e.g. window.gtag / posthog.capture) lands here once the
  // project has an analytics provider - intentionally a no-op until then.
}

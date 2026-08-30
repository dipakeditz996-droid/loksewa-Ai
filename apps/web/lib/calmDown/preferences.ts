/**
 * "Don't ask me again" preference for the pre-exam Calm Down prompt.
 *
 * Deliberately localStorage-only, no backend model: this is a device-level
 * UI convenience, not sensitive data, and the feature spec calls for
 * avoiding a new database table unless there's a genuine product need for
 * one (e.g. syncing the preference across devices). If that need shows up
 * later, this is the one place that would change.
 */

const SKIP_PREFERENCE_KEY = "loksewa_calm_down_skip_prompt";

export function getCalmDownSkipPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SKIP_PREFERENCE_KEY) === "true";
  } catch {
    // Private browsing / storage disabled - fall back to always asking.
    return false;
  }
}

export function setCalmDownSkipPreference(skip: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (skip) {
      window.localStorage.setItem(SKIP_PREFERENCE_KEY, "true");
    } else {
      window.localStorage.removeItem(SKIP_PREFERENCE_KEY);
    }
  } catch {
    // Ignore - worst case the prompt keeps appearing.
  }
}

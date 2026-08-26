import toast, { type ToastOptions, type Toast } from "react-hot-toast";

/**
 * Focus-aware notification helper.
 *
 * Every in-app toast is classified. Focus Mode suppresses the noisy classes
 * and always lets the important ones through, so "quieter" never means
 * "the student misses a warning".
 */
export type NotificationLevel =
  | "critical" // security alerts, session expiry, system errors
  | "exam" // exam warnings, submission confirmations, timer alerts
  | "account" // account-level changes the student asked for
  | "info" // general, non-critical feedback
  | "promo" // marketplace / promotional
  | "achievement"; // gamification popups

/** Levels that survive normal Focus Mode. */
const FOCUS_ALLOWED: NotificationLevel[] = ["critical", "exam", "account"];

/** Levels that survive an active examination. Exam-critical only. */
const EXAM_ALLOWED: NotificationLevel[] = ["critical", "exam"];

type FocusSnapshot = { focusEnabled: boolean; examFocus: boolean };

let focusSnapshot: FocusSnapshot = { focusEnabled: false, examFocus: false };

// ─── Browser Notification API patch ────────────────────────────────────────────
// When DND is active we intercept the Web Notifications API so that:
//   • Notification.requestPermission()  → always resolves to "denied"
//   • new Notification(...)             → silently dropped (no-op)
//   • Push subscription                 → unsubscribed
//
// The originals are stored and fully restored when DND turns off.
// This mirrors how the OS / phone DND mode works, scoped to this origin.

let _notifPatched = false;
let _origNotifConstructor: typeof Notification | undefined;
let _origRequestPermission: typeof Notification["requestPermission"] | undefined;

function _patchNotifications() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (_notifPatched) return;
  _notifPatched = true;

  // Save originals before overwriting
  _origNotifConstructor = window.Notification as unknown as typeof Notification;
  _origRequestPermission = Notification.requestPermission?.bind(Notification);

  // 1. Patch requestPermission → always resolves to "denied"
  try {
    (Notification as any).requestPermission = async (): Promise<NotificationPermission> =>
      "denied";
  } catch {
    // read-only in some browsers — skip
  }

  // 2. Replace the Notification constructor with a silent no-op
  try {
    function NoopNotification(
      this: any,
      _title: string,
      _options?: NotificationOptions
    ) {
      // DND active — notification swallowed silently
    }
    Object.setPrototypeOf(NoopNotification, Notification);
    NoopNotification.prototype = Notification.prototype;

    // Report permission as "denied" so sites stop trying
    try {
      Object.defineProperty(NoopNotification, "permission", {
        get: (): NotificationPermission => "denied",
        configurable: true,
        enumerable: true,
      });
    } catch { /* ignore if non-configurable */ }

    try {
      Object.defineProperty(NoopNotification, "requestPermission", {
        value: async (): Promise<NotificationPermission> => "denied",
        configurable: true,
        writable: true,
      });
    } catch { /* ignore */ }

    (window as any).Notification = NoopNotification;
  } catch {
    /* fallback: at minimum requestPermission is patched */
  }

  // 3. Unsubscribe from any active push subscription
  void _unsubscribePush();
}

function _restoreNotifications() {
  if (typeof window === "undefined") return;
  if (!_notifPatched) return;
  _notifPatched = false;

  try {
    if (_origNotifConstructor) (window as any).Notification = _origNotifConstructor;
  } catch { /* ignore */ }

  try {
    if (_origRequestPermission) {
      (Notification as any).requestPermission = _origRequestPermission;
    }
  } catch { /* ignore */ }

  _origNotifConstructor = undefined;
  _origRequestPermission = undefined;
}

async function _unsubscribePush(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager?.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {
    // push may not be set up — not an error
  }
}

// ─── Focus state sync (called by FocusModeProvider) ───────────────────────────

/** Called by FocusModeProvider whenever focus state changes. */
export function syncNotificationFocusState(next: FocusSnapshot) {
  const wasDnd = focusSnapshot.focusEnabled || focusSnapshot.examFocus;
  const isDnd = next.focusEnabled || next.examFocus;
  focusSnapshot = next;

  if (isDnd && !wasDnd) {
    // DND just turned ON — intercept browser notification API
    _patchNotifications();
  } else if (isDnd && !_notifPatched) {
    // DND was already ON when this was called (e.g. after page refresh) — apply patch
    _patchNotifications();
  } else if (!isDnd && wasDnd) {
    // DND just turned OFF — restore original notification API
    _restoreNotifications();
  }
}


export function isNotificationSuppressed(level: NotificationLevel): boolean {
  if (focusSnapshot.examFocus) return !EXAM_ALLOWED.includes(level);
  if (focusSnapshot.focusEnabled) return !FOCUS_ALLOWED.includes(level);
  return false;
}

// ─── Toast helpers ─────────────────────────────────────────────────────────────

type Variant = "success" | "error" | "plain";

function emit(
  variant: Variant,
  level: NotificationLevel,
  message: string,
  options?: ToastOptions
): string | null {
  if (isNotificationSuppressed(level)) return null;
  const opts: ToastOptions = { ...options, id: options?.id };
  if (variant === "success") return toast.success(message, opts);
  if (variant === "error") return toast.error(message, opts);
  return toast(message, opts);
}

export const notify = {
  /** Security, session expiry, unrecoverable errors. Never suppressed. */
  critical: (message: string, options?: ToastOptions) =>
    emit("error", "critical", message, options),

  /** Exam warnings, timer alerts, submission confirmations. */
  exam: (message: string, options?: ToastOptions) =>
    emit("plain", "exam", message, options),

  examSuccess: (message: string, options?: ToastOptions) =>
    emit("success", "exam", message, options),

  examError: (message: string, options?: ToastOptions) =>
    emit("error", "exam", message, options),

  /** Account changes the student explicitly requested. */
  account: (message: string, options?: ToastOptions) =>
    emit("success", "account", message, options),

  /**
   * Neutral, account-level notice. Survives Focus Mode (so a message *about*
   * Focus Mode is never suppressed by Focus Mode) without the alarm of an
   * error toast.
   */
  notice: (message: string, options?: ToastOptions) =>
    emit("plain", "account", message, options),

  /** General feedback. Suppressed in Focus Mode. */
  info: (message: string, options?: ToastOptions) =>
    emit("plain", "info", message, options),

  success: (message: string, options?: ToastOptions) =>
    emit("success", "info", message, options),

  error: (message: string, options?: ToastOptions) =>
    emit("error", "info", message, options),

  /** Marketplace / promotional. Suppressed in Focus Mode. */
  promo: (message: string, options?: ToastOptions) =>
    emit("plain", "promo", message, options),

  /** Gamification popups. Suppressed in Focus Mode. */
  achievement: (message: string, options?: ToastOptions) =>
    emit("success", "achievement", message, options),

  dismiss: (id?: string) => toast.dismiss(id),
};

export type { Toast };

// ─── Browser Notification helper ───────────────────────────────────────────────

/**
 * Show a browser (Web Notifications API) notification, respecting Focus Mode.
 *
 * Scope: this only governs notifications **this site** creates.
 * The OS notification centre, other apps, or other websites cannot be silenced
 * from JavaScript — browsers don't expose that by design.
 *
 * Returns true only if a notification was actually shown.
 */
export function showBrowserNotification(
  title: string,
  options?: NotificationOptions,
  level: NotificationLevel = "info"
): boolean {
  if (isNotificationSuppressed(level)) return false;
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

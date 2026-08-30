"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import {
  studentFocusApi, examFocusApi, type ActiveAttemptSummary,
} from "../lib/api/student-focus";
import { notify, syncNotificationFocusState } from "../lib/notify";

/**
 * Focus Mode has exactly two layers and they never overwrite each other:
 *
 *   preference   - the student's persistent choice, stored server-side on
 *                  support.StudentProfile.focus_mode_enabled (default OFF).
 *   examFocus    - a temporary state derived from an ExaminationAttempt that
 *                  is currently `in-progress`. Never persisted.
 *
 * `isFocusActive` is the union of the two. When an exam ends, examFocus drops
 * away and the student is left with exactly the preference they had before.
 *
 * This is a UX / distraction-reduction feature. It is not anti-cheating: it
 * cannot and does not prevent screenshots, other devices, switching browsers
 * or outside communication, and it does not touch the operating system's own
 * notification centre.
 */

const PREFERENCE_CACHE_KEY = "loksewa.focusMode.preference";
/** A choice made while the server was unreachable, replayed on next load. */
const PREFERENCE_PENDING_KEY = "loksewa.focusMode.pendingPreference";
const EXAM_FOCUS_KEY = "loksewa.focusMode.examAttemptId";

export interface ExamFocusSession {
  attemptId: number;
  examinationId?: number;
}

interface FocusModeContextValue {
  /** Persistent user preference. */
  preference: boolean;
  /** True while an ExaminationAttempt is in progress. */
  examFocus: boolean;
  /** preference || examFocus */
  isFocusActive: boolean;
  /** The toggle is locked while an exam is running. */
  isLocked: boolean;
  /** True until the preference has been read (from cache or server). */
  isLoading: boolean;
  /** True while a preference write is in flight. */
  isSaving: boolean;
  /** True when the choice is held on this device but not saved to the account. */
  isUnsynced: boolean;
  /** The attempt currently driving exam focus, if any. */
  examSession: ExamFocusSession | null;

  /** Controls the DND OS Guide Modal (only opened when explicitly clicking DND or taking an exam). */
  isDndModalOpen: boolean;
  openDndGuideModal: () => void;
  closeDndGuideModal: () => void;

  setPreference: (enabled: boolean, triggeredByUser?: boolean) => Promise<void>;
  togglePreference: () => Promise<void>;

  /** Called by the exam UI once an attempt is confirmed active. */
  beginExamFocus: (session: ExamFocusSession) => void;
  /** Called on submit / expiry / termination. */
  endExamFocus: () => void;

  // Optional fullscreen (never forced).
  fullscreenSupported: boolean;
  isFullscreen: boolean;
  requestFullscreen: () => Promise<boolean>;
  exitFullscreen: () => Promise<void>;
}

const noopAsync = async () => {};

const FocusModeContext = createContext<FocusModeContextValue>({
  preference: false,
  examFocus: false,
  isFocusActive: false,
  isLocked: false,
  isLoading: true,
  isSaving: false,
  isUnsynced: false,
  examSession: null,
  isDndModalOpen: false,
  openDndGuideModal: () => {},
  closeDndGuideModal: () => {},
  setPreference: noopAsync,
  togglePreference: noopAsync,
  beginExamFocus: () => {},
  endExamFocus: () => {},
  fullscreenSupported: false,
  isFullscreen: false,
  requestFullscreen: async () => false,
  exitFullscreen: noopAsync,
});


function readCachedPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PREFERENCE_CACHE_KEY) === "true";
  } catch {
    return false;
  }
}

function readPendingPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFERENCE_PENDING_KEY);
    return raw === null ? null : raw === "true";
  } catch {
    return null;
  }
}

function writePendingPreference(value: boolean | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(PREFERENCE_PENDING_KEY);
    else window.localStorage.setItem(PREFERENCE_PENDING_KEY, value ? "true" : "false");
  } catch {
    /* ignore */
  }
}

function writeCachedPreference(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFERENCE_CACHE_KEY, value ? "true" : "false");
  } catch {
    /* storage unavailable (private mode) - the server copy is authoritative */
  }
}

function readCachedExamAttempt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(EXAM_FOCUS_KEY);
    return raw ? Number(raw) || null : null;
  } catch {
    return null;
  }
}

function writeCachedExamAttempt(attemptId: number | null) {
  if (typeof window === "undefined") return;
  try {
    if (attemptId === null) window.sessionStorage.removeItem(EXAM_FOCUS_KEY);
    else window.sessionStorage.setItem(EXAM_FOCUS_KEY, String(attemptId));
  } catch {
    /* ignore */
  }
}

const DISMISSED_KEY = "loksewa.focusMode.dndGuideDismissed";

export function wasDndGuideDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function markDndGuideDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    /* ignore */
  }
}

export const FocusModeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const isStudent = !!user && user.role === "student";

  const [preference, setPreferenceState] = useState(false);
  const [examSession, setExamSession] = useState<ExamFocusSession | null>(null);
  const [isDndModalOpen, setIsDndModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnsynced, setIsUnsynced] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);

  const hydratedRef = useRef(false);
  // Warn about a failed sync once per session, not on every click.
  const warnedUnsyncedRef = useRef(false);

  const examFocus = examSession !== null;
  const isFocusActive = preference || examFocus;

  const openDndGuideModal = useCallback(() => {
    if (!wasDndGuideDismissed()) {
      setIsDndModalOpen(true);
    }
  }, []);

  const closeDndGuideModal = useCallback(() => {
    setIsDndModalOpen(false);
  }, []);

  /* ---------------------------------------------------------------- *
   * Preference: optimistic local cache first, then the server truth.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    // Paint from cache immediately so a refresh does not flash the wrong state.
    if (!hydratedRef.current) {
      setPreferenceState(readCachedPreference());
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isStudent) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // A choice made while the server was down is replayed before reading,
        // so the student's last action wins instead of being overwritten.
        const pending = readPendingPreference();
        if (pending !== null) {
          try {
            const saved = await studentFocusApi.updatePreference(pending);
            if (cancelled) return;
            writePendingPreference(null);
            setIsUnsynced(false);
            setPreferenceState(!!saved.focus_mode_enabled);
            writeCachedPreference(!!saved.focus_mode_enabled);
            return;
          } catch {
            if (cancelled) return;
            setPreferenceState(pending);
            setIsUnsynced(true);
            return;
          }
        }

        const data = await studentFocusApi.getPreference();
        if (cancelled) return;
        setIsUnsynced(false);
        setPreferenceState(!!data.focus_mode_enabled);
        writeCachedPreference(!!data.focus_mode_enabled);
      } catch {
        // Server preference unreachable - keep the cached client value rather
        // than silently resetting the student's choice.
        if (!cancelled) setIsUnsynced(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isStudent]);

  /* ---------------------------------------------------------------- *
   * Exam focus: the backend attempt is the source of truth.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (authLoading || !isStudent) return;

    let cancelled = false;
    (async () => {
      try {
        const active: ActiveAttemptSummary[] = await examFocusApi.activeAttempts();
        if (cancelled) return;
        const attempt = active?.[0];
        if (attempt) {
          setExamSession({ attemptId: attempt.id, examinationId: attempt.examination });
          writeCachedExamAttempt(attempt.id);
        } else {
          setExamSession(null);
          writeCachedExamAttempt(null);
        }
      } catch {
        // If we cannot reach the server, fall back to the session hint so a
        // refresh mid-exam does not drop the student out of exam focus.
        if (cancelled) return;
        const cached = readCachedExamAttempt();
        if (cached) setExamSession({ attemptId: cached });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isStudent]);

  /* ---------------------------------------------------------------- *
   * Watchdog: while exam focus is on, keep asking the server whether the
   * attempt is still running. Submitted, expired or terminated attempts drop
   * the student back to their own preference even if the exam page never got
   * the chance to say so (crash, force-close, expiry in a background tab).
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!examSession) return;

    let cancelled = false;

    const check = async () => {
      try {
        const state = await examFocusApi.attemptState(examSession.attemptId);
        if (cancelled) return;
        if (!state.is_active) {
          setExamSession(null);
          writeCachedExamAttempt(null);
        }
      } catch {
        // Leave focus on: a network blip must not strip the exam environment.
      }
    };

    const interval = window.setInterval(() => void check(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [examSession]);

  /* ---------------------------------------------------------------- *
   * Reflect state onto <html> so CSS can quiet the UI, and into the
   * notification helper so toasts are filtered at the source.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (isFocusActive) root.setAttribute("data-focus-mode", "on");
    else root.removeAttribute("data-focus-mode");
    if (examFocus) root.setAttribute("data-exam-focus", "on");
    else root.removeAttribute("data-exam-focus");
  }, [isFocusActive, examFocus]);

  useEffect(() => {
    syncNotificationFocusState({ focusEnabled: preference, examFocus });
  }, [preference, examFocus]);

  /* ---------------------------------------------------------------- *
   * Fullscreen - offered, never forced.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (typeof document === "undefined") return;
    setFullscreenSupported(
      typeof document.documentElement.requestFullscreen === "function" &&
        document.fullscreenEnabled !== false
    );

    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const requestFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return false;
    const el = document.documentElement;
    if (typeof el.requestFullscreen !== "function") return false;
    try {
      await el.requestFullscreen();
      return true;
    } catch {
      // Browsers routinely refuse programmatic fullscreen. Never break the exam.
      return false;
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  /* ---------------------------------------------------------------- *
   * Actions
   * ---------------------------------------------------------------- */
  const setPreference = useCallback(
    async (enabled: boolean, triggeredByUser: boolean = false) => {
      if (examFocus) {
        notify.exam("Focus Mode is locked during an active examination.");
        return;
      }

      setPreferenceState(enabled);
      writeCachedPreference(enabled);

      // Open the guide ONLY if user explicitly triggered enabling it
      if (enabled && triggeredByUser && !wasDndGuideDismissed()) {
        setIsDndModalOpen(true);
      } else if (!enabled) {
        setIsDndModalOpen(false);
      }

      if (!isStudent) return;

      setIsSaving(true);
      try {
        const saved = await studentFocusApi.updatePreference(enabled);
        setPreferenceState(!!saved.focus_mode_enabled);
        writeCachedPreference(!!saved.focus_mode_enabled);
        writePendingPreference(null);
        setIsUnsynced(false);
      } catch {
        // The toggle keeps working. The choice is held on this device and
        // replayed the next time the app loads, so a backend that is down or
        // mid-migration degrades instead of fighting the student.
        writePendingPreference(enabled);
        setIsUnsynced(true);
        if (!warnedUnsyncedRef.current) {
          warnedUnsyncedRef.current = true;
          notify.notice(
            "Focus Mode is active on this device. We'll save it to your account when the server is reachable."
          );
        }
      } finally {
        setIsSaving(false);
      }
    },
    [examFocus, isStudent]
  );

  const togglePreference = useCallback(
    () => setPreference(!preference, true),
    [preference, setPreference]
  );

  const beginExamFocus = useCallback((session: ExamFocusSession) => {
    setExamSession((current) =>
      current && current.attemptId === session.attemptId ? current : session
    );
    writeCachedExamAttempt(session.attemptId);
    // When student gives exam or test, show the DND guide if not dismissed
    if (!wasDndGuideDismissed()) {
      setIsDndModalOpen(true);
    }
  }, []);

  const endExamFocus = useCallback(() => {
    setExamSession(null);
    writeCachedExamAttempt(null);
    setIsDndModalOpen(false);
    // Leaving fullscreen is part of leaving the exam environment.
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const value = useMemo<FocusModeContextValue>(
    () => ({
      preference,
      examFocus,
      isFocusActive,
      isLocked: examFocus,
      isLoading,
      isSaving,
      isUnsynced,
      examSession,
      isDndModalOpen,
      openDndGuideModal,
      closeDndGuideModal,
      setPreference,
      togglePreference,
      beginExamFocus,
      endExamFocus,
      fullscreenSupported,
      isFullscreen,
      requestFullscreen,
      exitFullscreen,
    }),
    [
      preference,
      examFocus,
      isFocusActive,
      isLoading,
      isSaving,
      isUnsynced,
      examSession,
      isDndModalOpen,
      openDndGuideModal,
      closeDndGuideModal,
      setPreference,
      togglePreference,
      beginExamFocus,
      endExamFocus,
      fullscreenSupported,
      isFullscreen,
      requestFullscreen,
      exitFullscreen,
    ]
  );

  return (
    <FocusModeContext.Provider value={value}>{children}</FocusModeContext.Provider>
  );
};

export const useFocusMode = () => useContext(FocusModeContext);

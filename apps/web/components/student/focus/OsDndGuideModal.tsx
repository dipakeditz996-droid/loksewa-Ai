"use client";

import React, { useEffect, useState, useCallback } from "react";
import { X, BellOff, Smartphone, Monitor, Apple, Info } from "lucide-react";
import { useFocusMode } from "@/contexts/FocusModeContext";

// ─── Platform detection ────────────────────────────────────────────────────────

type Platform =
  | "windows"
  | "macos"
  | "android"
  | "ios"
  | "linux"
  | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const platform =
    (navigator as any).userAgentData?.platform?.toLowerCase() ??
    navigator.platform?.toLowerCase() ??
    "";

  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/win/i.test(platform) || /windows/i.test(ua)) return "windows";
  if (/mac/i.test(platform) || /macintosh|mac os x/i.test(ua)) return "macos";
  if (/linux/i.test(platform)) return "linux";
  return "unknown";
}

// ─── Per-platform DND instructions ────────────────────────────────────────────

interface PlatformGuide {
  label: string;
  icon: React.ReactNode;
  color: string;
  badge: string;
  steps: string[];
  shortcut?: string;
  note?: string;
}

const GUIDES: Record<Platform, PlatformGuide> = {
  windows: {
    label: "Windows",
    icon: <Monitor className="w-5 h-5" />,
    color: "from-blue-600 to-blue-800",
    badge: "Focus Assist / Do Not Disturb",
    steps: [
      'Click the ⊞ Start menu → open Settings (⚙️)',
      'Go to System → Notifications',
      'Toggle "Do not disturb" ON  — or —',
      'Press  Windows + N  to open Notification Center and enable it from there',
    ],
    shortcut: "Win + N",
    note: "Windows 11: Click the bell icon in the taskbar corner.",
  },
  macos: {
    label: "macOS",
    icon: <Apple className="w-5 h-5" />,
    color: "from-slate-600 to-slate-800",
    badge: "Focus / Do Not Disturb",
    steps: [
      'Click the  in the top-right menu bar',
      "Expand the Focus tile",
      'Select "Do Not Disturb"',
      "Set a duration or leave it on until you turn it off",
    ],
    shortcut: "⌥ + click menu bar clock",
    note: "Or: System Settings → Focus → Do Not Disturb.",
  },
  android: {
    label: "Android",
    icon: <Smartphone className="w-5 h-5" />,
    color: "from-green-600 to-green-800",
    badge: "Do Not Disturb",
    steps: [
      "Swipe down from the top of your screen",
      'Find the "Do Not Disturb" tile (bell with line)',
      "Tap it to turn DND ON",
      "You can allow calls from favourites if needed",
    ],
    note: "On Samsung: Settings → Sounds → Do Not Disturb.",
  },
  ios: {
    label: "iPhone / iPad",
    icon: <Smartphone className="w-5 h-5" />,
    color: "from-indigo-600 to-purple-700",
    badge: "Focus → Do Not Disturb",
    steps: [
      "Swipe down from the top-right corner to open Control Center",
      'Tap the  Focus  button (crescent moon icon)',
      'Select "Do Not Disturb"',
      "Choose a duration or leave on until you turn it off",
    ],
    note: 'Or: Settings → Focus → Do Not Disturb → turn on.',
  },
  linux: {
    label: "Linux",
    icon: <Monitor className="w-5 h-5" />,
    color: "from-orange-600 to-orange-800",
    badge: "Notification Settings",
    steps: [
      'Open Settings → Notifications',
      'Toggle "Do Not Disturb" ON',
      "GNOME: Click the system tray → toggle DND",
      "KDE: System Tray → Notifications → Do Not Disturb",
    ],
  },
  unknown: {
    label: "Your Device",
    icon: <BellOff className="w-5 h-5" />,
    color: "from-slate-600 to-slate-800",
    badge: "Do Not Disturb",
    steps: [
      "Open your device's Settings app",
      'Find "Notifications" or "Sounds & Notifications"',
      'Enable "Do Not Disturb" or "Quiet Hours"',
    ],
  },
};

// ─── LocalStorage key ──────────────────────────────────────────────────────────

const DISMISSED_KEY = "loksewa.dnd.osDismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, "true");
  } catch { /* ignore */ }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function OsDndGuideModal() {
  const { isFocusActive } = useFocusMode();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [dontShow, setDontShow] = useState(false);

  // Detect platform on mount
  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  // Open modal when DND turns ON (unless dismissed before)
  useEffect(() => {
    if (isFocusActive && !wasDismissed()) {
      setOpen(true);
    }
    if (!isFocusActive) {
      setOpen(false);
    }
  }, [isFocusActive]);

  const close = useCallback(() => {
    if (dontShow) markDismissed();
    setOpen(false);
  }, [dontShow]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  if (!open || !isFocusActive) return null;

  const guide = GUIDES[platform];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dnd-modal-title"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          {/* Header gradient */}
          <div className={`bg-gradient-to-br ${guide.color} p-6 text-white relative overflow-hidden`}>
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-white/5 blur-lg pointer-events-none" />

            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-xl">
                  <BellOff className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-0.5">
                    Focus Mode is ON
                  </p>
                  <h2 id="dnd-modal-title" className="text-xl font-bold leading-tight">
                    Block All Notifications
                  </h2>
                </div>
              </div>
              <button
                onClick={close}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="relative mt-3 text-sm text-white/80 leading-relaxed">
              LoksewaAI has blocked its own notifications. To also silence{" "}
              <strong className="text-white">WhatsApp, calls, and all other apps</strong>,
              enable Do Not Disturb on {guide.label}:
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Platform badge */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              {guide.icon}
              <span>{guide.label}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400 font-medium normal-case">{guide.badge}</span>
            </div>

            {/* Steps */}
            <ol className="space-y-3">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#0B2545] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-700 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            {/* Shortcut pill */}
            {guide.shortcut && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Quick shortcut:</span>
                <kbd className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-[#0B2545] shadow-sm">
                  {guide.shortcut}
                </kbd>
              </div>
            )}

            {/* Note */}
            {guide.note && (
              <div className="flex items-start gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>{guide.note}</span>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={dontShow}
                  onChange={(e) => setDontShow(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#0B2545] cursor-pointer"
                />
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">
                  Don't show again
                </span>
              </label>

              <button
                onClick={close}
                className="px-5 py-2 bg-[#0B2545] hover:bg-[#163E6B] text-white text-sm font-bold rounded-xl transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

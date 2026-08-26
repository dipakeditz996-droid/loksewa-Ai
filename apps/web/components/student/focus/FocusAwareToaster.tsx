"use client";

import { Toaster } from "react-hot-toast";

import { useFocusMode } from "@/contexts/FocusModeContext";

/**
 * Single mount point for in-app toasts in the student area.
 *
 * Suppression happens twice, on purpose:
 *  - at the source, in lib/notify (a suppressed toast is never created), and
 *  - here, by shortening durations and moving toasts out of the reading area
 *    while Focus Mode is on, so anything that does get through is calm.
 */
export function FocusAwareToaster() {
  const { isFocusActive, examFocus } = useFocusMode();

  return (
    <Toaster
      position={examFocus ? "top-center" : "bottom-right"}
      gutter={8}
      containerClassName="!z-[100]"
      toastOptions={{
        duration: isFocusActive ? 2500 : 4000,
        style: {
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          background: "#FFFFFF",
          color: "#0B2545",
          fontSize: "13px",
          fontWeight: 500,
          boxShadow: isFocusActive
            ? "0 1px 2px rgba(11, 37, 69, 0.08)"
            : "0 8px 24px rgba(11, 37, 69, 0.12)",
        },
        success: { iconTheme: { primary: "#159A82", secondary: "#FFFFFF" } },
        error: { iconTheme: { primary: "#DC5A5A", secondary: "#FFFFFF" } },
      }}
    />
  );
}

"use client";

import { useId } from "react";
import { Loader2, Lock, Moon } from "lucide-react";

import { useFocusMode } from "@/contexts/FocusModeContext";
import { cn } from "@/lib/utils";

/**
 * Compact Do Not Disturb / Focus Mode switch for the student portal header.
 *
 * Same two-layer state as the full control (persistent preference vs. the
 * temporary exam state) - this is only a smaller presentation of it, sitting
 * beside the other header utilities so it is reachable from every page.
 */
export function FocusModeHeaderToggle() {
  const {
    preference,
    examFocus,
    isFocusActive,
    isLocked,
    isLoading,
    isSaving,
    isUnsynced,
    togglePreference,
  } = useFocusMode();

  const labelId = useId();
  const statusId = useId();
  const checked = examFocus ? true : preference;

  const label = examFocus
    ? "Focus Mode, locked on during your examination"
    : `Do Not Disturb, currently ${preference ? "on" : "off"}` +
      (isUnsynced ? ", saved on this device only" : "");

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={statusId}
        aria-disabled={isLocked || isSaving || isLoading}
        disabled={isLoading}
        title={
          examFocus
            ? "Focus Mode is locked during an exam"
            : isUnsynced
            ? "Do Not Disturb - saved on this device only"
            : "Do Not Disturb"
        }
        onClick={() => {
          if (isLocked || isSaving || isLoading) return;
          void togglePreference();
        }}
        onKeyDown={(event) => {
          // Space activates the button; suppress the page scroll it would cause.
          if (event.key === " ") event.preventDefault();
        }}
        className={cn(
          "group inline-flex h-9 items-center gap-2 rounded-full border px-2.5 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A72C] focus-visible:ring-offset-2",
          checked
            ? "border-[#0B2545] bg-[#0B2545] text-white"
            : "border-border bg-transparent text-muted-foreground hover:bg-accent",
          (isLocked || isLoading) && "cursor-not-allowed opacity-80"
        )}
      >
        <span className="relative flex h-4 w-4 items-center justify-center">
          {isUnsynced && !examFocus && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-amber-500"
            />
          )}
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : examFocus ? (
            <Lock className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Moon
              className={cn("h-4 w-4", checked && "fill-[#D4A72C] text-[#D4A72C]")}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          )}
        </span>

        {/* The word carries the state too, so colour is never the only cue. */}
        <span
          id={labelId}
          className={cn(
            "hidden text-[12px] font-bold tracking-tight lg:inline",
            checked ? "text-white" : "text-foreground/70"
          )}
        >
          {checked ? "DND On" : "DND Off"}
        </span>
      </button>

      <span id={statusId} className="sr-only" role="status" aria-live="polite">
        {label}
        {examFocus ? ". It cannot be turned off during an active examination." : ""}
      </span>
    </>
  );
}

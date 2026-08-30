"use client";

import { useId, type KeyboardEvent } from "react";
import { Check, Loader2, Lock, Moon } from "lucide-react";

import { useFocusMode } from "@/contexts/FocusModeContext";
import { cn } from "@/lib/utils";

interface FocusModeToggleProps {
  /** "bar" sits inline on the dashboard, "card" suits a settings column. */
  variant?: "bar" | "card";
  className?: string;
}

/**
 * Do Not Disturb / Focus Mode control.
 *
 * Deliberately quiet: no gradient, no oversized icon, no hero card. It reads
 * as a piece of the dashboard rather than an advertisement for itself.
 */
export function FocusModeToggle({ variant = "bar", className }: FocusModeToggleProps) {
  const {
    preference,
    examFocus,
    isFocusActive,
    isLocked,
    isLoading,
    isSaving,
    togglePreference,
  } = useFocusMode();

  const labelId = useId();
  const descriptionId = useId();
  const statusId = useId();

  const checked = examFocus ? true : preference;

  const stateLabel = examFocus
    ? "Focus Mode, locked on during your examination"
    : `Focus Mode, currently ${preference ? "enabled" : "disabled"}`;

  const description = examFocus
    ? "Locked on while your examination is in progress."
    : "Reduce distractions while studying and taking exams.";

  const handleToggle = () => {
    if (isLocked || isSaving || isLoading) return;
    void togglePreference();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    // Space and Enter both fire click on a <button>; Space needs the default
    // scroll suppressed.
    if (event.key === " ") event.preventDefault();
  };

  return (
    <section
      aria-labelledby={labelId}
      className={cn(
        "bg-card border border-border shadow-sm",
        variant === "bar"
          ? "rounded-[16px] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6"
          : "rounded-2xl p-6 flex flex-col gap-4",
        className
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border transition-colors",
            isFocusActive
              ? "bg-primary text-primary-foreground border-[#0B2545] text-[#D4A72C]"
              : "bg-muted border-border text-muted-foreground"
          )}
        >
          {examFocus ? (
            <Lock className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <Moon className="h-4 w-4" strokeWidth={1.75} />
          )}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              id={labelId}
              className="text-[14px] font-bold text-primary dark:text-foreground tracking-tight"
            >
              Focus Mode
            </h2>
            {isFocusActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary dark:text-foreground">
                <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                Active
              </span>
            )}
          </div>
          <p id={descriptionId} className="text-[12px] text-muted-foreground mt-0.5">
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:shrink-0">
        <span
          aria-hidden="true"
          className={cn(
            "text-[11px] font-bold uppercase tracking-wider transition-colors",
            checked ? "text-primary dark:text-foreground" : "text-muted-foreground"
          )}
        >
          {checked ? "On" : "Off"}
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={labelId}
          aria-describedby={`${descriptionId} ${statusId}`}
          aria-disabled={isLocked || isSaving || isLoading}
          disabled={isLoading}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A72C] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
            checked ? "bg-primary text-primary-foreground" : "bg-muted/80",
            (isLocked || isLoading) && "cursor-not-allowed opacity-70"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-card shadow ring-0 transition-transform",
              checked ? "translate-x-5" : "translate-x-0"
            )}
          >
            {isSaving && (
              <Loader2 className="h-3 w-3 animate-spin text-primary dark:text-foreground" aria-hidden="true" />
            )}
            {!isSaving && examFocus && (
              <Lock className="h-2.5 w-2.5 text-primary dark:text-foreground" aria-hidden="true" />
            )}
          </span>
        </button>
      </div>

      {/* Screen-reader status. Never colour alone: the On/Off word, the icon
          and this live region all carry the state. */}
      <p id={statusId} className="sr-only" role="status" aria-live="polite">
        {stateLabel}
        {examFocus ? ". Focus Mode is locked during an active examination." : ""}
      </p>
    </section>
  );
}

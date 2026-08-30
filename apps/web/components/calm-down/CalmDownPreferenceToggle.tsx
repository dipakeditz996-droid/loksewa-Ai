"use client";

import { useEffect, useState } from "react";
import { getCalmDownSkipPreference, setCalmDownSkipPreference } from "@/lib/calmDown/preferences";
import { cn } from "@/lib/utils";

/**
 * Lets a student turn the pre-exam Calm Down prompt off entirely, from
 * Settings. Stored locally (see lib/calmDown/preferences.ts) - this is a
 * device-level convenience, not account data.
 */
export function CalmDownPreferenceToggle({ className }: { className?: string }) {
  const [skip, setSkip] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSkip(getCalmDownSkipPreference());
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const next = !skip;
    setSkip(next);
    setCalmDownSkipPreference(next);
  };

  // Avoid a flash of the wrong state before localStorage has been read.
  if (!mounted) return null;

  return (
    <section className={cn("bg-card border border-border shadow-sm rounded-2xl p-6 flex flex-col gap-4", className)}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-muted text-lg"
        >
          🧘
        </span>
        <div className="min-w-0">
          <h2 className="text-[14px] font-bold text-primary dark:text-foreground tracking-tight">
            Pre-Exam Calm Down Prompt
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Optional 5-minute breathing break offered before mock exams and timed practice sessions.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:shrink-0">
        <span className={cn("text-[11px] font-bold uppercase tracking-wider", !skip ? "text-primary dark:text-foreground" : "text-muted-foreground")}>
          {skip ? "Not shown" : "Shown before each start"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={!skip}
          aria-label="Show the Calm Down prompt before exams and timed practice"
          onClick={handleToggle}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A72C] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
            !skip ? "bg-primary text-primary-foreground" : "bg-muted/80"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-card shadow ring-0 transition-transform",
              !skip ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>
    </section>
  );
}

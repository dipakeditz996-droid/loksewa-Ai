"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BREATHING_PHASE_GUIDANCE, BREATHING_PHASE_LABEL, type BreathingPhase } from "@/lib/calmDown/config";

interface BreathingPhaseLabelProps {
  phase: BreathingPhase;
  secondsLeft: number;
  reducedMotion: boolean;
}

/** Uppercase phase name, short guidance line, and the large per-second countdown - all read straight from useBreathingCycle's state, never a second timer. */
export function BreathingPhaseLabel({ phase, secondsLeft, reducedMotion }: BreathingPhaseLabelProps) {
  return (
    <div className="flex flex-col items-center gap-1.5" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={reducedMotion ? undefined : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <span className="text-[13px] font-bold uppercase tracking-[0.25em] text-[#F0C95A] sm:text-sm">
            {BREATHING_PHASE_LABEL[phase]}
          </span>
          <span className="mt-0.5 text-xs font-medium text-slate-400 sm:text-sm">
            {BREATHING_PHASE_GUIDANCE[phase]}
          </span>
        </motion.div>
      </AnimatePresence>
      <span className="mt-1 text-4xl font-black tabular-nums text-white sm:text-5xl">{secondsLeft}</span>
    </div>
  );
}

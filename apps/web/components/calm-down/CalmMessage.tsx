"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CALM_MESSAGES } from "@/lib/calmDown/config";

interface CalmMessageProps {
  secondsRemaining: number;
  totalSeconds: number;
  reducedMotion: boolean;
}

/** Rotates through CALM_MESSAGES roughly every 20s of the session countdown - reads the existing session timer, keeps no timer of its own. */
export function CalmMessage({ secondsRemaining, totalSeconds, reducedMotion }: CalmMessageProps) {
  const elapsed = totalSeconds - secondsRemaining;
  const index = Math.floor(elapsed / 20) % CALM_MESSAGES.length;
  const message = CALM_MESSAGES[index];

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={index}
        initial={reducedMotion ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="max-w-xs text-sm font-medium leading-relaxed text-slate-300 sm:max-w-sm sm:text-base"
      >
        {message}
      </motion.p>
    </AnimatePresence>
  );
}

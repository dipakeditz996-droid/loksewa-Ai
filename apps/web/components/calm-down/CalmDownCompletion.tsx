"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CALM_DOWN_COPY } from "@/lib/calmDown/config";

interface CalmDownCompletionProps {
  onStart: () => void;
  reducedMotion: boolean;
}

/** Shown once the session countdown hits zero. `onStart` is the exact same callback CalmDownExperience always had - no navigation/business logic here. */
export function CalmDownCompletion({ onStart, reducedMotion }: CalmDownCompletionProps) {
  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center gap-5"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#D4A72C]/40 bg-[#D4A72C]/10">
        <Check className="h-7 w-7 text-[#F0C95A]" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <h2 className="text-xl font-bold text-white sm:text-2xl">{CALM_DOWN_COPY.readyLine}</h2>
        <p className="text-sm text-slate-400">{CALM_DOWN_COPY.completionBody}</p>
      </div>
      <Button
        onClick={onStart}
        className="h-14 w-full max-w-xs bg-[#D4A72C] font-bold text-base text-[#0B1524] hover:bg-[#c29322] sm:w-auto sm:px-12"
      >
        {CALM_DOWN_COPY.startExam}
      </Button>
    </motion.div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { BREATHING_PHASE_ORDER, BREATHING_PHASE_SECONDS, type BreathingPhase } from "./config";

export interface BreathingState {
  phase: BreathingPhase;
  secondsLeft: number;
}

/** Loops inhale -> hold -> exhale -> inhale... every second while `active`. */
export function useBreathingCycle(active: boolean): BreathingState {
  const [state, setState] = useState<BreathingState>({
    phase: "inhale",
    secondsLeft: BREATHING_PHASE_SECONDS.inhale,
  });

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setState((prev) => {
        if (prev.secondsLeft > 1) {
          return { phase: prev.phase, secondsLeft: prev.secondsLeft - 1 };
        }
        const idx = BREATHING_PHASE_ORDER.indexOf(prev.phase);
        const nextPhase: BreathingPhase = BREATHING_PHASE_ORDER[(idx + 1) % BREATHING_PHASE_ORDER.length] ?? "inhale";
        return { phase: nextPhase, secondsLeft: BREATHING_PHASE_SECONDS[nextPhase] };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  return state;
}

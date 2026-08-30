"use client";

import { useCallback, useState } from "react";
import { CalmDownPrompt } from "./CalmDownPrompt";
import { CalmDownExperience } from "./CalmDownExperience";
import { getCalmDownSkipPreference } from "@/lib/calmDown/preferences";
import { trackCalmDownEvent } from "@/lib/calmDown/analytics";

type GateState = "idle" | "prompt" | "experience";

/**
 * Wraps any "Start Exam" / "Start Practice" action with the optional
 * pre-exam Calm Down flow.
 *
 * Usage:
 *   const { requestStart, gate } = useCalmDownGate(actuallyStartTheExam);
 *   <Button onClick={requestStart}>Start Exam</Button>
 *   {gate}
 *
 * `actuallyStartTheExam` is only ever invoked once the student is really
 * ready to begin - either immediately (Skip, or the student has opted out
 * of the prompt entirely), or after they press "Start Exam" inside the
 * Calm Down experience. Nothing about attempt creation or exam timing
 * lives in this hook; it only decides *when* to call the callback the
 * caller already had.
 */
export function useCalmDownGate(onStart: () => void) {
  const [state, setState] = useState<GateState>("idle");

  const requestStart = useCallback(() => {
    if (getCalmDownSkipPreference()) {
      onStart();
      return;
    }
    trackCalmDownEvent("calm_down_prompt_shown");
    setState("prompt");
  }, [onStart]);

  const handleAccept = useCallback(() => {
    setState("experience");
  }, []);

  const handleSkipFromPrompt = useCallback(() => {
    trackCalmDownEvent("calm_down_skipped");
    setState("idle");
    onStart();
  }, [onStart]);

  const handleStartFromExperience = useCallback(() => {
    setState("idle");
    onStart();
  }, [onStart]);

  const gate = (
    <>
      <CalmDownPrompt open={state === "prompt"} onAccept={handleAccept} onSkip={handleSkipFromPrompt} />
      {state === "experience" && <CalmDownExperience onStart={handleStartFromExperience} />}
    </>
  );

  return { requestStart, gate, isActive: state !== "idle" };
}

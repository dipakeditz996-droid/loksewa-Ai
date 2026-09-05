"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CALM_DOWN_DURATION_SECONDS,
  BREATHING_PHASE_SECONDS,
  CALM_DOWN_COPY,
  type AmbientAudioId,
} from "@/lib/calmDown/config";
import { useBreathingCycle } from "@/lib/calmDown/useBreathingCycle";
import { usePrefersReducedMotion } from "@/lib/calmDown/useReducedMotion";
import { calmDownAudioEngine } from "@/lib/calmDown/audioEngine";
import { trackCalmDownEvent } from "@/lib/calmDown/analytics";
import { BreathingLungs } from "./BreathingLungs";
import { BreathingPhaseLabel } from "./BreathingPhaseLabel";
import { SessionProgress } from "./SessionProgress";
import { CalmMessage } from "./CalmMessage";
import { CalmAudioControl } from "./CalmAudioControl";
import { CalmDownCompletion } from "./CalmDownCompletion";

interface CalmDownExperienceProps {
  /** Called when the student presses "Start Exam" - only place the exam is actually allowed to begin. */
  onStart: () => void;
}

export function CalmDownExperience({ onStart }: CalmDownExperienceProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(CALM_DOWN_DURATION_SECONDS);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [audioTrack, setAudioTrack] = useState<AmbientAudioId>("none");
  const [volume, setVolume] = useState(0.4);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const ready = secondsRemaining <= 0;
  const breathing = useBreathingCycle(!ready);

  useEffect(() => {
    trackCalmDownEvent("calm_down_started");
  }, []);

  // The session countdown - independent of the breathing phase cycle. Sole
  // source of truth for both the mm:ss readout and CalmMessage's rotation.
  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [ready]);

  useEffect(() => {
    if (ready) trackCalmDownEvent("calm_down_completed");
  }, [ready]);

  // Audio must stop the moment this component unmounts (session ends, skip, or navigation away).
  useEffect(() => {
    return () => {
      calmDownAudioEngine.stop();
    };
  }, []);

  const handleSelectAudio = (id: AmbientAudioId) => {
    setAudioTrack(id);
    calmDownAudioEngine.play(id, volume);
    setAudioBlocked(id !== "none" && calmDownAudioEngine.isSuspended());
    if (id !== "none") trackCalmDownEvent("calm_down_audio_enabled", { track: id });
  };

  const handleVolumeChange = (next: number) => {
    setVolume(next);
    calmDownAudioEngine.setVolume(next);
  };

  const handleTapToPlay = async () => {
    await calmDownAudioEngine.resume();
    setAudioBlocked(calmDownAudioEngine.isSuspended());
  };

  const handleStartExam = () => {
    calmDownAudioEngine.stop();
    onStart();
  };

  const handleSkipConfirmed = () => {
    calmDownAudioEngine.stop();
    trackCalmDownEvent("calm_down_skipped");
    onStart();
  };

  // Sole source of truth for how long the current phase's animation should
  // take - read straight from config, same numbers useBreathingCycle counts
  // down from. No second timer.
  const phaseDurationSeconds = BREATHING_PHASE_SECONDS[breathing.phase];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[#06101F] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Calm Down relaxation session"
    >
      {/* Premium ambient background: deep navy base + soft atmospheric glow + vignette */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,_rgba(103,201,255,0.10),_transparent_55%)]" />
        <div
          className={`absolute left-1/4 top-1/4 h-[420px] w-[420px] rounded-full bg-[#D4A72C]/[0.06] blur-[130px] ${
            reducedMotion ? "" : "animate-pulse-glow"
          }`}
        />
        <div
          className={`absolute right-1/4 bottom-1/4 h-[380px] w-[380px] rounded-full bg-cyan-500/[0.07] blur-[130px] ${
            reducedMotion ? "" : "animate-pulse-glow"
          }`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_rgba(2,6,14,0.55)_100%)]" />
      </div>

      {/* Skip control */}
      <div className="relative z-10 flex justify-end p-4 sm:p-6">
        <button
          onClick={() => setShowSkipConfirm(true)}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200 sm:text-sm"
        >
          {CALM_DOWN_COPY.skipDuring}
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-1 flex-col items-center justify-center gap-7 px-4 pb-10 text-center sm:gap-8"
      >
        <div>
          <h1 className="text-[26px] font-bold tracking-tight sm:text-4xl">{CALM_DOWN_COPY.experienceTitle}</h1>
          <p className="mt-1.5 text-sm text-slate-400 sm:text-base">{CALM_DOWN_COPY.experienceSubtitle}</p>
        </div>

        <AnimatePresence mode="wait">
          {ready ? (
            <CalmDownCompletion key="completion" onStart={handleStartExam} reducedMotion={reducedMotion} />
          ) : (
            <motion.div
              key="breathing"
              initial={reducedMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-6 sm:gap-7"
            >
              <BreathingPhaseLabel phase={breathing.phase} secondsLeft={breathing.secondsLeft} reducedMotion={reducedMotion} />
              <BreathingLungs
                phase={breathing.phase}
                phaseDurationSeconds={phaseDurationSeconds}
                reducedMotion={reducedMotion}
                ready={ready}
              />
              <SessionProgress secondsRemaining={secondsRemaining} totalSeconds={CALM_DOWN_DURATION_SECONDS} />
              <CalmMessage
                secondsRemaining={secondsRemaining}
                totalSeconds={CALM_DOWN_DURATION_SECONDS}
                reducedMotion={reducedMotion}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optional ambient audio */}
        <CalmAudioControl
          audioTrack={audioTrack}
          volume={volume}
          audioBlocked={audioBlocked}
          onSelect={handleSelectAudio}
          onVolumeChange={handleVolumeChange}
          onTapToPlay={handleTapToPlay}
        />
      </motion.div>

      {/* Skip confirmation */}
      {showSkipConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0B1524] p-6 text-center shadow-2xl">
            <p className="text-base font-semibold text-white">{CALM_DOWN_COPY.skipConfirmTitle}</p>
            <div className="mt-5 flex flex-col gap-2.5">
              <Button
                onClick={() => setShowSkipConfirm(false)}
                variant="outline"
                className="h-12 w-full border-white/15 bg-transparent font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                {CALM_DOWN_COPY.skipConfirmContinue}
              </Button>
              <Button
                onClick={handleSkipConfirmed}
                className="h-12 w-full bg-[#D4A72C] font-bold text-[#0B1524] hover:bg-[#c29322]"
              >
                {CALM_DOWN_COPY.skipConfirmSkip}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

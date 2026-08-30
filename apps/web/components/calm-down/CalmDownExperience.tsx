"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CALM_DOWN_DURATION_SECONDS,
  BREATHING_PHASE_LABEL,
  AMBIENT_AUDIO_OPTIONS,
  AUDIO_DISCLAIMER,
  CALM_DOWN_COPY,
  type AmbientAudioId,
} from "@/lib/calmDown/config";
import { useBreathingCycle } from "@/lib/calmDown/useBreathingCycle";
import { usePrefersReducedMotion } from "@/lib/calmDown/useReducedMotion";
import { calmDownAudioEngine } from "@/lib/calmDown/audioEngine";
import { trackCalmDownEvent } from "@/lib/calmDown/analytics";

interface CalmDownExperienceProps {
  /** Called when the student presses "Start Exam" - only place the exam is actually allowed to begin. */
  onStart: () => void;
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

  // The 2-minute countdown - independent of the breathing phase cycle.
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

  // Breathing circle scale + transition duration, derived from the current phase.
  const phaseSeconds = { inhale: 4, hold: 2, exhale: 6 }; // mirrors BREATHING_PATTERN for the transition timing
  const circleScale = reducedMotion
    ? 1
    : breathing.phase === "inhale"
    ? 1.35
    : breathing.phase === "exhale"
    ? 1
    : 1.35; // holds at the expanded size
  const circleDuration = breathing.phase === "hold" ? 0 : phaseSeconds[breathing.phase];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-gradient-to-b from-[#050B16] via-[#0B1526] to-[#050B16] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Calm Down relaxation session"
    >
      {/* Ambient background glow - static under reduced motion */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute left-1/4 top-1/4 h-[420px] w-[420px] rounded-full bg-[#D4A72C]/[0.08] blur-[120px] ${
            reducedMotion ? "" : "animate-pulse-glow"
          }`}
        />
        <div
          className={`absolute right-1/4 bottom-1/4 h-[380px] w-[380px] rounded-full bg-blue-500/[0.08] blur-[120px] ${
            reducedMotion ? "" : "animate-pulse-glow"
          }`}
        />
      </div>

      {/* Skip control */}
      <div className="relative z-10 flex justify-end p-4 sm:p-6">
        <button
          onClick={() => setShowSkipConfirm(true)}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {CALM_DOWN_COPY.skipDuring}
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-10 text-center sm:gap-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{CALM_DOWN_COPY.experienceTitle}</h1>
          <p className="mt-1 text-sm text-slate-400 sm:text-base">{CALM_DOWN_COPY.experienceSubtitle}</p>
        </div>

        {/* Breathing circle */}
        <div className="relative flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-[#D4A72C]/25 to-blue-500/20 border border-white/10"
            style={{
              transform: `scale(${circleScale})`,
              transition: reducedMotion
                ? "opacity 0.3s ease"
                : `transform ${circleDuration}s ease-in-out`,
            }}
          />
          <div className="absolute inset-6 rounded-full bg-white/[0.04] backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-1">
            {ready ? (
              <span className="text-xl font-bold sm:text-2xl">{CALM_DOWN_COPY.readyLine}</span>
            ) : (
              <>
                <span className="text-lg font-bold uppercase tracking-widest text-[#F0C95A] sm:text-xl">
                  {BREATHING_PHASE_LABEL[breathing.phase]}
                </span>
                <span className="text-4xl font-black tabular-nums sm:text-5xl">{breathing.secondsLeft}</span>
              </>
            )}
          </div>
        </div>

        {/* 5-minute countdown */}
        <div className="text-5xl font-black tabular-nums tracking-tight sm:text-6xl">
          {formatMMSS(secondsRemaining)}
        </div>

        {ready ? (
          <Button
            onClick={handleStartExam}
            className="h-14 w-full max-w-xs bg-[#D4A72C] hover:bg-[#c29322] text-[#0B1524] font-bold text-base sm:w-auto sm:px-12"
          >
            {CALM_DOWN_COPY.startExam}
          </Button>
        ) : (
          <p className="max-w-sm text-xs text-slate-500 sm:text-sm">
            Take a short breathing break before you begin. Individual responses to breathing exercises vary.
          </p>
        )}

        {/* Optional ambient audio */}
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Relaxation Sound</p>

          <RadioGroup
            value={audioTrack}
            onValueChange={(v) => handleSelectAudio(v as AmbientAudioId)}
            className="gap-2.5"
          >
            {AMBIENT_AUDIO_OPTIONS.map((opt) => (
              <label key={opt.id} htmlFor={`calm-audio-${opt.id}`} className="flex items-center gap-2.5 cursor-pointer">
                <RadioGroupItem
                  value={opt.id}
                  id={`calm-audio-${opt.id}`}
                  className="border-white/30 text-[#D4A72C]"
                />
                <span className="text-sm text-slate-200">{opt.label}</span>
              </label>
            ))}
          </RadioGroup>

          {audioTrack !== "none" && (
            <div className="mt-4 flex items-center gap-3">
              {volume === 0 ? (
                <VolumeX className="h-4 w-4 text-slate-400 shrink-0" />
              ) : (
                <Volume2 className="h-4 w-4 text-slate-400 shrink-0" />
              )}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                aria-label="Relaxation audio volume"
                className="flex-1 h-1.5 rounded-full bg-white/10 accent-[#D4A72C]"
              />
            </div>
          )}

          {audioBlocked && (
            <button
              onClick={handleTapToPlay}
              className="mt-3 w-full rounded-lg border border-[#D4A72C]/40 bg-[#D4A72C]/10 py-2 text-xs font-semibold text-[#F0C95A]"
            >
              Tap to play relaxation audio
            </button>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{AUDIO_DISCLAIMER}</p>
        </div>
      </div>

      {/* Skip confirmation */}
      {showSkipConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0B1524] p-6 text-center shadow-2xl">
            <p className="text-base font-semibold text-white">{CALM_DOWN_COPY.skipConfirmTitle}</p>
            <div className="mt-5 flex flex-col gap-2.5">
              <Button
                onClick={() => setShowSkipConfirm(false)}
                variant="outline"
                className="h-12 w-full border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold"
              >
                {CALM_DOWN_COPY.skipConfirmContinue}
              </Button>
              <Button
                onClick={handleSkipConfirmed}
                className="h-12 w-full bg-[#D4A72C] hover:bg-[#c29322] text-[#0B1524] font-bold"
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

"use client";

import { Volume2, VolumeX } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AMBIENT_AUDIO_OPTIONS, AUDIO_DISCLAIMER, type AmbientAudioId } from "@/lib/calmDown/config";

interface CalmAudioControlProps {
  audioTrack: AmbientAudioId;
  volume: number;
  audioBlocked: boolean;
  onSelect: (id: AmbientAudioId) => void;
  onVolumeChange: (next: number) => void;
  onTapToPlay: () => void;
}

/** Same audio behavior/state as before (lib/calmDown/audioEngine.ts) - presentation only, kept secondary to the breathing visualization above it. */
export function CalmAudioControl({
  audioTrack,
  volume,
  audioBlocked,
  onSelect,
  onVolumeChange,
  onTapToPlay,
}: CalmAudioControlProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-left backdrop-blur-sm">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Relaxation Sound</p>

      <RadioGroup value={audioTrack} onValueChange={(v) => onSelect(v as AmbientAudioId)} className="gap-2.5">
        {AMBIENT_AUDIO_OPTIONS.map((opt) => (
          <label key={opt.id} htmlFor={`calm-audio-${opt.id}`} className="flex items-center gap-2.5 cursor-pointer">
            <RadioGroupItem value={opt.id} id={`calm-audio-${opt.id}`} className="border-white/30 text-[#D4A72C]" />
            <span className="text-sm text-slate-300">{opt.label}</span>
          </label>
        ))}
      </RadioGroup>

      {audioTrack !== "none" && (
        <div className="mt-4 flex items-center gap-3">
          {volume === 0 ? (
            <VolumeX className="h-4 w-4 shrink-0 text-slate-500" />
          ) : (
            <Volume2 className="h-4 w-4 shrink-0 text-slate-500" />
          )}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Relaxation audio volume"
            className="h-1.5 flex-1 rounded-full bg-white/10 accent-[#D4A72C]"
          />
        </div>
      )}

      {audioBlocked && (
        <button
          onClick={onTapToPlay}
          className="mt-3 w-full rounded-lg border border-[#D4A72C]/40 bg-[#D4A72C]/10 py-2 text-xs font-semibold text-[#F0C95A] transition-colors hover:bg-[#D4A72C]/15"
        >
          Tap to play relaxation audio
        </button>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-600">{AUDIO_DISCLAIMER}</p>
    </div>
  );
}

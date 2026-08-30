/**
 * Procedurally generated ambient audio for the Calm Down experience.
 *
 * The project ships no audio assets anywhere (no public/audio, no media
 * storage entries, no existing player utility) and downloading third-party
 * "ambient" or "binaural" tracks from the web carries real licensing risk
 * with no way to verify it here. Instead every option is synthesized at
 * runtime with the Web Audio API - a soft filtered-noise bed for "Calm
 * Ambient", and two-oscillator tone pairs (one per ear, a few Hz apart) for
 * the "-style" options. Nothing is downloaded, nothing is copyrighted,
 * and volume always starts low and ramps in - never a sudden loud tone.
 *
 * These are deliberately named "-style" everywhere they reach the UI: they
 * are not clinically validated brainwave-entrainment audio, just a gentle
 * two-tone ambience loosely themed around those frequency ranges.
 */
import type { AmbientAudioId } from "./config";

// Per-ear frequency offsets used for the "-style" tone pairs. These sit far
// below audible beat-frequency claims - they are simply pleasant, distinct
// two-tone ambiences, not tuned for any asserted neurological effect.
const TONE_PAIRS: Partial<Record<AmbientAudioId, { left: number; right: number }>> = {
  alpha: { left: 220, right: 228 }, // ~8Hz apart
  beta: { left: 220, right: 236 }, // ~16Hz apart
  gamma: { left: 220, right: 260 }, // ~40Hz apart
};

class CalmDownAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private current: AmbientAudioId = "none";

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private stopActiveNodes() {
    this.activeNodes.forEach((node) => {
      try {
        (node as OscillatorNode).stop?.();
      } catch {
        // Already stopped.
      }
      try {
        node.disconnect();
      } catch {
        // Already disconnected.
      }
    });
    this.activeNodes = [];
  }

  private buildNoiseBed(ctx: AudioContext, destination: AudioNode) {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Brown-ish noise: integrate white noise so it sounds like soft rain
    // rather than harsh static.
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;

    source.connect(filter);
    filter.connect(destination);
    source.start();
    this.activeNodes.push(source, filter);
  }

  private buildTonePair(ctx: AudioContext, destination: AudioNode, left: number, right: number) {
    const merger = ctx.createChannelMerger(2);

    const leftOsc = ctx.createOscillator();
    leftOsc.type = "sine";
    leftOsc.frequency.value = left;
    const leftGain = ctx.createGain();
    leftGain.gain.value = 0.5;
    leftOsc.connect(leftGain);
    leftGain.connect(merger, 0, 0);

    const rightOsc = ctx.createOscillator();
    rightOsc.type = "sine";
    rightOsc.frequency.value = right;
    const rightGain = ctx.createGain();
    rightGain.gain.value = 0.5;
    rightOsc.connect(rightGain);
    rightGain.connect(merger, 0, 1);

    merger.connect(destination);
    leftOsc.start();
    rightOsc.start();
    this.activeNodes.push(leftOsc, rightOsc, leftGain, rightGain, merger);
  }

  /** Starts (or switches to) a track. Volume ramps in over ~1.5s - never a hard start. */
  play(track: AmbientAudioId, volume: number) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    this.stopActiveNodes();
    this.current = track;

    if (track === "none") {
      this.masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      return;
    }

    if (track === "calm") {
      this.buildNoiseBed(ctx, this.masterGain);
    } else {
      const pair = TONE_PAIRS[track];
      if (pair) this.buildTonePair(ctx, this.masterGain, pair.left, pair.right);
    }

    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)), now + 1.5);
  }

  setVolume(volume: number) {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime, 0.15);
  }

  /** True if the browser is blocking audio until another user gesture resumes it. */
  isSuspended(): boolean {
    return this.ctx?.state === "suspended";
  }

  /** Retries resuming the AudioContext - call from a fresh click/tap handler. */
  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  stop() {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
    // Let the fade-out finish before tearing down oscillators.
    window.setTimeout(() => this.stopActiveNodes(), 250);
    this.current = "none";
  }

  get currentTrack() {
    return this.current;
  }
}

// One engine per browser tab - audio should never come from two instances.
export const calmDownAudioEngine = new CalmDownAudioEngine();

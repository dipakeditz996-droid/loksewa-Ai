/**
 * Pre-Exam Calm Down — configuration constants.
 *
 * This is a wellness feature, not a performance guarantee. Keep all
 * copy here honest: "optional", "may help you relax", never claims about
 * IQ, brainwave synchronization, or improved scores. See AUDIO_TRACKS
 * disclaimer below for the audio-specific wording.
 */

/** Total length of the relaxation session, in seconds. */
export const CALM_DOWN_DURATION_SECONDS = 2 * 60;


/**
 * The breathing cycle. Adjustable here without touching any component -
 * the UI reads these numbers and derives everything else (phase labels,
 * countdown digits, circle animation duration) from them.
 */
export const BREATHING_PATTERN = {
  inhaleSeconds: 4,
  holdSeconds: 2,
  exhaleSeconds: 6,
} as const;

export type BreathingPhase = "inhale" | "hold" | "exhale";

export const BREATHING_PHASE_ORDER: BreathingPhase[] = ["inhale", "hold", "exhale"];

export const BREATHING_PHASE_LABEL: Record<BreathingPhase, string> = {
  inhale: "Inhale",
  hold: "Hold",
  exhale: "Exhale",
};

export const BREATHING_PHASE_SECONDS: Record<BreathingPhase, number> = {
  inhale: BREATHING_PATTERN.inhaleSeconds,
  hold: BREATHING_PATTERN.holdSeconds,
  exhale: BREATHING_PATTERN.exhaleSeconds,
};

export type AmbientAudioId = "none" | "calm" | "alpha" | "beta" | "gamma";

export interface AmbientAudioOption {
  id: AmbientAudioId;
  label: string;
  description: string;
}

/**
 * Deliberately "-style" naming throughout - these are procedurally
 * generated ambient tones (see lib/calmDown/audioEngine.ts), not clinically
 * validated brainwave-entrainment audio. Never rename these to drop the
 * "-style" qualifier or add a performance claim.
 */
export const AMBIENT_AUDIO_OPTIONS: AmbientAudioOption[] = [
  { id: "none", label: "None", description: "Silence. No audio plays." },
  { id: "calm", label: "Calm Ambient", description: "Soft, filtered ambient noise, like distant rain." },
  { id: "alpha", label: "Alpha-style Ambient", description: "A gentle low-frequency tone pairing." },
  { id: "beta", label: "Beta-style Ambient", description: "A gentle mid-frequency tone pairing." },
  { id: "gamma", label: "Gamma-style Ambient", description: "A gentle higher-frequency tone pairing." },
];

export const AUDIO_DISCLAIMER =
  "These sounds are provided as optional relaxation audio. Individual responses may vary, and they are not a medical treatment.";

export const CALM_DOWN_COPY = {
  promptTitle: "Ready to Begin?",
  promptBody: "Would you like to take 2 minutes to calm your mind before starting? A short breathing exercise can help you pause, relax, and prepare.",
  promptAccept: "Yes, Calm My Mind",

  promptSkip: "Skip & Start Exam",
  experienceTitle: "Calm Down",
  experienceSubtitle: "Take a moment to breathe and reset.",
  readyLine: "You're ready.",
  completionBody: "Your breathing session is complete.",
  startExam: "Start Exam",
  skipDuring: "Skip Calm Down",
  skipConfirmTitle: "Skip the relaxation session and start your exam?",
  skipConfirmContinue: "Continue Calm Down",
  skipConfirmSkip: "Skip & Start Exam",
} as const;

/** Short instruction shown alongside the phase label + countdown. */
export const BREATHING_PHASE_GUIDANCE: Record<BreathingPhase, string> = {
  inhale: "Slowly breathe in",
  hold: "Hold gently",
  exhale: "Slowly breathe out",
};

/**
 * Calming lines shown at the bottom of the experience, cross-fading every
 * few breathing cycles. Kept short and non-clinical - see the module
 * docstring above about honest, non-medical wellness copy.
 */
export const CALM_MESSAGES: string[] = [
  "Let your breathing slow your thoughts.",
  "Prepare your mind for focused learning.",
  "One breath at a time.",
  "Slow your breathing. Clear your mind.",
];

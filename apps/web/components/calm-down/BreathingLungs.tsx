"use client";

import { useMemo } from "react";
import type { BreathingPhase } from "@/lib/calmDown/config";

interface BreathingLungsProps {
  phase: BreathingPhase;
  /** Seconds the *current* phase lasts in total - drives the transition duration, mirroring the single breathing timer in useBreathingCycle. */
  phaseDurationSeconds: number;
  reducedMotion: boolean;
  /** True once the session countdown has hit zero - settles the lungs at rest. */
  ready: boolean;
}

const PARTICLE_ANGLES = [15, 55, 95, 135, 175, 215, 255, 295, 335];

/**
 * Stylized, symbolic pair of lungs - not an anatomical illustration. Scale
 * and glow are driven entirely by `phase`/`phaseDurationSeconds`, which come
 * straight from useBreathingCycle (lib/calmDown/useBreathingCycle.ts) - this
 * component owns no timer of its own.
 */
export function BreathingLungs({ phase, phaseDurationSeconds, reducedMotion, ready }: BreathingLungsProps) {
  const expanded = ready ? false : phase === "inhale" || phase === "hold";
  const scale = reducedMotion ? 1 : expanded ? 1.08 : 1;
  const glowOpacity = ready ? 0.35 : expanded ? 0.55 : 0.28;
  // Holding snaps instantly to the already-expanded size (nothing left to
  // animate towards); inhale/exhale animate over their own phase length.
  const transitionSeconds = phase === "hold" ? 0 : phaseDurationSeconds;
  // Percent-of-container radius the particles sit at - shrinks toward the
  // lungs on inhale/hold, drifts back out on exhale.
  const particleRadiusPct = reducedMotion ? 43 : expanded ? 33 : 46;

  const particles = useMemo(
    () =>
      PARTICLE_ANGLES.map((angle, i) => ({
        angle,
        delay: (i % 5) * 0.6,
        size: i % 3 === 0 ? 3 : 2,
      })),
    []
  );

  return (
    <div className="relative flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80" aria-hidden="true">
      {/* Ambient orbit particles - independent slow drift, plus a phase-driven radius so they visibly move inward on inhale / outward on exhale. */}
      {!reducedMotion &&
        particles.map((p, i) => {
          const rad = (p.angle * Math.PI) / 180;
          const x = 50 + particleRadiusPct * Math.cos(rad);
          const y = 50 + particleRadiusPct * Math.sin(rad);
          return (
            <span
              key={i}
              className="absolute rounded-full bg-cyan-200/40 animate-calm-particle-drift"
              style={{
                width: p.size,
                height: p.size,
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
                transition: `left ${transitionSeconds || 1.2}s ease-in-out, top ${transitionSeconds || 1.2}s ease-in-out`,
                animationDelay: `${p.delay}s`,
              }}
            />
          );
        })}

      {/* Soft radial glow behind the lungs */}
      <div
        className="absolute h-full w-full rounded-full bg-[radial-gradient(closest-side,_rgba(103,201,255,0.35),_rgba(212,167,44,0.12)_65%,_transparent_80%)] blur-2xl"
        style={{
          opacity: glowOpacity,
          transform: `scale(${reducedMotion ? 1 : expanded ? 1.15 : 0.92})`,
          transition: reducedMotion
            ? "opacity 0.4s ease"
            : `opacity ${transitionSeconds || 0.6}s ease-in-out, transform ${transitionSeconds || 0.6}s ease-in-out`,
        }}
      />

      {/* Faint orbital ring */}
      <div className="absolute h-[88%] w-[88%] rounded-full border border-white/[0.06]" />

      <svg
        viewBox="0 0 200 220"
        className="relative h-[62%] w-[62%] sm:h-[58%] sm:w-[58%]"
        role="img"
        aria-label="Stylized lung illustration animating with the breathing phase"
      >
        <defs>
          <linearGradient id="calmLungFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(148, 210, 255, 0.28)" />
            <stop offset="100%" stopColor="rgba(212, 167, 44, 0.12)" />
          </linearGradient>
          <linearGradient id="calmLungStroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(199, 231, 255, 0.9)" />
            <stop offset="100%" stopColor="rgba(240, 201, 90, 0.55)" />
          </linearGradient>
        </defs>

        <g
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "100px 118px",
            transition: reducedMotion
              ? "opacity 0.4s ease"
              : `transform ${transitionSeconds || 0.6}s cubic-bezier(0.45, 0, 0.4, 1)`,
          }}
          className={!reducedMotion && phase === "hold" && !ready ? "animate-calm-heartbeat" : undefined}
        >
          {/* Trachea + primary bronchi */}
          <path
            d="M100,10 L100,40 M100,40 C100,40 89,43 87,50 M100,40 C100,40 111,43 113,50"
            fill="none"
            stroke="url(#calmLungStroke)"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.6}
          />

          {/* Right lobe (viewer's left) */}
          <path
            d="M92,42 C68,40 36,62 30,100 C25,133 32,168 56,187 C70,198 87,193 92,178 C97,152 97,90 92,42 Z"
            fill="url(#calmLungFill)"
            stroke="url(#calmLungStroke)"
            strokeWidth={1.5}
          />
          {/* Left lobe (viewer's right, mirrored) */}
          <path
            d="M108,42 C132,40 164,62 170,100 C175,133 168,168 144,187 C130,198 113,193 108,178 C103,152 103,90 108,42 Z"
            fill="url(#calmLungFill)"
            stroke="url(#calmLungStroke)"
            strokeWidth={1.5}
          />

          {/* Subtle bronchial branch lines */}
          <path
            d="M87,50 C76,60 64,74 58,96 M87,50 C80,66 71,86 66,112"
            fill="none"
            stroke="rgba(233,244,255,0.22)"
            strokeWidth={1}
            strokeLinecap="round"
          />
          <path
            d="M113,50 C124,60 136,74 142,96 M113,50 C120,66 129,86 134,112"
            fill="none"
            stroke="rgba(233,244,255,0.22)"
            strokeWidth={1}
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

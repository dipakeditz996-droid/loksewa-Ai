"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

/**
 * SSR-safe reduced-motion read. Framer Motion's own `useReducedMotion` reads
 * `matchMedia` synchronously on the client's very first render (hydration),
 * which can't match the server (no `window` there) — for anyone with the
 * preference actually on, that mismatch trips a React hydration error on
 * every load. Starting at `false` (matching what SSR assumes) and syncing
 * the real value in an effect keeps the hydration render identical to the
 * server; the true preference then applies a frame later.
 */
export function useSafeReducedMotion(): boolean {
  const raw = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    setReducedMotion(!!raw);
  }, [raw]);
  return reducedMotion;
}

export type DepthTier = "near" | "mid" | "far" | "background";

interface TierConfig {
  /** Max px the layer travels on full pointer throw — near moves most, background least. */
  parallax: number;
  /** Idle float travel range in px. */
  floatRange: number;
  /** Idle float loop duration in seconds. */
  floatDuration: number;
  /** Entrance stagger delay in seconds — near enters first. */
  entranceDelay: number;
}

/**
 * Depth-tier config for the hero's floating cards. Keeping this in one place
 * makes the "which card sits above which" relationship easy to re-tune
 * without hunting through the component tree.
 */
export const DEPTH_TIERS: Record<DepthTier, TierConfig> = {
  near: { parallax: 22, floatRange: 6, floatDuration: 6.5, entranceDelay: 0 },
  mid: { parallax: 14, floatRange: 5, floatDuration: 5, entranceDelay: 0.15 },
  far: { parallax: 7, floatRange: 4, floatDuration: 4, entranceDelay: 0.3 },
  background: { parallax: 4, floatRange: 0, floatDuration: 0, entranceDelay: 0 },
};

interface HeroDepth {
  containerRef: RefObject<HTMLDivElement | null>;
  /** False under prefers-reduced-motion or on coarse (touch) pointers. */
  parallaxEnabled: boolean;
  /** Framer Motion's own reduced-motion signal — gate idle float/entrance stagger on this. */
  reducedMotion: boolean;
  tiers: Record<DepthTier, { x: MotionValue<number>; y: MotionValue<number> }>;
}

/**
 * One shared pointer position (normalized -1..1 on each axis), read into four
 * independent spring-smoothed offsets — one per depth tier — so every layer
 * follows the same cursor movement but at its own parallax strength.
 * Mouse tracking is skipped entirely under prefers-reduced-motion or on
 * touch/coarse-pointer devices; the springs simply stay settled at 0.
 */
export function useHeroDepth(): HeroDepth {
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallaxEnabled, setParallaxEnabled] = useState(false);
  const reducedMotion = useSafeReducedMotion();

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(pointer: fine)");

    const evaluate = () => setParallaxEnabled(pointerQuery.matches && !motionQuery.matches);
    evaluate();

    motionQuery.addEventListener("change", evaluate);
    pointerQuery.addEventListener("change", evaluate);
    return () => {
      motionQuery.removeEventListener("change", evaluate);
      pointerQuery.removeEventListener("change", evaluate);
    };
  }, []);

  useEffect(() => {
    if (!parallaxEnabled) {
      pointerX.set(0);
      pointerY.set(0);
      return;
    }
    const node = containerRef.current;
    if (!node) return;

    function handleMove(e: MouseEvent) {
      const rect = node!.getBoundingClientRect();
      pointerX.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
      pointerY.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
    }
    function handleLeave() {
      pointerX.set(0);
      pointerY.set(0);
    }

    node.addEventListener("mousemove", handleMove);
    node.addEventListener("mouseleave", handleLeave);
    return () => {
      node.removeEventListener("mousemove", handleMove);
      node.removeEventListener("mouseleave", handleLeave);
    };
  }, [parallaxEnabled, pointerX, pointerY]);

  const springX = useSpring(pointerX, { stiffness: 55, damping: 18, mass: 0.6 });
  const springY = useSpring(pointerY, { stiffness: 55, damping: 18, mass: 0.6 });

  const near = {
    x: useTransform(springX, [-1, 1], [-DEPTH_TIERS.near.parallax, DEPTH_TIERS.near.parallax]),
    y: useTransform(springY, [-1, 1], [-DEPTH_TIERS.near.parallax, DEPTH_TIERS.near.parallax]),
  };
  const mid = {
    x: useTransform(springX, [-1, 1], [-DEPTH_TIERS.mid.parallax, DEPTH_TIERS.mid.parallax]),
    y: useTransform(springY, [-1, 1], [-DEPTH_TIERS.mid.parallax, DEPTH_TIERS.mid.parallax]),
  };
  const far = {
    x: useTransform(springX, [-1, 1], [-DEPTH_TIERS.far.parallax, DEPTH_TIERS.far.parallax]),
    y: useTransform(springY, [-1, 1], [-DEPTH_TIERS.far.parallax, DEPTH_TIERS.far.parallax]),
  };
  const background = {
    x: useTransform(springX, [-1, 1], [-DEPTH_TIERS.background.parallax, DEPTH_TIERS.background.parallax]),
    y: useTransform(springY, [-1, 1], [-DEPTH_TIERS.background.parallax, DEPTH_TIERS.background.parallax]),
  };

  return { containerRef, parallaxEnabled, reducedMotion, tiers: { near, mid, far, background } };
}

/**
 * Cursor-following "magnetic" shift for a button, capped to `strength` px and
 * cleared on mouse leave. Disabled under prefers-reduced-motion or on
 * touch/coarse pointers — same detection convention as useHeroDepth.
 */
export function useMagneticHover(strength = 10) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 15, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 200, damping: 15, mass: 0.4 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(pointer: fine)");
    const evaluate = () => setEnabled(pointerQuery.matches && !motionQuery.matches);
    evaluate();
    motionQuery.addEventListener("change", evaluate);
    pointerQuery.addEventListener("change", evaluate);
    return () => {
      motionQuery.removeEventListener("change", evaluate);
      pointerQuery.removeEventListener("change", evaluate);
    };
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set(((e.clientX - rect.left) / rect.width - 0.5) * 2 * strength);
    y.set(((e.clientY - rect.top) / rect.height - 0.5) * 2 * strength);
  }
  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return { ref, x: springX, y: springY, handleMouseMove, handleMouseLeave };
}

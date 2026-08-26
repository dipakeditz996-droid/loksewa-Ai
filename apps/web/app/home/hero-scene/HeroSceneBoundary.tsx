"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { HeroSceneFallback } from "./HeroSceneFallback";
import { SceneErrorBoundary } from "./SceneErrorBoundary";

const HeroScene3D = dynamic(() => import("./HeroScene3D"), {
  ssr: false,
  loading: () => <HeroSceneFallback />,
});

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

/**
 * Gates the R3F canvas behind: viewport visibility, prefers-reduced-motion,
 * a coarse WebGL capability check, and a mobile-aware DPR cap. Renders the
 * static SVG silhouette until every condition for the real scene is met.
 */
export function HeroSceneBoundary({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [interactive, setInteractive] = useState(true);
  const [dpr, setDpr] = useState(1);
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    setWebglOk(supportsWebGL());

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(pointer: fine)");
    setReducedMotion(motionQuery.matches);
    setInteractive(pointerQuery.matches);

    const isMobile = window.innerWidth < 768;
    setDpr(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

    const onMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    const onPointerChange = (e: MediaQueryListEvent) => setInteractive(e.matches);
    motionQuery.addEventListener("change", onMotionChange);
    pointerQuery.addEventListener("change", onPointerChange);

    setReady(true);

    return () => {
      motionQuery.removeEventListener("change", onMotionChange);
      pointerQuery.removeEventListener("change", onPointerChange);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const canRender3D = ready && inView && webglOk;

  return (
    <div ref={containerRef} className={className} style={{ pointerEvents: "none" }}>
      <SceneErrorBoundary fallback={<HeroSceneFallback />}>
        {canRender3D ? (
          <Suspense fallback={<HeroSceneFallback />}>
            <HeroScene3D reducedMotion={reducedMotion} interactive={interactive} dpr={dpr} />
          </Suspense>
        ) : (
          <HeroSceneFallback />
        )}
      </SceneErrorBoundary>
    </div>
  );
}

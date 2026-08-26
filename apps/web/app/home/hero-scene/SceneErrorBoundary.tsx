"use client";

import { Component, type ReactNode } from "react";

/**
 * Catches WebGL/context-creation failures (unsupported browser, GPU
 * blocklisted, out-of-memory context loss on very low-end devices) and
 * drops back to the static fallback instead of taking down the hero.
 */
export class SceneErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("HeroScene3D failed, falling back to static visual:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

"use client";

import React, { useState, useEffect, useRef } from "react";

interface CountUpProps {
  value: number | string;
  startValue?: number;
  duration?: number; // in seconds
  precision?: number;
  thousandSeparator?: boolean;
  prefix?: string;
  suffix?: string;
  enabled?: boolean;
  className?: string;
}

/**
 * Format a number into display string with thousand separators, decimals, prefix, and suffix.
 */
function formatNumberDisplay(
  num: number,
  precision: number,
  thousandSeparator: boolean,
  prefix: string,
  suffix: string
): string {
  if (isNaN(num)) return `${prefix}${num}${suffix}`;

  let formattedNum: string;
  if (precision > 0) {
    formattedNum = num.toFixed(precision);
    if (thousandSeparator) {
      const parts = formattedNum.split(".");
      parts[0] = parseInt(parts[0] || "0", 10).toLocaleString("en-US");
      formattedNum = parts.join(".");
    }
  } else {
    const intVal = Math.round(num);
    formattedNum = thousandSeparator ? intVal.toLocaleString("en-US") : intVal.toString();
  }

  return `${prefix}${formattedNum}${suffix}`;
}

/**
 * Cubic ease-out curve: decelerates gracefully to rest at 1.0.
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUp({
  value,
  startValue = 0,
  duration = 1.5,
  precision = 0,
  thousandSeparator = true,
  prefix = "",
  suffix = "",
  enabled = true,
  className = "",
}: CountUpProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  // Check if value is numeric
  const numericTarget = typeof value === "number" ? value : parseFloat(String(value));
  const isNumeric = !isNaN(numericTarget);

  // Final formatted string for static fallback or screen readers
  const finalDisplay = isNumeric
    ? formatNumberDisplay(numericTarget, precision, thousandSeparator, prefix, suffix)
    : `${prefix}${value}${suffix}`;

  const safeStart = isNumeric ? Math.min(startValue, numericTarget) : 0;
  const initialDisplay = enabled && isNumeric
    ? formatNumberDisplay(safeStart, precision, thousandSeparator, prefix, suffix)
    : finalDisplay;

  const [displayText, setDisplayText] = useState<string>(initialDisplay);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // If not numeric or animation is disabled, render final immediately
    if (!isNumeric || !enabled) {
      setDisplayText(finalDisplay);
      return;
    }

    // Check prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayText(finalDisplay);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    let rafId: number | null = null;

    const startAnimation = () => {
      if (hasAnimatedRef.current) return;
      hasAnimatedRef.current = true;

      const startTime = performance.now();
      const durationMs = Math.max(duration * 1000, 200); // minimum 200ms
      const delta = numericTarget - safeStart;

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const easedProgress = easeOutCubic(progress);
        const currentVal = safeStart + delta * easedProgress;

        if (progress < 1) {
          setDisplayText(formatNumberDisplay(currentVal, precision, thousandSeparator, prefix, suffix));
          rafId = requestAnimationFrame(tick);
        } else {
          setDisplayText(finalDisplay);
        }
      };

      rafId = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          observer.disconnect();
          startAnimation();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [value, startValue, duration, precision, thousandSeparator, prefix, suffix, enabled, isNumeric, numericTarget, safeStart, finalDisplay]);

  return (
    <span
      ref={containerRef}
      className={`tabular-nums inline-block ${className}`}
      aria-label={finalDisplay}
      title={finalDisplay}
    >
      {displayText}
    </span>
  );
}

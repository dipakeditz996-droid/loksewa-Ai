"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { getMediaFallbackUrl } from "@/lib/api/client";

// Same problem as RetryImage (see that file), but for spots using next/image
// with `fill` + `unoptimized` instead of a plain <img>. A freshly-uploaded
// Google Drive-hosted image can fail to load for a while after upload -
// confirmed to sometimes take well over 30 seconds, but it has ALWAYS
// eventually succeeded in testing (CDN propagation delay, not a genuinely
// missing file). Retry with fast backoff at first, then keep retrying
// indefinitely at a fixed, gentle interval rather than ever giving up.
const FAST_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];
const SLOW_RETRY_INTERVAL_MS = 60000;

export function RetryNextImage({ onError, src, ...props }: ImageProps) {
  const [attempt, setAttempt] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasFallenBack, setHasFallenBack] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setAttempt(0);
    setCurrentSrc(src);
    setHasFallenBack(false);
  }, [src]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleError = (e: any) => {
    const srcStr = typeof currentSrc === "string" ? currentSrc : "";
    const fallback = getMediaFallbackUrl(srcStr);

    if (fallback && !hasFallenBack && fallback !== srcStr) {
      setHasFallenBack(true);
      setCurrentSrc(fallback as any);
      return;
    }

    const delay = FAST_RETRY_DELAYS_MS[attempt] ?? SLOW_RETRY_INTERVAL_MS;
    timeoutRef.current = setTimeout(() => setAttempt((a) => a + 1), delay);
    onError?.(e);
  };

  return (
    <Image
      referrerPolicy="no-referrer"
      key={`${attempt}-${hasFallenBack}`}
      src={currentSrc}
      {...props}
      onError={handleError}
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";

// Same problem as RetryImage (see that file), but for spots using next/image
// with `fill` + `unoptimized` instead of a plain <img>. A freshly-uploaded
// Google Drive-hosted image can fail to load for a while after upload -
// confirmed to sometimes take well over 30 seconds, but it has ALWAYS
// eventually succeeded in testing (CDN propagation delay, not a genuinely
// missing file). Retry with fast backoff at first, then keep retrying
// indefinitely at a fixed, gentle interval rather than ever giving up.
const FAST_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];
const SLOW_RETRY_INTERVAL_MS = 60000;

export function RetryNextImage({ onError, ...props }: ImageProps) {
  const [attempt, setAttempt] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setAttempt(0);
  }, [props.src]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <Image
      key={attempt}
      {...props}
      onError={(e) => {
        const delay = FAST_RETRY_DELAYS_MS[attempt] ?? SLOW_RETRY_INTERVAL_MS;
        timeoutRef.current = setTimeout(() => setAttempt((a) => a + 1), delay);
        onError?.(e);
      }}
    />
  );
}

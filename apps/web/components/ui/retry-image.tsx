"use client";

import { useEffect, useRef, useState } from "react";

// A freshly-uploaded Google Drive-hosted image can fail to load for a
// while after upload - confirmed against the real Drive account to
// sometimes take well over 30 seconds, not just a few. It has, however,
// ALWAYS eventually succeeded in testing - this is CDN propagation delay,
// not a genuinely missing file. So: retry with fast backoff at first, then
// keep retrying indefinitely at a fixed, gentle interval rather than ever
// permanently giving up - a blank/broken image is worse than one more
// quiet retry. Each attempt remounts the <img> (via `key`) so the browser
// issues a genuinely fresh request rather than re-using a cached error.
const FAST_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];
const SLOW_RETRY_INTERVAL_MS = 60000;

interface RetryImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  fallback?: React.ReactNode;
}

export function RetryImage({ src, fallback, className, onError, ...props }: RetryImageProps) {
  const [attempt, setAttempt] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setAttempt(0);
  }, [src]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!src) {
    return <>{fallback ?? null}</>;
  }

  return (
    <img
      key={attempt}
      src={src}
      className={className}
      onError={(e) => {
        const delay = FAST_RETRY_DELAYS_MS[attempt] ?? SLOW_RETRY_INTERVAL_MS;
        timeoutRef.current = setTimeout(() => setAttempt((a) => a + 1), delay);
        onError?.(e);
      }}
      {...props}
    />
  );
}

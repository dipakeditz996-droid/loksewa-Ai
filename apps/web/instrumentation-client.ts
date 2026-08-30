/**
 * Client-side (browser) Sentry setup - the instrumentation-client.ts file
 * convention this Next.js version uses in place of the older
 * sentry.client.config.js pattern. Runs after the HTML loads, before React
 * hydrates (see Next.js docs on execution timing).
 *
 * NEXT_PUBLIC_SENTRY_DSN unset (the default) means Sentry.init() never
 * runs - no script behavior change, no network calls, nothing to point at
 * a project that doesn't exist. It has to be NEXT_PUBLIC_-prefixed to reach
 * the browser bundle at all; a Sentry DSN is a public identifier by design
 * (there's no secret in it), so this is the standard way to configure it.
 */
import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Session Replay is off by default (0) - it's a heavier feature with
    // its own pricing/quota implications, opt in with an env var rather
    // than silently sampling real user sessions the moment a DSN is set.
    replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0),
    replaysOnErrorSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? 0),
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

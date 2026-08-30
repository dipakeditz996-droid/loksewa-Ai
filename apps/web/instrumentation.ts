/**
 * Server-side Sentry setup (Node + Edge runtimes).
 *
 * NEXT_PUBLIC_SENTRY_DSN unset (the default, including local dev and this
 * repo's own .env.example) means Sentry.init() never runs here - no network
 * calls, no behavior change. Set it from your Sentry project's Client Keys
 * page to start reporting unhandled server errors.
 */
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      sendDefaultPii: false,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      sendDefaultPii: false,
    });
  }
}

// Reports errors thrown in Server Components, Route Handlers, and Server
// Actions - the class of error a browser-only Sentry setup never sees.
export const onRequestError = Sentry.captureRequestError;

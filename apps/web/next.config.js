import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/teacher/materials',
        destination: '/teacher/study-materials',
        permanent: true,
      },
    ];
  },
};

// Wraps the config to upload source maps on build (readable stack traces in
// Sentry instead of minified ones) - only actually does anything when
// SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT are set; harmless no-op build
// step otherwise. This wrapper runs regardless of whether a DSN is
// configured for runtime reporting (instrumentation.ts /
// instrumentation-client.ts) - the two are independent.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  // Only Sentry's own webpack plugin needs to run to have anything to do;
  // without an auth token there's nothing to upload, so skip it outright
  // rather than let it warn on every build.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});

import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

/**
 * Sentry wraps the build to upload source maps. The upload is skipped without
 * an auth token, so `npm run build` still works for anyone without Sentry set up.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "maxed-labs",
  project: process.env.SENTRY_PROJECT || "roofhelm_web",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Route browser reports through our own domain so ad blockers do not drop
  // them. `true` picks a random path per build; a fixed "/monitoring" is on
  // blocklists.
  tunnelRoute: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});

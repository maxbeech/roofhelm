import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Addresses Google knows from posts that were never published here. They 301
   * to the closest live page until the post itself ships (remove its entry then).
   */
  async redirects() {
    const toBlog = [
      "rafter-vs-truss",
      "steel-building-cost-per-square-foot",
      "pole-barn-cost-worked-estimate",
      "roof-truss-calculator-how-many-you-need",
      "attic-insulation-r-value-by-climate-zone",
      "how-to-calculate-rafter-length",
      "how-to-calculate-roof-pitch",
      "manual-j-explained-hvac-load-sizing",
      "how-much-does-a-new-roof-cost-2026",
      "stamped-engineering-drawings-explained",
    ];
    return [
      ...toBlog.map((slug) => ({ source: `/blog/${slug}`, destination: "/blog", statusCode: 301 as const })),
      { source: "/blog/asce-7-22-code-adoption-2026", destination: "/blog/asce-7-22-snow-load-changes", statusCode: 301 as const },
      { source: "/blog/free-snow-load-calculators-compared", destination: "/calculators", statusCode: 301 as const },
    ];
  },
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

import * as Sentry from "@sentry/nextjs";
import { sharedSentryOptions } from "@/lib/sentry-options";

/**
 * Server and edge error reporting. Next calls `register()` once per runtime.
 * Without a DSN the app runs normally and reports nothing, with one console
 * line so that is never a silent state in production.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (process.env.NODE_ENV === "production") console.warn("[sentry] no DSN configured, error reporting is off");
    return;
  }
  Sentry.init({ dsn, ...sharedSentryOptions() });
}

// Reports errors thrown while rendering a server component or route handler.
export const onRequestError = Sentry.captureRequestError;

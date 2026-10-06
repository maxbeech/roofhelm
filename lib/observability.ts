import * as Sentry from "@sentry/nextjs";

/**
 * The one way server code reports a problem.
 *
 * Context is ids, codes, counts and enum values only. Anything else (names,
 * emails, free text, request or response bodies) is replaced, because a
 * visitor's lead details are not ours to ship to a third party. Callers pass
 * what happened ("stripe_status": 402), never what was said.
 */
const SAFE_VALUE = /^[A-Za-z0-9_.:-]{0,64}$/;

export function safeContext(context: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(context)) {
    if (v === null || typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (typeof v === "string" && SAFE_VALUE.test(v)) out[k] = v;
    else out[k] = "[omitted]";
  }
  return out;
}

const hasDsn = () => Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

export function captureServerError(err: unknown, context: Record<string, unknown> = {}): void {
  const safe = safeContext(context);
  const scope = typeof safe.scope === "string" ? safe.scope : "server";
  try {
    if (hasDsn()) {
      Sentry.withScope((s) => {
        s.setTag("scope", scope);
        for (const [k, v] of Object.entries(safe)) if (k !== "scope") s.setExtra(k, v);
        s.captureException(err instanceof Error ? err : new Error(String(err)));
      });
      return;
    }
  } catch {
    // Never let reporting an error become an error.
  }
  // No DSN (or Sentry threw): fail visibly, not silently.
  console.error(`[${scope}] unreported error`, err instanceof Error ? err.name : typeof err, safe);
}

/** A handled failure that is not an exception, such as a rejected upstream response. */
export function captureServerMessage(message: string, context: Record<string, unknown> = {}): void {
  const safe = safeContext(context);
  const scope = typeof safe.scope === "string" ? safe.scope : "server";
  try {
    if (hasDsn()) {
      Sentry.withScope((s) => {
        s.setTag("scope", scope);
        s.setLevel("warning");
        for (const [k, v] of Object.entries(safe)) if (k !== "scope") s.setExtra(k, v);
        s.captureMessage(message);
      });
      return;
    }
  } catch {
    /* see above */
  }
  console.warn(`[${scope}] ${message}`, safe);
}

/** Structured log with ids-only attributes. */
export function logServer(level: "info" | "warn" | "error", message: string, attrs: Record<string, unknown> = {}): void {
  try {
    Sentry.logger[level](message, safeContext(attrs));
  } catch {
    console.warn("[observability] log not sent");
  }
}

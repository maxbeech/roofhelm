import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Scanner probes that are already rejected and are not bugs worth a Sentry issue.
 *
 * Crawlers and exploit scanners POST to a page with `Accept: text/x-component`,
 * a made-up `Next-Action` id and often an `x-middleware-subrequest` header
 * (the CVE-2025-29927 probe). Next.js answers with a 4xx text/plain page, then
 * its own client-response check throws "Invariant: Expected RSC response, got
 * text/plain". The request was refused correctly; reporting it only fills the
 * quota. Real server actions never hit this: an unknown action id is a 404
 * before this check, and real browsers send the action id from a page we served.
 *
 * Deliberately narrow: the invariant message AND a POST that looks like an RSC
 * or action probe. Any other InvariantError, and any other error, still reports.
 * Wired into `beforeSend` in sentry-options.ts, ahead of scrubbing.
 */
const RSC_INVARIANT = /Invariant: Expected RSC response, got /;

function header(headers: Record<string, unknown> | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name) return Array.isArray(value) ? value.join(",") : String(value ?? "");
  }
  return undefined;
}

/** True when the event is the known "Expected RSC response" error caused by a scanner POST. */
export function isScannerProbeEvent(event: Pick<ErrorEvent, "exception" | "request">): boolean {
  const first = event.exception?.values?.[0];
  if (!first || !RSC_INVARIANT.test(first.value ?? "")) return false;

  const request = event.request;
  if (!request || request.method?.toUpperCase() !== "POST") return false;

  const headers = request.headers;
  const probe =
    header(headers, "x-middleware-subrequest") !== undefined ||
    header(headers, "next-action") !== undefined ||
    /text\/x-component/i.test(header(headers, "accept") ?? "") ||
    /text\/x-component/i.test(header(headers, "content-type") ?? "");
  return probe;
}

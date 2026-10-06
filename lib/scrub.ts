import type { Breadcrumb, ErrorEvent, EventHint, Log } from "@sentry/nextjs";
import type * as Sentry from "@sentry/nextjs";

// The SDK does not re-export its transaction event type; derive it.
type TransactionEvent = Parameters<NonNullable<NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSendTransaction"]>>[0];

/**
 * The one scrubber for everything RoofHelm sends to Sentry: events, logs,
 * breadcrumbs and transactions.
 *
 * Two properties matter more than coverage:
 *
 * 1. FAIL CLOSED. Every exported hook is wrapped so that if scrubbing throws,
 *    the event/log/breadcrumb is dropped (null), never sent raw.
 * 2. LINEAR TIME. Log text is attacker-influenced. Every pattern below uses
 *    literal prefixes and bounded repetition, with no nested or overlapping
 *    unbounded quantifiers, and strings are cut to MAX_SCAN characters before
 *    any pattern runs, so hostile input cannot trigger catastrophic
 *    backtracking.
 */

const REDACTED = "[redacted]";
/** Strings longer than this are truncated before matching. */
export const MAX_SCAN = 10_000;
const MAX_DEPTH = 8;

// Ordered most specific first. All repetition is bounded.
const TEXT_PATTERNS: RegExp[] = [
  // JWTs (three base64url segments).
  /\beyJ[A-Za-z0-9_-]{4,2000}\.[A-Za-z0-9_-]{4,2000}\.[A-Za-z0-9_-]{0,2000}/g,
  // Authorization headers and bearer tokens.
  /\bBearer\s{1,5}[A-Za-z0-9._~+/=-]{8,2000}/gi,
  // Provider keys: Stripe, Helm7, Sentry, GitHub, Resend and friends.
  /\b(?:sk|pk|rk|whsec|hlm_sk|hlm_pk|sntrys|sntryu|ghp|gho|ghs|github_pat|re)_[A-Za-z0-9_]{8,200}/g,
  // Emails.
  /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,5}/g,
  // International numbers, then US-style, then UK-style.
  /\+\d[\d\s().-]{7,16}\d/g,
  /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g,
  /\b0\d{3,4}[ ]?\d{3}[ ]?\d{3,4}\b/g,
];

// `password=abc`, `"token": "abc"`, `api_key: abc`: the key survives, the value does not.
const KEY_VALUE =
  /(password|passwd|secret|token|authorization|api[_-]?key|apikey|cookie)(["']?\s{0,3}[:=]\s{0,3}["']?)[^\s"',;&}]{1,500}/gi;

const SENSITIVE_KEY =
  /password|passwd|secret|token|authorization|cookie|api[_-]?key|apikey|credential|signature|dsn|email|phone|address|postcode|zip|notes|message_body|body/i;

/** Redact secrets and personal data inside a string. Truncates first. */
export function scrubText(input: string): string {
  let s = input.length > MAX_SCAN ? `${input.slice(0, MAX_SCAN)}[truncated]` : input;
  for (const re of TEXT_PATTERNS) s = s.replace(re, REDACTED);
  return s.replace(KEY_VALUE, `$1$2${REDACTED}`);
}

/** Drop the query string and fragment from a URL or path. */
export function stripQuery(url: string): string {
  const i = url.search(/[?#]/);
  return i < 0 ? url : url.slice(0, i);
}

/** Remove `?query` runs embedded in free text such as span descriptions. */
function stripQueryInText(text: string): string {
  return text.replace(/\?[^\s]{0,2000}/g, "");
}

/** Recursively scrub strings and redact sensitive keys, preserving shape. */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === "string") return scrubText(value);
  if (typeof value !== "object") return value;
  if (depth > MAX_DEPTH) return REDACTED;
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => scrubValue(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY.test(k) ? REDACTED : scrubValue(v, depth + 1);
  }
  return out;
}

const URL_KEYS = ["url", "to", "from", "http.url", "url.full", "http.target"];
const QUERY_KEYS = ["url.query", "http.query", "query", "query_string"];

function scrubUrlData(data: Record<string, unknown>): Record<string, unknown> {
  const out = scrubValue(data) as Record<string, unknown>;
  for (const k of URL_KEYS) if (typeof data[k] === "string") out[k] = scrubText(stripQuery(data[k] as string));
  for (const k of QUERY_KEYS) delete out[k];
  return out;
}

function isFeedback(event: { contexts?: Record<string, unknown> }): boolean {
  return Boolean(event.contexts && "feedback" in event.contexts);
}

function scrubEventUnsafe(event: ErrorEvent): ErrorEvent {
  const feedback = isFeedback(event) ? { contexts: event.contexts, user: event.user } : null;

  if (event.message) event.message = scrubText(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubText(ex.value);
  }
  if (event.request) {
    if (event.request.url) event.request.url = scrubText(stripQuery(event.request.url));
    delete event.request.cookies;
    event.request.query_string = undefined;
    if (event.request.headers) event.request.headers = scrubValue(event.request.headers) as Record<string, string>;
    if (event.request.data) event.request.data = scrubValue(event.request.data);
  }
  if (event.extra) event.extra = scrubValue(event.extra) as Record<string, unknown>;
  if (event.tags) event.tags = scrubValue(event.tags) as typeof event.tags;
  if (event.contexts) event.contexts = scrubValue(event.contexts) as typeof event.contexts;
  if (event.user) event.user = { id: event.user.id };
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumbUnsafe);
  }
  // Feedback is the one exception: the person chose to give us a name and email.
  if (feedback) {
    event.contexts = { ...event.contexts, feedback: feedback.contexts?.feedback } as typeof event.contexts;
    if (feedback.user) event.user = feedback.user;
  }
  return event;
}

function scrubBreadcrumbUnsafe(b: Breadcrumb): Breadcrumb {
  const out: Breadcrumb = { ...b };
  if (typeof b.message === "string") out.message = scrubText(stripQueryInText(b.message));
  if (b.data) out.data = scrubUrlData(b.data);
  return out;
}

function scrubTransactionUnsafe(event: TransactionEvent): TransactionEvent {
  if (event.transaction) event.transaction = scrubText(stripQuery(event.transaction));
  if (event.request) {
    if (event.request.url) event.request.url = scrubText(stripQuery(event.request.url));
    delete event.request.cookies;
    event.request.query_string = undefined;
    delete event.request.headers;
    delete event.request.data;
  }
  if (event.user) event.user = { id: event.user.id };
  for (const span of event.spans ?? []) {
    if (span.description) span.description = scrubText(stripQueryInText(span.description));
    if (span.data) span.data = scrubUrlData(span.data) as typeof span.data;
  }
  const trace = event.contexts?.trace;
  if (trace?.data) trace.data = scrubUrlData(trace.data) as typeof trace.data;
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumbUnsafe);
  if (event.extra) event.extra = scrubValue(event.extra) as Record<string, unknown>;
  return event;
}

function scrubLogUnsafe(log: Log): Log {
  const message = typeof log.message === "string" ? scrubText(log.message) : log.message;
  const attributes = log.attributes ? (scrubValue(log.attributes) as Log["attributes"]) : log.attributes;
  return { ...log, message, attributes };
}

function failClosed<A extends unknown[], T>(fn: (...args: A) => T, what: string): (...args: A) => T | null {
  return (...args: A) => {
    try {
      return fn(...args);
    } catch {
      // Never forward the raw payload. Say so locally, with no payload content.
      console.error(`[sentry] scrubbing failed, ${what} dropped`);
      return null;
    }
  };
}

/** Sentry `beforeSend`. */
export const scrubEvent = failClosed((event: ErrorEvent, hint?: EventHint) => {
  void hint;
  return scrubEventUnsafe(event);
}, "event");
/** Sentry `beforeSendTransaction`. */
export const scrubTransaction = failClosed(scrubTransactionUnsafe, "transaction");
/** Sentry `beforeSendLog`. */
export const scrubLog = failClosed(scrubLogUnsafe, "log");
/** Sentry `beforeBreadcrumb`. */
export const scrubBreadcrumb = failClosed(scrubBreadcrumbUnsafe, "breadcrumb");

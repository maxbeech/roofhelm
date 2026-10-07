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
function scrubTextCore(input: string): string {
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
function scrubValueCore(value: unknown, depth = 0): unknown {
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

// ---------------------------------------------------------------------------
// Hardening layer (SENTRY_STANDARD section 2). Wraps the pattern table above so
// that bounded-repetition limits, truncation, encodings and per-repo gaps cannot
// leak a secret:
//  1. the string is cut to a safe window FIRST, dropping any half-cut token
//     (a secret's head must never survive a truncation boundary);
//  2. percent-encoded delimiters are decoded so `token%3Dabc` and `Bearer%20abc`
//     match like their plain forms, and URL query strings are dropped;
//  3. long JWTs, bearer tokens, vendor keys and key=value secrets are redacted
//     with open-ended (but still linear-time) patterns, so a secret longer than
//     any bounded limit in the table is redacted whole, not just its first part;
//  4. any run of token characters left glued to a redaction marker (the tail of
//     a secret that overran a bounded pattern) is swallowed into the marker;
//  5. every event / breadcrumb / log gets a second, repo-independent deep pass
//     (secret key names, URL queries, stack-frame vars, spans, contexts) and the
//     wrappers fail closed: a throw drops the item, never sends it raw. A feedback
//     event keeps ONLY the reporter's own contexts.feedback and user.
// ---------------------------------------------------------------------------
const HARDEN_MAX_CHARS = 9_900;
const HARDEN_MARK = "[redacted]";
// Characters a token cannot contain: a cut right after one is a clean cut.
const HARDEN_DELIM_RE = /[\s,;"'()[\]{}<>=:&|/?#\\]/;
// Digits and separators: the head of a phone number must not survive a cut.
const HARDEN_PHONEISH_RE = /[\d\s().+-]/;

/** Cut to the matching budget without leaving the head of a secret behind. */
function hardenWindow(s: string): string {
  if (s.length <= HARDEN_MAX_CHARS) return s;
  let end = HARDEN_MAX_CHARS;
  // Cut landed inside a token: drop the whole partial token.
  if (!HARDEN_DELIM_RE.test(s.charAt(end))) {
    while (end > 0 && !HARDEN_DELIM_RE.test(s.charAt(end - 1))) end--;
  }
  while (end > 0 && HARDEN_PHONEISH_RE.test(s.charAt(end - 1))) end--;
  return end === 0 ? `${HARDEN_MARK}...[truncated]` : `${s.slice(0, end)}...[truncated]`;
}

const HARDEN_PCT_RE = /%(?:40|20|2[BbCcFf]|3[AaDd]|26|22|27)/g;
// No lookbehind anywhere below: older WKWebView / Safari reject it at parse time.
const HARDEN_JWT_RE = /(^|[^A-Za-z0-9])eyJ[\w-]{5,}(?:\.[\w-]*){0,2}/g;
const HARDEN_BEARER_RE = /\bBearer(?:\s|\+){1,4}[\w\-.~+/=%]{8,}/gi;
const HARDEN_KEY_RE =
  /(^|[^A-Za-z0-9])(?:sk|pk|rk|whsec|hlm_sk|hlm_pk|sntrys|sntryu|sbp|sb_secret|sb_publishable|ghp|gho|ghs|ghu|ghr|github_pat|xox[abprs]|AIza)[_-][\w=+/-]{8,}/g;
const HARDEN_AUTH_RE =
  /(\bauthorization["']?\s{0,3}(?:[:=]|%3[AaDd])\s{0,3}\\?["']?)(?!(?:(?:Bearer|Basic|Token|Digest|Negotiate)(?:\s|\+|%20){1,4})?\[[A-Za-z-]{2,12}\](?![\w=+/%~.-]))(?:(?:Bearer|Basic|Token|Digest|Negotiate)(?:\s|\+|%20){1,4})?[^\s,;&}"'\\]+/gi;
const HARDEN_KV_KEY =
  "((?:password|passwd|passphrase|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|credential|cookie|signature|jwt|dsn)[\\w.-]{0,30}\\\\?[\"']?\\s{0,3}(?:[:=]|%3[AaDd])\\s{0,3})";
// Quoted values keep their quotes so serialised JSON stays valid.
const HARDEN_KV_ESC_RE = new RegExp(`${HARDEN_KV_KEY}\\\\"(?!\\[[A-Za-z-]{2,12}\\]\\\\")[^"\\\\]*\\\\"`, "gi");
const HARDEN_KV_DQ_RE = new RegExp(`${HARDEN_KV_KEY}"(?!\\[[A-Za-z-]{2,12}\\]")(?:[^"\\\\]|\\\\.)*"`, "gi");
const HARDEN_KV_SQ_RE = new RegExp(`${HARDEN_KV_KEY}'(?!\\[[A-Za-z-]{2,12}\\]')(?:[^'\\\\]|\\\\.)*'`, "gi");
const HARDEN_KV_RAW_RE = new RegExp(`${HARDEN_KV_KEY}(?!\\[[A-Za-z-]{2,12}\\](?![\\w=+/%~.-]))[^\\s,;&}"'\\\\]+`, "gi");
const HARDEN_EMAIL_RE = /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,8}/g;
const HARDEN_URLCRED_RE = /\b([a-z][a-z0-9+.-]{1,15}:\/\/)[^\s/@:]{1,200}:(?!\[[A-Za-z-]{2,12}\]@)[^\s/@]{1,500}@/gi;
const HARDEN_PHONE_RE = /(^|[^\w.-])((?:\+|0)(?![0-9a-f]{7}-[0-9a-f]{4}-)\d[\d\s().-]{7,18}\d)(?![\w])/gi;
const HARDEN_NANP_RE = /(^|[^\w.-])(\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})(?![\w])/g;
// Query strings and fragments carry capability tokens: keep scheme+host+path only.
const HARDEN_URLQ_RE = /(https?:\/\/[^\s"'<>?#]{1,2000})\?(?!\[[A-Za-z-]{2,12}\](?:$|[\s"'<>]))(?:[^\s"'<>]{0,4000}=\s\[[A-Za-z-]{2,12}\]|[^\s"'<>]{0,4000})/gi;
const HARDEN_PATHQ_RE = /(^|[\s"'(])(\/[^\s"'<>?#]{0,2000})\?(?!\[[A-Za-z-]{2,12}\](?:$|[\s"'<>]))(?:[^\s"'<>]{0,4000}=\s\[[A-Za-z-]{2,12}\]|[^\s"'<>]{0,4000})/g;
// Fragments carry tokens too (OAuth implicit flow, magic links): only a strict routing fragment may stay.
const HARDEN_URLF_RE = /(https?:\/\/[^\s"'<>?#]{1,2000})#(?!\/[A-Za-z0-9_/-]{0,64}(?:$|[\s"'<>]))[^\s"'<>]{0,4000}/gi;
const HARDEN_PATHF_RE = /(^|[\s"'(])(\/[^\s"'<>?#]{0,2000})#(?!\/[A-Za-z0-9_/-]{0,64}(?:$|[\s"'<>]))[^\s"'<>]{0,4000}/g;
const HARDEN_TAIL_RE = /(\[redacted\]|\[[A-Za-z][A-Za-z-]{1,14}\])(?:[\w=+/%~-]|\.(?=\w))+/g;
// Same, when the repo wraps its marker in quotes (`"[redacted]"tail`).
const HARDEN_TAILQ_RE = /(\[redacted\]|\[[A-Za-z][A-Za-z-]{1,14}\])(["']\]?)(?:[\w=+/%~-]|\.(?=\w))+/g;
// A scheme-only redaction (`Authorization: Basic abc...` -> `[redacted] abc...`) leaves the credential itself behind.
const HARDEN_AUTHTAIL_RE = /(\[redacted\])\s{1,4}(?=[A-Za-z0-9+/=._~-]*[0-9])[A-Za-z0-9+/=._~-]{20,}/g;
const HARDEN_DECODE: Record<string, string> = {
  "%40": "@", "%20": " ", "%2b": "+", "%2c": ",", "%2f": "/", "%3a": ":", "%3d": "=", "%26": "&", "%22": '"', "%27": "'",
};

function hardenPre(input: string): string {
  return hardenRedact(input, true);
}

/** Module-private: only the reporter's own feedback message is run with `redactContact` false (secrets still go). */
function hardenRedact(input: string, redactContact: boolean): string {
  // Query strings first: decoding `%20` would otherwise end the URL early and leave the rest behind.
  let s = input.replace(HARDEN_URLQ_RE, "$1").replace(HARDEN_PATHQ_RE, "$1$2").replace(HARDEN_URLF_RE, "$1").replace(HARDEN_PATHF_RE, "$1$2");
  if (s.includes("%")) s = s.replace(HARDEN_PCT_RE, (m) => HARDEN_DECODE[m.toLowerCase()] ?? m);
  return s
    .replace(HARDEN_URLCRED_RE, `$1${HARDEN_MARK}@`)
    .replace(HARDEN_EMAIL_RE, redactContact ? HARDEN_MARK : "$&")
    .replace(HARDEN_JWT_RE, `$1${HARDEN_MARK}`)
    .replace(HARDEN_BEARER_RE, HARDEN_MARK)
    .replace(HARDEN_AUTH_RE, `$1${HARDEN_MARK}`)
    .replace(HARDEN_KEY_RE, `$1${HARDEN_MARK}`)
    .replace(HARDEN_KV_ESC_RE, `$1\\"${HARDEN_MARK}\\"`)
    .replace(HARDEN_KV_DQ_RE, `$1"${HARDEN_MARK}"`)
    .replace(HARDEN_KV_SQ_RE, `$1'${HARDEN_MARK}'`)
    .replace(HARDEN_KV_RAW_RE, `$1${HARDEN_MARK}`)
    .replace(HARDEN_PHONE_RE, (m, pre: string, num: string) => (redactContact && num.replace(/\D/g, "").length >= 9 ? `${pre}${HARDEN_MARK}` : m))
    .replace(HARDEN_NANP_RE, redactContact ? `$1${HARDEN_MARK}` : "$&");
}

function hardenPost(s: string): string {
  return s.replace(HARDEN_TAIL_RE, "$1").replace(HARDEN_TAILQ_RE, "$1$2").replace(HARDEN_AUTHTAIL_RE, "$1");
}

/**
 * Mask secrets, tokens, emails, phone numbers and URL query strings in free text.
 * Extra arguments (modes, options, `true`) are deliberately ignored: nothing a caller passes can switch
 * redaction off. A feedback reporter's own fields are restored at event level instead (see hardenEvent).
 */
export function scrubText(input: string, ..._ignored: unknown[]): string {
  const core = scrubTextCore as (s: string) => string;
  // Cut first, then the repo's own scrubber (its output shapes are unchanged), then the open-ended
  // passes for whatever its bounded patterns missed, then swallow any tail left glued to a marker.
  return hardenPost(hardenPre(core(hardenWindow(input))));
}

// Key names that carry secrets whatever the repo-specific table above says.
const HARDEN_SECRET_KEY_RE =
  /passw(?:or)?d|passwd|pwd|passphrase|secret|token|api[-_. ]?key|apikey|access[-_.]?key|private[-_.]?key|authorization|cookie|credential|signature|dsn|jwt|bearer|session|otp|(?:^|[-_.])(?:auth|key|sig)(?:$|[-_.])/i;

// `api_key_id`, `token_id`: identifiers of a credential, not the credential.
// `auth_method` and friends describe the scheme, they do not carry it.
const HARDEN_ID_KEY_RE = /(?:(?:key|token|secret)[-_.]?ids?|(?:^|[-_.])auth[-_.](?:method|type|provider|mode|scheme|status))$/i;

function hardenIsSecretEntry(k: string, val: unknown): boolean {
  return HARDEN_SECRET_KEY_RE.test(k) && !HARDEN_ID_KEY_RE.test(k) && val != null && typeof val !== "number" && typeof val !== "boolean";
}

/** Recursively redact sensitive values, preserving structure for debugging. */
export function scrubValue(value: unknown, ...rest: unknown[]): unknown {
  const core = scrubValueCore as (v: unknown, ...r: unknown[]) => unknown;
  let v: unknown = value;
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.some(([k, val]) => hardenIsSecretEntry(k, val))) {
      const copy: Record<string, unknown> = {};
      for (const [k, val] of entries) copy[k] = hardenIsSecretEntry(k, val) ? HARDEN_MARK : val;
      v = copy;
    }
  }
  return core(v, ...rest);
}

type HardenBag = Record<string, unknown>;
type HardenState = { n: number; seen: WeakSet<object> };
const HARDEN_URL_KEYS = new Set(["url", "to", "from", "href", "http.url", "url.full", "http.target", "referrer", "referer", "origin"]);
const HARDEN_QUERY_KEYS = new Set(["url.query", "http.query", "query", "query_string", "http.fragment", "search"]);
const HARDEN_MAX_NODES = 20_000;

function hardenStripQuery(url: string): string {
  // Cut at the first `?` or `#`. Only a strict routing fragment (`#/some/route`) may stay, and never after a query.
  const i = url.search(/[?#]/);
  if (i === -1) return url;
  if (url.charAt(i) === "#" && /^#\/[A-Za-z0-9_/-]{0,64}$/.test(url.slice(i))) return url;
  return url.slice(0, i);
}

/** Deep, idempotent pass: secret keys, URL queries, every string through the scrubber. */
function hardenValue(value: unknown, state: HardenState, depth = 0, key = ""): unknown {
  if (value == null) return value;
  if (typeof value === "string") return scrubText(key && HARDEN_URL_KEYS.has(key) ? hardenStripQuery(value) : value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return undefined; // functions, symbols
  if (value instanceof Date) return value;
  if (state.seen.has(value) || depth > 10 || ++state.n > HARDEN_MAX_NODES) return HARDEN_MARK;
  state.seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((v) => hardenValue(v, state, depth + 1, key));
    const out: HardenBag = {};
    for (const [k, v] of Object.entries(value as HardenBag)) {
      const lk = k.toLowerCase();
      if (HARDEN_QUERY_KEYS.has(lk) && v != null && v !== "") out[k] = HARDEN_MARK;
      else if (!lk.startsWith("sentry.") && hardenIsSecretEntry(k, v)) out[k] = HARDEN_MARK;
      else out[k] = hardenValue(v, state, depth + 1, lk);
    }
    return out;
  } finally {
    state.seen.delete(value);
  }
}

function hardenFresh(): HardenState {
  return { n: 0, seen: new WeakSet<object>() };
}

type HardenReporter = { feedback: HardenBag; user: HardenBag } | undefined;
const HARDEN_REPORTER_FEEDBACK_KEYS = ["name", "email", "contact_email", "message"];
const HARDEN_REPORTER_USER_KEYS = ["email", "name"];

/** The reporter's own words, read from the ORIGINAL feedback event before anything scrubs it. */
function hardenReporter(event: unknown): HardenReporter {
  try {
    const ev = event as HardenBag | null;
    if (!ev || typeof ev !== "object") return undefined;
    const fb = (ev.contexts as HardenBag | undefined)?.feedback;
    if (ev.type !== "feedback" && !fb) return undefined;
    const pick = (src: unknown, keys: string[]): HardenBag => {
      const out: HardenBag = {};
      if (src && typeof src === "object") for (const k of keys) {
        const v = (src as HardenBag)[k];
        if (typeof v === "string") out[k] = k === "message" ? hardenPost(hardenRedact(hardenWindow(v), false)) : v;
      }
      return out;
    };
    return { feedback: pick(fb, HARDEN_REPORTER_FEEDBACK_KEYS), user: pick(ev.user, HARDEN_REPORTER_USER_KEYS) };
  } catch {
    return undefined;
  }
}

/**
 * Second, repo-independent pass over every free-text and structured field of an event. EVERYTHING is
 * scrubbed, feedback events included; afterwards the reporter's own contexts.feedback name/email/message
 * and user email/name are copied back from the original event. Breadcrumbs, request, tags, extra, other
 * contexts and every other field of the same event stay fully scrubbed.
 */
function hardenEvent<T>(event: T, reporter?: HardenReporter): T {
  const ev = event as unknown as HardenBag;
  const st = hardenFresh();
  for (const k of ["message", "logentry", "request", "extra", "tags", "breadcrumbs", "transaction", "spans", "user"]) {
    if (ev[k] != null) ev[k] = hardenValue(ev[k], st, 0, k);
  }
  const contexts = ev.contexts as HardenBag | undefined;
  if (contexts) {
    const trace = contexts.trace as HardenBag | undefined;
    const next: HardenBag = {};
    for (const [ck, cv] of Object.entries(contexts)) {
      if (ck === "trace" && trace) next[ck] = { ...trace, data: hardenValue(trace.data, st, 0, "data") };
      else next[ck] = hardenValue(cv, st, 0, ck);
    }
    ev.contexts = next;
  }
  if (reporter) {
    if (Object.keys(reporter.feedback).length) {
      const ctx = (ev.contexts as HardenBag | undefined) ?? {};
      ctx.feedback = { ...((ctx.feedback as HardenBag | undefined) ?? {}), ...reporter.feedback };
      ev.contexts = ctx;
    }
    if (Object.keys(reporter.user).length) ev.user = { ...((ev.user as HardenBag | undefined) ?? {}), ...reporter.user };
  }
  const exc = ev.exception as { values?: HardenBag[] } | undefined;
  for (const x of exc?.values ?? []) {
    if (typeof x.value === "string") x.value = scrubText(x.value);
    const frames = (x.stacktrace as { frames?: HardenBag[] } | undefined)?.frames ?? [];
    for (const f of frames) if (f.vars != null) f.vars = hardenValue(f.vars, st, 0, "vars");
    const mech = x.mechanism as HardenBag | undefined;
    if (mech?.data != null) mech.data = hardenValue(mech.data, st, 0, "data");
  }
  return event;
}

/** Deep pass for a breadcrumb or log record (message + data/attributes). */
function hardenRecord<T>(rec: T): T {
  return hardenValue(rec, hardenFresh()) as T;
}

/** scrubEvent, then the deep hardening pass. Fails closed: a throw drops the item, never sends it raw. */
export const scrubEvent: typeof scrubEventCore = ((...args: unknown[]) => {
  try {
    const reporter = hardenReporter(args[0]);
    const out = (scrubEventCore as unknown as (...a: unknown[]) => unknown)(...args);
    return out ? hardenEvent(out, reporter) : null;
  } catch {
    return null;
  }
}) as unknown as typeof scrubEventCore;

/** scrubTransaction, then the deep hardening pass. Fails closed: a throw drops the item, never sends it raw. */
export const scrubTransaction: typeof scrubTransactionCore = ((...args: unknown[]) => {
  try {
    const reporter = hardenReporter(args[0]);
    const out = (scrubTransactionCore as unknown as (...a: unknown[]) => unknown)(...args);
    return out ? hardenEvent(out, reporter) : null;
  } catch {
    return null;
  }
}) as unknown as typeof scrubTransactionCore;

/** scrubBreadcrumb, then the deep hardening pass. Fails closed: a throw drops the item, never sends it raw. */
export const scrubBreadcrumb: typeof scrubBreadcrumbCore = ((...args: unknown[]) => {
  try {
    const out = (scrubBreadcrumbCore as unknown as (...a: unknown[]) => unknown)(...args);
    return out ? hardenRecord(out) : null;
  } catch {
    return null;
  }
}) as unknown as typeof scrubBreadcrumbCore;

/** scrubLog, then the deep hardening pass. Fails closed: a throw drops the item, never sends it raw. */
export const scrubLog: typeof scrubLogCore = ((...args: unknown[]) => {
  try {
    const out = (scrubLogCore as unknown as (...a: unknown[]) => unknown)(...args);
    return out ? hardenRecord(out) : null;
  } catch {
    return null;
  }
}) as unknown as typeof scrubLogCore;


/** Sentry `beforeSend`. */
const scrubEventCore = failClosed((event: ErrorEvent, hint?: EventHint) => {
  void hint;
  return scrubEventUnsafe(event);
}, "event");
/** Sentry `beforeSendTransaction`. */
const scrubTransactionCore = failClosed(scrubTransactionUnsafe, "transaction");
/** Sentry `beforeSendLog`. */
const scrubLogCore = failClosed(scrubLogUnsafe, "log");
/** Sentry `beforeBreadcrumb`. */
const scrubBreadcrumbCore = failClosed(scrubBreadcrumbUnsafe, "breadcrumb");

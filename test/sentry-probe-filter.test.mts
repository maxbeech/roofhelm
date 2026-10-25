// Scanner-probe filter: the known "Expected RSC response" POST is dropped, everything else still reports.
// Run: tsx test/sentry-probe-filter.test.mts
import { isScannerProbeEvent } from "../lib/sentry-probe-filter.ts";
import { CLIENT_IGNORED_ERROR_PATTERNS } from "../lib/sentry-filters.ts";
import { sharedSentryOptions } from "../lib/sentry-options.ts";

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name}`); }
}

const INVARIANT = "Invariant: Expected RSC response, got text/plain. This is a bug in Next.js.";
function event(over: { value?: string; method?: string; headers?: Record<string, string> } = {}) {
  return {
    exception: { values: [{ type: "InvariantError", value: over.value ?? INVARIANT }] },
    request: { method: over.method ?? "POST", headers: over.headers ?? { accept: "text/x-component" } },
  };
}

check("drops the invariant from an RSC POST", isScannerProbeEvent(event()));
check("drops it with a made-up Next-Action id", isScannerProbeEvent(event({ headers: { Accept: "text/x-component", "Next-Action": "cachefn" } })));
check("drops it with only the exploit header", isScannerProbeEvent(event({ headers: { "x-middleware-subrequest": "middleware:middleware" } })));
check("drops it when only the content type marks it as RSC", isScannerProbeEvent(event({ headers: { "content-type": "text/x-component" } })));
check("keeps it with no probe markers", !isScannerProbeEvent(event({ headers: { accept: "text/html" } })));
check("keeps it with no request", !isScannerProbeEvent({ exception: event().exception }));
check("keeps a GET", !isScannerProbeEvent(event({ method: "GET" })));
check("keeps another invariant", !isScannerProbeEvent(event({ value: "Invariant: something else" })));
check("keeps an event with no exception", !isScannerProbeEvent({ request: event().request }));

const beforeSend = sharedSentryOptions().beforeSend as unknown as (e: unknown, h: unknown) => unknown;
check("beforeSend drops a probe", beforeSend(event({ headers: { "next-action": "cachefn" } }), {}) === null);
const real = { exception: { values: [{ type: "Error", value: "Stripe webhook failed" }] }, request: { method: "POST", headers: { accept: "application/json" } } };
check("beforeSend still sends a real error", beforeSend(real, {}) !== null);

const bridge = "Non-Error promise rejection captured with value: Object Not Found Matching Id:1, MethodName:update, ParamCount:4";
check("client filter ignores the injected-bridge rejection", CLIENT_IGNORED_ERROR_PATTERNS.some((p) => p.test(bridge)));
check("client filter keeps ordinary errors", !CLIENT_IGNORED_ERROR_PATTERNS.some((p) => p.test("TypeError: x is undefined")));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);

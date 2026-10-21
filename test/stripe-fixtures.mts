// Shared fixtures for the Stripe tests: a fake Checkout Session, a fake Stripe
// and OpenHelm Mail behind globalThis.fetch, and environment helpers. All
// values are obviously fake and nothing here makes a network call. Not a test
// itself, so it is not in the npm test chain.
import { createHmac } from "node:crypto";
import { inflateSync } from "node:zlib";
import type { SnowInputs } from "../lib/snow.ts";
import { encodeInputs } from "../lib/snow-url.ts";

export const PRICE = "price_roofhelm_fixture";
export const OTHER_PRICE = "price_somebody_else";
export const SESSION_ID = "cs_test_a1B2c3D4e5F6g7H8";
export const WEBHOOK_SECRET = "whsec_fixture_secret";

// The gable roof hand-computed in test/unbalanced.test.mts.
export const GABLE: SnowInputs = {
  pg: 40, risk: "II", terrain: "C", roofExposure: "partial", thermal: "heated",
  surface: "nonslippery", shape: "gable", slopeDeg: 18.43, width: 40, area: 1500,
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

export function session(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: SESSION_ID,
    object: "checkout.session",
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    created: nowSeconds() - 120,
    customer_details: { email: "buyer@example.test" },
    metadata: { report: "snow-load-v1", calc: encodeInputs(GABLE) },
    custom_fields: [
      { key: "projectname", type: "text", text: { value: "Maple Street garage" } },
      { key: "siteaddress", type: "text", text: { value: "14 Maple St" } },
    ],
    line_items: { object: "list", data: [{ price: { id: PRICE }, quantity: 1 }] },
    ...over,
  };
}

const ENV_KEYS = [
  "STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_SITE_URL",
  "OPENHELM_API_KEY", "OPENHELM_MAIL_INBOX_ID", "OPENHELM_API_URL", "OPENHELM_PRODUCT_ID", "SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN",
];
const saved: Record<string, string | undefined> = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

/** Fully configured: Stripe, webhook secret and mail. Pass overrides (undefined removes a key). */
export function setEnv(over: Record<string, string | undefined> = {}) {
  const base: Record<string, string | undefined> = {
    STRIPE_SECRET_KEY: "sk_test_fixture",
    STRIPE_PRICE_ID: PRICE,
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    NEXT_PUBLIC_SITE_URL: "https://www.roofhelm.test",
    OPENHELM_API_KEY: "ohk_fixture",
    OPENHELM_MAIL_INBOX_ID: "inbox_fixture",
    OPENHELM_API_URL: "https://mail.fixture.test/v1",
    OPENHELM_PRODUCT_ID: undefined,
    SENTRY_DSN: undefined,
    NEXT_PUBLIC_SENTRY_DSN: undefined,
    ...over,
  };
  for (const [k, v] of Object.entries(base)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}
export function restoreEnv() {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

export interface Call { url: string; method: string; headers: Record<string, string>; body: string }

export interface FakeNet {
  calls: Call[];
  stripeLookups: () => Call[];
  mailSends: () => Call[];
  /** Sessions Stripe will return by id. */
  sessions: Map<string, Record<string, unknown>>;
  /** Make the next N Stripe lookups answer with this status instead. */
  failStripe: (status: number, times?: number) => void;
  failMail: (status: number, times?: number) => void;
  /** Make the next Stripe lookup throw a network error. */
  dropStripe: (times?: number) => void;
  restore: () => void;
}

/** Replace globalThis.fetch with a fake Stripe + OpenHelm Mail. */
export function fakeNet(): FakeNet {
  const real = globalThis.fetch;
  const calls: Call[] = [];
  const sessions = new Map<string, Record<string, unknown>>();
  let stripeFail: { status: number; left: number } | null = null;
  let mailFail: { status: number; left: number } | null = null;
  let drop = 0;
  const mailByClientId = new Map<string, string>();

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((v, k) => { headers[k] = v; });
    const body = typeof init?.body === "string" ? init.body : init?.body ? String(init.body) : "";
    calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers, body });
    const json = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });

    if (url.startsWith("https://api.stripe.com/v1/checkout/sessions/")) {
      if (drop > 0) { drop--; throw new TypeError("fetch failed"); }
      if (stripeFail && stripeFail.left > 0) { stripeFail.left--; return json(stripeFail.status, { error: { message: "boom" } }); }
      const id = url.slice("https://api.stripe.com/v1/checkout/sessions/".length).split("?")[0];
      const found = sessions.get(id);
      return found ? json(200, found) : json(404, { error: { code: "resource_missing" } });
    }
    if (url === "https://api.stripe.com/v1/checkout/sessions") {
      return json(200, { id: "cs_test_created00001", url: "https://checkout.stripe.test/c/pay/cs_test_created00001" });
    }
    if (url.startsWith("https://mail.fixture.test/v1/inboxes/") && url.endsWith("/messages")) {
      if (mailFail && mailFail.left > 0) { mailFail.left--; return json(mailFail.status, { error: "mail platform down" }); }
      // Behave like the platform: the same client_id returns the original message.
      const clientId = (JSON.parse(body) as { client_id?: string }).client_id ?? "";
      const id = mailByClientId.get(clientId) ?? `msg_${mailByClientId.size + 1}`;
      if (clientId) mailByClientId.set(clientId, id);
      return json(200, { message_id: id, status: "sent", thread_id: null });
    }
    return json(500, { error: `unexpected fetch to ${url}` });
  }) as typeof fetch;

  return {
    calls,
    stripeLookups: () => calls.filter((c) => c.url.startsWith("https://api.stripe.com/v1/checkout/sessions/")),
    mailSends: () => calls.filter((c) => c.url.startsWith("https://mail.fixture.test/")),
    sessions,
    failStripe: (status, times = 1) => { stripeFail = { status, left: times }; },
    failMail: (status, times = 1) => { mailFail = { status, left: times }; },
    dropStripe: (times = 1) => { drop = times; },
    restore: () => { globalThis.fetch = real; },
  };
}

/** A signed Stripe webhook request, exactly as Stripe builds it. */
export function signedRequest(payload: unknown, opts: { secret?: string; t?: number; tamper?: boolean; headerOverride?: string } = {}): Request {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const t = opts.t ?? nowSeconds();
  const sig = createHmac("sha256", opts.secret ?? WEBHOOK_SECRET).update(`${t}.${raw}`, "utf8").digest("hex");
  return new Request("https://www.roofhelm.test/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": opts.headerOverride ?? `t=${t},v1=${sig}`, "content-type": "application/json" },
    body: opts.tamper ? `${raw} ` : raw,
  });
}

export function event(id: string, type: string, sessionId = SESSION_ID) {
  return { id, object: "event", type, data: { object: { id: sessionId, object: "checkout.session" } } };
}

/** Collect console output instead of printing it, so failure-path tests stay quiet. */
export function quietConsole() {
  const out: string[] = [];
  const real = { error: console.error, warn: console.warn };
  console.error = (...a: unknown[]) => { out.push(a.map(String).join(" ")); };
  console.warn = (...a: unknown[]) => { out.push(a.map(String).join(" ")); };
  return { out, restore: () => { console.error = real.error; console.warn = real.warn; } };
}

/**
 * The text a pdf-lib document draws. pdf-lib deflates content streams and writes
 * built-in-font text as hex strings in WinAnsi (Latin-1 for the text we use), so
 * inflate each stream and read back the Tj operands, one per line.
 */
export function drawnText(pdf: Uint8Array): string {
  const bin = Buffer.from(pdf).toString("latin1");
  const out: string[] = [];
  for (const m of bin.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let body: string;
    try { body = inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"); } catch { continue; }
    for (const t of body.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) out.push(Buffer.from(t[1], "hex").toString("latin1"));
  }
  return out.join("\n");
}

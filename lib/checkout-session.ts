// Reads a Stripe Checkout Session object and says whether money was taken.
// Kept pure so the purchase event can be tested without calling Stripe.

export interface PaidSession {
  paid: boolean;
  transactionId: string;
  currency: string;
  value: number;
}

export const SESSION_ID_RE = /^cs_[A-Za-z0-9_]{8,200}$/;

export function parseSession(session: unknown): PaidSession | null {
  if (!session || typeof session !== "object") return null;
  const s = session as Record<string, unknown>;
  if (typeof s.id !== "string") return null;
  const cents = typeof s.amount_total === "number" ? s.amount_total : null;
  const currency = typeof s.currency === "string" ? s.currency.toUpperCase() : "";
  return {
    paid: s.payment_status === "paid" && cents !== null && currency !== "",
    transactionId: s.id,
    currency,
    value: cents === null ? 0 : cents / 100,
  };
}

// ---------------------------------------------------------------------------
// Fulfilment check. `parseSession` above only answers "was money taken", which
// is enough for an analytics event. Handing over the PDF needs more: the
// session must be a one-time payment for THIS product's price. A Stripe account
// can be shared, so a paid session for someone else's price must not unlock a
// roofhelm report. The return URL alone proves nothing; the session is always
// fetched from Stripe (with line_items expanded) and run through this.

export type RejectReason = "malformed" | "wrong_mode" | "wrong_price" | "not_paid";

export interface VerifiedSession {
  id: string;
  /** Unix seconds, when the session was created. */
  created: number;
  /** Buyer's email as collected by Checkout, if any. */
  email: string | null;
  metadata: Record<string, string>;
  /** Checkout custom fields (text type), by key. */
  customFields: Record<string, string>;
}

export type Verification = { ok: true; session: VerifiedSession } | { ok: false; reason: RejectReason };

const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

function priceIdsOf(session: Record<string, unknown>): string[] | null {
  const items = session.line_items;
  if (!isRecord(items) || !Array.isArray(items.data)) return null;
  return items.data.map((item) => {
    const price = isRecord(item) ? item.price : null;
    return isRecord(price) && typeof price.id === "string" ? price.id : "";
  });
}

function stringMap(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(v)) return out;
  for (const [k, val] of Object.entries(v)) if (typeof val === "string") out[k] = val;
  return out;
}

function customFieldsOf(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(v)) return out;
  for (const f of v) {
    if (!isRecord(f) || typeof f.key !== "string" || !isRecord(f.text)) continue;
    if (typeof f.text.value === "string") out[f.key] = f.text.value;
  }
  return out;
}

/**
 * Decide whether a Checkout Session, as returned by Stripe with
 * `expand[]=line_items`, is a paid one-time purchase of `expectedPriceId`.
 * Checks run foreign-first (mode, then price, then payment) so a caller can
 * tell "not ours" apart from "ours, not paid yet".
 */
export function verifyPaidSession(raw: unknown, expectedPriceId: string): Verification {
  if (!isRecord(raw) || typeof raw.id !== "string" || !SESSION_ID_RE.test(raw.id)) {
    return { ok: false, reason: "malformed" };
  }
  if (raw.mode !== "payment") return { ok: false, reason: "wrong_mode" };

  const prices = priceIdsOf(raw);
  // An empty expected id must never match: a missing price would read as "".
  if (!expectedPriceId || !prices || prices.length === 0 || prices.some((p) => p !== expectedPriceId)) {
    return { ok: false, reason: "wrong_price" };
  }
  if (raw.payment_status !== "paid") return { ok: false, reason: "not_paid" };

  const details = isRecord(raw.customer_details) ? raw.customer_details : null;
  const email =
    (details && typeof details.email === "string" && details.email) ||
    (typeof raw.customer_email === "string" && raw.customer_email) ||
    null;
  return {
    ok: true,
    session: {
      id: raw.id,
      created: typeof raw.created === "number" ? raw.created : 0,
      email,
      metadata: stringMap(raw.metadata),
      customFields: customFieldsOf(raw.custom_fields),
    },
  };
}

/** True while a paid session may still fetch its PDF. */
export function withinDownloadWindow(createdSeconds: number, windowDays: number, nowMs: number = Date.now()): boolean {
  if (!createdSeconds) return false;
  return nowMs - createdSeconds * 1000 <= windowDays * 86_400_000;
}

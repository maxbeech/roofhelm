// The one Stripe call fulfilment needs: fetch a Checkout Session with its line
// items. Raw fetch, like the checkout route (no Stripe SDK in this repo).
// Stripe omits line_items unless asked, and the price on them is how we tell
// our sales from anyone else's, so the expand is not optional.
import { SESSION_ID_RE } from "./checkout-session";

export type SessionLookup =
  | { kind: "ok"; session: unknown }
  | { kind: "not_found" }
  | { kind: "error"; status: number };

/** Throws only on a network failure or timeout; callers treat that as retryable. */
export async function retrieveCheckoutSession(
  id: string,
  secret: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SessionLookup> {
  if (!SESSION_ID_RE.test(id)) return { kind: "not_found" };
  const query = new URLSearchParams({ "expand[]": "line_items" });
  const res = await fetchImpl(`https://api.stripe.com/v1/checkout/sessions/${id}?${query}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return { kind: "not_found" };
  if (!res.ok) return { kind: "error", status: res.status };
  return { kind: "ok", session: await res.json() };
}

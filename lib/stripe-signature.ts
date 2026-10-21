// Stripe webhook signature check, done by hand with node:crypto so the repo
// stays free of the Stripe SDK. The procedure is Stripe's own, from
// https://docs.stripe.com/webhooks (Verify manually):
//   1. Split the Stripe-Signature header on "," then "=" into t and v1 values.
//   2. signed_payload = `${t}.${rawBody}`
//   3. expected = HMAC-SHA256(endpoint secret, signed_payload), hex
//   4. Constant-time compare against every v1, then check the timestamp.
// Only v1 counts (ignoring other schemes prevents downgrade attacks), and
// several v1 values appear while a rolled secret is still active. The default
// tolerance matches Stripe's libraries: 5 minutes. Zero would disable the
// recency check, so it is refused.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_TOLERANCE_SECONDS = 300;

export type SignatureCheck =
  | { ok: true }
  | { ok: false; reason: "missing_header" | "malformed_header" | "mismatch" | "stale" };

export function verifyStripeSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = SIGNATURE_TOLERANCE_SECONDS,
): SignatureCheck {
  if (!(toleranceSeconds > 0)) throw new Error("signature tolerance must be greater than zero");
  if (!header) return { ok: false, reason: "missing_header" };

  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1") signatures.push(value);
  }
  if (!/^\d{1,12}$/.test(timestamp) || signatures.length === 0) return { ok: false, reason: "malformed_header" };

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest();
  const matched = signatures.some((sig) => {
    if (!/^[0-9a-f]{64}$/i.test(sig)) return false;
    return timingSafeEqual(expected, Buffer.from(sig, "hex"));
  });
  if (!matched) return { ok: false, reason: "mismatch" };

  if (Math.abs(nowSeconds - Number(timestamp)) > toleranceSeconds) return { ok: false, reason: "stale" };
  return { ok: true };
}

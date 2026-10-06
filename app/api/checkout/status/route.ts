import { NextResponse } from "next/server";
import { captureServerError, captureServerMessage } from "@/lib/observability";
import { parseSession, SESSION_ID_RE } from "@/lib/checkout-session";

// Confirms with Stripe that a Checkout Session was paid, so the `purchase`
// analytics event fires only for real payments and not for anyone who edits
// ?status=success into the URL. Uncached: one lookup per returning buyer.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("session_id") ?? "";
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !SESSION_ID_RE.test(id)) {
    return NextResponse.json({ paid: false }, { status: 400 });
  }
  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const parsed = res.ok ? parseSession(await res.json()) : null;
    if (!parsed) {
      captureServerMessage("Stripe session lookup failed or was malformed", { scope: "checkout-status", stripe_status: res.status });
    }
    if (!parsed) return NextResponse.json({ paid: false }, { status: 502 });
    return NextResponse.json(parsed);
  } catch (err) {
    captureServerError(err, { scope: "checkout-status" });
    return NextResponse.json({ paid: false }, { status: 502 });
  }
}

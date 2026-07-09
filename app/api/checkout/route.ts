import { NextResponse } from "next/server";

// Stripe Checkout for the one-time $29 Pro report. Keys are injected as Vercel
// env vars (STRIPE_SECRET_KEY, STRIPE_PRICE_ID). When absent (e.g. before the
// Stripe account is wired) the endpoint degrades gracefully: the Pro tier reads
// "coming soon" via the `message` field instead of throwing a 500.
// Deliberately uncached, same reasoning as app/api/lead/route.ts: this
// creates a unique Stripe session per request and must never serve a stale
// checkout URL.
export async function POST() {
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://roofhelm.vercel.app";

  if (!secret || !price) {
    return NextResponse.json(
      { message: "Pro reports are launching shortly. Email hello [at] roofhelm.com for early access." },
      { status: 200 },
    );
  }

  try {
    const body = new URLSearchParams({
      "mode": "payment",
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      "success_url": `${base}/pricing?status=success`,
      "cancel_url": `${base}/pricing?status=cancel`,
      "allow_promotion_codes": "true",
    });
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const session = await res.json();
    if (!res.ok) {
      return NextResponse.json({ message: session?.error?.message ?? "Stripe error" }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ message: "Could not reach Stripe. Please try again." }, { status: 502 });
  }
}

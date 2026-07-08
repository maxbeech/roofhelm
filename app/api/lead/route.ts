import { NextResponse } from "next/server";
import { CATEGORY_LABEL, type OfferCategory } from "@/lib/offers";

// CPL lead intake for the quote-based structures (steel buildings, carports,
// pole barns). A lead arrives already carrying the computed ASCE 7 design load,
// so it is pre-qualified. We deliver it to whichever sink is configured:
//
//   1. Resend  -> emails the lead straight to your inbox (simplest to run solo).
//      Needs RESEND_API_KEY + LEAD_NOTIFY_EMAIL.
//   2. Webhook -> POSTs the lead JSON to LEAD_WEBHOOK_URL (Zapier / Make / n8n /
//      Formspree / a supplier intake), for piping into a CRM or sheet.
//
// Both can run at once. Mirroring the Stripe checkout route, the endpoint
// degrades honestly: with no sink configured, or when every configured sink
// fails, the caller gets an explicit state, never a fabricated success. Nothing
// is stored here (forward and forget), so there is no PII at rest in this app.
//
// Caching: deliberately uncached (Next.js's App Router default for a POST
// handler -- no `revalidate`/`cache` export here). Every other route in this
// app is static content cached at the CDN edge; this one processes a unique
// submission per request and must run every time, so caching it would either
// be a no-op (POST responses aren't cached) or, if forced via a custom
// Cache-Control header, would risk serving a stale honeypot/early-access
// response to a real lead. The "maximize free tier" lever here isn't
// caching -- it's that this function only runs on an actual form submit, not
// on every page view, which is already as cheap as a mutation endpoint gets.

const VALID_CATEGORIES = Object.keys(CATEGORY_LABEL) as OfferCategory[];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LeadBody {
  name?: string;
  email?: string;
  phone?: string;
  structure?: string;
  state?: string;
  zip?: string;
  size?: string;
  timeframe?: string;
  notes?: string;
  designLoad?: number | string;
  groundSnow?: number | string;
  metricLabel?: string;
  metricValue?: string;
  company?: string; // honeypot: real users never fill this hidden field
}

interface Lead {
  source: string;
  receivedAt: string;
  name: string;
  email: string;
  phone: string;
  structure: string;
  structureLabel: string;
  state: string;
  zip: string;
  size: string;
  timeframe: string;
  designLoadPsf: number | null;
  groundSnowPsf: number | null;
  metricLabel: string;
  metricValue: string;
  notes: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

// Email the lead via Resend. Raw fetch (no SDK dependency) needs a User-Agent
// header or Resend returns 403 (error 1010). Returns true on a 2xx.
async function sendViaResend(lead: Lead): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_EMAIL;
  if (!key || !to) return false;
  const from = process.env.LEAD_FROM_EMAIL || "RoofHelm Leads <onboarding@resend.dev>";

  const rows: [string, string][] = [
    ["Structure", lead.structureLabel],
    ["Design snow load", lead.designLoadPsf ? `${lead.designLoadPsf} psf` : "n/a"],
    ["Ground snow", lead.groundSnowPsf ? `${lead.groundSnowPsf} psf` : "n/a"],
    ...(lead.metricLabel && lead.metricValue ? ([[lead.metricLabel, lead.metricValue]] as [string, string][]) : []),
    ["State", lead.state || "n/a"],
    ["ZIP", lead.zip || "n/a"],
    ["Size", lead.size || "n/a"],
    ["Timeframe", lead.timeframe || "n/a"],
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone || "n/a"],
    ["Notes", lead.notes || "n/a"],
  ];
  const html =
    `<h2>New snow load quote request</h2><table cellpadding="6" style="border-collapse:collapse">` +
    rows
      .map(([k, v]) => `<tr><td style="border:1px solid #ddd"><strong>${esc(k)}</strong></td><td style="border:1px solid #ddd">${esc(v)}</td></tr>`)
      .join("") +
    `</table><p style="color:#888">Sent ${esc(lead.receivedAt)} from roofhelm.</p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "User-Agent": "roofhelm/1.0",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: lead.email,
        subject: `New quote: ${lead.structureLabel}${lead.designLoadPsf ? ` (${lead.designLoadPsf} psf)` : ""}${lead.state ? ` - ${lead.state}` : ""}`,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// POST the lead JSON to a generic webhook. Returns true on a 2xx.
async function sendViaWebhook(lead: Lead): Promise<boolean> {
  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (!webhook) return false;
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let body: LeadBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  // Honeypot: silently accept bots without delivering, so they think it worked.
  if (body.company && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const structure = (body.structure ?? "").trim();

  const errors: string[] = [];
  if (name.length < 2) errors.push("a name");
  if (!EMAIL_RE.test(email)) errors.push("a valid email");
  if (!VALID_CATEGORIES.includes(structure as OfferCategory)) errors.push("a structure type");
  if (errors.length) {
    return NextResponse.json(
      { ok: false, message: `Please provide ${errors.join(", ")}.` },
      { status: 422 },
    );
  }

  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.LEAD_NOTIFY_EMAIL);
  const webhookConfigured = Boolean(process.env.LEAD_WEBHOOK_URL);
  if (!resendConfigured && !webhookConfigured) {
    // No delivery sink wired yet: be explicit and give a working fallback rather
    // than pretend the lead was captured.
    return NextResponse.json(
      {
        ok: false,
        notLive: true,
        message:
          "Supplier matching is launching shortly. Email hello@roofhelm.com with your project and snow load and we will connect you.",
      },
      { status: 200 },
    );
  }

  const lead: Lead = {
    source: "roofhelm",
    receivedAt: new Date().toISOString(), // server clock, not a hardcoded date
    name,
    email,
    phone: (body.phone ?? "").trim(),
    structure,
    structureLabel: CATEGORY_LABEL[structure as OfferCategory],
    state: (body.state ?? "").trim(),
    zip: (body.zip ?? "").trim(),
    size: (body.size ?? "").trim(),
    timeframe: (body.timeframe ?? "").trim(),
    designLoadPsf: Number(body.designLoad) || null,
    groundSnowPsf: Number(body.groundSnow) || null,
    metricLabel: (body.metricLabel ?? "").trim(),
    metricValue: (body.metricValue ?? "").trim(),
    notes: (body.notes ?? "").trim(),
  };

  // Deliver to every configured sink; succeed if at least one accepts the lead.
  const results = await Promise.all([sendViaResend(lead), sendViaWebhook(lead)]);
  if (results.some(Boolean)) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json(
    { ok: false, message: "We could not submit your request just now. Please try again or email hello@roofhelm.com." },
    { status: 502 },
  );
}

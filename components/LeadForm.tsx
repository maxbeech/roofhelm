"use client";

// CPL lead form. Collects a pre-qualified quote request that already carries the
// computed ASCE 7 design load, posts it to /api/lead, and reflects the route's
// honest states: a real success, an explicit failure, or the "not wired yet"
// early-access state. No fake confirmation is ever shown. The carried design
// load / ground snow are surfaced read-only so the user sees the engineering
// context that makes their lead worth a sized quote.

import { useState } from "react";
import { CATEGORY_LABEL, CPL_CATEGORIES, type OfferCategory } from "@/lib/offers";
import { STATE_SNOW } from "@/lib/ground-snow";
// Reuse the same input styling as Calculator/ToolCalculator/DriftCalculator
// (single source of truth in FormFields.tsx) instead of a parallel definition.
import { selectCls as field, selectControl as selectField } from "./FormFields";

type Status = "idle" | "submitting" | "ok" | "error" | "notLive";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-[13px] font-semibold text-ink-700">{children}</span>;
}

export default function LeadForm({
  initialStructure,
  designLoad,
  groundSnow,
  metricLabel,
  metricValue,
  prefillNotes,
}: {
  initialStructure: OfferCategory;
  designLoad?: number;
  groundSnow?: number;
  // Generic computed-context for non-snow calculators (e.g. "Estimated cooling
  // load" / "36,000 BTU/hr (3 tons)"), shown the same way as designLoad/groundSnow.
  metricLabel?: string;
  metricValue?: string;
  // Full computed sentence (e.g. the tool's result headline), prefilled into
  // the notes textarea so the buyer gets richer, pre-qualified context than
  // the short metric badge alone -- a real lead-quality lever, not just a
  // bigger CTA: more context up front means fewer back-and-forth calls before
  // a contractor can quote, which is what actually makes a lead worth more.
  prefillNotes?: string;
}) {
  const [structure, setStructure] = useState<OfferCategory>(initialStructure);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      structure,
      state: String(form.get("state") ?? ""),
      zip: String(form.get("zip") ?? ""),
      size: String(form.get("size") ?? ""),
      timeframe: String(form.get("timeframe") ?? ""),
      notes: String(form.get("notes") ?? ""),
      company: String(form.get("company") ?? ""), // honeypot
      designLoad,
      groundSnow,
      metricLabel,
      metricValue,
    };
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) { setStatus("ok"); return; }
      if (data.notLive) { setStatus("notLive"); setMessage(data.message); return; }
      setStatus("error");
      setMessage(data.message ?? "Something went wrong. Please try again.");
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Please try again.");
    }
  }

  if (status === "ok") {
    return (
      <div className="border-2 border-frost-500 bg-frost-50 p-6">
        <div className="label text-frost-600">Request received</div>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink-900">Your quote request is on its way.</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-600">
          We have passed your project to suppliers with your calculated numbers attached, so the quotes that come
          back are sized for your site. Expect to hear from them by email.
        </p>
      </div>
    );
  }

  const hasSnowContext = typeof designLoad === "number" && designLoad > 0;
  const hasMetricContext = !hasSnowContext && Boolean(metricLabel && metricValue);

  return (
    <form onSubmit={onSubmit} className="border border-ink-300 bg-paper p-5 sm:p-6">
      {hasSnowContext && (
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-1 border border-frost-300 bg-frost-50 px-4 py-3">
          <div>
            <span className="label text-ink-400">Design snow load</span>
            <span className="ml-2 tabular font-mono font-semibold text-frost-600">{designLoad} psf</span>
          </div>
          {typeof groundSnow === "number" && groundSnow > 0 && (
            <div>
              <span className="label text-ink-400">Ground snow</span>
              <span className="ml-2 tabular font-mono font-semibold text-ink-700">{groundSnow} psf</span>
            </div>
          )}
          <span className="text-xs text-ink-400">carried from your calculation, sent with the quote</span>
        </div>
      )}

      {hasMetricContext && (
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-1 border border-frost-300 bg-frost-50 px-4 py-3">
          <div>
            <span className="label text-ink-400">{metricLabel}</span>
            <span className="ml-2 tabular font-mono font-semibold text-frost-600">{metricValue}</span>
          </div>
          <span className="text-xs text-ink-400">carried from your calculation, sent with the quote</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <Label>Structure type</Label>
          <select name="structure" className={selectField} value={structure}
            onChange={(e) => setStructure(e.target.value as OfferCategory)}>
            {CPL_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </label>

        <label className="block">
          <Label>Your name</Label>
          <input name="name" required autoComplete="name" className={field} />
        </label>
        <label className="block">
          <Label>Email</Label>
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
        <label className="block">
          <Label>Phone (optional)</Label>
          <input name="phone" type="tel" autoComplete="tel" className={field} />
        </label>
        <label className="block">
          <Label>State</Label>
          <select name="state" className={selectField} defaultValue="">
            <option value="">Select a state</option>
            {STATE_SNOW.map((s) => <option key={s.abbr} value={s.abbr}>{s.name}</option>)}
          </select>
        </label>
        <label className="block">
          <Label>ZIP code (optional)</Label>
          <input name="zip" inputMode="numeric" autoComplete="postal-code" className={field} />
        </label>
        <label className="block">
          <Label>Approx. size, e.g. 30 x 40 ft or sq ft (optional)</Label>
          <input name="size" className={field} />
        </label>
        <label className="block sm:col-span-2">
          <Label>Timeframe (optional)</Label>
          <select name="timeframe" className={selectField} defaultValue="">
            <option value="">Select a timeframe</option>
            <option>As soon as possible</option>
            <option>1 to 3 months</option>
            <option>3 to 6 months</option>
            <option>Just researching</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <Label>Anything else (optional)</Label>
          <textarea name="notes" rows={3} className={field} defaultValue={prefillNotes} />
        </label>

        {/* Honeypot: visually hidden, off the tab order; bots fill it, people do not. */}
        <input name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      </div>

      <button type="submit" disabled={status === "submitting"}
        className="mt-5 w-full bg-ink-900 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-paper transition hover:bg-ink-700 disabled:opacity-60">
        {status === "submitting" ? "Sending" : "Request supplier quotes"}
      </button>

      {(status === "error" || status === "notLive") && (
        <p className={`mt-3 text-sm leading-relaxed ${status === "notLive" ? "text-ink-600" : "text-load-700"}`}>{message}</p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
        We pass your details to relevant suppliers so they can quote a structure sized for your snow load. We do
        not sell your data for anything else. A quote is not engineering certification: confirm the rated load
        and have a licensed engineer review the design for a permit.
      </p>
    </form>
  );
}

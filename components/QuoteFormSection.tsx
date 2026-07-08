"use client";

// Client wrapper that reads the carried calculator context from the URL
// (?structure=&load=&pg=) and feeds it to the prop-driven LeadForm. Living in a
// client component lets the /quote page stay fully static (prerendered, served
// from the edge cache) instead of being forced dynamic by server-side
// searchParams: the prefill happens in the browser. Must be rendered inside a
// <Suspense> boundary because useSearchParams suspends during prerender.

import { useSearchParams } from "next/navigation";
import LeadForm from "./LeadForm";
import { CPL_CATEGORIES, type OfferCategory } from "@/lib/offers";

function normalizeStructure(raw: string | null): OfferCategory {
  if (raw && (CPL_CATEGORIES as string[]).includes(raw)) return raw as OfferCategory;
  return "metal-building";
}

function toLoad(raw: string | null): number | undefined {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default function QuoteFormSection() {
  const sp = useSearchParams();
  return (
    <LeadForm
      initialStructure={normalizeStructure(sp.get("structure"))}
      designLoad={toLoad(sp.get("load"))}
      groundSnow={toLoad(sp.get("pg"))}
      metricLabel={sp.get("metricLabel") ?? undefined}
      metricValue={sp.get("metricValue") ?? undefined}
      prefillNotes={sp.get("detail") ?? undefined}
    />
  );
}

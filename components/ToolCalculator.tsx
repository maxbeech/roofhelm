"use client";

// Generic calculator worksheet + results, driven entirely by a ToolDef
// (lib/calc-engine.ts + lib/tools/*). This is the non-snow-load counterpart
// to Calculator.tsx + CalcResults.tsx: one component renders any of the
// pitch / rafter / truss / joist / insulation / HVAC / roof-cost tools, so
// adding a new calculator is a new lib/tools/*.ts file, not a new component.

import { useEffect, useMemo, useRef, useState } from "react";
import type { ToolDef, ToolInputs } from "@/lib/calc-engine";
import { getTool } from "@/lib/tools";
import { categoryForSlug } from "@/lib/offers";
import { Field, NumberField, SelectField } from "./FormFields";
import SupplierModule from "./SupplierModule";
import { FigCaption } from "./ui";

function encodeInputs(inputs: ToolInputs): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(inputs)) qs.set(k, String(v));
  return qs.toString();
}

function decodeInputs(search: string, tool: ToolDef): ToolInputs {
  const qs = new URLSearchParams(search);
  const out: ToolInputs = { ...tool.defaults };
  for (const f of tool.fields) {
    const raw = qs.get(f.key);
    if (raw === null) continue;
    if (f.type === "number") {
      const n = Number(raw);
      if (Number.isFinite(n)) out[f.key] = Math.min(f.max, Math.max(f.min, n));
    } else {
      if (f.options.some((o) => o.value === raw)) out[f.key] = raw;
    }
  }
  return out;
}

export default function ToolCalculator({ slug }: { slug: string }) {
  // Resolved from the slug (a plain string prop) rather than receiving the
  // ToolDef itself, since ToolDef.compute is a function and can't cross the
  // server/client boundary as a serialized prop. The caller (ToolPage) only
  // ever passes a slug it already resolved via getTool(), so this is safe.
  const tool = getTool(slug)!;
  const [inputs, setInputs] = useState<ToolInputs>(() => ({ ...tool.defaults }));
  const hydrated = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputs(decodeInputs(window.location.search, tool));
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    window.history.replaceState(null, "", `${window.location.pathname}?${encodeInputs(inputs)}`);
  }, [inputs]);

  const result = useMemo(() => tool.compute(inputs), [tool, inputs]);
  const set = (key: string, value: number | string) => setInputs((p) => ({ ...p, [key]: value }));
  const offerCategory = categoryForSlug(tool.slug);
  const primary = tool.resultFields.find((f) => f.primary) ?? tool.resultFields[0];
  const primaryValue = primary ? result.values[primary.key] : undefined;

  return (
    <div>
      <div role="status" aria-live="polite" aria-atomic="true"
        className="sticky top-[64px] z-20 mb-3 flex items-center justify-between border border-ink-300 bg-paper/95 px-4 py-2 backdrop-blur md:hidden print:hidden">
        <span className="label text-ink-400">{primary?.label}</span>
        <span className="tabular font-display text-lg font-semibold text-frost-600">{primaryValue}{primary?.unit && <span className="text-xs font-medium text-ink-400"> {primary.unit}</span>}</span>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="border border-ink-300 bg-paper p-5">
          <div className="flex items-center justify-between border-b border-ink-200 pb-3">
            <h2 className="label text-ink-500">The worksheet</h2>
            <span className="border border-ink-300 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-500">{tool.keyword}</span>
          </div>
          <div className="mt-4 space-y-3.5">
            {tool.fields.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint}>
                {f.type === "number" ? (
                  <NumberField value={Number(inputs[f.key])} min={f.min} max={f.max} step={f.step} ariaLabel={f.label} onChange={(n) => set(f.key, n)} />
                ) : (
                  <SelectField value={String(inputs[f.key])} options={f.options} ariaLabel={f.label} onChange={(v) => set(f.key, v)} />
                )}
              </Field>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-ink-900 bg-paper p-5">
            <div className="label text-ink-500">{primary?.label}</div>
            <div className="tabular mt-1 font-display text-5xl font-semibold text-frost-600">
              {primaryValue}{primary?.unit && <span className="ml-2 font-sans text-xl font-medium text-ink-400">{primary.unit}</span>}
            </div>
            <p className="mt-3 max-w-prose border-t border-ink-200 pt-3 text-sm leading-relaxed text-ink-600">{result.headline}</p>
          </div>

          {tool.resultFields.length > 1 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {tool.resultFields.filter((f) => f.key !== primary?.key).map((f) => (
                <div key={f.key} className="border border-ink-200 bg-paper p-3">
                  <div className="label text-ink-400">{f.label}</div>
                  <div className="tabular mt-0.5 font-display text-2xl font-semibold text-ink-900">
                    {result.values[f.key]}{f.unit && <span className="ml-1 font-sans text-sm font-medium text-ink-400">{f.unit}</span>}
                  </div>
                  {f.hint && <div className="mt-0.5 font-mono text-[11px] text-ink-400">{f.hint}</div>}
                </div>
              ))}
            </div>
          )}

          {result.warnings && result.warnings.length > 0 && (
            <div className="border border-load-300 bg-load-50 p-4">
              <div className="flex items-center gap-2">
                <span className="border border-load-300 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-load-700">Read before you build</span>
              </div>
              {result.warnings.map((w, i) => (
                <p key={i} className="mt-2 text-sm leading-relaxed text-ink-600">{w}</p>
              ))}
            </div>
          )}

          <div className="border border-ink-200 bg-paper p-4">
            <div className="font-display text-sm font-semibold text-ink-900">How this was calculated</div>
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-ink-100">
                {result.breakdown.map((row, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-2 text-ink-500">{row.label}</td>
                    <td className="tabular py-1.5 pr-2 text-right font-mono font-semibold text-ink-900">{row.value}</td>
                    <td className="py-1.5 text-right font-mono text-[11px] text-ink-300">{row.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-ink-900 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-900 transition hover:bg-ink-900 hover:text-paper print:hidden">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>
            Print or save as PDF
          </button>

          <SupplierModule
            category={offerCategory}
            contextLine={<>{result.headline}</>}
            quoteQuery={{
              metricLabel: primary?.label ?? "",
              metricValue: `${primaryValue}${primary?.unit ? ` ${primary.unit}` : ""}`,
              // Full computed sentence, prefilled into the lead's notes field
              // (not the short badge) so the buyer gets richer, pre-qualified
              // context without the UI box trying to fit a whole sentence.
              detail: result.headline,
            }}
          />
        </div>
      </div>
      <FigCaption n="A">{tool.focus}</FigCaption>
    </div>
  );
}

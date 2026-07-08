"use client";

import { useState } from "react";

// Shared calculator worksheet form primitives. Both the snow-load Calculator
// and the generic ToolCalculator (for pitch, rafter, truss, joist, insulation,
// HVAC, roof-cost) render from these, so the input styling and editing
// behavior (clear-and-retype, clamp-on-blur) stay in one place.

export const selectCls =
  "mt-1 w-full border border-ink-300 bg-paper px-3 py-2 text-sm text-ink-900 transition focus-visible:border-frost-500 focus-visible:ring-1 focus-visible:ring-frost-500 focus:outline-none";
// Selects add the painted chevron; number inputs reuse the base only.
export const selectControl = `${selectCls} select-control`;

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold text-ink-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs leading-snug text-ink-400">{hint}</span>}
    </label>
  );
}

// Number input that lets you clear and retype (keeps a raw string while editing,
// clamps to [min,max] only on blur), so deleting a digit never snaps to the min.
export function NumberField({ value, min, max, step = 1, onChange, ariaLabel }:
  { value: number; min: number; max: number; step?: number; onChange: (n: number) => void; ariaLabel?: string }) {
  const [raw, setRaw] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) { setLastValue(value); setRaw(String(value)); }
  return (
    <input type="number" inputMode="decimal" min={min} max={max} step={step} value={raw} aria-label={ariaLabel}
      className={`${selectCls} tabular font-mono`}
      onChange={(e) => {
        setRaw(e.target.value);
        if (e.target.value === "") return;
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
      }}
      onBlur={() => {
        const n = raw === "" ? min : Math.min(max, Math.max(min, Number(raw) || min));
        setRaw(String(n)); onChange(n);
      }} />
  );
}

export function SelectField({ value, options, onChange, ariaLabel }:
  { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; ariaLabel?: string }) {
  return (
    <select className={selectControl} aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

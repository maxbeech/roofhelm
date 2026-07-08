// Generic calculator engine that the non-snow-load calculator family runs on.
// Each tool is a pure data record: input field specs, a pure compute()
// function, and notes/FAQs, in the same shape as lib/roof-types.ts. One
// generic UI (components/ToolCalculator.tsx) renders any ToolDef, so adding a
// new calculator is data, not a new page or component. Single source of truth
// for the type shape every tool in lib/tools/* implements.
import type { FaqItem } from "./faq";
import type { OfferCategory } from "./offers";

export interface NumberFieldSpec {
  type: "number";
  key: string;
  label: string;
  hint?: string;
  unit?: string;
  min: number;
  max: number;
  step?: number;
}

export interface SelectFieldSpec {
  type: "select";
  key: string;
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export type FieldSpec = NumberFieldSpec | SelectFieldSpec;

export type ToolInputs = Record<string, number | string>;

export interface ResultFieldSpec {
  key: string;
  label: string;
  unit?: string;
  hint?: string;
  primary?: boolean; // shown as the big readout
}

export interface ToolResult {
  values: Record<string, number | string>;
  headline: string; // plain-English one-liner, shown as the big readout caption
  breakdown: { label: string; value: string; note?: string }[];
  warnings?: string[]; // shown in a load-toned callout, e.g. limitation disclaimers
}

export interface ToolDef {
  slug: string;
  kind: string; // discriminator, e.g. "roof-pitch"
  name: string; // short label, used in index/nav
  h1: string;
  keyword: string;
  volume: string; // live Google Ads US monthly volume, for transparency
  meta: string;
  intro: string;
  focus: string; // one-line "what this tool gives you"
  offerCategory: OfferCategory;
  fields: FieldSpec[];
  defaults: ToolInputs;
  compute: (inputs: ToolInputs) => ToolResult;
  resultFields: ResultFieldSpec[];
  notes: string[];
  faqs: FaqItem[];
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
export function r1(n: number): number {
  return Math.round(n * 10) / 10;
}
export const fmt = (n: number): string => n.toLocaleString("en-US");
export const fmtMoney = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

export function num(inputs: ToolInputs, key: string): number {
  return Number(inputs[key]);
}
export function str(inputs: ToolInputs, key: string): string {
  return String(inputs[key]);
}

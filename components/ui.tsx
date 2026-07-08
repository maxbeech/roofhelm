import Link from "next/link";
import Contours from "./Contours";

// Editorial primitives. Every page composes from these so the monograph stays
// coherent: one label, one numbered section head, one figure plate, one button.

// Running label / eyebrow, set as a small-caps mono kicker with a short rule.
export function Eyebrow({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 label ${tone === "dark" ? "text-frost-200" : "text-frost-600"}`}>
      <span className={`h-px w-7 ${tone === "dark" ? "bg-frost-300/60" : "bg-frost-500"}`} />
      {children}
    </span>
  );
}

// Numbered section head: a section mark (§n), eyebrow, serif title, standfirst.
export function SectionHead({ num, eyebrow, title, sub, center }:
  { num?: string; eyebrow: string; title: React.ReactNode; sub?: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-3xl"}>
      <div className={`flex items-baseline gap-3 ${center ? "justify-center" : ""}`}>
        {num && <span className="font-mono text-sm font-medium text-frost-600">§{num}</span>}
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <h2 className="mt-3 font-display text-3xl font-semibold leading-[1.04] tracking-tight text-ink-900 sm:text-[2.6rem]">{title}</h2>
      {sub && <p className="mt-4 text-[15px] leading-relaxed text-ink-500">{sub}</p>}
    </div>
  );
}

export function Pill({ children, tone = "frost" }: { children: React.ReactNode; tone?: "frost" | "load" | "ink" }) {
  const tones = { frost: "border-frost-300 text-frost-700", load: "border-load-300 text-load-700", ink: "border-ink-300 text-ink-600" } as const;
  return <span className={`inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tones[tone]}`}>{children}</span>;
}

// Sharp-edged editorial button rendered as a Link.
export function CTA({ href, children, variant = "primary", className = "" }:
  { href: string; children: React.ReactNode; variant?: "primary" | "ghost"; className?: string }) {
  const styles = variant === "primary"
    ? "bg-ink-900 text-paper hover:bg-ink-700"
    : "border border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-paper";
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] transition ${styles} ${className}`}>
      {children}
    </Link>
  );
}

// A figure "plate": a ruled frame with a caption strip, the way a diagram sits
// in a printed monograph (replaces the old browser-chrome mockup).
export function MockWindow({ title = "Plate", children, className = "" }:
  { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <figure className={`border border-ink-300 bg-paper shadow-[0_24px_50px_-30px_rgba(20,17,11,0.4)] ${className}`}>
      <figcaption className="flex items-center justify-between border-b border-ink-200 px-3 py-1.5">
        <span className="label text-ink-500">{title}</span>
        <span className="label text-ink-300">RoofHelm</span>
      </figcaption>
      <div className="p-3 sm:p-4">{children}</div>
    </figure>
  );
}

// A numbered figure caption, e.g. "Fig. 1, balanced roof snow load profile".
export function FigCaption({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <figcaption className="mt-2 figcaption">
      <span className="text-frost-600">Fig. {n}</span> &middot; {children}
    </figcaption>
  );
}

// Big readout numeral, set in the serif for editorial weight.
export function Readout({ value, unit = "psf", label, tone = "frost", size = "xl" }:
  { value: string | number; unit?: string; label?: string; tone?: "frost" | "load" | "ink"; size?: "xl" | "lg" | "md" }) {
  const color = tone === "load" ? "text-load-600" : tone === "ink" ? "text-ink-900" : "text-frost-600";
  const sizes = { xl: "text-5xl", lg: "text-4xl", md: "text-3xl" } as const;
  return (
    <div>
      {label && <div className="label text-ink-400">{label}</div>}
      <div className={`tabular font-display font-semibold ${sizes[size]} ${color}`}>
        {value}{unit && <span className="ml-1.5 font-sans text-base font-medium text-ink-300">{unit}</span>}
      </div>
    </div>
  );
}

// The standard page opener, set like a chapter title page with a faint
// topographic plate behind a section mark, eyebrow, serif title and standfirst.
export function PageHeader({ num, eyebrow, title, children, width = "max-w-6xl" }:
  { num?: string; eyebrow: string; title: React.ReactNode; children?: React.ReactNode; width?: string }) {
  return (
    <div className="relative overflow-hidden border-b-2 border-ink-900 bg-paper">
      <Contours className="opacity-70" />
      <div className={`relative mx-auto ${width} px-6 pb-10 pt-10`}>
        <div className="flex items-baseline gap-3">
          {num && <span className="font-mono text-sm font-medium text-frost-600">{num}</span>}
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.25rem]">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-ink-600">{children}</div>}
      </div>
    </div>
  );
}

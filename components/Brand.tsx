import { MARK } from "@/lib/brand";

// The mark, drawn as a fine line-art figure in a ruled box, the way a small
// diagram sits in a book. Stroked (not filled) so it reads as an engraving.
export function LogoMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox={MARK.viewBox} fill="none" aria-hidden="true" className={className}>
      <rect x="1" y="1" width="30" height="30" rx="2" className="fill-none stroke-ink-900" strokeWidth="1.2" />
      <path d={MARK.roof} className="fill-none stroke-ink-900" strokeWidth="1.3" strokeLinejoin="round" />
      <path d={MARK.snowCap} className="fill-none stroke-frost-600" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

// The masthead lockup: the figure-mark beside a serif wordmark.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={28} />
      <span className="font-display text-[20px] font-semibold leading-none tracking-tight text-ink-900">
        RoofHelm
      </span>
    </span>
  );
}

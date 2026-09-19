import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SITE } from "@/lib/site";
import { Wordmark } from "@/components/Brand";
import { OpenHelmAnalytics } from "../lib/openhelm-analytics";

const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["400", "500", "600", "700"], style: ["normal", "italic"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} · ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: { title: SITE.name, description: SITE.description, url: SITE.url, siteName: SITE.name, type: "website" },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
};

const NAV = [
  { href: "/calculators", label: "Calculators" },
  { href: "/states", label: "By state" },
  { href: "/drift", label: "Drift" },
  { href: "/blog", label: "Essays" },
  { href: "/methodology", label: "Method" },
];

function Header() {
  return (
    <header className="sticky top-0 z-40 bg-paper/92 backdrop-blur print:hidden">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center justify-between border-b border-ink-100 py-1.5">
          <span className="label text-ink-400">A roof engineering monograph</span>
          <span className="label hidden text-ink-400 sm:block">Snow load · pitch · insulation · HVAC · cost</span>
        </div>
        <div className="flex items-baseline justify-between py-3.5">
          <Link href="/" aria-label={`${SITE.name} home`}><Wordmark /></Link>
          <nav className="flex items-center gap-5">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className="hidden text-[13px] font-medium text-ink-600 underline-offset-4 transition hover:text-frost-600 hover:underline sm:inline">
                {n.label}
              </Link>
            ))}
            <Link href="/pricing"
              className="border border-ink-900 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-900 transition hover:bg-ink-900 hover:text-paper">
              Pro offprint
            </Link>
            {/* Mobile menu */}
            <details className="group relative sm:hidden">
              <summary aria-label="Open menu" className="grid h-8 w-8 cursor-pointer list-none place-items-center border border-ink-200 text-ink-700 [&::-webkit-details-marker]:hidden">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-current group-open:hidden" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="hidden stroke-current group-open:block" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </summary>
              <div className="absolute right-0 mt-2 w-52 border border-ink-200 bg-paper p-2 shadow-xl">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="block px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">{n.label}</Link>
                ))}
              </div>
            </details>
          </nav>
        </div>
      </div>
      <div className="rule-masthead mx-auto max-w-6xl" />
    </header>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  const cols: { head: string; links: { href: string; label: string }[] }[] = [
    { head: "Contents", links: [
      { href: "/", label: "The calculator" }, { href: "/drift", label: "Snow drift" },
      { href: "/calculators/ground-snow-to-roof-snow-load", label: "Ground to roof" },
    ] },
    { head: "Plates", links: [
      { href: "/calculators/flat-roof-snow-load", label: "Flat roof" },
      { href: "/calculators/metal-building-snow-load", label: "Metal building" },
      { href: "/calculators/roof-pitch-calculator", label: "Roof pitch" },
      { href: "/calculators/roof-replacement-cost-calculator", label: "Roof cost" },
    ] },
    { head: "Appendices", links: [
      { href: "/states", label: "Ground snow by state" }, { href: "/blog", label: "Essays" },
      { href: "/methodology", label: "Methods" },
    ] },
  ];
  return (
    <footer className="mt-24 border-t-2 border-ink-900 bg-paper print:hidden">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" aria-label={`${SITE.name} home`}><Wordmark /></Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
              An offprint on roof engineering: ASCE 7-22 snow load, roof geometry, insulation, HVAC and cost,
              set and computed transparently, with every factor shown.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.head}>
              <div className="label text-ink-400">{c.head}</div>
              <ul className="mt-3 space-y-2 text-sm">
                {c.links.map((l) => (
                  <li key={l.href}><Link href={l.href} className="text-ink-600 underline-offset-4 transition hover:text-frost-600 hover:underline">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-ink-200 pt-6">
          <p className="max-w-3xl text-xs leading-relaxed text-ink-400">
            <span className="label text-ink-500">Colophon. </span>
            {SITE.name} is set in Fraunces and Inter. The snow load engine computes ASCE 7-22 balanced,
            minimum, rain-on-snow and §7.6.1 unbalanced roof loads for planning and checking; the pitch,
            rafter, truss, joist, insulation, HVAC and cost calculators use the real-formula engines documented
            on each calculator page. The governing ground snow load comes from the ASCE 7 Hazard Tool or your
            building department, and drift, sliding and code-table cases must also be reviewed. Confirm with a
            licensed engineer or contractor before you build or submit. © {year} {SITE.name}.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-paper text-ink-800 antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        <OpenHelmAnalytics />
      </body>
    </html>
  );
}

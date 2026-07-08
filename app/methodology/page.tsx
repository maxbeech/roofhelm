import type { Metadata } from "next";
import { CE, CT, IS } from "@/lib/snow";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Methodology: How RoofHelm Computes Snow Load",
  description: "The exact ASCE 7-22 equations, factors and tables RoofHelm uses, with every source cited. Transparent, defensible roof snow load math.",
  alternates: { canonical: "/methodology" },
};

// 1-week ISR (see app/page.tsx for the reasoning).
export const revalidate = 604800;

function Cell({ children, head }: { children: React.ReactNode; head?: boolean }) {
  return <td className={`border border-ink-100 px-3 py-1.5 text-center ${head ? "bg-ink-50/70 font-semibold text-ink-700" : "text-ink-600"}`}>{children}</td>;
}

const EQUATIONS = [
  ["Flat-roof load", "Pf = 0.7 · Ce · Ct · Is · Pg", "Eq. 7.3-1"],
  ["Sloped load", "Ps = Cs · Pf", "Eq. 7.4-1"],
  ["Minimum load", "Pm = Is · min(Pg, 20)", "§7.3.4, slope < 15°"],
  ["Rain-on-snow", "+5 psf when 0 < Pg ≤ 20 and slope < W/50", "§7.10"],
  ["Snow density", "γ = 0.13 · Pg + 14 ≤ 30 pcf", "Eq. 7.7-1"],
  ["Drift height", "hd = 0.43 · L^⅓ · (Pg+10)^¼ − 1.5", "§7.7"],
  ["Unbalanced", "gable/hip: leeward Ps + hd·γ/√S surcharge", "§7.6.1"],
];

export default function Methodology() {
  return (
    <div>
      <PageHeader eyebrow="Reference" title="Methodology" width="max-w-4xl">
        RoofHelm implements the snow load procedure of <strong className="text-ink-700">ASCE/SEI 7-22,
        Chapter 7</strong> (Minimum Design Loads and Associated Criteria for Buildings and Other Structures).
        Every factor below is exactly the value the calculator uses. This page is the single source of truth.
      </PageHeader>
      <div className="mx-auto max-w-4xl px-5 py-12">
      <section>
        <h2 className="font-display text-lg font-bold text-ink-900">The equations</h2>
        <div className="mt-3 overflow-hidden border border-ink-200 bg-paper">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-ink-50">
              {EQUATIONS.map(([name, eq, ref]) => (
                <tr key={name}>
                  <td className="px-4 py-2.5 font-medium text-ink-600">{name}</td>
                  <td className="px-4 py-2.5 font-mono text-[13px] text-ink-900">{eq}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[11px] text-frost-600">{ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-9 text-sm leading-relaxed text-ink-600">
        <h2 className="font-display text-lg font-bold text-ink-900">Ground snow load, Pg</h2>
        <p className="mt-2">
          Pg is a site-specific input, set by the ASCE 7 Hazard Tool or your local building department.
          RoofHelm never assumes it. The per-state pages provide a planning range read from the ASCE 7
          ground snow load map; the value adopted by your jurisdiction governs a permit.
        </p>
      </section>

      <section className="mt-9 text-sm text-ink-600">
        <h2 className="font-display text-lg font-bold text-ink-900">Exposure factor Ce, Table 7.3-1</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead><tr><Cell head>Terrain</Cell><Cell head>Fully exposed</Cell><Cell head>Partially exposed</Cell><Cell head>Sheltered</Cell></tr></thead>
            <tbody>
              {(["B", "C", "D", "aboveTreeline"] as const).map((t) => (
                <tr key={t}>
                  <Cell head>{t === "aboveTreeline" ? "Above treeline" : t}</Cell>
                  <Cell>{CE[t].fully}</Cell><Cell>{CE[t].partial}</Cell><Cell>{CE[t].sheltered}</Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-9 grid gap-7 text-sm text-ink-600 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">Thermal factor Ct, Table 7.3-2</h2>
          <table className="mt-3 w-full border-collapse text-xs">
            <tbody>
              <tr><Cell head>Heated building</Cell><Cell>{CT.heated}</Cell></tr>
              <tr><Cell head>Just above freezing or cold ventilated</Cell><Cell>{CT.slightlyHeated}</Cell></tr>
              <tr><Cell head>Unheated or open</Cell><Cell>{CT.unheated}</Cell></tr>
              <tr><Cell head>Freezer</Cell><Cell>{CT.freezer}</Cell></tr>
              <tr><Cell head>Heated greenhouse</Cell><Cell>{CT.greenhouse}</Cell></tr>
            </tbody>
          </table>
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">Importance factor Is, Table 1.5-2</h2>
          <table className="mt-3 w-full border-collapse text-xs">
            <tbody>
              {(["I", "II", "III", "IV"] as const).map((k) => (
                <tr key={k}><Cell head>Risk Category {k}</Cell><Cell>{IS[k]}</Cell></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-9 text-sm leading-relaxed text-ink-600">
        <h2 className="font-display text-lg font-bold text-ink-900">Slope factor Cs, §7.4 and Fig. 7.4-1</h2>
        <p className="mt-2">
          Cs is 1.0 up to a breakpoint slope, then falls linearly to 0 at 70°. The breakpoint depends on
          whether the roof is warm (Ct ≤ 1.0), cold ventilated (Ct = 1.1) or cold (Ct ≥ 1.2), and on whether
          the surface is slippery: warm slippery 5°, warm other 30°; cold-ventilated slippery 10°, other
          37.5°; cold slippery 15°, other 45°.
        </p>
      </section>

      <section className="mt-9 border-l-2 border-load-500 bg-load-50 p-5 text-sm leading-relaxed text-ink-600">
        <h2 className="font-display text-lg font-bold text-ink-900">What this tool covers, and what it does not</h2>
        <p className="mt-2">
          RoofHelm computes the <strong className="text-ink-800">balanced</strong> roof snow load, the
          §7.3.4 minimum and the §7.10 rain-on-snow case; the <strong className="text-ink-800">§7.6.1
          unbalanced</strong> case for hip and gable roofs; and, on the drift page, the <strong className="text-ink-800">§7.7
          drift</strong> surcharge at roof steps. It does not yet resolve sliding snow (§7.9), partial loading
          (§7.5), the monoslope and sawtooth unbalanced cases (§7.6.2 and §7.6.3), or curved roofs. Those can
          govern on specific geometries and must be checked by a qualified engineer for a permit submittal.
          Always confirm the governing ground snow load and have the design reviewed by a licensed professional.
        </p>
      </section>
      </div>
    </div>
  );
}

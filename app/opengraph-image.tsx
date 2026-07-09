import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";
import { COLOR, MARK } from "@/lib/brand";

export const alt = `${SITE.name}, ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social share card, set as the cover of the monograph: warm paper, ink, a
// masthead rule and a line-art mark. Generated at build time (no runtime cost).
// Every multi-child div sets display:flex because Satori (next/og) requires it.
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: COLOR.paper, padding: "64px 72px", color: COLOR.ink900 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `2px solid ${COLOR.ink900}`, paddingBottom: 16, fontSize: 22, letterSpacing: 2, color: COLOR.ink600, textTransform: "uppercase" }}>
            <span style={{ display: "flex" }}>A roof engineering monograph</span>
            <span style={{ display: "flex" }}>Vol. 01</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 28 }}>
            <svg width="46" height="46" viewBox={MARK.viewBox}>
              <rect x="1" y="1" width="30" height="30" fill="none" stroke={COLOR.ink900} strokeWidth="1.4" />
              <path d={MARK.roof} fill="none" stroke={COLOR.ink900} strokeWidth="1.5" />
              <path d={MARK.snowCap} fill="none" stroke={COLOR.frost600} strokeWidth="1.3" />
            </svg>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>RoofHelm</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 78, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, maxWidth: 1010 }}>
            Every roof calculation, measured to the letter of the code.
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 28, color: COLOR.ink600, maxWidth: 960 }}>
            Snow load, pitch and framing, insulation, HVAC and roof replacement cost, each run through a real
            formula with every factor shown.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, borderTop: `1px solid ${COLOR.ink200}`, paddingTop: 22 }}>
          {["Snow load, ASCE 7-22", "Pitch & framing", "Insulation & HVAC", "Roof cost"].map((t) => (
            <div key={t} style={{ display: "flex", border: `1px solid ${COLOR.ink900}`, color: COLOR.ink800, padding: "8px 18px", fontSize: 22, fontWeight: 600 }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}

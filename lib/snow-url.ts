// Single source of truth for encoding/decoding snow calculator inputs to URL
// query params, so a result is shareable, bookmarkable and deep-linkable. Pure
// + validated: every value is clamped or checked against its allowed set, so a
// hand-edited or stale URL (or a link carrying only ?utm_source) can never
// produce NaN or an out-of-range input.
import {
  DEFAULT_SNOW, type RiskCategory, type RoofExposure, type RoofShape, type SnowInputs,
  type Surface, type Terrain, type Thermal,
} from "./snow";

const RISK: RiskCategory[] = ["I", "II", "III", "IV"];
const TERRAIN: Terrain[] = ["B", "C", "D", "aboveTreeline"];
const EXPOSURE: RoofExposure[] = ["fully", "partial", "sheltered"];
const THERMAL: Thermal[] = ["heated", "slightlyHeated", "unheated", "freezer", "greenhouse"];
const SURFACE: Surface[] = ["slippery", "nonslippery"];
const SHAPE: RoofShape[] = ["flat", "monoslope", "gable", "hip"];

function clampNum(v: string | null, min: number, max: number, fallback: number): number {
  // Absent/blank param -> fallback (default), NOT 0: a link carrying only
  // tracking params leaves our keys null and Number(null) === 0 (finite), which
  // would otherwise clamp every such link to the minimum.
  if (v === null || v.trim() === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function pick<T extends string>(v: string | null, allowed: T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

export function encodeInputs(inp: SnowInputs): string {
  const p = new URLSearchParams({
    pg: String(inp.pg), r: inp.risk, te: inp.terrain, ex: inp.roofExposure,
    th: inp.thermal, su: inp.surface, sh: inp.shape, sl: String(inp.slopeDeg),
    w: String(inp.width), ar: String(inp.area ?? 0),
  });
  return p.toString();
}

/**
 * Strict counterpart to decodeInputs, for the paid path. Every key must be
 * present and valid. Nothing is clamped and nothing falls back to a default,
 * because a Pro report built from numbers the buyer never entered is worse
 * than no report. Returns null on the first problem.
 */
export function parseStrictInputs(search: string): SnowInputs | null {
  const p = new URLSearchParams(search);
  const num = (key: string, min: number, max: number): number | null => {
    const v = p.get(key);
    if (v === null || v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  const one = <T extends string>(key: string, allowed: T[]): T | null => {
    const v = p.get(key);
    return v !== null && allowed.includes(v as T) ? (v as T) : null;
  };

  const pg = num("pg", 0, 400);
  const slopeDeg = num("sl", 0, 70);
  const width = num("w", 5, 500);
  const area = num("ar", 0, 1000000);
  const risk = one("r", RISK);
  const terrain = one("te", TERRAIN);
  const roofExposure = one("ex", EXPOSURE);
  const thermal = one("th", THERMAL);
  const surface = one("su", SURFACE);
  const shape = one("sh", SHAPE);
  if (pg === null || slopeDeg === null || width === null || area === null) return null;
  if (!risk || !terrain || !roofExposure || !thermal || !surface || !shape) return null;
  return { pg, risk, terrain, roofExposure, thermal, surface, shape, slopeDeg, width, area };
}

export function decodeInputs(search: string, fallback: Partial<SnowInputs> = {}): SnowInputs {
  const base = { ...DEFAULT_SNOW, ...fallback };
  const p = new URLSearchParams(search);
  if ([...p.keys()].length === 0) return base;
  return {
    pg: clampNum(p.get("pg"), 0, 400, base.pg),
    risk: pick(p.get("r"), RISK, base.risk),
    terrain: pick(p.get("te"), TERRAIN, base.terrain),
    roofExposure: pick(p.get("ex"), EXPOSURE, base.roofExposure),
    thermal: pick(p.get("th"), THERMAL, base.thermal),
    surface: pick(p.get("su"), SURFACE, base.surface),
    shape: pick(p.get("sh"), SHAPE, base.shape),
    slopeDeg: clampNum(p.get("sl"), 0, 70, base.slopeDeg),
    width: clampNum(p.get("w"), 5, 500, base.width),
    area: clampNum(p.get("ar"), 0, 1000000, base.area ?? 0),
  };
}

// Town-by-town ground snow load tables. Some state codes set one value per municipality,
// so a single state-level range cannot answer a town query. Each table names its document,
// the table inside it, and the date its rows were read. Add a table only after opening the
// primary source and counting its rows. Guarded by test/town-snow.test.mts.
import { CT_TOWN_SNOW } from "./town-snow-data/connecticut";

export interface TownSnow {
  town: string;
  pg: number; // ground snow load, psf
}

export interface TownSnowLink {
  href: string; // internal path, e.g. /blog/ground-snow-load-explained
  label: string;
}

export interface TownSnowTable {
  stateSlug: string; // matches StateSnow.slug in lib/ground-snow.ts
  sourceName: string; // the document the values come from
  sourceHref: string; // https link to that document
  sourceTable: string; // where the values sit in it, e.g. "Appendix P"
  checkedOn: string; // YYYY-MM-DD the rows were read from the source
  towns: TownSnow[];
  related?: TownSnowLink[]; // internal links shown under the table
}

export interface PsfTier {
  psf: number;
  towns: string[];
}

// Group towns into psf tiers, lowest psf first, with town names alphabetical inside a tier.
// Input order does not matter; the output is the same for any permutation of the input.
export function groupTownsByPsf(towns: TownSnow[]): PsfTier[] {
  const byPsf = new Map<number, string[]>();
  for (const t of towns) {
    const list = byPsf.get(t.pg) ?? [];
    list.push(t.town);
    byPsf.set(t.pg, list);
  }
  return [...byPsf.keys()]
    .sort((a, b) => a - b)
    .map((psf) => ({
      psf,
      towns: (byPsf.get(psf) ?? []).slice().sort((a, b) => a.localeCompare(b)),
    }));
}

// A Map, not a plain object, so a lookup such as "constructor" cannot match Object.prototype.
const TOWN_TABLES = new Map<string, TownSnowTable>([[CT_TOWN_SNOW.stateSlug, CT_TOWN_SNOW]]);

export function getTownSnowTable(stateSlug: string): TownSnowTable | undefined {
  return TOWN_TABLES.get(stateSlug);
}

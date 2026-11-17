import Link from "next/link";
import { groupTownsByPsf, type TownSnowTable } from "@/lib/town-snow";

// Town-by-town ground snow load, rendered from a checked source table (lib/town-snow.ts).
// The values come from the state code, so the section names the document, the table inside
// it and the date the rows were read.
export default function TownSnowList({ table, stateName }: { table: TownSnowTable; stateName: string }) {
  const tiers = groupTownsByPsf(table.towns);
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-semibold text-ink-900">{stateName} ground snow load by town</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-600">
        The {table.sourceName} gives each of the {table.towns.length} municipalities its own ground snow load in{" "}
        {table.sourceTable}, in {tiers.length} values. Find your town in the list below. That is the ground snow
        load the state code sets for the town, and the building department can confirm it for your address.
      </p>

      <div className="mt-4 space-y-3">
        {tiers.map((tier) => (
          <div key={tier.psf} className="border border-ink-200 bg-paper p-4">
            <h3 className="text-sm font-semibold text-ink-900">
              {tier.psf} psf <span className="font-normal text-ink-500">({tier.towns.length} towns)</span>
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{tier.towns.join(", ")}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm text-ink-500">
        Source:{" "}
        <a
          href={table.sourceHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-frost-700 hover:underline"
        >
          {table.sourceName}
        </a>
        , {table.sourceTable}, read {table.checkedOn}.
      </p>

      {table.related && table.related.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-ink-700">Related reading</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {table.related.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border border-ink-200 bg-paper px-3 py-1.5 text-sm text-ink-500 transition hover:border-frost-500 hover:text-ink-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

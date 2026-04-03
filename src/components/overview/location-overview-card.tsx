import Link from "next/link";

import type { LocationOverview } from "@/lib/dashboard-data";

import { LocationFlag } from "@/components/overview/location-flag";
import { LocationOverviewStat } from "@/components/overview/location-overview-stat";

export function LocationOverviewCard({ location }: { location: LocationOverview }) {
  return (
    <Link
      className="card-panel overview-card group relative flex min-h-72 w-full max-w-[27rem] overflow-hidden rounded-none p-5 md:h-72"
      href={`/${location.slug}`}
    >
      <LocationFlag slug={location.slug} variant="card" />

      <div className="relative flex min-h-full flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 transition-colors duration-500 group-hover:text-slate-500">
                {location.country}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-50 transition-colors duration-500 group-hover:text-slate-950">
                {location.label}
              </h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <LocationOverviewStat
            footer={`${location.years[0]} - ${location.years.at(-1)}`}
            label="Coverage"
            value={`${location.years.at(-1)! - location.years[0] + 1} years`}
          />
          <LocationOverviewStat
            label={location.districtCount > 1 ? location.areaLabelPlural : "No Area Breakdown"}
            value={location.districtCount > 1 ? String(location.districtCount) : undefined}
          />
          <LocationOverviewStat label="Categories" value={String(location.categoryCount)} />
        </div>
      </div>
    </Link>
  );
}

import Link from "next/link";

import type { LocationOverview } from "@/lib/dashboard-data";

import { LocationFlag } from "@/components/overview/location-flag";

export function OverviewLocationList({ locations }: { locations: LocationOverview[] }) {
  return (
    <div className="mx-auto max-w-4xl">
      {locations.map((location, index) => (
        <Link
          className="group relative flex items-center gap-4 px-0 py-3 transition sm:py-3.5"
          href={`/${location.slug}`}
          key={location.slug}
        >
          <LocationFlag slug={location.slug} variant="list" />
          <span className="text-xl font-semibold tracking-[-0.02em] text-slate-100 transition group-hover:text-white">
            {location.label}
          </span>
          {index < locations.length - 1 ? (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/8" />
          ) : null}
        </Link>
      ))}
    </div>
  );
}

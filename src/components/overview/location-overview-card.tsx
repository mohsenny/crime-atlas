import Image from "next/image";
import Link from "next/link";

import type { LocationOverview } from "@/lib/dashboard-data";

import { LocationOverviewStat } from "@/components/overview/location-overview-stat";

const flagByLocationSlug: Record<string, { src: string; alt: string }> = {
  berlin: {
    src: "/flags/germany.png",
    alt: "Flag of Germany",
  },
  frankfurt: {
    src: "/flags/germany.png",
    alt: "Flag of Germany",
  },
  london: {
    src: "/flags/united-kingdom.png",
    alt: "Flag of the United Kingdom",
  },
  luton: {
    src: "/flags/united-kingdom.png",
    alt: "Flag of the United Kingdom",
  },
  paris: {
    src: "/flags/france.png",
    alt: "Flag of France",
  },
};

export function LocationOverviewCard({ location }: { location: LocationOverview }) {
  const flag = flagByLocationSlug[location.slug];

  return (
    <Link
      className="card-panel overview-card group relative flex min-h-72 w-full max-w-[27rem] overflow-hidden rounded-none p-5 md:h-72"
      href={`/${location.slug}`}
    >
      {flag ? (
        <div className="pointer-events-none absolute right-5 top-5 z-0 h-[28%] min-h-[4.75rem] w-[30%] min-w-[6.75rem] opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-95">
          <div className="relative h-full w-full overflow-hidden border border-white/10 bg-white/[0.04] shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-colors duration-500 group-hover:border-slate-300/80 group-hover:bg-white/80">
            <Image
              alt={flag.alt}
              className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
              fill
              sizes="(min-width: 768px) 10rem, 8rem"
              src={flag.src}
            />
          </div>
        </div>
      ) : null}

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
            label={location.districtCount > 1 ? location.areaLabelPlural : "Area breakdown"}
            value={location.districtCount > 1 ? String(location.districtCount) : "No Area Breakdown"}
          />
          <LocationOverviewStat label="Categories" value={String(location.categoryCount)} />
        </div>
      </div>
    </Link>
  );
}

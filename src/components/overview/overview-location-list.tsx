import Link from "next/link";

import type { LocationOverview } from "@/lib/dashboard-data";

import { LocationFlag } from "@/components/overview/location-flag";
import { cn } from "@/lib/utils";

type OverviewLocationListProps = {
  locations: LocationOverview[];
  compareMode?: boolean;
  selectedSlugs?: string[];
  disabledSlugs?: string[];
  onSelect?: (slug: string) => void;
};

export function OverviewLocationList({
  locations,
  compareMode = false,
  selectedSlugs = [],
  disabledSlugs = [],
  onSelect,
}: OverviewLocationListProps) {
  return (
    <div className="mx-auto max-w-4xl">
      {locations.map((location, index) => (
        compareMode ? (
          <button
            className={cn(
              "group relative flex w-full items-center gap-4 px-0 py-3 text-left transition sm:py-3.5",
              disabledSlugs.includes(location.slug) ? "cursor-not-allowed opacity-45" : null,
              selectedSlugs.includes(location.slug) ? "text-slate-950" : "text-slate-100",
            )}
            disabled={disabledSlugs.includes(location.slug)}
            key={location.slug}
            onClick={() => onSelect?.(location.slug)}
            type="button"
          >
            <LocationFlag slug={location.slug} variant="list" />
            <span
              className={cn(
                "text-xl font-semibold tracking-[-0.02em] transition",
                selectedSlugs.includes(location.slug) ? "text-slate-50" : "text-slate-100 group-hover:text-white",
              )}
            >
              {location.label}
            </span>
            <span
              className={cn(
                "ml-auto flex h-5 w-5 items-center justify-center border text-xs font-semibold leading-none transition-colors",
                selectedSlugs.includes(location.slug)
                  ? "border-slate-200 bg-slate-100 text-slate-950"
                  : "border-white/18 text-transparent",
              )}
            >
              ✓
            </span>
            {index < locations.length - 1 ? (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/8" />
            ) : null}
          </button>
        ) : (
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
        )
      ))}
    </div>
  );
}

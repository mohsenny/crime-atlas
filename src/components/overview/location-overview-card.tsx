import Link from "next/link";

import type { LocationOverview } from "@/lib/dashboard-data";

import { LocationFlag } from "@/components/overview/location-flag";
import { LocationOverviewStat } from "@/components/overview/location-overview-stat";
import { cn } from "@/lib/utils";

type LocationOverviewCardProps = {
  location: LocationOverview;
  compareMode?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: (slug: string) => void;
};

export function LocationOverviewCard({
  location,
  compareMode = false,
  selected = false,
  disabled = false,
  onSelect,
}: LocationOverviewCardProps) {
  const baseClassName = cn(
    "card-panel overview-card group relative flex min-h-72 w-full max-w-[27rem] overflow-hidden rounded-none p-5 text-left md:h-72",
    compareMode ? "overview-card--compare-mode cursor-pointer !border-slate-200" : null,
    compareMode && selected
      ? "overview-card--selected !border-slate-200 bg-slate-100 shadow-[0_22px_52px_rgba(2,6,23,0.28)] [backdrop-filter:none]"
      : null,
    compareMode && disabled ? "cursor-not-allowed opacity-45" : null,
  );

  const content = (
    <>
      {compareMode ? (
        <div
          className={cn(
            "absolute right-0 top-0 z-20 flex h-5 w-5 items-center justify-center border-b border-l transition-colors",
            selected
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-slate-200 bg-slate-100 text-transparent",
          )}
        >
          <svg
            aria-hidden="true"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 16 16"
          >
            <path
              d="M3.5 8.25 6.4 11.15 12.5 5.05"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </div>
      ) : null}

      <LocationFlag country={location.country} selected={selected} slug={location.slug} variant="card" />

      <div className="relative flex min-h-full w-full flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div>
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-[0.22em] transition-colors duration-500",
                  selected ? "text-slate-500" : "text-slate-400 group-hover:text-slate-500",
                )}
              >
                {location.country}
              </p>
              <h2
                className={cn(
                  "mt-2 text-3xl font-semibold tracking-[-0.03em] transition-colors duration-500",
                  selected ? "text-slate-950" : "text-slate-50 group-hover:text-slate-950",
                )}
              >
                {location.label}
              </h2>
            </div>
          </div>
        </div>

        <div className="grid w-full grid-cols-[repeat(3,minmax(0,1fr))] gap-3">
          <LocationOverviewStat
            footer={`${location.years[0]} - ${location.years.at(-1)}`}
            label="Coverage"
            selected={selected}
            value={`${location.years.at(-1)! - location.years[0] + 1} years`}
          />
          <LocationOverviewStat
            label={location.districtCount > 1 ? location.areaLabelPlural : "No Area Breakdown"}
            selected={selected}
            value={location.districtCount > 1 ? String(location.districtCount) : undefined}
          />
          <LocationOverviewStat label="Categories" selected={selected} value={String(location.categoryCount)} />
        </div>
      </div>
    </>
  );

  if (compareMode) {
    return (
      <button
        className={baseClassName}
        disabled={disabled && !selected}
        onClick={() => onSelect?.(location.slug)}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      className={baseClassName}
      href={`/${location.slug}`}
    >
      {content}
    </Link>
  );
}

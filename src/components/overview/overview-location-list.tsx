import { Fragment } from "react";
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
  showAlphaIndex?: boolean;
};

function getLocationInitial(label: string) {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const firstCharacter = normalized.slice(0, 1).toUpperCase();

  return /^[A-Z]$/.test(firstCharacter) ? firstCharacter : "#";
}

export function OverviewLocationList({
  locations,
  compareMode = false,
  selectedSlugs = [],
  disabledSlugs = [],
  onSelect,
  showAlphaIndex = false,
}: OverviewLocationListProps) {
  const activeLetters = [...new Set(locations.map((location) => getLocationInitial(location.label)))];

  function scrollToLetter(letter: string) {
    const target = document.getElementById(`overview-alpha-${letter}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className={cn("relative", showAlphaIndex && activeLetters.length > 1 && "pr-7")}>
        {showAlphaIndex && activeLetters.length > 1 ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 top-0 w-5">
            <div className="pointer-events-auto sticky top-24 flex w-full flex-col items-center gap-1 rounded-full border border-white/8 bg-slate-950/35 py-2 backdrop-blur-sm">
              {activeLetters.map((letter) => (
                <button
                  aria-label={`Jump to ${letter}`}
                  className="inline-flex h-4 w-full items-center justify-center text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 transition hover:text-slate-100"
                  key={letter}
                  onClick={() => scrollToLetter(letter)}
                  type="button"
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {locations.map((location, index) => {
          const locationInitial = getLocationInitial(location.label);
          const previousInitial = index > 0 ? getLocationInitial(locations[index - 1]!.label) : null;
          const showInitialMarker = showAlphaIndex && locationInitial !== previousInitial;

          return (
            <Fragment key={location.slug}>
              {showInitialMarker ? (
                <div
                  className="mb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                  id={`overview-alpha-${locationInitial}`}
                >
                  {locationInitial}
                </div>
              ) : null}

              {compareMode ? (
                <button
                  className={cn(
                    "group relative flex w-full items-center gap-4 px-0 py-3 text-left transition sm:py-3.5",
                    disabledSlugs.includes(location.slug) ? "cursor-not-allowed opacity-45" : null,
                    selectedSlugs.includes(location.slug) ? "bg-slate-100 text-slate-950" : "text-slate-100",
                  )}
                  disabled={disabledSlugs.includes(location.slug)}
                  onClick={() => onSelect?.(location.slug)}
                  type="button"
                >
                  <LocationFlag
                    country={location.country}
                    selected={selectedSlugs.includes(location.slug)}
                    slug={location.slug}
                    variant="list"
                  />
                  <span
                    className={cn(
                      "text-xl font-semibold tracking-[-0.02em] transition",
                      selectedSlugs.includes(location.slug) ? "text-slate-950" : "text-slate-100 group-hover:text-white",
                    )}
                  >
                    {location.label}
                  </span>
                  <span
                    className={cn(
                      "ml-auto mr-3 flex h-5 w-5 shrink-0 items-center justify-center border text-xs font-semibold leading-none transition-colors",
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
                >
                  <LocationFlag country={location.country} slug={location.slug} variant="list" />
                  <span className="text-xl font-semibold tracking-[-0.02em] text-slate-100 transition group-hover:text-white">
                    {location.label}
                  </span>
                  {index < locations.length - 1 ? (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/8" />
                  ) : null}
                </Link>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

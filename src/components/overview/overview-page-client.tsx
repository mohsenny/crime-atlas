"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { LocationOverview } from "@/lib/dashboard-data";

import { CompareCityPicker, MAX_COMPARE_LOCATIONS } from "@/components/comparison/compare-city-picker";
import { SingleSelectDropdown } from "@/components/dashboard/expandable-dropdown";
import { LocationOverviewCard } from "@/components/overview/location-overview-card";
import { OverviewLocationList } from "@/components/overview/overview-location-list";
import { OverviewViewToggle } from "@/components/overview/overview-view-toggle";
import { cn } from "@/lib/utils";

type OverviewPageClientProps = {
  locations: LocationOverview[];
};

export function OverviewPageClient({ locations }: OverviewPageClientProps) {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [viewPreference, setViewPreference] = useState<"card" | "list">("card");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareSlugs, setSelectedCompareSlugs] = useState<string[]>([]);

  const countryOptions = useMemo(
    () => [
      { label: "All", value: "all" },
      ...Array.from(new Set(locations.map((location) => location.country)))
        .sort((left, right) => left.localeCompare(right))
        .map((country) => ({ label: country, value: country })),
    ],
    [locations],
  );

  const filteredLocations = useMemo(
    () => locations.filter((location) => selectedCountry === "all" || location.country === selectedCountry),
    [locations, selectedCountry],
  );

  function toggleCompareSelection(slug: string) {
    setSelectedCompareSlugs((current) => {
      if (current.includes(slug)) {
        return current.filter((value) => value !== slug);
      }

      if (current.length >= MAX_COMPARE_LOCATIONS) {
        return current;
      }

      return [...current, slug];
    });
  }

  function cancelCompareMode() {
    setCompareMode(false);
    setSelectedCompareSlugs([]);
  }

  function handleCountryChange(nextCountry: string) {
    setSelectedCountry(nextCountry);

    if (!compareMode) {
      return;
    }

    const visibleSlugs = new Set(
      locations
        .filter((location) => nextCountry === "all" || location.country === nextCountry)
        .map((location) => location.slug),
    );

    setSelectedCompareSlugs((current) => current.filter((slug) => visibleSlugs.has(slug)));
  }

  function handleDesktopCompareButton() {
    if (!compareMode) {
      setCompareMode(true);
      setSelectedCompareSlugs([]);
      return;
    }

    if (selectedCompareSlugs.length >= 2 && selectedCompareSlugs.length <= MAX_COMPARE_LOCATIONS) {
      router.push(`/compare?cities=${selectedCompareSlugs.join(",")}`);
    }
  }

  return (
    <main className="min-h-screen px-4 py-7 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-[83rem]">
        <div className="mb-8 flex flex-col gap-4 md:gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3 xl:flex-1">
            <h1 className="masthead-title text-5xl leading-[0.94] tracking-[0.01em] text-stone-50 sm:text-6xl md:text-[4.35rem]">
              Crime Atlas
            </h1>
            <p className="text-sm leading-6 text-slate-300/85 sm:text-base xl:whitespace-nowrap">
              Official dashboards built from police-recorded crime data published by public authorities for each location.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 xl:shrink-0">
            <div className="hidden md:flex md:items-center md:gap-3">
              <div className="flex min-w-[14.5rem] items-center gap-2">
                <button
                  className={cn(
                    "inline-flex h-10 items-center rounded-2xl border border-slate-700 bg-slate-900/70 px-3.5 text-slate-300 transition",
                    "min-w-[8.5rem] justify-center text-[10px] font-semibold uppercase tracking-[0.18em] leading-none",
                    compareMode
                      ? selectedCompareSlugs.length >= 2 && selectedCompareSlugs.length <= MAX_COMPARE_LOCATIONS
                        ? "hover:text-slate-50"
                        : "cursor-default text-slate-500"
                      : "hover:text-slate-50",
                  )}
                  onClick={handleDesktopCompareButton}
                  type="button"
                >
                  {compareMode
                    ? selectedCompareSlugs.length >= 2
                      ? `Compare ${selectedCompareSlugs.length} Cities`
                      : "Select Cities"
                    : "Compare"}
                </button>
                <div className="w-12">
                  {compareMode ? (
                    <button
                      className="inline-flex h-10 items-center px-1 text-sm font-medium text-slate-400 transition hover:text-slate-100"
                      onClick={cancelCompareMode}
                      type="button"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              <OverviewViewToggle
                onChange={(value) => setViewPreference(value)}
                value={viewPreference}
              />
            </div>
            <div className="md:hidden">
              <CompareCityPicker locations={locations} triggerLabel="Compare" />
            </div>
            <SingleSelectDropdown
              fullWidth
              label="Country"
              maxOverlayWidth={320}
              maxWidth={320}
              minWidth={160}
              onChange={handleCountryChange}
              options={countryOptions}
              value={selectedCountry}
            />
          </div>
        </div>

        <div
          className={cn(
            "hidden flex-wrap justify-center gap-2 md:gap-2 md:flex",
            viewPreference === "list" ? "md:hidden" : null,
          )}
        >
          {filteredLocations.map((location) => (
            <LocationOverviewCard
              compareMode={compareMode}
              disabled={
                compareMode &&
                selectedCompareSlugs.length === MAX_COMPARE_LOCATIONS &&
                !selectedCompareSlugs.includes(location.slug)
              }
              key={location.slug}
              location={location}
              onSelect={toggleCompareSelection}
              selected={selectedCompareSlugs.includes(location.slug)}
            />
          ))}
        </div>

        <div
          className={cn(
            "mx-auto block max-w-4xl md:hidden",
            viewPreference === "list" ? "md:block" : null,
          )}
        >
          <OverviewLocationList
            compareMode={compareMode}
            disabledSlugs={
              compareMode && selectedCompareSlugs.length === MAX_COMPARE_LOCATIONS
                ? filteredLocations
                    .map((location) => location.slug)
                    .filter((slug) => !selectedCompareSlugs.includes(slug))
                : []
            }
            locations={filteredLocations}
            onSelect={toggleCompareSelection}
            selectedSlugs={selectedCompareSlugs}
          />
        </div>
      </div>
    </main>
  );
}

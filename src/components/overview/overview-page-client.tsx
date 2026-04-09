"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { LocationOverview } from "@/lib/dashboard-data";

import { MAX_COMPARE_LOCATIONS } from "@/components/comparison/compare-city-picker";
import { SingleSelectDropdown } from "@/components/dashboard/expandable-dropdown";
import { LocationOverviewCard } from "@/components/overview/location-overview-card";
import { OverviewLocationList } from "@/components/overview/overview-location-list";
import { OverviewScopeToggle } from "@/components/overview/overview-scope-toggle";
import { buildOverviewHref, getScopeLabel, type LocationScope } from "@/lib/location-scope";
import { cn } from "@/lib/utils";
import { buildCompareSearchParams } from "@/lib/view-state";

type OverviewPageClientProps = {
  initialScope: LocationScope;
  locations: LocationOverview[];
};

export function OverviewPageClient({ initialScope, locations }: OverviewPageClientProps) {
  const router = useRouter();
  const [selectedScope, setSelectedScope] = useState<LocationScope>(initialScope);
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareSlugs, setSelectedCompareSlugs] = useState<string[]>([]);

  useEffect(() => {
    const nextHref = buildOverviewHref(selectedScope);
    if (`${window.location.pathname}${window.location.search}` !== nextHref) {
      window.history.replaceState(null, "", nextHref);
    }
  }, [selectedScope]);

  const scopeLabelPlural = getScopeLabel(selectedScope, { plural: true, capitalized: true });
  const scopedLocations = useMemo(
    () => locations.filter((location) => location.scope === selectedScope),
    [locations, selectedScope],
  );

  const countryOptions = useMemo(
    () => [
      { label: "All", value: "all" },
      ...Array.from(new Set(scopedLocations.map((location) => location.country)))
        .sort((left, right) => left.localeCompare(right))
        .map((country) => ({ label: country, value: country })),
    ],
    [scopedLocations],
  );

  const filteredLocations = useMemo(
    () =>
      selectedScope === "country"
        ? scopedLocations
        : scopedLocations.filter((location) => selectedCountry === "all" || location.country === selectedCountry),
    [scopedLocations, selectedCountry, selectedScope],
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

  function handleScopeChange(nextScope: LocationScope) {
    setSelectedScope(nextScope);
    setSelectedCountry("all");
    cancelCompareMode();
  }

  function handleCountryChange(nextCountry: string) {
    setSelectedCountry(nextCountry);

    if (!compareMode) {
      return;
    }

    const visibleSlugs = new Set(
      scopedLocations
        .filter((location) => nextCountry === "all" || location.country === nextCountry)
        .map((location) => location.slug),
    );

    setSelectedCompareSlugs((current) => current.filter((slug) => visibleSlugs.has(slug)));
  }

  function submitCompareSelection() {
    if (selectedCompareSlugs.length < 2 || selectedCompareSlugs.length > MAX_COMPARE_LOCATIONS) {
      return;
    }

    router.push(
      `/compare?${buildCompareSearchParams({
        locations: selectedCompareSlugs,
        metric: "rate",
        scope: selectedScope,
      }).toString()}`,
    );
  }

  function handleDesktopCompareButton() {
    if (!compareMode) {
      setCompareMode(true);
      setSelectedCompareSlugs([]);
      return;
    }

    submitCompareSelection();
  }

  function handleMobileCompareButton() {
    if (!compareMode) {
      setCompareMode(true);
      setSelectedCompareSlugs([]);
      return;
    }

    submitCompareSelection();
  }

  const compareButtonEnabled =
    selectedCompareSlugs.length >= 2 && selectedCompareSlugs.length <= MAX_COMPARE_LOCATIONS;
  const hasLocations = filteredLocations.length > 0;
  const compareButtonLabel = !compareMode
    ? "Compare"
    : compareButtonEnabled
      ? `Compare ${selectedCompareSlugs.length}`
      : "Select 2+";
  const emptyTitle =
    selectedScope === "country" ? "Country dashboards will appear here" : "No city dashboards match this filter";
  const emptyCopy =
    selectedScope === "country"
      ? "No country dashboards are available in the current dataset yet. Once another normalized country dataset is added, it will appear here automatically."
      : "Try switching the country filter or return to all cities.";

  return (
    <main className="min-h-screen px-4 pb-5 pt-2 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-[83rem]">
        <div className="mb-3 flex flex-col gap-2 md:mb-8 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-8 md:gap-y-3">
          <div className="space-y-2 md:space-y-3">
            <h1 className="masthead-title text-5xl leading-[0.94] tracking-[0.01em] text-stone-50 sm:text-6xl md:text-[4.35rem]">
              Crime Atlas
            </h1>
          </div>

          <div className="hidden md:flex md:items-center md:justify-self-end md:gap-1.5 lg:gap-2">
            {selectedScope === "city" ? (
              <div className="w-72">
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
            ) : null}

            <div className="flex h-10 items-center gap-2">
              {compareMode ? (
                <button
                  className="inline-flex h-10 items-center px-1 text-sm font-medium text-slate-400 transition hover:text-slate-100"
                  onClick={cancelCompareMode}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
              <button
                aria-label={`Compare ${getScopeLabel(selectedScope, { plural: true })}`}
                className={cn(
                  "inline-flex h-10 min-w-[9.5rem] items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/70 px-4 text-slate-300 transition",
                  "whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] leading-none",
                  compareMode
                    ? compareButtonEnabled
                      ? "border-slate-200 bg-slate-100 text-slate-950 hover:bg-white"
                      : "cursor-default text-slate-500"
                    : "hover:text-slate-50",
                )}
                  disabled={!hasLocations}
                onClick={handleDesktopCompareButton}
                type="button"
              >
                {compareButtonLabel}
              </button>
            </div>

            <OverviewScopeToggle onChange={handleScopeChange} value={selectedScope} />
          </div>

          <p className="pl-1 text-sm leading-5 text-slate-300/85 sm:text-base sm:leading-6 md:col-span-2 lg:whitespace-nowrap">
            Official dashboards built from police-recorded crime data published by public authorities for each location.
          </p>
        </div>

        <div className="sticky top-0 z-30 -mx-4 mb-3 bg-[#2d333c]/95 px-4 py-2.5 shadow-[0_18px_34px_rgba(3,7,14,0.18)] backdrop-blur-md sm:-mx-6 sm:px-6 md:hidden" data-overview-mobile-header>
          {compareMode ? (
            <div className="flex h-10 items-stretch justify-end gap-2">
              <div className="flex items-stretch gap-2">
                <button
                  aria-label="Cancel compare"
                  className="inline-flex h-full w-8 shrink-0 items-center justify-center text-slate-300 transition hover:text-slate-50"
                  onClick={cancelCompareMode}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <button
                aria-label={`Compare ${getScopeLabel(selectedScope, { plural: true })}`}
                className={cn(
                  "inline-flex h-full w-[9.5rem] shrink-0 items-center justify-center rounded-2xl border px-3.5 text-[10px] font-semibold uppercase tracking-[0.18em] leading-none transition whitespace-nowrap",
                  compareButtonEnabled
                    ? "border-slate-200 bg-slate-100 text-slate-950 hover:bg-white"
                    : "border-slate-700 bg-slate-900/70 text-slate-500",
                )}
                disabled={!hasLocations}
                onClick={handleMobileCompareButton}
                type="button"
              >
                {compareButtonLabel}
              </button>
            </div>
          ) : (
            <div className="flex h-10 items-stretch gap-1.5">
              <div className="shrink-0">
                <OverviewScopeToggle onChange={handleScopeChange} value={selectedScope} />
              </div>
              <button
                aria-label={`Compare ${getScopeLabel(selectedScope, { plural: true })}`}
                className={cn(
                  "inline-flex h-full min-w-0 flex-1 items-center justify-center rounded-2xl border px-3.5 text-[10px] font-semibold uppercase tracking-[0.18em] leading-none transition whitespace-nowrap",
                  "border-slate-700 bg-slate-900/70 text-slate-300 hover:text-slate-50",
                )}
                disabled={!hasLocations}
                onClick={handleMobileCompareButton}
                type="button"
              >
                {compareButtonLabel}
              </button>
            </div>
          )}
        </div>

        {hasLocations ? (
          <>
            <div className="hidden flex-wrap justify-center gap-2 md:flex md:gap-2">
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

            <div className="mx-auto block max-w-4xl md:hidden">
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
                showAlphaIndex={selectedScope === "city"}
              />
            </div>
          </>
        ) : (
          <section className="card-panel chart-panel rounded-none p-6 sm:p-7">
            <div className="mx-auto max-w-2xl space-y-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{scopeLabelPlural}</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-100">{emptyTitle}</h2>
              <p className="max-w-xl text-sm leading-6 text-slate-300/85">{emptyCopy}</p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

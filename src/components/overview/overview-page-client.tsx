"use client";

import { useEffect, useMemo, useState } from "react";

import type { LocationOverview } from "@/lib/dashboard-data";

import { SingleSelectDropdown } from "@/components/dashboard/expandable-dropdown";
import { LocationOverviewCard } from "@/components/overview/location-overview-card";
import { OverviewLocationList } from "@/components/overview/overview-location-list";
import { OverviewViewToggle } from "@/components/overview/overview-view-toggle";
import { cn } from "@/lib/utils";

type OverviewPageClientProps = {
  locations: LocationOverview[];
};

export function OverviewPageClient({ locations }: OverviewPageClientProps) {
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [viewPreference, setViewPreference] = useState<"auto" | "card" | "list">("auto");
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

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
  const effectiveView = viewPreference === "auto" ? (isMobileViewport ? "list" : "card") : viewPreference;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[83rem]">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl space-y-3">
            <h1 className="masthead-title text-5xl leading-[0.94] tracking-[0.01em] text-stone-50 sm:text-6xl md:text-[4.35rem]">
              Crime Atlas
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-300/85 sm:text-base">
              Official dashboards built from police-recorded crime data published by public authorities for each location.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <OverviewViewToggle
              onChange={(value) => setViewPreference(value)}
              value={effectiveView}
            />
            <SingleSelectDropdown
              label="Country"
              maxOverlayWidth={320}
              maxWidth={320}
              minWidth={260}
              onChange={setSelectedCountry}
              options={countryOptions}
              value={selectedCountry}
            />
          </div>
        </div>

        <div
          className={cn(
            "flex flex-wrap justify-center gap-2 md:gap-2",
            viewPreference === "list" ? "hidden" : viewPreference === "auto" ? "hidden md:flex" : "flex",
          )}
        >
          {filteredLocations.map((location) => (
            <LocationOverviewCard key={location.slug} location={location} />
          ))}
        </div>

        <div
          className={cn(
            "mx-auto max-w-4xl",
            viewPreference === "card" ? "hidden" : viewPreference === "auto" ? "block md:hidden" : "block",
          )}
        >
          <OverviewLocationList locations={filteredLocations} />
        </div>
      </div>
    </main>
  );
}

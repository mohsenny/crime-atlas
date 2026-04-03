"use client";

import { useMemo, useState } from "react";

import type { LocationOverview } from "@/lib/dashboard-data";

import { SingleSelectDropdown } from "@/components/dashboard/expandable-dropdown";
import { LocationOverviewCard } from "@/components/overview/location-overview-card";

type OverviewPageClientProps = {
  locations: LocationOverview[];
};

export function OverviewPageClient({ locations }: OverviewPageClientProps) {
  const [selectedCountry, setSelectedCountry] = useState("all");

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

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[83rem]">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl space-y-3">
            <h1 className="masthead-title text-5xl leading-none tracking-[-0.015em] text-stone-50 sm:text-6xl">
              Crime Atlas
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-300/85 sm:text-base">
              Official dashboards built from police-recorded crime data published by public authorities for each location.
            </p>
          </div>

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

        <div className="flex flex-wrap justify-center gap-2 md:gap-2">
          {filteredLocations.map((location) => (
            <LocationOverviewCard key={location.slug} location={location} />
          ))}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ComparisonData, LocationOverview } from "@/lib/dashboard-data";

import { CompareCityPicker } from "@/components/comparison/compare-city-picker";
import { ComparisonChart } from "@/components/comparison/comparison-chart";
import { ComparisonMethodology } from "@/components/comparison/comparison-methodology";
import { DashboardSources } from "@/components/dashboard/dashboard-sources";
import { MetricToggle } from "@/components/dashboard/metric-toggle";
import { buildOverviewHref, getScopeLabel } from "@/lib/location-scope";
import { buildCompareSearchParams } from "@/lib/view-state";
type ComparisonPageClientProps = {
  data: ComparisonData;
  initialCategorySlug?: string;
  initialMetric: "count" | "rate";
  locations: LocationOverview[];
};

export function ComparisonPageClient({ data, initialCategorySlug, initialMetric, locations }: ComparisonPageClientProps) {
  const pathname = usePathname();
  const resolvedInitialCategorySlug =
    data.categories.find((category) => category.value === initialCategorySlug)?.value ??
    data.defaultCategorySlug ??
    data.categories[0]?.value ??
    "";

  const [selectedCategorySlug, setSelectedCategorySlug] = useState(resolvedInitialCategorySlug);
  const [metric, setMetric] = useState<"count" | "rate">(initialMetric);

  useEffect(() => {
    setSelectedCategorySlug(resolvedInitialCategorySlug);
  }, [resolvedInitialCategorySlug]);

  useEffect(() => {
    if (!selectedCategorySlug || data.locations.length === 0) {
      return;
    }

    const nextParams = buildCompareSearchParams({
      locations: data.locations.map((location) => location.slug),
      categorySlug: selectedCategorySlug,
      metric,
      scope: data.scope,
    });
    const nextUrl = `${pathname}?${nextParams.toString()}`;

    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [data.locations, data.scope, metric, pathname, selectedCategorySlug]);

  const selectedCategory = data.categories.find((category) => category.value === selectedCategorySlug) ?? data.categories[0] ?? null;

  const rows = useMemo(() => {
    const series = data.seriesByCategory[selectedCategorySlug] ?? [];
    const valuesByKey = new Map(series.map((record) => [`${record.year}__${record.locationSlug}`, record]));

    return data.years.map((year) => {
      const row: Record<string, number | string | null> = { year: String(year) };

      for (const location of data.locations) {
        const record = valuesByKey.get(`${year}__${location.slug}`);
        row[location.slug] = metric === "rate" ? (record?.ratePer100k ?? null) : (record?.count ?? null);
      }

      return row;
    });
  }, [data.locations, data.seriesByCategory, data.years, metric, selectedCategorySlug]);

  const combinedSources = useMemo(
    () =>
      data.locations.flatMap((location) =>
        location.sources.map((source) => ({
          label: `${location.label}: ${source.label}`,
          url: source.url,
        })),
      ),
    [data.locations],
  );

  return (
    <main className="min-h-screen py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="px-4 sm:px-0">
          <div className="flex items-center gap-2 sm:justify-between">
            <Link
              aria-label={`All ${getScopeLabel(data.scope, { plural: true, capitalized: true })}`}
              className="-ml-1 inline-flex h-10 shrink-0 items-center gap-2 text-slate-400 transition hover:text-slate-100"
              href={buildOverviewHref(data.scope)}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline text-sm font-semibold leading-none">
                All {getScopeLabel(data.scope, { plural: true, capitalized: true })}
              </span>
            </Link>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:flex-none sm:gap-2">
              <CompareCityPicker
                className="min-w-[5.5rem] shrink-0 justify-center sm:min-w-0"
                initialSelectedSlugs={data.locations.map((location) => location.slug)}
                locations={locations}
                mobileTriggerLabel="Switch"
                scope={data.scope}
                showTriggerLabel={true}
                triggerIcon={ArrowRightLeft}
                triggerLabel="Switch compare"
              />
              <div className="shrink-0">
                <MetricToggle
                  mobileLabelMode="adaptive"
                  onChange={setMetric}
                  supportsRate={data.supportsRate}
                  value={metric}
                />
              </div>
            </div>
          </div>
        </div>

        {selectedCategory ? (
          <ComparisonChart
            categories={data.categories}
            locations={data.locations}
            metric={metric}
            onSelectCategory={setSelectedCategorySlug}
            rows={rows}
            selectedCategorySlug={selectedCategorySlug}
            title={data.locations.map((location) => location.label).join(" vs ")}
          />
        ) : (
          <div className="card-panel chart-panel rounded-none p-6 text-sm text-slate-300">
            No mapped comparable categories were found for the selected locations.
          </div>
        )}

        <div className="grid gap-6 px-4 sm:px-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
          <DashboardSources sources={combinedSources} />
          <ComparisonMethodology
            category={selectedCategory}
            methodology={selectedCategory ? data.methodologyByCategory[selectedCategory.value] ?? null : null}
          />
        </div>
      </div>
    </main>
  );
}

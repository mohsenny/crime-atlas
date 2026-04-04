"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import Link from "next/link";

import type { ComparisonData, LocationOverview } from "@/lib/dashboard-data";

import { CompareCityPicker } from "@/components/comparison/compare-city-picker";
import { ComparisonChart } from "@/components/comparison/comparison-chart";
import { ComparisonMethodology } from "@/components/comparison/comparison-methodology";
import { DashboardSources } from "@/components/dashboard/dashboard-sources";
import { MetricToggle } from "@/components/dashboard/metric-toggle";
import { formatInteger } from "@/lib/utils";

type ComparisonPageClientProps = {
  data: ComparisonData;
  locations: LocationOverview[];
};

export function ComparisonPageClient({ data, locations }: ComparisonPageClientProps) {
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(data.defaultCategorySlug ?? data.categories[0]?.value ?? "");
  const [metric, setMetric] = useState<"count" | "rate">(data.supportsRate ? "rate" : "count");

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
    <main className="min-h-screen px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              className="inline-flex h-10 items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-100"
              href="/"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>All locations</span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <CompareCityPicker
                initialSelectedSlugs={data.locations.map((location) => location.slug)}
                locations={locations}
                triggerIcon={ArrowRightLeft}
                triggerLabel="Change Cities"
              />
              {data.supportsRate ? <MetricToggle value={metric} onChange={setMetric} /> : null}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-50 sm:text-3xl">
              {data.locations.map((location) => location.label).join(" vs ")}
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-slate-300/85">{data.note}</p>
            {selectedCategory ? (
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Comparing {selectedCategory.label} across {formatInteger(data.years.length)} yearly positions
                {selectedCategory.confidence === "medium" ? " · close official match" : ""}
              </p>
            ) : null}
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
            title={selectedCategory.label}
          />
        ) : (
          <div className="card-panel chart-panel rounded-none p-6 text-sm text-slate-300">
            No mapped comparable categories were found for the selected locations.
          </div>
        )}

        <ComparisonMethodology
          category={selectedCategory}
          methodology={selectedCategory ? data.methodologyByCategory[selectedCategory.value] ?? null : null}
        />

        <DashboardSources sources={combinedSources} />
      </div>
    </main>
  );
}

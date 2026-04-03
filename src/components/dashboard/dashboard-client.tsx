"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, RefreshCw } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { CrimeChart } from "@/components/dashboard/crime-chart";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DashboardSources } from "@/components/dashboard/dashboard-sources";
import { ExpandableDropdown } from "@/components/dashboard/expandable-dropdown";
import { MetricToggle } from "@/components/dashboard/metric-toggle";
import type { ChartResponse, FilterMetadata } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

type DashboardClientProps = {
  meta: FilterMetadata;
  backHref?: string;
  backLabel?: string;
};

export function DashboardClient({
  meta,
  backHref = "/",
  backLabel = "All locations",
}: DashboardClientProps) {
  const [selectedDistricts, setSelectedDistricts] = useState(meta.defaultDistrictSlugs);
  const [metric, setMetric] = useState<"count" | "rate">("count");
  const [hiddenCategorySlugs, setHiddenCategorySlugs] = useState<string[]>(
    meta.categories.filter((category) => !meta.defaultCategorySlugs.includes(category.value)).map((category) => category.value),
  );
  const [focusedDistrictSlug, setFocusedDistrictSlug] = useState<string | null>(null);
  const [data, setData] = useState<ChartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const deferredDistricts = useDeferredValue(selectedDistricts.join(","));
  const deferredMetric = useDeferredValue(metric);
  const isLoading =
    deferredDistricts !== selectedDistricts.join(",") ||
    deferredMetric !== metric;
  const isInitialLoading = data === null && !error;
  const isRefreshing = isLoading && hasLoadedOnce;
  const effectiveFocusedDistrictSlug =
    focusedDistrictSlug && selectedDistricts.includes(focusedDistrictSlug) ? focusedDistrictSlug : null;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      location: meta.slug,
      districts: deferredDistricts,
      metric: deferredMetric,
    });

    fetch(`/api/chart?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Chart data request failed.");
        }

        return (await response.json()) as ChartResponse;
      })
      .then((payload) => {
        startTransition(() => {
          setData(payload);
          setError(null);
          setHasLoadedOnce(true);
        });
      })
      .catch((fetchError: Error) => {
        if (fetchError.name !== "AbortError") {
          setError(fetchError.message);
        }
      });

    return () => controller.abort();
  }, [deferredDistricts, deferredMetric, meta.slug]);

  function toggleHiddenCategory(categorySlug: string) {
    setHiddenCategorySlugs((current) =>
      current.includes(categorySlug)
        ? current.filter((value) => value !== categorySlug)
        : [...current, categorySlug],
    );
  }

  function toggleFocusedDistrict(districtSlug: string) {
    setFocusedDistrictSlug((current) => (current === districtSlug ? null : districtSlug));
  }

  if (isInitialLoading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-100"
              href={backHref as Route}
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </div>
          <div className="card-panel chart-panel rounded-none p-6 text-sm text-rose-200">
            {error ?? "The dashboard data could not be loaded."}
          </div>
          <DashboardSources sources={meta.sources} />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-100"
            href={backHref as Route}
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {meta.supportsRate ? <MetricToggle value={metric} onChange={setMetric} /> : null}
            {meta.districts.length > 1 ? (
              <ExpandableDropdown
                label={meta.areaLabelPlural}
                onChange={setSelectedDistricts}
                options={meta.districts}
                values={selectedDistricts}
              />
            ) : null}
            <button
              className="inline-flex h-12 items-center gap-1.5 px-1 text-sm font-semibold leading-none tracking-[-0.01em] text-slate-400 transition hover:text-slate-100"
              onClick={() => {
                setSelectedDistricts(meta.defaultDistrictSlugs);
                setHiddenCategorySlugs(
                  meta.categories
                    .filter((category) => !meta.defaultCategorySlugs.includes(category.value))
                    .map((category) => category.value),
                );
                setFocusedDistrictSlug(null);
                setMetric("count");
              }}
              type="button"
            >
              <RefreshCw className="size-4" strokeWidth={2.1} />
              Reset
            </button>
          </div>
        </div>

        {error ? <div className="text-right text-sm text-rose-300">{error}</div> : null}

        <div className="relative">
          {isRefreshing ? (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
              <div className="inline-flex items-center gap-2 border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300 backdrop-blur-sm">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Updating
              </div>
            </div>
          ) : null}
          <div className={cn("transition-opacity", isRefreshing ? "opacity-72" : "opacity-100")}>
            <CrimeChart
              data={data}
              focusedDistrictSlug={effectiveFocusedDistrictSlug}
              hiddenCategorySlugs={hiddenCategorySlugs}
              onToggleDistrict={toggleFocusedDistrict}
              onToggleCategory={toggleHiddenCategory}
              title={meta.chartTitle}
            />
          </div>
        </div>

        <DashboardSources sources={meta.sources} />
      </div>
    </main>
  );
}

"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, RefreshCw } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { CompareCityPicker } from "@/components/comparison/compare-city-picker";
import { CrimeChart } from "@/components/dashboard/crime-chart";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DashboardSources } from "@/components/dashboard/dashboard-sources";
import { ExpandableDropdown } from "@/components/dashboard/expandable-dropdown";
import { MetricToggle } from "@/components/dashboard/metric-toggle";
import type { ChartResponse, FilterMetadata, LocationOverview } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

type DashboardClientProps = {
  meta: FilterMetadata;
  locations: LocationOverview[];
  backHref?: string;
  backLabel?: string;
};

export function DashboardClient({
  meta,
  locations,
  backHref = "/",
  backLabel = "All locations",
}: DashboardClientProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
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
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

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
      <main className="relative min-h-screen overflow-hidden py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="px-4 sm:px-0">
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-100"
              href={backHref as Route}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{backLabel}</span>
              <span className="sr-only sm:hidden">{backLabel}</span>
            </Link>
          </div>
          <div className="card-panel chart-panel rounded-none p-6 text-sm text-rose-200 sm:p-6">
            {error ?? "The dashboard data could not be loaded."}
          </div>
          <div className="px-4 sm:px-0">
            <DashboardSources sources={meta.sources} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <Link
              aria-label={backLabel}
              className="-ml-1 inline-flex h-10 items-center gap-2 text-slate-400 transition hover:text-slate-100"
              href={backHref as Route}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline text-sm font-semibold leading-none">{backLabel}</span>
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CompareCityPicker
                className="shrink-0"
                initialSelectedSlugs={[meta.slug]}
                locations={locations}
                lockedSlugs={[meta.slug]}
                triggerLabel="Compare"
              />
              {meta.supportsRate ? (
                <div className="shrink-0">
                  <MetricToggle value={metric} onChange={setMetric} />
                </div>
              ) : null}
              {meta.districts.length > 1 ? (
                <div className="min-w-0 sm:w-80 sm:flex-none">
                  <ExpandableDropdown
                    fullWidth
                    label={meta.areaLabelPlural}
                    maxOverlayWidth={360}
                    maxWidth={360}
                    minWidth={140}
                    onChange={setSelectedDistricts}
                    options={meta.districts}
                    values={selectedDistricts}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {error ? <div className="px-4 text-right text-sm text-rose-300 sm:px-0">{error}</div> : null}

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

        <div className="px-4 sm:px-0">
          <DashboardSources sources={meta.sources} />
        </div>
      </div>
    </main>
  );
}

"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { CompareCityPicker } from "@/components/comparison/compare-city-picker";
import { CrimeChart } from "@/components/dashboard/crime-chart";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DashboardSources } from "@/components/dashboard/dashboard-sources";
import { ExpandableDropdown } from "@/components/dashboard/expandable-dropdown";
import { MetricToggle } from "@/components/dashboard/metric-toggle";
import { BackLink } from "@/components/navigation/back-link";
import type { ChartResponse, FilterMetadata, LocationOverview } from "@/lib/dashboard-data";
import {
  findAllOffensesCategorySlug,
  normalizeLocationCategorySlugs,
} from "@/lib/location-category-selection";
import { cn } from "@/lib/utils";
import { buildLocationSearchParams } from "@/lib/view-state";

type DashboardClientProps = {
  meta: FilterMetadata;
  locations: LocationOverview[];
  backHref?: string;
  backLabel?: string;
  initialDistrictSlugs: string[];
  initialCategorySlugs: string[];
  initialMetric: "count" | "rate";
};

export function DashboardClient({
  meta,
  locations,
  backHref = "/",
  backLabel = "All locations",
  initialDistrictSlugs,
  initialCategorySlugs,
  initialMetric,
}: DashboardClientProps) {
  const pathname = usePathname();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const categoryValues = useMemo(() => meta.categories.map((category) => category.value), [meta.categories]);
  const allOffensesCategorySlug = useMemo(() => findAllOffensesCategorySlug(meta.categories), [meta.categories]);
  const [selectedDistricts, setSelectedDistricts] = useState(initialDistrictSlugs);
  const [metric, setMetric] = useState<"count" | "rate">(initialMetric);
  const [hiddenCategorySlugs, setHiddenCategorySlugs] = useState<string[]>(
    categoryValues.filter(
      (categorySlug) =>
        !normalizeLocationCategorySlugs(meta.categories, initialCategorySlugs).includes(categorySlug),
    ),
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
  const visibleCategorySlugs = useMemo(
    () => categoryValues.filter((categorySlug) => !hiddenCategorySlugs.includes(categorySlug)),
    [categoryValues, hiddenCategorySlugs],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const nextParams = buildLocationSearchParams({
      meta,
      districtSlugs: selectedDistricts,
      categorySlugs: visibleCategorySlugs,
      metric,
    });
    const nextUrl = `${pathname}?${nextParams.toString()}`;

    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [meta, metric, pathname, selectedDistricts, visibleCategorySlugs]);

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
    setHiddenCategorySlugs((current) => {
      const currentVisible = categoryValues.filter((value) => !current.includes(value));
      let nextVisible: string[];

      if (categorySlug === allOffensesCategorySlug) {
        nextVisible = currentVisible.includes(categorySlug) ? [] : [categorySlug];
      } else if (currentVisible.includes(categorySlug)) {
        nextVisible = currentVisible.filter((value) => value !== categorySlug);
      } else {
        nextVisible = [...currentVisible.filter((value) => value !== allOffensesCategorySlug), categorySlug];
      }

      const normalizedVisible = normalizeLocationCategorySlugs(meta.categories, nextVisible);

      return categoryValues.filter((value) => !normalizedVisible.includes(value));
    });
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
            <BackLink href={backHref as Route} label={backLabel} />
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
          <div className="flex items-center gap-2 sm:justify-between">
            <BackLink href={backHref as Route} label={backLabel} />
            <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:flex-none sm:gap-2">
              <CompareCityPicker
                className="min-w-[5.75rem] shrink-0 justify-center sm:min-w-0"
                initialSelectedSlugs={[meta.slug]}
                locations={locations}
                lockedSlugs={[meta.slug]}
                mobileTriggerLabel="Compare"
                scope={meta.scope}
                triggerLabel="Compare"
              />
              {meta.supportsRate ? (
                <div className="shrink-0">
                  <MetricToggle value={metric} onChange={setMetric} />
                </div>
              ) : null}
              {meta.districts.length > 1 ? (
                <div className="min-w-0 flex-1 sm:w-80 sm:flex-none">
                  <ExpandableDropdown
                    fullWidth
                    label={meta.areaLabelPlural}
                    maxOverlayWidth={360}
                    maxWidth={360}
                    minWidth={116}
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

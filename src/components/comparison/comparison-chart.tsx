"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import type { ComparisonCategory, ComparisonLocation } from "@/lib/dashboard-data";

import { ChartShell } from "@/components/chart/chart-shell";
import { useChartUi } from "@/components/chart/use-chart-ui";
import { ChartLegendButton } from "@/components/dashboard/chart-legend-button";
import { cn, formatAxisTickNumber, formatInteger } from "@/lib/utils";

type ComparisonChartProps = {
  rows: Array<Record<string, number | string | null>>;
  locations: ComparisonLocation[];
  categories: ComparisonCategory[];
  selectedCategorySlug: string;
  onSelectCategory: (slug: string) => void;
  metric: "count" | "rate";
  title: string;
};

const CITY_COLORS = ["#7dd3fc", "#f97316", "#a78bfa", "#22c55e"];
const DESKTOP_CHART_HEIGHT = 520;
const MOBILE_CHART_HEIGHT = 420;
const DESKTOP_AXIS_WIDTH = 88;
const MOBILE_AXIS_WIDTH = 64;
const X_AXIS_HEIGHT = 30;

export function ComparisonChart({
  rows,
  locations,
  categories,
  selectedCategorySlug,
  onSelectCategory,
  metric,
  title,
}: ComparisonChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [focusedLocationSlug, setFocusedLocationSlug] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { isMobileViewport } = useChartUi();
  const chartHeight = isMobileViewport ? MOBILE_CHART_HEIGHT : DESKTOP_CHART_HEIGHT;
  const axisWidth = isMobileViewport ? MOBILE_AXIS_WIDTH : DESKTOP_AXIS_WIDTH;
  const axisChartWidth = axisWidth + (isMobileViewport ? 6 : 8);
  const axisProbeLocationSlug = locations[0]?.slug ?? null;
  const groupWidth = isMobileViewport ? 52 : 72;
  const minChartWidth = Math.max(isMobileViewport ? 0 : 760, rows.length * groupWidth);
  const chartWidth = Math.max(minChartWidth, viewportWidth);

  const yMax = useMemo(() => {
    const values = rows.flatMap((row) =>
      locations
        .map((location) => Number(row[location.slug] ?? Number.NaN))
        .filter((value) => Number.isFinite(value)),
    );
    return values.length ? Math.max(...values) : 0;
  }, [locations, rows]);

  const axisTicks = useMemo(() => {
    const buildAxisTicks = (max: number) => {
      if (max <= 0) return [0];
      const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
      const normalized = max / magnitude;
      const step = normalized <= 1 ? 0.1 : normalized <= 2 ? 0.2 : normalized <= 5 ? 0.5 : 1;
      const ticks = [];
      for (let i = 0; i <= Math.ceil(normalized / step); i++) {
        ticks.push(Math.round(i * step * magnitude * 100) / 100);
      }
      return ticks;
    };
    return buildAxisTicks(yMax);
  }, [yMax]);

  const chartTopMargin = 12;
  const chartBottomMargin = 8;
  const chartPlotHeight = chartHeight - chartTopMargin - chartBottomMargin;
  const yAxisMax = axisTicks.at(-1) ?? 1;
  const visibleLocationSlugs = focusedLocationSlug ? [focusedLocationSlug] : locations.map((location) => location.slug);

  const syncScrollState = useCallback(() => {
    const element = scrollContainerRef.current;

    if (!element) {
      return;
    }

    setCanScrollLeft(element.scrollLeft > 8);
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) {
      return;
    }

    const syncViewport = () => {
      setViewportWidth(element.clientWidth);
      syncScrollState();
    };

    const id = window.requestAnimationFrame(syncViewport);
    const resizeObserver = new ResizeObserver(syncViewport);
    resizeObserver.observe(element);
    window.addEventListener("resize", syncViewport);

    return () => {
      window.cancelAnimationFrame(id);
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncViewport);
    };
  }, [syncScrollState]);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) {
      return;
    }

    const onScroll = () => syncScrollState();
    element.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      element.removeEventListener("scroll", onScroll);
    };
  }, [syncScrollState]);

  function toggleFocusedLocation(slug: string) {
    setFocusedLocationSlug((current) => (current === slug ? null : slug));
  }

  function scrollChart(direction: 1 | -1) {
    const element = scrollContainerRef.current;

    if (!element) {
      return;
    }

    element.scrollBy({
      left: direction * Math.max(element.clientWidth * 0.75, 240),
      behavior: "smooth",
    });
  }

  return (
    <ChartShell
      title={title}
      controls={
        <>
          {categories.map((category) => (
            <ChartLegendButton
              active={category.value === selectedCategorySlug}
              key={category.value}
              label={category.shortLabel ?? category.label}
              onClick={() => onSelectCategory(category.value)}
              showDot={false}
            />
          ))}
        </>
      }
      footerLeft={
        <div className="flex flex-wrap gap-1.5">
          {locations.map((location, index) => (
            <ChartLegendButton
              active={focusedLocationSlug ? focusedLocationSlug === location.slug : true}
              color={CITY_COLORS[index % CITY_COLORS.length]}
              key={location.slug}
              label={location.label}
              onClick={() => toggleFocusedLocation(location.slug)}
            />
          ))}
        </div>
      }
      footerRight={isMobileViewport ? null : (
        <div className="flex items-center justify-end gap-2">
          <button
            aria-label="Scroll chart left"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!canScrollLeft}
            onClick={() => scrollChart(-1)}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Scroll chart right"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!canScrollRight}
            onClick={() => scrollChart(1)}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    >
      <div className="flex min-h-0 flex-1 sm:-mx-4 lg:mx-0">
        <div className="flex min-h-0 min-w-0 w-full overflow-hidden">
          <div
            className="pointer-events-none relative z-[1] shrink-0 border-r border-slate-800/70"
            style={{ width: axisChartWidth, height: chartHeight }}
          >
            <LineChart
              data={rows}
              height={chartHeight}
              margin={{ top: chartTopMargin, right: 0, left: 0, bottom: 8 }}
              width={axisChartWidth}
            >
              <XAxis
                axisLine={false}
                dataKey="year"
                height={X_AXIS_HEIGHT}
                tick={false}
                tickLine={false}
              />
              <YAxis
                allowDataOverflow
                axisLine={false}
                domain={[0, yAxisMax]}
                interval={0}
                tick={{ fontSize: isMobileViewport ? 11 : 12, fill: "#94a3b8" }}
                tickFormatter={formatAxisTickNumber}
                tickLine={false}
                ticks={axisTicks}
                type="number"
                width={axisWidth}
              />
              {axisProbeLocationSlug ? (
                <Line
                  activeDot={false}
                  dataKey={axisProbeLocationSlug}
                  dot={false}
                  isAnimationActive={false}
                  stroke="transparent"
                  strokeOpacity={0}
                  strokeWidth={0}
                  type="monotone"
                />
              ) : null}
            </LineChart>
          </div>

          <div className="chart-scroll-shell min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden" ref={scrollContainerRef}>
            <div style={{ height: chartHeight, width: chartWidth }}>
              <LineChart
                data={rows}
                height={chartHeight}
                margin={{ top: chartTopMargin, right: isMobileViewport ? 0 : 12, left: 0, bottom: 8 }}
                width={chartWidth}
              >
              <CartesianGrid stroke="rgba(100,116,139,0.14)" strokeDasharray="3 4" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="year"
                height={X_AXIS_HEIGHT}
                interval={0}
                tick={{ fill: "#94a3b8", fontSize: isMobileViewport ? 11 : 12 }}
                tickLine={false}
                tickMargin={12}
              />
              <Tooltip
                content={({ active, label, payload }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const visiblePayload = payload.filter((entry) => visibleLocationSlugs.includes(String(entry.dataKey)));

                  if (!visiblePayload.length) {
                    return null;
                  }

                  return (
                    <div className="border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur-sm">
                      <p className="font-semibold text-slate-200">{label}</p>
                      <div className="mt-2 space-y-1.5">
                        {visiblePayload.map((entry) => (
                          <div className="flex items-center justify-between gap-4" key={String(entry.dataKey)}>
                            <span className="inline-flex items-center gap-1.5 text-slate-300">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: String(entry.color ?? "#7dd3fc") }} />
                              {String(entry.name)}
                            </span>
                            <span className="font-semibold text-slate-100">
                              {metric === "rate"
                                ? `${formatInteger(Math.round(Number(entry.value ?? 0)))} / 100k`
                                : formatInteger(Math.round(Number(entry.value ?? 0)))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
                cursor={{ stroke: "rgba(148,163,184,0.24)", strokeWidth: 1 }}
              />
              {locations.map((location, index) => {
                const focused = focusedLocationSlug === location.slug;
                const dimmed = Boolean(focusedLocationSlug) && !focused;

                return (
                  <Line
                    animationDuration={220}
                    connectNulls={false}
                    dataKey={location.slug}
                    dot={false}
                    hide={false}
                    key={location.slug}
                    name={location.label}
                    opacity={dimmed ? 0.14 : 1}
                    stroke={CITY_COLORS[index % CITY_COLORS.length]}
                    strokeLinecap="round"
                    strokeWidth={focused ? 3 : 2.5}
                    type="monotone"
                  />
                );
              })}
              </LineChart>
            </div>
          </div>
        </div>
      </div>
    </ChartShell>
  );
}

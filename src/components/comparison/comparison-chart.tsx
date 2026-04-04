"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ComparisonCategory, ComparisonLocation } from "@/lib/dashboard-data";

import { ChartLegendButton } from "@/components/dashboard/chart-legend-button";
import { cn, formatInteger } from "@/lib/utils";

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

function subscribeToPointerMode(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getPointerModeSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

export function ComparisonChart({
  rows,
  locations,
  categories,
  selectedCategorySlug,
  onSelectCategory,
  metric,
  title,
}: ComparisonChartProps) {
  const [focusedLocationSlug, setFocusedLocationSlug] = useState<string | null>(null);
  const hasCoarsePointer = useSyncExternalStore(subscribeToPointerMode, getPointerModeSnapshot, () => false);

  const yMax = useMemo(() => {
    const values = rows.flatMap((row) =>
      locations
        .map((location) => Number(row[location.slug] ?? Number.NaN))
        .filter((value) => Number.isFinite(value)),
    );
    return values.length ? Math.max(...values) : 0;
  }, [locations, rows]);

  const visibleLocationSlugs = focusedLocationSlug ? [focusedLocationSlug] : locations.map((location) => location.slug);

  function toggleFocusedLocation(slug: string) {
    setFocusedLocationSlug((current) => (current === slug ? null : slug));
  }

  return (
    <div className="card-panel chart-panel rounded-none p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <p className="text-sm font-semibold text-slate-200">{title}</p>
          <div className="flex flex-wrap gap-1.5 lg:max-w-[62%] lg:justify-end">
            {categories.map((category) => (
              <ChartLegendButton
                active={category.value === selectedCategorySlug}
                color={category.color ?? "#7dd3fc"}
                key={category.value}
                label={category.shortLabel ?? category.label}
                onClick={() => onSelectCategory(category.value)}
              />
            ))}
          </div>
        </div>

        <div className="h-[22rem] sm:h-[30rem]">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={rows} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
              <CartesianGrid stroke="rgba(100,116,139,0.14)" strokeDasharray="3 4" vertical={false} />
              <XAxis axisLine={false} dataKey="year" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} />
              <YAxis
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickFormatter={(value) => formatInteger(Number(value))}
                tickLine={false}
                width={72}
              />
              <Tooltip
                active={!hasCoarsePointer}
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
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

          <p className={cn("max-w-2xl text-xs text-slate-400 sm:text-right")}>
            {metric === "rate"
              ? "Rate view is shown only when every selected location uses a citywide source with explicit official rates."
              : yMax === 0
                ? "No comparable values are available for the selected category."
                : "Only mapped exact or close category equivalents are compared; missing years remain blank rather than interpolated."}
          </p>
        </div>
      </div>
    </div>
  );
}

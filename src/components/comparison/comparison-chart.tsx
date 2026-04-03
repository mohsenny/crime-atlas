"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ComparisonLocation } from "@/lib/dashboard-data";
import { cn, formatInteger } from "@/lib/utils";

type ComparisonChartProps = {
  rows: Array<Record<string, number | string | null>>;
  locations: ComparisonLocation[];
  metric: "count" | "rate";
  title: string;
};

const CITY_COLORS = ["#7dd3fc", "#f97316", "#a78bfa", "#22c55e"];

export function ComparisonChart({ rows, locations, metric, title }: ComparisonChartProps) {
  const [mounted, setMounted] = useState(false);
  const [hasCoarsePointer, setHasCoarsePointer] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse)");
    const sync = () => setHasCoarsePointer(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  const yMax = useMemo(() => {
    const values = rows.flatMap((row) =>
      locations
        .map((location) => Number(row[location.slug] ?? Number.NaN))
        .filter((value) => Number.isFinite(value)),
    );
    return values.length ? Math.max(...values) : 0;
  }, [locations, rows]);

  return (
    <div className="card-panel chart-panel rounded-none p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <div className="flex flex-wrap gap-1.5">
          {locations.map((location, index) => (
            <span
              className="inline-flex items-center gap-1.5 border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium text-slate-100"
              key={location.slug}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CITY_COLORS[index % CITY_COLORS.length] }} />
              {location.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 h-[22rem] sm:h-[30rem]">
        {mounted ? (
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={rows} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
              <CartesianGrid stroke="rgba(100,116,139,0.14)" strokeDasharray="3 4" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="year"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickLine={false}
              />
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

                  return (
                    <div className="border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur-sm">
                      <p className="font-semibold text-slate-200">{label}</p>
                      <div className="mt-2 space-y-1.5">
                        {payload.map((entry) => (
                          <div className="flex items-center justify-between gap-4" key={String(entry.dataKey)}>
                            <span className="inline-flex items-center gap-1.5 text-slate-300">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: String(entry.color ?? "#7dd3fc") }}
                              />
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
              {locations.map((location, index) => (
                <Line
                  animationDuration={220}
                  connectNulls={false}
                  dataKey={location.slug}
                  dot={false}
                  key={location.slug}
                  name={location.label}
                  stroke={CITY_COLORS[index % CITY_COLORS.length]}
                  strokeLinecap="round"
                  strokeWidth={2.5}
                  type="monotone"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full bg-slate-950/20" />
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {metric === "rate"
          ? "Rate view is shown only when both selected locations currently use citywide sources with explicit official rates."
          : yMax === 0
            ? "No comparable values are available for the selected category."
            : "Only exact shared category labels are compared; missing years remain blank rather than interpolated."}
      </p>
    </div>
  );
}

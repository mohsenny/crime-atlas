"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ValueType = number | string;

export type ChartTooltipEntry = {
  color?: string;
  dataKey?: string | number;
  name?: string;
  payload?: unknown;
  value?: ValueType;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<ChartTooltipEntry>;
  label?: unknown;
  labelFormatter?: (label: unknown, payload?: Array<ChartTooltipEntry>) => ReactNode;
  nameFormatter?: (name: string, entry: ChartTooltipEntry) => ReactNode;
  valueFormatter?: (value: ValueType | undefined, name: string, entry: ChartTooltipEntry) => ReactNode;
  highlightEntry?: (entry: ChartTooltipEntry) => boolean;
};

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  nameFormatter,
  valueFormatter,
  highlightEntry,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const displayLabel = labelFormatter
    ? labelFormatter(label, payload as Array<ChartTooltipEntry>)
    : typeof label === "string" || typeof label === "number"
      ? label
      : null;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/95 px-3 py-2 text-xs font-medium text-slate-300 shadow-sm">
      {displayLabel ? <p className="mb-1 text-sm font-medium leading-tight text-slate-100">{displayLabel}</p> : null}
      <div className="space-y-0.5">
        {payload.map((entry, index) => {
          if (!entry) {
            return null;
          }

          const name = entry.name ?? "";
          const displayName = nameFormatter ? nameFormatter(name, entry) : name;
          const displayValue = valueFormatter ? valueFormatter(entry.value as ValueType, name, entry) : entry.value;

          if (displayValue === undefined || displayValue === null) {
            return null;
          }

          const accentColor =
            entry.color ??
            ((entry.payload as { color?: string; fill?: string } | undefined)?.color ??
              (entry.payload as { color?: string; fill?: string } | undefined)?.fill) ??
            "#94a3b8";
          const isHighlighted = highlightEntry ? highlightEntry(entry) : false;

          return (
            <div
              className={cn(
                "flex items-center gap-2 rounded-md px-1.5 py-1 leading-tight transition",
                isHighlighted ? "bg-white/[0.08] ring-1 ring-white/12" : "",
              )}
              key={`${name}-${index}`}
            >
              <span
                className={cn("flex flex-shrink-0 rounded-full", isHighlighted ? "h-2.5 w-2.5" : "h-2 w-2")}
                style={{ backgroundColor: accentColor }}
              />
              <span className={cn("min-w-0 shrink-0 text-xs font-medium", isHighlighted ? "text-slate-50" : "text-slate-200")}>{displayName}</span>
              <span className="h-px flex-1 border-b border-dotted border-slate-600/80" />
              <span className={cn("tabular-nums text-xs font-medium", isHighlighted ? "text-white" : "text-slate-50")}>{displayValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

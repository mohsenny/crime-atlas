"use client";

import type { ReactNode } from "react";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";

type ValueType = number | string;

type ChartTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<Payload<ValueType, string>>;
  label?: unknown;
  labelFormatter?: (label: unknown, payload?: Array<Payload<ValueType, string>>) => ReactNode;
  nameFormatter?: (name: string, entry: Payload<ValueType, string>) => ReactNode;
  valueFormatter?: (value: ValueType | undefined, name: string, entry: Payload<ValueType, string>) => ReactNode;
};

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  nameFormatter,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const displayLabel = labelFormatter
    ? labelFormatter(label, payload as Array<Payload<ValueType, string>>)
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

          return (
            <div className="flex items-center gap-2 leading-tight" key={`${name}-${index}`}>
              <span className="flex h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
              <span className="min-w-0 shrink-0 text-xs font-medium text-slate-200">{displayName}</span>
              <span className="h-px flex-1 border-b border-dotted border-slate-600/80" />
              <span className="tabular-nums text-xs font-medium text-slate-50">{displayValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

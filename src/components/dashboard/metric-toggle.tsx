"use client";

import { CONTROL_LABEL_TEXT_CLASS } from "@/components/dashboard/control-styles";
import { cn } from "@/lib/utils";

type MetricToggleProps = {
  value: "count" | "rate";
  onChange: (value: "count" | "rate") => void;
  supportsRate?: boolean;
};

export function MetricToggle({ value, onChange, supportsRate = true }: MetricToggleProps) {
  return (
    <div className="inline-flex h-10 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70 shadow-sm">
      {[
        { value: "count" as const, label: "Case Counts" },
        { value: "rate" as const, label: "Rate per 100k" },
      ].map((option) => {
        const disabled = option.value === "rate" && !supportsRate;

        return (
          <button
            aria-disabled={disabled}
            className={cn(
              "flex h-full items-center px-3.5 transition",
              CONTROL_LABEL_TEXT_CLASS,
              value === option.value
                ? "bg-slate-100 text-slate-900 shadow-sm"
                : disabled
                  ? "cursor-not-allowed text-slate-600"
                  : "text-slate-400 hover:text-slate-100",
            )}
            key={option.value}
            onClick={() => {
              if (disabled) {
                return;
              }

              onChange(option.value);
            }}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

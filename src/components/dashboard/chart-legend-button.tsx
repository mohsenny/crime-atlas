"use client";

import { cn } from "@/lib/utils";

type ChartLegendButtonProps = {
  label: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
};

export function ChartLegendButton({ label, color, active = true, onClick }: ChartLegendButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "border-slate-700 bg-slate-900/70 text-slate-100"
          : "border-slate-700/70 bg-transparent text-slate-500",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, opacity: active ? 1 : 0.45 }} />
      <span className="truncate">{label}</span>
    </button>
  );
}

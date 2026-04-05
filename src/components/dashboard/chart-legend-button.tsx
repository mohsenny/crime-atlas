"use client";

import { cn } from "@/lib/utils";

type ChartLegendButtonProps = {
  label: string;
  color?: string | null;
  active?: boolean;
  onClick?: () => void;
  showDot?: boolean;
};

export function ChartLegendButton({
  label,
  color,
  active = true,
  onClick,
  showDot = true,
}: ChartLegendButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "border-slate-200 bg-slate-100 text-slate-900"
          : "border-slate-700/70 bg-transparent text-slate-500",
      )}
      onClick={onClick}
      type="button"
    >
      {showDot ? (
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color ?? "#94a3b8", opacity: active ? 1 : 0.45 }} />
      ) : null}
      <span className="truncate">{label}</span>
    </button>
  );
}

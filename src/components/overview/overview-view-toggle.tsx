"use client";

import { LayoutGrid, Rows3 } from "lucide-react";

import { CONTROL_LABEL_TEXT_CLASS } from "@/components/dashboard/control-styles";
import { cn } from "@/lib/utils";

type OverviewViewToggleProps = {
  value: "card" | "list";
  onChange: (value: "card" | "list") => void;
};

export function OverviewViewToggle({ value, onChange }: OverviewViewToggleProps) {
  return (
    <div className="inline-flex h-10 flex-none overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70 shadow-sm">
      {[
        { value: "card" as const, label: "Cards", icon: LayoutGrid },
        { value: "list" as const, label: "List", icon: Rows3 },
      ].map((option) => {
        const Icon = option.icon;

        return (
          <button
            className={cn(
              "flex h-full min-w-fit items-center gap-2 px-3.5 transition",
              CONTROL_LABEL_TEXT_CLASS,
              value === option.value
                ? "bg-slate-100 text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-100",
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

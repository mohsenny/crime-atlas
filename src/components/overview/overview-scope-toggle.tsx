"use client";

import { Building2, Map } from "lucide-react";

import { CONTROL_LABEL_TEXT_CLASS } from "@/components/dashboard/control-styles";
import type { LocationScope } from "@/lib/location-scope";
import { cn } from "@/lib/utils";

type OverviewScopeToggleProps = {
  value: LocationScope;
  onChange: (value: LocationScope) => void;
  hideIconsOnMobile?: boolean;
  fullWidth?: boolean;
};

export function OverviewScopeToggle({
  value,
  onChange,
  hideIconsOnMobile = false,
  fullWidth = false,
}: OverviewScopeToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex h-10 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70 shadow-sm",
        fullWidth ? "w-full" : "w-fit flex-none justify-self-start",
      )}
    >
      {[
        { value: "city" as const, label: "Cities", icon: Building2 },
        { value: "country" as const, label: "Countries", icon: Map },
      ].map((option) => {
        const Icon = option.icon;

        return (
          <button
            className={cn(
              "flex h-full items-center gap-2 whitespace-nowrap transition",
              fullWidth ? "min-w-0 flex-1 justify-center px-2.5" : "min-w-fit px-3.5 max-sm:px-2.5",
              CONTROL_LABEL_TEXT_CLASS,
              value === option.value
                ? "bg-slate-100 text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-100",
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <Icon className={cn("h-3.5 w-3.5", hideIconsOnMobile && "max-sm:hidden")} />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
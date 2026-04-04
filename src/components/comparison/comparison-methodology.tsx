"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { ComparisonCategory, ComparisonData } from "@/lib/dashboard-data";

import { cn } from "@/lib/utils";

type ComparisonMethodologyProps = {
  category: ComparisonCategory | null;
  methodology: ComparisonData["methodologyByCategory"][string] | null;
};

export function ComparisonMethodology({ category, methodology }: ComparisonMethodologyProps) {
  const [open, setOpen] = useState(false);

  if (!category || !methodology) {
    return null;
  }

  return (
    <div className="space-y-2 border-t border-slate-800/90 pt-3">
      <button
        className="inline-flex cursor-pointer items-center gap-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:text-slate-200"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>How This Comparison Works</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open ? "rotate-180" : null)} />
      </button>

      {open ? (
        <div className="space-y-3 text-sm text-slate-300/90">
          <p className="max-w-4xl leading-6">
            <span className="font-medium text-slate-100">{category.label}</span> is being compared through a canonical
            category map. Only official source labels judged close enough to each other are included. Current mapping
            confidence: <span className="font-medium text-slate-100">{methodology.confidence}</span>.
          </p>

          <div className="space-y-3">
            {methodology.locations.map((location) => (
              <div className="space-y-1" key={location.locationSlug}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{location.locationLabel}</p>
                <p className="leading-6 text-slate-300">
                  {location.sourceLabels.length > 0 ? location.sourceLabels.join(" + ") : "No mapped source labels"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

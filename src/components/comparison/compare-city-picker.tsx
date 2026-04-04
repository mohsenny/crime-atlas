"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import type { LocationOverview } from "@/lib/dashboard-data";

import { CONTROL_LABEL_TEXT_CLASS } from "@/components/dashboard/control-styles";
import { LocationFlag } from "@/components/overview/location-flag";
import { cn } from "@/lib/utils";

export const MAX_COMPARE_LOCATIONS = 3;

type CompareCityPickerProps = {
  locations: LocationOverview[];
  initialSelectedSlugs?: string[];
  lockedSlugs?: string[];
  triggerLabel?: string;
  className?: string;
};

export function CompareCityPicker({
  locations,
  initialSelectedSlugs = [],
  lockedSlugs = [],
  triggerLabel = "Compare",
  className,
}: CompareCityPickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(initialSelectedSlugs);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const initialSelectedKey = initialSelectedSlugs.join(",");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedSlugs((current) => (current.join(",") === initialSelectedKey ? current : [...initialSelectedSlugs]));
    }
  }, [initialSelectedKey, initialSelectedSlugs, open]);

  const filteredLocations = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return locations;
    }

    return locations.filter(
      (location) =>
        location.label.toLowerCase().includes(normalized) ||
        location.country.toLowerCase().includes(normalized),
    );
  }, [locations, searchQuery]);

  function toggleLocation(slug: string) {
    const isLocked = lockedSlugs.includes(slug);
    if (isLocked) {
      return;
    }

    setSelectedSlugs((current) => {
      if (current.includes(slug)) {
        return current.filter((value) => value !== slug);
      }

      if (current.length >= MAX_COMPARE_LOCATIONS) {
        return current;
      }

      return [...current, slug];
    });
  }

  function submitComparison() {
    if (selectedSlugs.length < 2 || selectedSlugs.length > MAX_COMPARE_LOCATIONS) {
      return;
    }

    setOpen(false);
    router.push(`/compare?cities=${selectedSlugs.join(",")}`);
  }

  const selectedCount = selectedSlugs.length;

  return (
    <>
      <button
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-3.5 text-slate-300 transition hover:text-slate-50",
          CONTROL_LABEL_TEXT_CLASS,
          className,
        )}
        onClick={() => setOpen(true)}
        type="button"
      >
        <span>{triggerLabel}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm">
          <div className={cn("flex h-full", isMobileViewport ? "items-stretch justify-stretch" : "justify-end")}>
            <div
              className={cn(
                "flex h-full flex-col border-l border-white/10 bg-slate-950/96 shadow-[0_28px_90px_rgba(2,6,23,0.45)]",
                isMobileViewport ? "w-full" : "w-full max-w-[27rem]",
              )}
            >
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Compare Cities</p>
                  <p className="text-sm text-slate-300">
                    {selectedCount}/{MAX_COMPARE_LOCATIONS} selected
                  </p>
                </div>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center text-slate-400 transition hover:text-slate-50"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="border-b border-white/8 px-4 py-4">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    className="h-11 w-full border border-white/10 bg-slate-900/80 pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search city or country"
                    value={searchQuery}
                  />
                </label>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="space-y-2">
                  {filteredLocations.map((location) => {
                    const selected = selectedSlugs.includes(location.slug);
                    const locked = lockedSlugs.includes(location.slug);
                    const atLimit = selectedSlugs.length >= MAX_COMPARE_LOCATIONS && !selected;

                    return (
                      <button
                        className={cn(
                          "flex w-full items-center gap-3 border px-3 py-3 text-left transition",
                          selected
                            ? "border-slate-200 bg-slate-100 text-slate-950"
                            : "border-white/10 bg-transparent text-slate-100 hover:border-white/20",
                          atLimit || locked ? "cursor-default" : "cursor-pointer",
                          atLimit ? "opacity-45" : null,
                        )}
                        disabled={atLimit || locked}
                        key={location.slug}
                        onClick={() => toggleLocation(location.slug)}
                        type="button"
                      >
                        <LocationFlag slug={location.slug} variant="list" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-base font-semibold", selected ? "text-slate-950" : "text-slate-100")}>
                            {location.label}
                          </p>
                          <p className={cn("text-xs uppercase tracking-[0.16em]", selected ? "text-slate-500" : "text-slate-500")}>
                            {location.country}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center border text-xs font-semibold leading-none",
                            selected ? "border-slate-950 bg-slate-950 text-white" : "border-white/12 text-transparent",
                          )}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/8 px-4 py-4">
                <button
                  className={cn(
                    "inline-flex h-11 w-full items-center justify-center gap-2 border px-4 text-sm font-semibold transition",
                    selectedCount >= 2 && selectedCount <= MAX_COMPARE_LOCATIONS
                      ? "border-slate-200 bg-slate-100 text-slate-950 hover:bg-white"
                      : "cursor-not-allowed border-white/10 bg-slate-900/70 text-slate-500",
                  )}
                  disabled={selectedCount < 2 || selectedCount > MAX_COMPARE_LOCATIONS}
                  onClick={submitComparison}
                  type="button"
                >
                  {selectedCount >= 2 ? `Compare ${selectedCount} Cities` : "Compare Cities"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, Search, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import type { LocationOverview } from "@/lib/dashboard-data";
import { buildCompareSearchParams } from "@/lib/view-state";

import { CONTROL_LABEL_TEXT_CLASS } from "@/components/dashboard/control-styles";
import { LocationFlag } from "@/components/overview/location-flag";
import { getScopeLabel, type LocationScope } from "@/lib/location-scope";
import { cn } from "@/lib/utils";

export const MAX_COMPARE_LOCATIONS = 3;

type CompareCityPickerProps = {
  locations: LocationOverview[];
  scope: LocationScope;
  initialSelectedSlugs?: string[];
  lockedSlugs?: string[];
  triggerLabel?: string;
  mobileTriggerLabel?: string;
  triggerIcon?: LucideIcon;
  className?: string;
  showTriggerLabel?: boolean;
};

export function CompareCityPicker({
  locations,
  scope,
  initialSelectedSlugs = [],
  lockedSlugs = [],
  triggerLabel = "Compare",
  mobileTriggerLabel,
  triggerIcon: TriggerIcon,
  className,
  showTriggerLabel = true,
}: CompareCityPickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isTriggerPending, setIsTriggerPending] = useState(false);
  const [isSubmitPending, startSubmitTransition] = useTransition();
  const drawerDragStartYRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  const scopedLocations = useMemo(() => locations.filter((location) => location.scope === scope), [locations, scope]);
  const baseSelectedSlugs = useMemo(
    () => [...new Set([...lockedSlugs, ...initialSelectedSlugs])].filter((slug) => scopedLocations.some((location) => location.slug === slug)),
    [initialSelectedSlugs, lockedSlugs, scopedLocations],
  );
  const pinnedSelectedOrder = useMemo(
    () => new Map(baseSelectedSlugs.map((slug, index) => [slug, index])),
    [baseSelectedSlugs],
  );
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() => baseSelectedSlugs);

  const filteredLocations = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return scopedLocations;
    }

    return scopedLocations.filter(
      (location) =>
        location.label.toLowerCase().includes(normalized) ||
        location.country.toLowerCase().includes(normalized),
    );
  }, [scopedLocations, searchQuery]);
  const sortedFilteredLocations = useMemo(() => {
    return [...filteredLocations].sort((left, right) => {
      const leftSelectedOrder = pinnedSelectedOrder.get(left.slug);
      const rightSelectedOrder = pinnedSelectedOrder.get(right.slug);

      if (leftSelectedOrder !== undefined || rightSelectedOrder !== undefined) {
        return (leftSelectedOrder ?? Number.POSITIVE_INFINITY) - (rightSelectedOrder ?? Number.POSITIVE_INFINITY);
      }

      return 0;
    });
  }, [filteredLocations, pinnedSelectedOrder]);

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
    startSubmitTransition(() => {
      router.push(
        `/compare?${buildCompareSearchParams({
          locations: selectedSlugs,
          metric: "rate",
          scope,
        }).toString()}`,
      );
    });
  }

  function openPicker() {
    setSearchQuery("");
    setSelectedSlugs(baseSelectedSlugs);
    setIsTriggerPending(true);
    setOpen(true);
  }

  function closePicker() {
    setSearchQuery("");
    setSelectedSlugs(baseSelectedSlugs);
    setOpen(false);
  }

  function startDrawerDrag(clientY: number) {
    drawerDragStartYRef.current = clientY;
  }

  function finishDrawerDrag(clientY: number) {
    const startY = drawerDragStartYRef.current;
    drawerDragStartYRef.current = null;

    if (startY === null) {
      return;
    }

    if (clientY - startY > 56) {
      closePicker();
    }
  }

  const selectedCount = selectedSlugs.length;
  const resolvedMobileTriggerLabel = mobileTriggerLabel ?? triggerLabel;
  const pluralScopeLabel = getScopeLabel(scope, { plural: true, capitalized: true });
  const searchLabel = scope === "country" ? "Search countries" : "Search city or country";
  const searchPlaceholder = isMobileViewport
    ? scope === "country"
      ? "Search countries to compare..."
      : "Search cities to compare..."
    : searchLabel;
  const isCompareReady = selectedCount >= 2 && selectedCount <= MAX_COMPARE_LOCATIONS;
  const triggerBusy = isTriggerPending && !open;
  const submitLabel = isCompareReady
    ? `Compare ${selectedCount} ${pluralScopeLabel}`
    : selectedCount > 0
      ? `${selectedCount}/${MAX_COMPARE_LOCATIONS} selected`
      : "Select 2+";

  useEffect(() => {
    if (!open || !isTriggerPending) {
      return;
    }

    const frameA = window.requestAnimationFrame(() => {
      const frameB = window.requestAnimationFrame(() => {
        setIsTriggerPending(false);
      });

      return () => window.cancelAnimationFrame(frameB);
    });

    return () => window.cancelAnimationFrame(frameA);
  }, [isTriggerPending, open]);

  return (
    <>
      <button
        aria-label={triggerLabel}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/70 px-3 text-slate-300 transition hover:text-slate-50 whitespace-nowrap",
          "sm:px-4",
          CONTROL_LABEL_TEXT_CLASS,
          className,
        )}
        onClick={openPicker}
        type="button"
      >
        {triggerBusy ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        ) : TriggerIcon ? (
          <TriggerIcon className="h-3.5 w-3.5" />
        ) : null}
        {showTriggerLabel && !triggerBusy ? (
          <>
            <span className="sm:hidden">{resolvedMobileTriggerLabel}</span>
            <span className="hidden sm:inline">{triggerLabel}</span>
          </>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm">
          <div className={cn("flex h-full", isMobileViewport ? "h-[100dvh] items-end justify-stretch px-0 pt-10" : "justify-end")}>
            <div
              className={cn(
                "flex min-h-0 flex-col bg-slate-950/96 shadow-[0_28px_90px_rgba(2,6,23,0.45)]",
                isMobileViewport
                  ? "w-full max-h-[calc(100dvh-2.5rem)] rounded-t-[1.5rem] border-t border-white/10"
                  : "h-full w-full max-w-[27rem] border-l border-white/10",
              )}
            >
              {isMobileViewport ? (
                <div className="border-b border-white/8 px-4 pb-3 pt-2">
                  <button
                    aria-label="Drag down to close compare picker"
                    className="mb-2 flex h-5 w-full touch-none items-center justify-center"
                    onPointerCancel={() => {
                      drawerDragStartYRef.current = null;
                    }}
                    onPointerDown={(event) => {
                      startDrawerDrag(event.clientY);
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerUp={(event) => {
                      finishDrawerDrag(event.clientY);
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                    }}
                    type="button"
                  >
                    <span className="h-1 w-11 rounded-full bg-slate-600" />
                  </button>
                  <div className="flex items-center gap-2">
                    <label className="relative block min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-900/80 pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                      />
                    </label>
                    <button
                      aria-label="Close compare picker"
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-slate-400 transition hover:text-slate-50"
                      onClick={closePicker}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Compare {pluralScopeLabel}</p>
                    </div>
                    <button
                      className="inline-flex h-10 w-10 items-center justify-center text-slate-400 transition hover:text-slate-50"
                      onClick={closePicker}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="border-b border-white/8 px-4 py-4">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-900/80 pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                      />
                    </label>
                  </div>
                </>
              )}

              <div className={cn("flex-1 overflow-y-auto", isMobileViewport ? "px-4 py-3" : "px-4 py-3")}>
                <div className="space-y-2">
                  {sortedFilteredLocations.map((location) => {
                    const selected = selectedSlugs.includes(location.slug);
                    const locked = lockedSlugs.includes(location.slug);
                    const atLimit = selectedSlugs.length >= MAX_COMPARE_LOCATIONS && !selected;

                    return (
                      <button
                        className={cn(
                          "relative flex w-full items-center gap-3 text-left transition",
                          isMobileViewport ? "px-3 py-3" : "px-3 py-3 md:border",
                          isMobileViewport
                            ? selected
                              ? "text-slate-950"
                              : "text-slate-100"
                            : selected
                              ? "bg-slate-100 text-slate-950 md:border-slate-200"
                              : "bg-transparent text-slate-100 md:border-white/10 md:hover:border-white/20",
                          atLimit || locked ? "cursor-default" : "cursor-pointer",
                          atLimit ? "opacity-45" : null,
                        )}
                        disabled={atLimit || locked}
                        key={location.slug}
                        onClick={() => toggleLocation(location.slug)}
                        type="button"
                      >
                        {isMobileViewport ? (
                          <span
                            aria-hidden="true"
                            className={cn(
                              "pointer-events-none absolute inset-x-0 inset-y-[2px] rounded-[0.2rem] border transition-colors",
                              selected ? "border-slate-100 bg-slate-100" : "border-slate-200 bg-transparent",
                            )}
                          />
                        ) : null}
                        {isMobileViewport ? (
                          <span
                            className={cn(
                              "absolute right-0 top-[2px] z-10 flex h-6 w-6 items-center justify-center rounded-tr-[0.2rem] border border-slate-200 bg-slate-100 transition-colors",
                              selected ? "border-slate-950 bg-slate-950 text-white" : "text-transparent",
                            )}
                          >
                            <svg
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 16 16"
                            >
                              <path
                                d="M3.5 8.25 6.4 11.15 12.5 5.05"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                              />
                            </svg>
                          </span>
                        ) : null}
                        <LocationFlag country={location.country} slug={location.slug} variant="list" />
                        <div className={cn("min-w-0 flex-1", isMobileViewport ? "relative z-10 pr-8" : null)}>
                          <p className={cn("text-base font-semibold", selected ? "text-slate-950" : "text-slate-100")}>
                            {location.label}
                          </p>
                          <p className={cn("text-xs uppercase tracking-[0.16em]", selected ? "text-slate-500" : "text-slate-500")}>
                            {location.country}
                          </p>
                        </div>
                        {!isMobileViewport ? (
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center md:border",
                              selected
                                ? "bg-slate-950 text-white md:border-slate-950"
                                : "text-transparent md:border-white/12",
                            )}
                          >
                            <svg
                              aria-hidden="true"
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 16 16"
                            >
                              <path
                                d="M3.5 8.25 6.4 11.15 12.5 5.05"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                              />
                            </svg>
                          </span>
                        ) : null}
                        {!isMobileViewport ? <span className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-white/8 md:hidden" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={cn("border-t border-white/8 bg-slate-950/96", isMobileViewport ? "px-5 py-4" : "px-4 py-4")}>
                <button
                  className={cn(
                    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition whitespace-nowrap",
                    isCompareReady
                      ? "border-slate-200 bg-slate-100 text-slate-950 hover:bg-white"
                      : "cursor-not-allowed border-white/10 bg-slate-900/70 text-slate-500",
                  )}
                  disabled={!isCompareReady || isSubmitPending}
                  onClick={submitComparison}
                  type="button"
                >
                  {isSubmitPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {submitLabel}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

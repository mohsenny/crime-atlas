"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { LocationOverview } from "@/lib/dashboard-data";

import { LocationFlag } from "@/components/overview/location-flag";
import { cn } from "@/lib/utils";

type OverviewLocationListProps = {
  locations: LocationOverview[];
  compareMode?: boolean;
  selectedSlugs?: string[];
  disabledSlugs?: string[];
  onSelect?: (slug: string) => void;
  showAlphaIndex?: boolean;
};

function getLocationInitial(label: string) {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const firstCharacter = normalized.slice(0, 1).toUpperCase();

  return /^[A-Z]$/.test(firstCharacter) ? firstCharacter : "#";
}

export function OverviewLocationList({
  locations,
  compareMode = false,
  selectedSlugs = [],
  disabledSlugs = [],
  onSelect,
  showAlphaIndex = false,
}: OverviewLocationListProps) {
  const alphaRailRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const lastLetterRef = useRef<string | null>(null);
  const [alphaRailTop, setAlphaRailTop] = useState<number | null>(null);
  const activeLetters = [...new Set(locations.map((location) => getLocationInitial(location.label)))];
  const showAlphaRail = showAlphaIndex && activeLetters.length > 1;

  useEffect(() => {
    if (!showAlphaRail) {
      return;
    }

    const mobileHeader = document.querySelector<HTMLElement>("[data-overview-mobile-header]");
    const rail = alphaRailRef.current;
    if (!rail) {
      return;
    }

    const updateAlphaRailTop = () => {
      const headerHeight = mobileHeader?.getBoundingClientRect().height ?? 0;
      const railHeight = rail.getBoundingClientRect().height;
      const viewportHeight = window.innerHeight;
      const top = headerHeight + Math.max(20, (viewportHeight - headerHeight - railHeight) / 2);
      setAlphaRailTop(Math.round(top));
    };

    updateAlphaRailTop();

    const resizeObserver = new ResizeObserver(updateAlphaRailTop);
    resizeObserver.observe(rail);
    if (mobileHeader) {
      resizeObserver.observe(mobileHeader);
    }

    window.addEventListener("resize", updateAlphaRailTop);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateAlphaRailTop);
    };
  }, [showAlphaRail, activeLetters.length]);

  function scrollToLetter(letter: string, behavior: ScrollBehavior = "smooth") {
    const target = document.getElementById(`overview-alpha-${letter}`);
    if (!target) {
      return;
    }

    lastLetterRef.current = letter;
    const mobileHeader = document.querySelector<HTMLElement>("[data-overview-mobile-header]");
    const headerOffset = mobileHeader ? mobileHeader.getBoundingClientRect().height : 0;
    const targetTop = window.scrollY + target.getBoundingClientRect().top;
    const nextScrollTop = Math.max(0, targetTop - headerOffset - 12);

    window.scrollTo({ top: nextScrollTop, behavior });
  }

  function resolveLetterFromPointer(clientY: number) {
    const rail = alphaRailRef.current;
    if (!rail || activeLetters.length === 0) {
      return null;
    }

    const rect = rail.getBoundingClientRect();
    const relativeY = Math.min(Math.max(clientY - rect.top, 0), Math.max(rect.height - 1, 0));
    const index = Math.min(activeLetters.length - 1, Math.floor((relativeY / Math.max(rect.height, 1)) * activeLetters.length));

    return activeLetters[index] ?? null;
  }

  function updateDraggedLetter(clientY: number) {
    const letter = resolveLetterFromPointer(clientY);
    if (!letter || lastLetterRef.current === letter) {
      return;
    }

    scrollToLetter(letter, "auto");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className={cn("relative", showAlphaRail && "pr-6")}>
        {showAlphaRail ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 top-0 w-4">
            <div
              className="pointer-events-auto sticky flex w-full touch-none select-none flex-col items-center gap-1.5 py-1"
              onPointerCancel={(event) => {
                draggingRef.current = false;
                lastLetterRef.current = null;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }}
              onPointerDown={(event) => {
                draggingRef.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                updateDraggedLetter(event.clientY);
              }}
              onPointerMove={(event) => {
                if (!draggingRef.current) {
                  return;
                }

                updateDraggedLetter(event.clientY);
              }}
              onPointerUp={(event) => {
                draggingRef.current = false;
                lastLetterRef.current = null;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }}
              ref={alphaRailRef}
              style={showAlphaRail && alphaRailTop ? { top: `${alphaRailTop}px` } : undefined}
            >
              {activeLetters.map((letter) => (
                <button
                  aria-label={`Jump to ${letter}`}
                  className="inline-flex h-4 w-full items-center justify-center text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 transition hover:text-slate-100"
                  data-letter={letter}
                  key={letter}
                  onClick={() => scrollToLetter(letter)}
                  type="button"
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {locations.map((location, index) => {
          const locationInitial = getLocationInitial(location.label);
          const previousInitial = index > 0 ? getLocationInitial(locations[index - 1]!.label) : null;
          const showInitialMarker = showAlphaIndex && locationInitial !== previousInitial;

          return (
            <Fragment key={location.slug}>
              {showInitialMarker ? (
                <div
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500",
                    previousInitial ? "mt-3 mb-1" : "mb-1 pt-1",
                  )}
                  id={`overview-alpha-${locationInitial}`}
                >
                  {locationInitial}
                </div>
              ) : null}

              {compareMode ? (
                <button
                  aria-checked={selectedSlugs.includes(location.slug)}
                  className={cn(
                    "group relative flex w-full items-center gap-4 px-0 py-3 text-left transition sm:py-3.5",
                    selectedSlugs.includes(location.slug) ? "text-slate-950" : "text-slate-100",
                    disabledSlugs.includes(location.slug) ? "cursor-not-allowed opacity-45" : null,
                  )}
                  disabled={disabledSlugs.includes(location.slug)}
                  onClick={() => onSelect?.(location.slug)}
                  role="checkbox"
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-x-0 inset-y-[2px] border transition-colors",
                      selectedSlugs.includes(location.slug)
                        ? "border-slate-100 bg-slate-100"
                        : "border-slate-200 bg-transparent",
                    )}
                  />
                  <span
                    className={cn(
                      "absolute right-0 top-[2px] z-10 flex h-6 w-6 items-center justify-center border border-slate-200 bg-slate-100 transition-colors",
                      selectedSlugs.includes(location.slug)
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "text-transparent",
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
                  <div className="relative z-10 flex items-center gap-4">
                    <LocationFlag country={location.country} slug={location.slug} variant="list" />
                    <span
                      className={cn(
                        "text-xl font-semibold tracking-[-0.02em] transition",
                        selectedSlugs.includes(location.slug)
                          ? "text-slate-950"
                          : "text-slate-100 group-hover:text-white",
                      )}
                    >
                      {location.label}
                    </span>
                  </div>
                </button>
              ) : (
                <Link
                  className="group relative flex items-center gap-4 px-0 py-3 transition sm:py-3.5"
                  href={`/${location.slug}`}
                >
                  <LocationFlag country={location.country} slug={location.slug} variant="list" />
                  <span className="text-xl font-semibold tracking-[-0.02em] text-slate-100 transition group-hover:text-white">
                    {location.label}
                  </span>
                </Link>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

import { CONTROL_LABEL_TEXT_CLASS } from "@/components/dashboard/control-styles";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface ExpandableDropdownBaseProps {
  label: string;
  options: Option[];
  placeholder?: string;
  fullWidth?: boolean;
  minWidth?: number;
  maxWidth?: number;
  maxOverlayWidth?: number;
}

interface ExpandableDropdownMultiProps extends ExpandableDropdownBaseProps {
  values: string[];
  onChange: (values: string[]) => void;
}

interface ExpandableDropdownSingleProps extends ExpandableDropdownBaseProps {
  value: string;
  onChange: (value: string) => void;
}

interface ExpandableDropdownSharedProps extends ExpandableDropdownBaseProps {
  mode: "multi" | "single";
  selectedValues: string[];
  onCommit: (values: string[]) => void;
}

type Rect = { top: number; left: number; width: number; height: number };

const MIN_PILL_WIDTH = 240;
const MAX_PILL_WIDTH = 360;
const MAX_OVERLAY_WIDTH = 520;

const getRect = (element: HTMLElement | null): Rect | null => {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const valuesEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const DROPDOWN_TRIGGER_GRID_CLASS = "grid h-full w-full grid-cols-[auto_auto] items-center gap-3 px-4 text-left md:grid-cols-[auto_minmax(0,1fr)_auto]";

function measurePreferredOverlayWidth(measureWrap: HTMLDivElement | null) {
  if (!measureWrap) {
    return 0;
  }

  const labelElement = measureWrap.querySelector('[data-measure="label"]') as HTMLElement | null;
  const selectedElement = measureWrap.querySelector('[data-measure="selected"]') as HTMLElement | null;
  const optionElements = Array.from(measureWrap.querySelectorAll('[data-measure="option"]')) as HTMLElement[];

  const labelWidth = labelElement?.offsetWidth ?? 0;
  const selectedWidth = selectedElement?.offsetWidth ?? 0;
  const maxOptionWidth = optionElements.reduce(
    (accumulator, element) => Math.max(accumulator, element.offsetWidth),
    0,
  );
  const headerWidth = labelWidth + Math.max(selectedWidth, maxOptionWidth) + 84;
  const optionRowWidth = maxOptionWidth + 84;

  return Math.ceil(Math.max(headerWidth, optionRowWidth));
}

export function ExpandableDropdown({
  label,
  options,
  placeholder = "Select",
  fullWidth = false,
  minWidth,
  maxWidth,
  maxOverlayWidth,
  values,
  onChange,
}: ExpandableDropdownMultiProps) {
  return (
    <ExpandableDropdownBase
      label={label}
      maxOverlayWidth={maxOverlayWidth}
      maxWidth={maxWidth}
      minWidth={minWidth}
      mode="multi"
      onCommit={onChange}
      options={options}
      placeholder={placeholder}
      selectedValues={values}
      fullWidth={fullWidth}
    />
  );
}

export function SingleSelectDropdown({
  label,
  options,
  placeholder = "Select",
  fullWidth = false,
  minWidth,
  maxWidth,
  maxOverlayWidth,
  value,
  onChange,
}: ExpandableDropdownSingleProps) {
  return (
    <ExpandableDropdownBase
      label={label}
      maxOverlayWidth={maxOverlayWidth}
      maxWidth={maxWidth}
      minWidth={minWidth}
      mode="single"
      onCommit={(values) => onChange(values[0] ?? "")}
      options={options}
      placeholder={placeholder}
      selectedValues={value ? [value] : []}
      fullWidth={fullWidth}
    />
  );
}

function ExpandableDropdownBase({
  label,
  options,
  placeholder = "Select",
  fullWidth = false,
  minWidth,
  maxWidth,
  maxOverlayWidth,
  mode,
  selectedValues,
  onCommit,
}: ExpandableDropdownSharedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const measureWrapRef = useRef<HTMLDivElement>(null);
  const draftValuesRef = useRef<string[]>([]);

  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [overlayWidth, setOverlayWidth] = useState<number | null>(null);
  const [overlayLeft, setOverlayLeft] = useState<number | null>(null);
  const [pillWidth, setPillWidth] = useState<number | null>(null);
  const [draftValues, setDraftValues] = useState<string[]>(selectedValues);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const visibleValues = open ? draftValues : selectedValues;

  const selectedLabel = useMemo(() => {
    if (visibleValues.length === 0) {
      return placeholder;
    }

    if (mode === "multi" && isNarrowViewport) {
      return open ? `${visibleValues.length} selected` : String(visibleValues.length);
    }

    if (visibleValues.length === 1) {
      return options.find((option) => option.value === visibleValues[0])?.label ?? placeholder;
    }

    return `${visibleValues.length} selected`;
  }, [isNarrowViewport, mode, open, options, placeholder, visibleValues]);

  const minAllowedWidth = minWidth ?? MIN_PILL_WIDTH;
  const maxAllowedWidth = maxWidth ?? MAX_PILL_WIDTH;
  const maxOverlayAllowedWidth = maxOverlayWidth ?? MAX_OVERLAY_WIDTH;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 430px)");
    const sync = () => setIsNarrowViewport(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);

    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  const syncRect = useCallback(() => {
    const next = getRect(placeholderButtonRef.current);
    if (next) {
      setRect(next);
    }
  }, []);

  const openMenu = useCallback(() => {
    syncRect();
    setDraftValues(selectedValues);
    draftValuesRef.current = selectedValues;
    setOpen(true);

    const selectedIndex = options.findIndex((option) => option.value === (selectedValues[0] ?? ""));
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [options, selectedValues, syncRect]);

  const closeMenu = useCallback((commitSelection = true) => {
    if (commitSelection && !valuesEqual(draftValuesRef.current, selectedValues)) {
      onCommit(draftValuesRef.current);
    }

    setOpen(false);
    setHighlightedIndex(-1);
    placeholderButtonRef.current?.focus();
  }, [onCommit, selectedValues]);

  function toggleMenu() {
    if (open) {
      closeMenu(true);
      return;
    }

    openMenu();
  }

  const selectOption = useCallback((option: Option) => {
    if (mode === "single") {
      const nextValues = [option.value];
      setDraftValues(nextValues);
      draftValuesRef.current = nextValues;
      if (!valuesEqual(nextValues, selectedValues)) {
        onCommit(nextValues);
      }
      setOpen(false);
      setHighlightedIndex(-1);
      placeholderButtonRef.current?.focus();
      return;
    }

    const nextValues = draftValues.includes(option.value)
      ? draftValues.length === 1
        ? draftValues
        : draftValues.filter((value) => value !== option.value)
      : [...draftValues, option.value];

    setDraftValues(nextValues);
    draftValuesRef.current = nextValues;
  }, [draftValues, mode, onCommit, selectedValues]);

  const moveHighlight = useCallback((direction: 1 | -1) => {
    if (!options.length) {
      return;
    }

    setHighlightedIndex((previous) => (previous + direction + options.length) % options.length);
  }, [options.length]);

  useEffect(() => {
    if (fullWidth || !measureWrapRef.current) {
      return;
    }

    const id = window.requestAnimationFrame(() => {
      const wrap = measureWrapRef.current;
      const labelElement = wrap?.querySelector('[data-measure="label"]') as HTMLElement | null;
      const selectedElement = wrap?.querySelector('[data-measure="selected"]') as HTMLElement | null;
      const optionElements = Array.from(
        wrap?.querySelectorAll('[data-measure="option"]') ?? [],
      ) as HTMLElement[];

      const labelWidth = labelElement?.offsetWidth ?? 0;
      const selectedWidth = selectedElement?.offsetWidth ?? 0;
      const maxOptionWidth = optionElements.reduce((accumulator, element) => Math.max(accumulator, element.offsetWidth), 0);
      const paddingX = 36;
      const gapTotal = 18;
      const chevronBuffer = 30;
      const target = labelWidth + Math.max(selectedWidth, maxOptionWidth) + paddingX + gapTotal + chevronBuffer;
      const viewportLimit = Math.max(0, window.innerWidth - 32);

      setPillWidth(clampNumber(Math.ceil(target), minAllowedWidth, Math.min(maxAllowedWidth, viewportLimit)));
    });

    return () => window.cancelAnimationFrame(id);
  }, [fullWidth, label, maxAllowedWidth, minAllowedWidth, options, selectedLabel]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onScrollOrResize = () => syncRect();
    const id = window.requestAnimationFrame(syncRect);

    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      window.cancelAnimationFrame(id);
    };
  }, [open, syncRect]);

  useEffect(() => {
    if (!open || !rect) {
      return;
    }

    const computeWidth = () => {
      const viewportPadding = 16;
      const viewportLimit = Math.max(0, window.innerWidth - viewportPadding * 2);
      const baseWidth = rect.width;
      const contentWidth = optionsRef.current?.scrollWidth ?? baseWidth;
      const measuredContentWidth = measurePreferredOverlayWidth(measureWrapRef.current);
      const maxAllowed = Math.min(maxOverlayAllowedWidth, viewportLimit);
      const preferredWidth = Math.max(baseWidth, contentWidth, measuredContentWidth);
      const targetWidth = Math.min(maxAllowed, preferredWidth);
      const maxLeft = Math.max(viewportPadding, window.innerWidth - viewportPadding - targetWidth);
      const targetLeft = isNarrowViewport
        ? clampNumber(rect.left + rect.width - targetWidth, viewportPadding, maxLeft)
        : clampNumber(rect.left, viewportPadding, maxLeft);

      setOverlayWidth(targetWidth);
      setOverlayLeft(targetLeft);
    };

    computeWidth();
    window.addEventListener("resize", computeWidth);

    return () => window.removeEventListener("resize", computeWidth);
  }, [isNarrowViewport, maxOverlayAllowedWidth, open, options, rect]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (overlayRef.current?.contains(target)) {
        return;
      }

      if (containerRef.current?.contains(target)) {
        return;
      }

      closeMenu(true);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [closeMenu, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(false);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveHighlight(1);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveHighlight(-1);
        return;
      }

      if ((event.key === "Enter" || event.key === " ") && highlightedIndex >= 0 && highlightedIndex < options.length) {
        event.preventDefault();
        selectOption(options[highlightedIndex]);
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [closeMenu, highlightedIndex, moveHighlight, open, options, selectOption]);

  useEffect(() => {
    if (!open || highlightedIndex < 0) {
      return;
    }

    const optionElement = optionsRef.current?.children[highlightedIndex] as HTMLElement | undefined;
    optionElement?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) {
        closeMenu(true);
      } else {
        openMenu();
      }
    }
  }

  const triggerWidth = fullWidth
    ? undefined
    : {
        width: pillWidth ? `${pillWidth}px` : `clamp(${minAllowedWidth}px, 22vw, ${maxAllowedWidth}px)`,
      };

  return (
    <div className={cn("relative h-10", fullWidth && "w-full")} ref={containerRef} style={triggerWidth}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[99999px] -top-[99999px] opacity-0"
        ref={measureWrapRef}
      >
        <span className={cn("whitespace-nowrap", CONTROL_LABEL_TEXT_CLASS)} data-measure="label">
          {label}
        </span>
        <span className="whitespace-nowrap text-sm font-semibold" data-measure="selected">
          {selectedLabel}
        </span>
        {options.map((option) => (
          <span className="whitespace-nowrap text-sm font-semibold" data-measure="option" key={option.value}>
            {option.label}
          </span>
        ))}
      </div>

      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "h-full w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70 shadow-sm transition-colors duration-200 focus:outline-none",
          open && "opacity-0",
        )}
        onClick={toggleMenu}
        onKeyDown={handleButtonKeyDown}
        ref={placeholderButtonRef}
        type="button"
      >
        <span className={DROPDOWN_TRIGGER_GRID_CLASS}>
          <span className={cn("min-w-0 truncate text-slate-400", CONTROL_LABEL_TEXT_CLASS)} title={label}>
            {label}
          </span>
          <span className="hidden min-w-0 truncate text-right text-sm font-semibold text-slate-50 md:block" title={selectedLabel}>
            {selectedLabel}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {open && rect
        ? createPortal(
            <div
              className="rounded-2xl border border-slate-700 bg-slate-950/90 shadow-2xl backdrop-blur"
              ref={overlayRef}
              style={{
                position: "fixed",
                top: rect.top,
                left: overlayLeft ?? rect.left,
                width: overlayWidth ?? rect.width,
                minWidth: rect.width,
                zIndex: 9999,
              }}
            >
              <button
                aria-expanded={open}
                aria-haspopup="listbox"
                className="h-10 w-full overflow-hidden focus:outline-none"
                onClick={() => closeMenu(true)}
                type="button"
              >
                <span className={DROPDOWN_TRIGGER_GRID_CLASS}>
                  <span className={cn("min-w-0 truncate text-slate-400", CONTROL_LABEL_TEXT_CLASS)} title={label}>
                    {label}
                  </span>
                  <span className="min-w-0 truncate text-right text-sm font-semibold text-slate-50" title={selectedLabel}>
                    {selectedLabel}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 rotate-180 text-slate-300" />
                </span>
              </button>

              <div
                className="expandable-dropdown-options max-h-80 overflow-auto border-t border-slate-800/90 py-2"
                ref={optionsRef}
                role="listbox"
              >
                {options.map((option, index) => {
                  const selected = draftValues.includes(option.value);
                  const highlighted = index === highlightedIndex;

                  return (
                    <button
                      aria-selected={selected}
                      className={cn(
                        "flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition",
                        highlighted && "bg-slate-900/90",
                        selected ? "text-slate-50" : "text-slate-200",
                      )}
                      key={option.value}
                      onClick={() => selectOption(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      role="option"
                      type="button"
                    >
                      <span className="truncate text-sm font-semibold">{option.label}</span>
                      <span
                        className={cn(
                          "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition",
                          selected
                            ? "border-emerald-400/10 bg-emerald-400/15 text-emerald-300"
                            : "border-slate-700 text-transparent",
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

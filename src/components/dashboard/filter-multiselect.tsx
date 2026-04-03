"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type Option = {
  label: string;
  value: string;
  color?: string;
};

type FilterMultiselectProps = {
  label: string;
  options: Option[];
  selectedValues: string[];
  onChange: (nextValue: string[]) => void;
};

export function FilterMultiselect({
  label,
  options,
  selectedValues,
  onChange,
}: FilterMultiselectProps) {
  const allSelected = selectedValues.length === options.length;
  const triggerLabel =
    selectedValues.length === 0
      ? `Select ${label.toLowerCase()}`
      : allSelected
        ? `All ${label.toLowerCase()}`
        : `${selectedValues.length} selected`;

  function toggleValue(value: string) {
    if (selectedValues.includes(value) && selectedValues.length === 1) {
      return;
    }

    onChange(
      selectedValues.includes(value)
        ? selectedValues.filter((entry) => entry !== value)
        : [...selectedValues, value],
    );
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="pill flex min-h-16 w-full items-center justify-between gap-4 rounded-[24px] px-5 py-4 text-left transition hover:border-[var(--border-strong)]"
          type="button"
        >
          <div>
            <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[var(--text-soft)]">
              {label}
            </div>
            <div className="text-base font-semibold text-white">{triggerLabel}</div>
          </div>
          <ChevronDown className="size-5 text-[var(--text-soft)]" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="panel z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] rounded-[28px] p-3"
          sideOffset={8}
        >
          <div className="mb-3 flex items-center justify-between px-2 pt-1">
            <div>
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[var(--text-soft)]">
                {label}
              </div>
              <div className="mt-1 text-sm text-[var(--text-soft)]">Pick one or more options</div>
            </div>
            <button
              className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-[var(--text-soft)] transition hover:text-white"
              onClick={() => onChange(options.map((option) => option.value))}
              type="button"
            >
              Select all
            </button>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {options.map((option) => {
              const active = selectedValues.includes(option.value);

              return (
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition",
                    active ? "bg-white/6" : "hover:bg-white/4",
                  )}
                  key={option.value}
                  onClick={() => toggleValue(option.value)}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    {option.color ? (
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: option.color }} />
                    ) : null}
                    <span className="text-sm font-medium text-white">{option.label}</span>
                  </div>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border transition",
                      active ? "border-transparent bg-emerald-400/15 text-emerald-300" : "border-white/12 text-transparent",
                    )}
                  >
                    <Check className="size-4" />
                  </span>
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

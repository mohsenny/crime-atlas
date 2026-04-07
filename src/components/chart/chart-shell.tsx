"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ChartShellProps = {
  title: string;
  controls?: ReactNode;
  children: ReactNode;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function ChartShell({
  title,
  controls,
  children,
  footerLeft,
  footerRight,
  className,
  contentClassName,
}: ChartShellProps) {
  return (
    <div className={cn("card-panel chart-panel flex min-h-[26rem] flex-col rounded-none p-0 sm:min-h-[34rem]", className)}>
      <div className="flex flex-col gap-2 px-3 pt-3 sm:flex-row sm:gap-3 sm:px-4 sm:pt-4">
        <p className="text-sm font-semibold text-slate-200 shrink-0">{title}</p>
        {controls ? <div className="flex flex-wrap gap-1.5 sm:flex-1 sm:justify-end">{controls}</div> : null}
      </div>

      <div className={cn("mt-3 min-h-0 flex-1", contentClassName)}>{children}</div>

      {footerLeft || footerRight ? (
        <div className="mt-4 flex flex-col gap-3 px-3 pb-3 sm:flex-row sm:items-start sm:justify-between sm:px-4 sm:pb-4">
          <div className="min-w-0">{footerLeft}</div>
          <div className="min-w-0">{footerRight}</div>
        </div>
      ) : null}
    </div>
  );
}

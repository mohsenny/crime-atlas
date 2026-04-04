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
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        {controls ? <div className="flex flex-wrap justify-end gap-1.5">{controls}</div> : null}
      </div>

      <div className={cn("mt-3 min-h-0 flex-1", contentClassName)}>{children}</div>

      {footerLeft || footerRight ? (
        <div className="mt-4 flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:pb-5">
          <div className="min-w-0">{footerLeft}</div>
          <div className="min-w-0">{footerRight}</div>
        </div>
      ) : null}
    </div>
  );
}

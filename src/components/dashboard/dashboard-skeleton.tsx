import { cn } from "@/lib/utils";

type DashboardSkeletonProps = {
  showTopFilters?: boolean;
  showSources?: boolean;
};

export function DashboardSkeleton({
  showTopFilters = true,
  showSources = true,
}: DashboardSkeletonProps) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        {showTopFilters ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="h-5 w-28 animate-pulse bg-slate-800/80" />
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="h-10 w-72 animate-pulse bg-slate-900/80" />
              <div className="h-10 w-64 animate-pulse bg-slate-900/80" />
              <div className="h-5 w-14 animate-pulse bg-slate-800/80" />
            </div>
          </div>
        ) : null}

        <div className="card-panel chart-panel flex min-h-[34rem] flex-col rounded-none p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="h-4 w-44 animate-pulse bg-slate-800/80" />
            <div className="flex flex-wrap justify-end gap-1.5">
              {Array.from({ length: 8 }, (_, index) => (
                <div className="h-7 w-24 animate-pulse rounded-full bg-slate-900/80" key={index} />
              ))}
            </div>
          </div>

          <div className="mt-3 flex min-h-0 flex-1">
            <div className="relative shrink-0" style={{ width: 88 }}>
              <div className="relative h-[520px]">
                {Array.from({ length: 5 }, (_, index) => (
                  <div
                    className="absolute right-4 h-3 w-10 animate-pulse bg-slate-800/70"
                    key={index}
                    style={{ top: `${18 + index * 23}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <div className="relative h-[520px] border border-white/8 bg-white/[0.03] px-6 py-6">
                <div className="absolute inset-x-6 top-6 bottom-10 grid grid-cols-12 gap-3">
                  {Array.from({ length: 12 }, (_, columnIndex) => (
                    <div className="relative h-full" key={columnIndex}>
                      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-slate-800/70" />
                      <div
                        className={cn(
                          "absolute bottom-0 left-1/2 w-4 -translate-x-1/2 animate-pulse bg-slate-700/80",
                        )}
                        style={{ height: `${36 + ((columnIndex % 5) + 1) * 10}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }, (_, index) => (
                <div className="h-8 w-36 animate-pulse rounded-full bg-slate-900/80" key={index} />
              ))}
            </div>
            <div className="flex items-center justify-end gap-2">
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-900/80" />
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-900/80" />
            </div>
          </div>
        </div>

        {showSources ? (
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse bg-slate-800/70" />
            {Array.from({ length: 3 }, (_, index) => (
              <div className="h-3 w-72 animate-pulse bg-slate-900/80" key={index} />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

import { ArrowLeft } from "lucide-react";

type DashboardSkeletonProps = {
  showTopFilters?: boolean;
  showSources?: boolean;
};

export function DashboardSkeleton({
  showTopFilters = true,
  showSources = true,
}: DashboardSkeletonProps) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        {showTopFilters ? (
          <div className="px-4 sm:px-0">
            <div className="flex items-center gap-2 sm:justify-between">
              <div className="-ml-1 inline-flex h-10 w-8 shrink-0 items-center justify-center text-slate-400">
                <ArrowLeft className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:flex-none sm:gap-2">
                <div className="h-10 min-w-[5.75rem] w-[8.5rem] animate-pulse rounded-2xl border border-slate-700 bg-slate-900/70" />
                <div className="h-10 min-w-0 flex-1 animate-pulse rounded-2xl border border-slate-700 bg-slate-900/70 sm:w-72 sm:flex-none" />
              </div>
            </div>
          </div>
        ) : null}

        <div className="card-panel chart-panel flex min-h-[34rem] flex-col rounded-none p-4 sm:p-5">
          <div className="space-y-4">
            <div className="h-4 w-48 animate-pulse bg-slate-800/80" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="h-7 w-24 animate-pulse rounded-full border border-slate-700 bg-slate-900/70" key={index} />
              ))}
            </div>
          </div>

          <div className="mt-4 min-h-[26rem] flex-1 animate-pulse rounded-none border border-white/8 bg-white/[0.03] sm:min-h-[34rem]" />

          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: 2 }, (_, index) => (
              <div className="h-8 w-36 animate-pulse rounded-full border border-slate-700 bg-slate-900/70" key={index} />
            ))}
          </div>
        </div>

        {showSources ? (
          <div className="space-y-2 px-4 sm:px-0">
            <div className="h-3 w-20 animate-pulse bg-slate-800/70" />
            {Array.from({ length: 2 }, (_, index) => (
              <div className="h-3 w-72 animate-pulse bg-slate-900/80" key={index} />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

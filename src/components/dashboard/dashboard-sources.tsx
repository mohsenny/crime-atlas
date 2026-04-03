import type { SourceItem } from "@/lib/dashboard-data";

export function DashboardSources({ sources }: { sources: SourceItem[] }) {
  if (!sources.length) {
    return null;
  }

  return (
    <section className="px-1 pt-1">
      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sources</h2>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-slate-400">
          {sources.map((source) => (
            <li key={`${source.label}-${source.url ?? "text"}`}>
              <span>{source.label}</span>
              {source.url ? (
                <>
                  {" "}
                  (
                  <a
                    className="text-slate-500 decoration-slate-500/60 underline-offset-2 transition hover:text-slate-200 hover:underline"
                    href={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    link
                  </a>
                  )
                </>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

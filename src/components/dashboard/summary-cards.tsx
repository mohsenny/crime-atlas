import type { ChartSummary, Metric } from "@/lib/dashboard-data";
import { formatCompactNumber, formatMetricValue } from "@/lib/utils";

type SummaryCardsProps = {
  summary: ChartSummary;
  metric: Metric;
  districtCount: number;
  categoryCount: number;
};

export function SummaryCards({ summary, metric, districtCount, categoryCount }: SummaryCardsProps) {
  const trendText = `${summary.percentChange >= 0 ? "+" : ""}${summary.percentChange.toFixed(1)}%`;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="panel rounded-[28px] p-5">
        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[var(--text-soft)]">
          Latest total
        </div>
        <div className="mt-3 text-3xl font-semibold text-white">
          {formatMetricValue(summary.latestTotal, metric)}
        </div>
        <div className="mt-2 text-sm text-[var(--text-soft)]">Combined selected districts in {summary.latestYear}</div>
      </div>
      <div className="panel rounded-[28px] p-5">
        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[var(--text-soft)]">
          Trend
        </div>
        <div className="mt-3 flex items-end gap-3">
          <div className="text-3xl font-semibold text-white">{trendText}</div>
          <div className="pb-1 text-sm text-[var(--text-soft)]">
            vs {summary.startYear}
          </div>
        </div>
        <div className="mt-2 text-sm text-[var(--text-soft)]">
          From {formatCompactNumber(summary.startTotal)} to {formatCompactNumber(summary.latestTotal)}
        </div>
      </div>
      <div className="panel rounded-[28px] p-5">
        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[var(--text-soft)]">
          Leading district
        </div>
        <div className="mt-3 text-2xl font-semibold text-white">{summary.strongestDistrict.label}</div>
        <div className="mt-2 text-sm text-[var(--text-soft)]">
          {formatMetricValue(summary.strongestDistrict.value, metric)} across {categoryCount} categories in {summary.latestYear}
        </div>
        <div className="mt-1 text-sm text-[var(--text-soft)]">{districtCount} districts selected</div>
      </div>
    </div>
  );
}


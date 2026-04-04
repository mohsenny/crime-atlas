import type { ComparisonCategory, ComparisonData } from "@/lib/dashboard-data";

type ComparisonMethodologyProps = {
  category: ComparisonCategory | null;
  methodology: ComparisonData["methodologyByCategory"][string] | null;
};

export function ComparisonMethodology({ category, methodology }: ComparisonMethodologyProps) {
  if (!category || !methodology) {
    return null;
  }

  const confidenceLabel = methodology.confidence.charAt(0).toUpperCase() + methodology.confidence.slice(1);

  return (
    <section className="space-y-2 px-1 pt-1">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">How This Comparison Works</h2>
      <div className="space-y-3 text-sm text-slate-400">
        <p className="leading-6">
          <span className="font-medium text-slate-100">{category.label}</span> is being compared through the canonical
          category map. Only official source labels judged close enough to each other are included. Current mapping
          confidence: <span className="font-medium text-slate-100">{confidenceLabel}</span>.
        </p>

        <div className="space-y-3">
          {methodology.locations.map((location) => (
            <div className="space-y-1" key={location.locationSlug}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{location.locationLabel}</p>
              <p className="leading-6">
                {location.sourceLabels.length > 0 ? location.sourceLabels.join(" + ") : "No mapped source labels"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

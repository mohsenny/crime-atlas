import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

import { buildSeriesKey, getChartData, getFilterMetadata } from "@/lib/dashboard-data";
import { formatAreaCount, formatCrimeSelection, resolveLocationViewState } from "@/lib/view-state";

export const runtime = "nodejs";

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;
const CHART_HEIGHT = 250;
const CHART_WIDTH = 980;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const locationSlug = url.searchParams.get("location") ?? undefined;

  if (!locationSlug) {
    return new Response("Missing location", { status: 400 });
  }

  const meta = await getFilterMetadata(locationSlug);
  if (!meta) {
    return new Response("Not found", { status: 404 });
  }

  const viewState = resolveLocationViewState(meta, {
    districts: url.searchParams.get("districts") ?? undefined,
    categories: url.searchParams.get("categories") ?? undefined,
    metric: url.searchParams.get("metric") ?? undefined,
  });
  const chartData = await getChartData({
    locationSlug,
    districtSlugs: viewState.districtSlugs,
    categorySlugs: viewState.categorySlugs,
    metric: viewState.metric,
  });

  if (!chartData) {
    return new Response("Not found", { status: 404 });
  }

  const selectedCategories = meta.categories.filter((category) => viewState.categorySlugs.includes(category.value));
  const visibleCrimeLabels = selectedCategories.map((category) => category.shortLabel ?? category.label);
  const crimeSummary =
    viewState.categorySlugs.length === meta.categories.length
      ? "All crimes"
      : formatCrimeSelection(visibleCrimeLabels);
  const areaSummary = formatAreaCount(
    viewState.districtSlugs.length,
    meta.areaLabelSingular.toLowerCase(),
    meta.areaLabelPlural.toLowerCase(),
  );
  const barSeries = chartData.chartRows.map((row) => {
    const segments = selectedCategories
      .map((category) => ({
        color: category.color ?? "#94a3b8",
        label: category.shortLabel ?? category.label,
        value: viewState.districtSlugs.reduce(
          (sum, districtSlug) => sum + Number(row[buildSeriesKey(districtSlug, category.value)] ?? 0),
          0,
        ),
      }))
      .filter((segment) => segment.value > 0);

    return {
      year: String(row.year),
      total: segments.reduce((sum, segment) => sum + segment.value, 0),
      segments,
    };
  });
  const maxTotal = Math.max(...barSeries.map((item) => item.total), 1);
  const maxChipCount = 6;
  const chipLabels =
    viewState.categorySlugs.length === meta.categories.length
      ? [{ label: "All crimes", color: "#f8fafc", textColor: "#0f172a" }]
      : selectedCategories.slice(0, maxChipCount).map((category) => ({
          label: category.shortLabel ?? category.label,
          color: category.color ?? "#94a3b8",
          textColor: "#f8fafc",
        }));

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#1b2431",
          color: "#f8fafc",
          padding: "42px 46px",
          fontFamily: "Inter, Avenir Next, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 820 }}>
            <div style={{ fontSize: 18, letterSpacing: "0.22em", textTransform: "uppercase", color: "#94a3b8" }}>
              Crime Atlas
            </div>
            <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.05 }}>{meta.label}</div>
            <div style={{ fontSize: 26, color: "#cbd5e1" }}>{crimeSummary}</div>
            <div style={{ fontSize: 22, color: "#94a3b8" }}>
              {areaSummary} • {viewState.metric === "rate" ? "Rate per 100k" : "Case counts"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 132,
              height: 48,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.25)",
              color: "#cbd5e1",
              fontSize: 18,
            }}
          >
            {barSeries.length} years
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22, minHeight: 42 }}>
          {chipLabels.map((chip) => (
            <div
              key={chip.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 16px",
                borderRadius: 999,
                border: chip.label === "All crimes" ? "none" : "1px solid rgba(148,163,184,0.2)",
                background: chip.label === "All crimes" ? "#f8fafc" : "rgba(15,23,42,0.55)",
                color: chip.textColor,
                fontSize: 18,
              }}
            >
              {chip.label === "All crimes" ? null : (
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: chip.color,
                    display: "flex",
                  }}
                />
              )}
              {chip.label}
            </div>
          ))}
          {selectedCategories.length > maxChipCount && viewState.categorySlugs.length !== meta.categories.length ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "9px 16px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.2)",
                color: "#94a3b8",
                fontSize: 18,
              }}
            >
              +{selectedCategories.length - maxChipCount} more
            </div>
          ) : null}
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            flex: 1,
            marginTop: 26,
            borderRadius: 28,
            border: "1px solid rgba(71,83,98,0.9)",
            background: "rgba(14,24,37,0.82)",
            overflow: "hidden",
            padding: "28px 24px 20px 24px",
          }}
        >
          <div style={{ position: "absolute", inset: "28px 24px 52px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {[0, 1, 2, 3].map((index) => (
              <div key={index} style={{ borderTop: "1px dashed rgba(100,116,139,0.2)", width: "100%" }} />
            ))}
          </div>

          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-end", gap: 8, width: CHART_WIDTH, marginTop: "auto", height: CHART_HEIGHT }}>
            {barSeries.map((entry) => (
              <div key={entry.year} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1, height: CHART_HEIGHT }}>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: "100%", height: CHART_HEIGHT }}>
                  {entry.segments.map((segment) => (
                    <div
                      key={`${entry.year}-${segment.label}`}
                      style={{
                        width: "100%",
                        height: Math.max(3, (segment.value / maxTotal) * CHART_HEIGHT),
                        background: segment.color,
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 14, color: "#94a3b8" }}>{entry.year}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
    },
  );
}
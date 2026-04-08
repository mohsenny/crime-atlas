import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

import { getComparisonData } from "@/lib/dashboard-data";
import { formatCrimeSelection, resolveCompareViewState, splitParam } from "@/lib/view-state";

export const runtime = "nodejs";

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;
const CITY_COLORS = ["#7dd3fc", "#f97316", "#a78bfa"];

type Point = { x: number; y: number };

function buildLinePath(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const locations = splitParam(url.searchParams.get("locations") ?? url.searchParams.get("cities"));

  if (locations.length < 2 || locations.length > 3) {
    return new Response("Missing locations", { status: 400 });
  }

  const data = await getComparisonData(locations);
  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const viewState = resolveCompareViewState(data, {
    locations: url.searchParams.get("locations") ?? undefined,
    cities: url.searchParams.get("cities") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    metric: url.searchParams.get("metric") ?? undefined,
  });
  const selectedCategory = data.categories.find((category) => category.value === viewState.categorySlug);
  const series = data.seriesByCategory[viewState.categorySlug] ?? [];
  const valuesByKey = new Map(series.map((record) => [`${record.year}__${record.locationSlug}`, record]));
  const rows = data.years.map((year) => {
    const row: Record<string, number | null> = {};

    for (const location of data.locations) {
      const record = valuesByKey.get(`${year}__${location.slug}`);
      row[location.slug] = viewState.metric === "rate" ? (record?.ratePer100k ?? null) : (record?.count ?? null);
    }

    return {
      year,
      values: row,
    };
  });
  const yMax = Math.max(
    ...rows.flatMap((row) => data.locations.map((location) => Number(row.values[location.slug] ?? 0))),
    1,
  );
  const chartLeft = 84;
  const chartTop = 208;
  const chartWidth = 1040;
  const chartHeight = 300;
  const xStep = rows.length > 1 ? chartWidth / (rows.length - 1) : chartWidth;
  const locationPaths = data.locations.map((location, index) => {
    const points = rows.flatMap((row, rowIndex) => {
      const value = row.values[location.slug];
      if (value === null) {
        return [];
      }

      return [{
        x: chartLeft + rowIndex * xStep,
        y: chartTop + chartHeight - (Number(value) / yMax) * chartHeight,
      }];
    });

    return {
      color: CITY_COLORS[index % CITY_COLORS.length],
      label: location.label,
      path: buildLinePath(points),
    };
  });
  const title = data.locations.map((location) => location.label).join(" vs ");
  const subtitle = `${selectedCategory ? formatCrimeSelection([selectedCategory.shortLabel ?? selectedCategory.label]) : "Crime"} • ${viewState.metric === "rate" ? "Rate per 100k" : "Case counts"}`;

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
            <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.05 }}>{title}</div>
            <div style={{ fontSize: 26, color: "#cbd5e1" }}>{subtitle}</div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 150,
              height: 48,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.25)",
              color: "#cbd5e1",
              fontSize: 18,
            }}
          >
            {rows.length} years
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          {locationPaths.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 16px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.2)",
                background: "rgba(15,23,42,0.55)",
                color: "#f8fafc",
                fontSize: 18,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 999, background: item.color, display: "flex" }} />
              {item.label}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "relative",
            flex: 1,
            marginTop: 28,
            borderRadius: 28,
            border: "1px solid rgba(71,83,98,0.9)",
            background: "rgba(14,24,37,0.82)",
            overflow: "hidden",
          }}
        >
          <svg width="1200" height="430" viewBox="0 0 1200 430" style={{ position: "absolute", inset: 0 }}>
            {[0, 1, 2, 3, 4].map((index) => {
              const y = chartTop + (chartHeight / 4) * index;
              return <line key={index} x1={chartLeft} x2={chartLeft + chartWidth} y1={y} y2={y} stroke="rgba(100,116,139,0.18)" strokeDasharray="6 8" />;
            })}
            <line x1={chartLeft} x2={chartLeft} y1={chartTop} y2={chartTop + chartHeight} stroke="rgba(100,116,139,0.22)" />
            {locationPaths.map((item) => (
              <path
                key={item.label}
                d={item.path}
                fill="none"
                stroke={item.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="5"
              />
            ))}
            {rows.map((row, index) => (
              <text
                key={row.year}
                x={chartLeft + index * xStep}
                y={chartTop + chartHeight + 28}
                fill="#94a3b8"
                fontSize="16"
                textAnchor={index === 0 ? "start" : index === rows.length - 1 ? "end" : "middle"}
              >
                {row.year}
              </text>
            ))}
          </svg>
        </div>
      </div>
    ),
    {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
    },
  );
}
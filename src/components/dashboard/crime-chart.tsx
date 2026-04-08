"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartShell } from "@/components/chart/chart-shell";
import { useChartUi } from "@/components/chart/use-chart-ui";
import { ChartLegendButton } from "@/components/dashboard/chart-legend-button";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import { buildSeriesKey, type ChartResponse } from "@/lib/dashboard-data";
import { cn, formatAxisTickNumber, formatInteger, formatMetricValue } from "@/lib/utils";

type CrimeChartProps = {
  data: ChartResponse;
  focusedDistrictSlug: string | null;
  hiddenCategorySlugs: string[];
  onToggleDistrict: (districtSlug: string) => void;
  onToggleCategory: (categorySlug: string) => void;
  title: string;
};

type Point = {
  x: number;
  y: number;
};

function pointsEqual(left: Point[], right: Point[]) {
  return (
    left.length === right.length &&
    left.every((point, index) => point.x === right[index]?.x && point.y === right[index]?.y)
  );
}

const DESKTOP_CHART_HEIGHT = 520;
const MOBILE_CHART_HEIGHT = 420;
const DESKTOP_AXIS_WIDTH = 88;
const MOBILE_AXIS_WIDTH = 64;
const X_AXIS_HEIGHT = 30;

export function CrimeChart({
  data,
  focusedDistrictSlug,
  hiddenCategorySlugs,
  onToggleDistrict,
  onToggleCategory,
  title,
}: CrimeChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chartContentRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [focusLinePoints, setFocusLinePoints] = useState<Point[]>([]);
  const [viewportWidth, setViewportWidth] = useState(0);
  const { disableInteractiveTooltip, isMobileViewport } = useChartUi();

  const visibleCategories = useMemo(
    () => data.categories.filter((category) => !hiddenCategorySlugs.includes(category.value)),
    [data.categories, hiddenCategorySlugs],
  );
  const chartHeight = isMobileViewport ? MOBILE_CHART_HEIGHT : DESKTOP_CHART_HEIGHT;
  const axisWidth = isMobileViewport ? MOBILE_AXIS_WIDTH : DESKTOP_AXIS_WIDTH;
  const axisChartWidth = axisWidth + (isMobileViewport ? 6 : 8);
  const axisProbeSeriesKey = data.districts[0] && visibleCategories[0]
    ? buildSeriesKey(data.districts[0].value, visibleCategories[0].value)
    : null;
  const groupWidth = Math.max(
    isMobileViewport ? 42 : 50,
    data.districts.length * (isMobileViewport ? 16 : 18) + (isMobileViewport ? 12 : 18),
  );
  const minChartWidth = Math.max(isMobileViewport ? 0 : 760, data.years.length * groupWidth);
  const chartWidth = Math.max(minChartWidth, viewportWidth);
  const showDistrictMarkers = !isMobileViewport && data.districts.length > 1 && data.districts.length <= 16;
  const chartTopMargin = showDistrictMarkers ? 24 : 10;
  const chartBottomMargin = 8;
  const chartPlotHeight = chartHeight - chartTopMargin - chartBottomMargin - X_AXIS_HEIGHT;
  const districtIndexBySlug = useMemo(
    () => new Map(data.districts.map((district, index) => [district.value, index + 1])),
    [data.districts],
  );

  const axisTicks = useMemo(() => {
    const highestStack = data.chartRows.reduce((yearMax, row) => {
      const districtMax = data.districts.reduce((stackMax, district) => {
        const stackValue = visibleCategories.reduce(
          (sum, category) => sum + Number(row[buildSeriesKey(district.value, category.value)] ?? 0),
          0,
        );
        return Math.max(stackMax, stackValue);
      }, 0);

      return Math.max(yearMax, districtMax);
    }, 0);

    return buildAxisTicks(highestStack);
  }, [data.chartRows, data.districts, visibleCategories]);
  const yAxisMax = axisTicks.at(-1) ?? 1;
  const focusedDistrictIndex = useMemo(
    () => (focusedDistrictSlug ? data.districts.findIndex((district) => district.value === focusedDistrictSlug) : -1),
    [data.districts, focusedDistrictSlug],
  );

  const syncScrollState = useCallback(() => {
    const element = scrollContainerRef.current;

    if (!element) {
      return;
    }

    setCanScrollLeft(element.scrollLeft > 8);
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) {
      return;
    }

    const onScroll = () => syncScrollState();
    const syncViewport = () => {
      setViewportWidth(element.clientWidth);
      syncScrollState();
    };
    const id = window.requestAnimationFrame(syncViewport);
    const resizeObserver = new ResizeObserver(syncViewport);

    element.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    resizeObserver.observe(element);

    return () => {
      window.cancelAnimationFrame(id);
      element.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      resizeObserver.disconnect();
    };
  }, [syncScrollState]);

  useEffect(() => {
    if (!mounted || !focusedDistrictSlug || focusedDistrictIndex < 0) {
      return;
    }

    const clusterWidth = data.districts.length * 8 + Math.max(0, data.districts.length - 1) * 2;
    const stackOffset = -clusterWidth / 2 + focusedDistrictIndex * 10 + 4;

    const measurePoints = () => {
      const container = chartContentRef.current;
      if (!container) {
        setFocusLinePoints([]);
        return;
      }

      const yearPositions = (() => {
        const renderedTopRects = Array.from(
          container.querySelectorAll<SVGRectElement>('rect[data-focus-top="true"][data-year]'),
        )
          .map((rect) => {
            const year = rect.getAttribute("data-year");
            const x = Number(rect.getAttribute("x") ?? Number.NaN);
            const y = Number(rect.getAttribute("y") ?? Number.NaN);
            const width = Number(rect.getAttribute("width") ?? Number.NaN);

            if (!year || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width)) {
              return null;
            }

            return {
              year,
              x: x + width / 2,
              y,
            };
          })
          .filter((rect): rect is { year: string; x: number; y: number } => rect !== null);

        if (renderedTopRects.length > 0) {
          return renderedTopRects;
        }

        const gridLines = Array.from(
          container.querySelectorAll<SVGLineElement>(".recharts-cartesian-grid-vertical line[x1]"),
        )
          .map((line) => Number(line.getAttribute("x1") ?? Number.NaN))
          .filter((value) => Number.isFinite(value))
          .sort((left, right) => left - right);

        if (gridLines.length >= data.chartRows.length) {
          const maxGridX = Math.max(...gridLines);
          const interior = gridLines.filter((value) => value > 0 && value < maxGridX);

          if (interior.length >= data.chartRows.length) {
            return interior.slice(0, data.chartRows.length).map((x, index) => ({
              year: String(data.chartRows[index]?.year ?? ""),
              x,
              y: Number.NaN,
            }));
          }
        }

        return Array.from(
          container.querySelectorAll<SVGTextElement>(".recharts-xAxis .recharts-cartesian-axis-tick-value"),
        )
          .map((tickNode, index) => ({
            year: String(data.chartRows[index]?.year ?? ""),
            x: Number(tickNode.getAttribute("x") ?? Number.NaN),
            y: Number.NaN,
          }))
          .filter((value) => Number.isFinite(value.x));
      })();

      const renderedPointByYear = new Map(yearPositions.map((point) => [point.year, point]));

      const nextPoints = data.chartRows.flatMap((row) => {
        const renderedPoint = renderedPointByYear.get(String(row.year));

        if (renderedPoint && Number.isFinite(renderedPoint.y)) {
          return [{ x: renderedPoint.x, y: renderedPoint.y }];
        }

        if (!renderedPoint || !Number.isFinite(renderedPoint.x)) {
          return [];
        }

        const total = visibleCategories.reduce(
          (sum, category) => sum + Number(row[buildSeriesKey(focusedDistrictSlug, category.value)] ?? 0),
          0,
        );

        if (total <= 0) {
          return [];
        }

        const ratio = yAxisMax === 0 ? 0 : total / yAxisMax;
        const y = chartTopMargin + (1 - ratio) * chartPlotHeight;

        return [{ x: renderedPoint.x + stackOffset, y }];
      });

      setFocusLinePoints((current) => (pointsEqual(current, nextPoints) ? current : nextPoints));
    };

    const first = window.requestAnimationFrame(() => {
      const second = window.requestAnimationFrame(measurePoints);
      frameIds.push(second);
    });
    const frameIds = [first];
    const observer = new MutationObserver(measurePoints);
    const resizeObserver = new ResizeObserver(measurePoints);

    if (chartContentRef.current) {
      observer.observe(chartContentRef.current, {
        subtree: true,
        childList: true,
        attributes: true,
      });
      resizeObserver.observe(chartContentRef.current);
    }

    window.addEventListener("resize", measurePoints);

    return () => {
      frameIds.forEach((id) => window.cancelAnimationFrame(id));
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", measurePoints);
    };
  }, [
    chartHeight,
    chartWidth,
    chartPlotHeight,
    chartTopMargin,
    data.chartRows,
    data.districts.length,
    focusedDistrictIndex,
    focusedDistrictSlug,
    mounted,
    visibleCategories,
    yAxisMax,
  ]);

  function scrollChart(direction: 1 | -1) {
    const element = scrollContainerRef.current;

    if (!element) {
      return;
    }

    element.scrollBy({
      left: direction * Math.max(element.clientWidth * 0.75, 240),
      behavior: "smooth",
    });
  }

  return (
    <ChartShell
      title={title}
      className="crime-chart-with-grid"
      controls={
        <>
          {data.categories.map((category) => {
            const active = !hiddenCategorySlugs.includes(category.value);

            return (
              <ChartLegendButton
                active={active}
                color={category.color ?? "#94a3b8"}
                key={category.value}
                onClick={() => onToggleCategory(category.value)}
                label={category.shortLabel ?? category.label}
              />
            );
          })}
        </>
      }
      footerLeft={
        <div className="flex flex-wrap gap-2 text-xs text-slate-400 pb-1 sm:pb-0">
          {data.districts.map((district, index) => (
            <button
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-full border px-2 py-1 text-left text-[11px] transition sm:px-3 sm:py-1.5 sm:text-sm",
                focusedDistrictSlug === null
                  ? "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                  : focusedDistrictSlug === district.value
                    ? "border-slate-500 bg-slate-900/80 text-slate-100"
                    : "border-slate-800 text-slate-500 opacity-55 hover:opacity-75",
              )}
              key={district.value}
              onClick={() => onToggleDistrict(district.value)}
              type="button"
            >
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold leading-none text-slate-900">
                {index + 1}
              </span>
              <span className="inline-flex min-w-0 items-center leading-tight">{district.label}</span>
            </button>
          ))}
        </div>
      }
      footerRight={isMobileViewport ? null : (
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <button
            aria-label="Scroll chart left"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!canScrollLeft}
            onClick={() => scrollChart(-1)}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Scroll chart right"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!canScrollRight}
            onClick={() => scrollChart(1)}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    >
      <div className="flex min-h-0 flex-1 -mx-3 sm:-mx-4 lg:mx-0">
        <div className="flex min-h-0 w-full overflow-hidden">
          <div
            className="pointer-events-none relative z-[1] shrink-0 border-r border-slate-800/70"
            style={{ width: axisChartWidth, height: chartHeight }}
          >
            {mounted ? (
              <BarChart
                barCategoryGap={isMobileViewport ? 10 : 14}
                barGap={2}
                data={data.chartRows}
                height={chartHeight}
                margin={{ top: chartTopMargin, right: 0, left: 0, bottom: 8 }}
                width={axisChartWidth}
              >
                <XAxis
                  axisLine={false}
                  dataKey="year"
                  height={X_AXIS_HEIGHT}
                  tick={false}
                  tickLine={false}
                />
                <YAxis
                  allowDataOverflow
                  axisLine={false}
                  domain={[0, yAxisMax]}
                  interval={0}
                  tick={{ fontSize: isMobileViewport ? 11 : 12, fill: "var(--chart-axis-dark)" }}
                  tickFormatter={formatAxisTickNumber}
                  tickLine={false}
                  ticks={axisTicks}
                  type="number"
                  width={axisWidth}
                />
                {axisProbeSeriesKey ? (
                  <Bar
                    barSize={1}
                    dataKey={axisProbeSeriesKey}
                    fill="transparent"
                    fillOpacity={0}
                    isAnimationActive={false}
                  />
                ) : null}
              </BarChart>
            ) : (
              <div className="h-full border-r border-white/8 bg-white/[0.03]" />
            )}
          </div>

          <div className="chart-scroll-shell min-h-0 flex-1 overflow-x-auto" ref={scrollContainerRef}>
            <div
              className="relative"
              ref={chartContentRef}
              style={{ width: `${chartWidth}px`, minWidth: `${minChartWidth}px`, height: chartHeight }}
            >
              {focusedDistrictSlug && focusLinePoints.length > 1 ? (
                <svg className="pointer-events-none absolute inset-0" height={chartHeight} width={chartWidth}>
                  <polyline
                    fill="none"
                    points={focusLinePoints.map((point) => `${point.x},${point.y}`).join(" ")}
                    stroke="rgba(125, 211, 252, 0.22)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={8}
                  />
                  <polyline
                    fill="none"
                    points={focusLinePoints.map((point) => `${point.x},${point.y}`).join(" ")}
                    stroke="#dbeafe"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                  {focusLinePoints.map((point) => (
                    <circle cx={point.x} cy={point.y} fill="#dbeafe" key={`${point.x}-${point.y}`} r={2.5} />
                  ))}
                </svg>
              ) : null}

              {mounted ? (
                <BarChart
                  barCategoryGap={isMobileViewport ? 10 : 14}
                  barGap={2}
                  data={data.chartRows}
                  height={chartHeight}
                  margin={{ top: chartTopMargin, right: isMobileViewport ? 0 : 12, left: 0, bottom: 8 }}
                  width={chartWidth}
                >
                  <CartesianGrid horizontal={false} stroke="var(--chart-grid-dark)" strokeDasharray="3 3" />
                  <XAxis
                    axisLine={false}
                    dataKey="year"
                    height={X_AXIS_HEIGHT}
                    interval={0}
                    tick={{ fontSize: isMobileViewport ? 11 : 12, fill: "var(--chart-axis-dark)" }}
                    tickLine={false}
                    tickMargin={12}
                  />
                  {!disableInteractiveTooltip ? (
                    <Tooltip
                      content={
                        <ChartTooltip
                          labelFormatter={(label) => String(label ?? "")}
                          nameFormatter={(name) => formatSeriesName(name, data)}
                          valueFormatter={(value) => formatMetricValue(Number(value ?? 0), data.metric)}
                        />
                      }
                      cursor={{ fill: "rgba(148, 163, 184, 0.06)" }}
                    />
                  ) : null}
                  {data.districts.map((district) =>
                    visibleCategories.map((category) => (
                      <Bar
                        barSize={isMobileViewport ? 7 : 8}
                        dataKey={buildSeriesKey(district.value, category.value)}
                        fill={category.color}
                        isAnimationActive={false}
                        key={`${district.value}-${category.value}`}
                        shape={(props) =>
                          renderStackShape({
                            props,
                            districtSlug: district.value,
                            categorySlug: category.value,
                            color: category.color ?? "#94a3b8",
                            districtOpacity:
                              focusedDistrictSlug === null || focusedDistrictSlug === district.value ? 1 : 0.18,
                            visibleCategories,
                            districtIndex: districtIndexBySlug.get(district.value) ?? 0,
                            isFocusedDistrict: focusedDistrictSlug === district.value,
                            showDistrictMarkers,
                          })
                        }
                        stackId={district.value}
                      />
                    )),
                  )}
                </BarChart>
              ) : (
                <div className="h-full border border-white/8 bg-white/[0.03]" />
              )}
            </div>
          </div>
        </div>
      </div>
    </ChartShell>
  );
}

function formatSeriesName(name: string, data: ChartResponse) {
  const [districtSlug, categorySlug] = name.split("__");
  const districtLabel = data.districts.find((district) => district.value === districtSlug)?.label ?? districtSlug;
  const categoryLabel = data.categories.find((category) => category.value === categorySlug)?.shortLabel ?? categorySlug;
  return `${districtLabel} • ${categoryLabel}`;
}

function buildAxisTicks(maxValue: number) {
  const safeMax = maxValue > 0 ? maxValue : 1;
  const roughStep = safeMax / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;

  let niceStep = magnitude;
  if (residual > 5) {
    niceStep = 10 * magnitude;
  } else if (residual > 2) {
    niceStep = 5 * magnitude;
  } else if (residual > 1) {
    niceStep = 2 * magnitude;
  }

  const axisMax = Math.ceil(safeMax / niceStep) * niceStep;
  const ticks = Array.from({ length: Math.min(6, Math.floor(axisMax / niceStep) + 1) }, (_, index) => index * niceStep);

  return ticks[ticks.length - 1] === axisMax ? ticks : [...ticks, axisMax];
}

function renderStackShape({
  props,
  districtSlug,
  categorySlug,
  color,
  districtOpacity,
  visibleCategories,
  districtIndex,
  isFocusedDistrict,
  showDistrictMarkers,
}: {
  props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: Record<string, number | string>;
  };
  districtSlug: string;
  categorySlug: string;
  color: string;
  districtOpacity: number;
  visibleCategories: ChartResponse["categories"];
  districtIndex: number;
  isFocusedDistrict: boolean;
  showDistrictMarkers: boolean;
}) {
  const { x, y, width, height, payload } = props;

  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    !payload ||
    height <= 0
  ) {
    return null;
  }

  const topCategory = [...visibleCategories]
    .reverse()
    .find((category) => Number(payload[buildSeriesKey(districtSlug, category.value)] ?? 0) > 0)?.value;
  const isTopOfStack = topCategory === categorySlug;

  return (
    <g>
      <rect
        data-focus-top={isTopOfStack && isFocusedDistrict ? "true" : undefined}
        data-year={isTopOfStack && isFocusedDistrict ? String(payload.year ?? "") : undefined}
        fill={color}
        fillOpacity={districtOpacity}
        height={height}
        rx="0"
        ry="0"
        width={width}
        x={x}
        y={y}
      />
      {showDistrictMarkers && isTopOfStack ? (
        <g opacity={districtOpacity} transform={`translate(${x + width / 2}, ${y - 8})`}>
          <text
            dominantBaseline="central"
            fill="#f8fafc"
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            x="0"
            y="0.5"
            style={{ paintOrder: "stroke", stroke: "#0f172a", strokeWidth: 3 }}
          >
            {districtIndex}
          </text>
        </g>
      ) : null}
    </g>
  );
}

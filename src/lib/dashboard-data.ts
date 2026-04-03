import { cache } from "react";
import locationsIndex from "@/generated/locations-index.json";

export type Metric = "count" | "rate";

export type FilterOption = {
  label: string;
  value: string;
  shortLabel?: string;
  color?: string;
  isDefault?: boolean;
};

export type SourceItem = {
  label: string;
  url?: string;
};

export type ChartRow = {
  year: string;
  [key: string]: number | string;
};

export type ChartSummary = {
  latestYear: number;
  latestTotal: number;
  startYear: number;
  startTotal: number;
  percentChange: number;
  strongestDistrict: {
    label: string;
    value: number;
  };
};

export type ChartResponse = {
  metric: Metric;
  note: string;
  chartRows: ChartRow[];
  years: number[];
  districts: FilterOption[];
  categories: FilterOption[];
  summary: ChartSummary;
};

export type LocationOverview = {
  slug: string;
  label: string;
  country: string;
  chartTitle: string;
  note: string;
  years: number[];
  areaLabelSingular: string;
  areaLabelPlural: string;
  districtCount: number;
  categoryCount: number;
  sources: SourceItem[];
  supportsRate: boolean;
};

export type FilterMetadata = LocationOverview & {
  districts: FilterOption[];
  categories: FilterOption[];
  defaultDistrictSlugs: string[];
  defaultCategorySlugs: string[];
  latestYear: number | null;
};

type LocationRecord = {
  year: number;
  districtLabel: string;
  districtSlug: string;
  categoryLabel: string;
  categorySlug: string;
  count: number;
  ratePer100k: number | null;
};

type LocationDataset = {
  slug: string;
  label: string;
  country: string;
  areaLabelSingular: string;
  areaLabelPlural: string;
  chartTitle: string;
  note: string;
  sources: SourceItem[];
  years: number[];
  districts: FilterOption[];
  categories: FilterOption[];
  defaultCategorySlugs: string[];
  records: LocationRecord[];
};

type LocationsIndex = typeof locationsIndex;

const locationLoaders: Record<string, () => Promise<LocationDataset>> = {
  berlin: async () => (await import("@/generated/locations/berlin.json")).default as LocationDataset,
  barcelona: async () => (await import("@/generated/locations/barcelona.json")).default as LocationDataset,
  frankfurt: async () => (await import("@/generated/locations/frankfurt.json")).default as LocationDataset,
  hamburg: async () => (await import("@/generated/locations/hamburg.json")).default as LocationDataset,
  london: async () => (await import("@/generated/locations/london.json")).default as LocationDataset,
  luton: async () => (await import("@/generated/locations/luton.json")).default as LocationDataset,
  milan: async () => (await import("@/generated/locations/milan.json")).default as LocationDataset,
  paris: async () => (await import("@/generated/locations/paris.json")).default as LocationDataset,
  rome: async () => (await import("@/generated/locations/rome.json")).default as LocationDataset,
  valencia: async () => (await import("@/generated/locations/valencia.json")).default as LocationDataset,
};

function buildValue(record: LocationRecord, metric: Metric) {
  if (metric === "rate") {
    return record.ratePer100k ?? 0;
  }

  return record.count;
}

const loadLocation = cache(async (slug: string) => {
  const loader = locationLoaders[slug];
  return loader ? loader() : null;
});

export function buildSeriesKey(districtSlug: string, categorySlug: string) {
  return `${districtSlug}__${categorySlug}`;
}

export const getLocationSummaries = cache(async (): Promise<LocationOverview[]> => {
  return locationsIndex.locations as LocationsIndex["locations"];
});

function buildDefaultDistrictSlugs(location: LocationDataset) {
  const latestYear = location.years.at(-1);
  if (!latestYear) {
    return location.districts.slice(0, 3).map((item) => item.value);
  }

  const configuredDefaultCategories = location.categories.filter((category) => category.isDefault).map((category) => category.value);
  const preferredCategorySlugs =
    configuredDefaultCategories.length > 0 ? configuredDefaultCategories : location.defaultCategorySlugs;

  const districtTotals = new Map<string, number>();

  for (const record of location.records) {
    if (record.year !== latestYear || !preferredCategorySlugs.includes(record.categorySlug)) {
      continue;
    }

    districtTotals.set(record.districtSlug, (districtTotals.get(record.districtSlug) ?? 0) + record.count);
  }

  const topDistricts = [...districtTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([districtSlug]) => districtSlug);

  return topDistricts.length > 0 ? topDistricts : location.districts.slice(0, 3).map((item) => item.value);
}

export const getFilterMetadata = cache(async (locationSlug: string): Promise<FilterMetadata | null> => {
  const location = await loadLocation(locationSlug);
  if (!location) {
    return null;
  }
  const supportsRate = location.records.some((record) => record.ratePer100k !== null);

  return {
    slug: location.slug,
    label: location.label,
    country: location.country,
    chartTitle: location.chartTitle,
    note: location.note,
    sources: location.sources,
    years: location.years,
    areaLabelSingular: location.areaLabelSingular,
    areaLabelPlural: location.areaLabelPlural,
    districtCount: location.districts.length,
    categoryCount: location.categories.length,
    supportsRate,
    districts: location.districts,
    categories: location.categories,
    defaultDistrictSlugs: buildDefaultDistrictSlugs(location),
    defaultCategorySlugs: location.defaultCategorySlugs,
    latestYear: location.years.at(-1) ?? null,
  };
});

export async function getChartData(input: {
  locationSlug: string;
  districtSlugs?: string[];
  categorySlugs?: string[];
  metric?: Metric;
}): Promise<ChartResponse | null> {
  const location = await loadLocation(input.locationSlug);

  if (!location) {
    return null;
  }

  const supportsRate = location.records.some((record) => record.ratePer100k !== null);
  const metric = input.metric === "rate" && supportsRate ? "rate" : "count";
  const validDistrictSlugs = input.districtSlugs?.filter((slug) => location.districts.some((item) => item.value === slug)) ?? [];
  const validCategorySlugs =
    input.categorySlugs?.filter((slug) => location.categories.some((item) => item.value === slug)) ?? [];
  const defaultDistrictSlugs = buildDefaultDistrictSlugs(location);
  const districtSlugs = validDistrictSlugs.length ? validDistrictSlugs : defaultDistrictSlugs;
  const categorySlugs = validCategorySlugs.length
    ? validCategorySlugs
    : location.categories.map((category) => category.value);
  const selectedDistricts = location.districts.filter((district) => districtSlugs.includes(district.value));
  const filteredRecords = location.records.filter(
    (record) => districtSlugs.includes(record.districtSlug) && categorySlugs.includes(record.categorySlug),
  );

  const rowByYear = new Map<number, ChartRow>();
  const districtTotals = new Map<string, number>();
  const yearTotals = new Map<number, number>();
  const latestYear = location.years.at(-1) ?? new Date().getFullYear();

  for (const year of location.years) {
    rowByYear.set(year, { year: String(year) });
    yearTotals.set(year, 0);
  }

  for (const record of filteredRecords) {
    const row = rowByYear.get(record.year);
    const key = buildSeriesKey(record.districtSlug, record.categorySlug);
    const value = buildValue(record, metric);

    if (!row) {
      continue;
    }

    row[key] = value;
    yearTotals.set(record.year, (yearTotals.get(record.year) ?? 0) + value);

    if (record.year === latestYear) {
      districtTotals.set(record.districtSlug, (districtTotals.get(record.districtSlug) ?? 0) + value);
    }
  }

  const startYear = location.years.at(0) ?? latestYear;
  const latestTotal = yearTotals.get(latestYear) ?? 0;
  const startTotal = yearTotals.get(startYear) ?? 0;
  const strongestDistrict =
    selectedDistricts
      .map((district) => ({
        label: district.label,
        value: districtTotals.get(district.value) ?? 0,
      }))
      .sort((left, right) => right.value - left.value)[0] ?? { label: "N/A", value: 0 };

  return {
    metric,
    note: location.note,
    chartRows: location.years.map((year) => rowByYear.get(year) ?? { year: String(year) }),
    years: location.years,
    districts: selectedDistricts,
    categories: location.categories,
    summary: {
      latestYear,
      latestTotal,
      startYear,
      startTotal,
      percentChange: startTotal === 0 ? 0 : ((latestTotal - startTotal) / startTotal) * 100,
      strongestDistrict,
    },
  };
}

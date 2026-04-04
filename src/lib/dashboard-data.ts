import { cache } from "react";
import locationsIndex from "@/generated/locations-index.json";
import {
  CANONICAL_COMPARISON_CATEGORIES,
  isComparableMappingConfidence,
  LOCATION_COMPARISON_MAPPINGS,
  type ComparisonMappingConfidence,
} from "@/lib/comparison-taxonomy";

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

export type ComparisonCategory = FilterOption & {
  sharedAcrossAll: true;
  confidence: Exclude<ComparisonMappingConfidence, "partial">;
};

export type ComparisonSeriesRecord = {
  year: number;
  locationSlug: string;
  count: number;
  ratePer100k: number | null;
};

export type ComparisonLocation = {
  slug: string;
  label: string;
  country: string;
  years: number[];
  areaLabelSingular: string;
  areaLabelPlural: string;
  districtCount: number;
  supportsRate: boolean;
  sources: SourceItem[];
};

export type ComparisonData = {
  locations: ComparisonLocation[];
  categories: ComparisonCategory[];
  defaultCategorySlug: string | null;
  years: number[];
  supportsRate: boolean;
  note: string;
  seriesByCategory: Record<string, ComparisonSeriesRecord[]>;
  methodologyByCategory: Record<
    string,
    {
      confidence: Exclude<ComparisonMappingConfidence, "partial">;
      locations: Array<{
        locationSlug: string;
        locationLabel: string;
        sourceLabels: string[];
      }>;
    }
  >;
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
  cityPopulationByYear: Record<string, number>;
  records: LocationRecord[];
};

type ResolvedComparisonMapping = {
  canonicalKey: string;
  sourceCategoryValues: string[];
  confidence: ComparisonMappingConfidence;
};

type LocationsIndex = typeof locationsIndex;

const locationLoaders: Record<string, () => Promise<LocationDataset>> = {
  austin: async () => (await import("@/generated/locations/austin.json")).default as LocationDataset,
  berlin: async () => (await import("@/generated/locations/berlin.json")).default as LocationDataset,
  barcelona: async () => (await import("@/generated/locations/barcelona.json")).default as LocationDataset,
  chicago: async () => (await import("@/generated/locations/chicago.json")).default as LocationDataset,
  dallas: async () => (await import("@/generated/locations/dallas.json")).default as LocationDataset,
  frankfurt: async () => (await import("@/generated/locations/frankfurt.json")).default as LocationDataset,
  hamburg: async () => (await import("@/generated/locations/hamburg.json")).default as LocationDataset,
  houston: async () => (await import("@/generated/locations/houston.json")).default as LocationDataset,
  london: async () => (await import("@/generated/locations/london.json")).default as LocationDataset,
  "los-angeles": async () => (await import("@/generated/locations/los-angeles.json")).default as LocationDataset,
  luton: async () => (await import("@/generated/locations/luton.json")).default as LocationDataset,
  milan: async () => (await import("@/generated/locations/milan.json")).default as LocationDataset,
  "new-york-city": async () => (await import("@/generated/locations/new-york-city.json")).default as LocationDataset,
  paris: async () => (await import("@/generated/locations/paris.json")).default as LocationDataset,
  phoenix: async () => (await import("@/generated/locations/phoenix.json")).default as LocationDataset,
  rome: async () => (await import("@/generated/locations/rome.json")).default as LocationDataset,
  "sao-paulo": async () => (await import("@/generated/locations/sao-paulo.json")).default as LocationDataset,
  "san-francisco": async () => (await import("@/generated/locations/san-francisco.json")).default as LocationDataset,
  seattle: async () => (await import("@/generated/locations/seattle.json")).default as LocationDataset,
  tokyo: async () => (await import("@/generated/locations/tokyo.json")).default as LocationDataset,
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

async function getLocationsBySlugs(locationSlugs: string[]) {
  const uniqueSlugs = [...new Set(locationSlugs)].filter(Boolean);
  const loaded = await Promise.all(uniqueSlugs.map((slug) => loadLocation(slug)));
  return loaded.filter((location): location is LocationDataset => Boolean(location));
}

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

export async function getComparisonData(locationSlugs: string[]): Promise<ComparisonData | null> {
  const locations = await getLocationsBySlugs(locationSlugs);

  if (locations.length < 2 || locations.length > 3) {
    return null;
  }

  const resolvedMappingsByLocation = new Map<string, Map<string, ResolvedComparisonMapping>>();

  for (const location of locations) {
    const configuredMappings = LOCATION_COMPARISON_MAPPINGS[location.slug] ?? [];
    const resolvedMappings = new Map<string, ResolvedComparisonMapping>();

    for (const mapping of configuredMappings) {
      const sourceCategories = mapping.sourceLabels
        .map((label) => location.categories.find((category) => category.label === label))
        .filter((category): category is FilterOption => Boolean(category));

      if (sourceCategories.length !== mapping.sourceLabels.length) {
        continue;
      }

      resolvedMappings.set(mapping.canonicalKey, {
        canonicalKey: mapping.canonicalKey,
        sourceCategoryValues: sourceCategories.map((category) => category.value),
        confidence: mapping.confidence,
      });
    }

    resolvedMappingsByLocation.set(location.slug, resolvedMappings);
  }

  const sharedCategories = CANONICAL_COMPARISON_CATEGORIES
    .map<ComparisonCategory | null>((canonicalCategory) => {
      const mappings = locations
        .map((location) => resolvedMappingsByLocation.get(location.slug)?.get(canonicalCategory.key) ?? null);

      if (
        mappings.some((mapping) => !mapping || !isComparableMappingConfidence(mapping.confidence))
      ) {
        return null;
      }

      const confidence = mappings.every((mapping) => mapping?.confidence === "high") ? "high" : "medium";

      return {
        label: canonicalCategory.label,
        value: canonicalCategory.key,
        shortLabel: canonicalCategory.shortLabel,
        color: canonicalCategory.color,
        isDefault: canonicalCategory.isDefault,
        sharedAcrossAll: true as const,
        confidence,
      };
    })
    .filter((category): category is ComparisonCategory => category !== null)
    .sort((left, right) => {
      const leftOrder = CANONICAL_COMPARISON_CATEGORIES.find((item) => item.key === left.value)?.sortOrder ?? 999;
      const rightOrder = CANONICAL_COMPARISON_CATEGORIES.find((item) => item.key === right.value)?.sortOrder ?? 999;
      return leftOrder - rightOrder;
    });

  const supportsRate = locations.every(
    (location) => Object.keys(location.cityPopulationByYear ?? {}).length > 0,
  );

  const years = [...new Set(locations.flatMap((location) => location.years))].sort((leftYear, rightYear) => leftYear - rightYear);
  const seriesByCategory: Record<string, ComparisonSeriesRecord[]> = {};
  const methodologyByCategory: ComparisonData["methodologyByCategory"] = {};

  for (const category of sharedCategories) {
    const records: ComparisonSeriesRecord[] = [];
    const methodologyLocations: ComparisonData["methodologyByCategory"][string]["locations"] = [];

    for (const location of locations) {
      const mapping = resolvedMappingsByLocation.get(location.slug)?.get(category.value);
      if (!mapping) {
        continue;
      }

      const totalsByYear = new Map<number, { count: number; ratePer100k: number | null }>();

      for (const year of location.years) {
        totalsByYear.set(year, { count: 0, ratePer100k: null });
      }

      for (const record of location.records) {
        if (!mapping.sourceCategoryValues.includes(record.categorySlug)) {
          continue;
        }

        const current = totalsByYear.get(record.year) ?? { count: 0, ratePer100k: null };
        totalsByYear.set(record.year, {
          count: current.count + record.count,
          ratePer100k: current.ratePer100k,
        });
      }

      for (const year of location.years) {
        const totals = totalsByYear.get(year) ?? { count: 0, ratePer100k: null };
        const population = location.cityPopulationByYear?.[String(year)] ?? null;
        records.push({
          year,
          locationSlug: location.slug,
          count: totals.count,
          ratePer100k: supportsRate && population ? (totals.count / population) * 100_000 : null,
        });
      }

      methodologyLocations.push({
        locationSlug: location.slug,
        locationLabel: location.label,
        sourceLabels: mapping.sourceCategoryValues
          .map((categoryValue) => location.categories.find((item) => item.value === categoryValue)?.label ?? null)
          .filter((label): label is string => Boolean(label)),
      });
    }

    seriesByCategory[category.value] = records.sort((leftRecord, rightRecord) =>
      leftRecord.year === rightRecord.year
        ? leftRecord.locationSlug.localeCompare(rightRecord.locationSlug)
        : leftRecord.year - rightRecord.year,
    );
    methodologyByCategory[category.value] = {
      confidence: category.confidence,
      locations: methodologyLocations,
    };
  }

  const defaultCategorySlug =
    sharedCategories.find((category) => category.isDefault)?.value ?? sharedCategories[0]?.value ?? null;

  return {
    locations: locations.map((location) => ({
      slug: location.slug,
      label: location.label,
      country: location.country,
      years: location.years,
      areaLabelSingular: location.areaLabelSingular,
      areaLabelPlural: location.areaLabelPlural,
      districtCount: location.districts.length,
      supportsRate: Object.keys(location.cityPopulationByYear ?? {}).length > 0,
      sources: location.sources,
    })),
    categories: sharedCategories,
    defaultCategorySlug,
    years,
    supportsRate,
    note:
      "Only canonical categories with exact or close official equivalents across all selected cities are included. Rate per 100k is enabled when every selected location has a verified official yearly city-population series for comparison.",
    seriesByCategory,
    methodologyByCategory,
  };
}

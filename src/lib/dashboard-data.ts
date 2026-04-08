import { cache } from "react";
import type { Prisma } from "@prisma/client";
import {
  CANONICAL_COMPARISON_CATEGORIES,
  isComparableMappingConfidence,
  type ComparisonMappingConfidence,
} from "@/lib/comparison-taxonomy";
import { getLocationScope } from "@/lib/location-config";
import { getDefaultLocationCategorySlugs } from "@/lib/location-category-selection";
import { getScopeLabel, type LocationScope } from "@/lib/location-scope";
import { prisma } from "@/lib/prisma";

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
  scope: LocationScope;
  country: string;
  years: number[];
  areaLabelSingular: string;
  areaLabelPlural: string;
  districtCount: number;
  supportsRate: boolean;
  sources: SourceItem[];
};

export type ComparisonData = {
  scope: LocationScope;
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
  scope: LocationScope;
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
  scope: LocationScope;
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
  comparisonMappings: ResolvedComparisonMapping[];
};

type ResolvedComparisonMapping = {
  canonicalKey: string;
  sourceCategoryValues: string[];
  confidence: ComparisonMappingConfidence;
};

function toComparisonConfidence(value: string): ComparisonMappingConfidence {
  return value === "high" || value === "medium" || value === "partial" ? value : "partial";
}

function buildSimpleChartTitle(label: string) {
  return `${label} Crime`;
}

type DbLocationPayload = Prisma.LocationGetPayload<{
  include: {
    sources: { orderBy: { sortOrder: "asc" } };
    districts: { orderBy: { sortOrder: "asc" } };
    categories: { orderBy: { sortOrder: "asc" } };
    populations: true;
    records: {
      orderBy: [{ year: "asc" }];
      include: {
        district: true;
        category: true;
      };
    };
    comparisonMappings: {
      include: {
        canonicalCategory: true;
        sourceCategories: {
          orderBy: { sortOrder: "asc" };
          include: { category: true };
        };
      };
    };
  };
}>;

function mapLocationEntityToDataset(location: DbLocationPayload): LocationDataset {
  const years = [...new Set(location.records.map((record) => record.year))].sort((left, right) => left - right);

  return {
    slug: location.slug,
    label: location.label,
    scope: getLocationScope(location.slug),
    country: location.country,
    areaLabelSingular: location.areaLabelSingular,
    areaLabelPlural: location.areaLabelPlural,
    chartTitle: buildSimpleChartTitle(location.label),
    note: location.note,
    sources: location.sources.map((source) => ({
      label: source.label,
      url: source.url ?? undefined,
    })),
    years,
    districts: location.districts.map((district) => ({
      label: district.label,
      value: district.slug,
    })),
    categories: location.categories.map((category) => ({
      label: category.label,
      value: category.slug,
      shortLabel: category.shortLabel ?? undefined,
      color: category.color ?? undefined,
      isDefault: category.isDefault,
    })),
    defaultCategorySlugs: location.categories.filter((category) => category.isDefault).map((category) => category.slug),
    cityPopulationByYear: Object.fromEntries(
      location.populations.map((population) => [String(population.year), population.population]),
    ),
    records: location.records.map((record) => ({
      year: record.year,
      districtLabel: record.district.label,
      districtSlug: record.district.slug,
      categoryLabel: record.category.label,
      categorySlug: record.category.slug,
      count: record.count,
      ratePer100k: record.ratePer100k,
    })),
    comparisonMappings: location.comparisonMappings.map((mapping) => ({
      canonicalKey: mapping.canonicalCategory.key,
      sourceCategoryValues: mapping.sourceCategories.map((sourceCategory) => sourceCategory.category.slug),
      confidence: toComparisonConfidence(mapping.confidence),
    })),
  };
}

function buildValue(record: LocationRecord, metric: Metric) {
  if (metric === "rate") {
    return record.ratePer100k ?? 0;
  }

  return record.count;
}

const loadLocation = cache(async (slug: string) => {
  const location = await prisma.location.findUnique({
    where: { slug },
    include: {
      sources: { orderBy: { sortOrder: "asc" } },
      districts: { orderBy: { sortOrder: "asc" } },
      categories: { orderBy: { sortOrder: "asc" } },
      populations: true,
      records: {
        orderBy: [{ year: "asc" }],
        include: {
          district: true,
          category: true,
        },
      },
      comparisonMappings: {
        include: {
          canonicalCategory: true,
          sourceCategories: {
            orderBy: { sortOrder: "asc" },
            include: { category: true },
          },
        },
      },
    },
  });

  return location ? mapLocationEntityToDataset(location) : null;
});

export function buildSeriesKey(districtSlug: string, categorySlug: string) {
  return `${districtSlug}__${categorySlug}`;
}

export const getLocationSummaries = cache(async (): Promise<LocationOverview[]> => {
  const locations = await prisma.location.findMany({
    orderBy: { label: "asc" },
    include: {
      sources: { orderBy: { sortOrder: "asc" } },
      districts: { orderBy: { sortOrder: "asc" } },
      categories: { orderBy: { sortOrder: "asc" } },
      records: { select: { year: true, ratePer100k: true } },
    },
  });

  return locations.map((location) => {
    const years = [...new Set(location.records.map((record) => record.year))].sort((left, right) => left - right);

    return {
      slug: location.slug,
      label: location.label,
      scope: getLocationScope(location.slug),
      country: location.country,
      chartTitle: buildSimpleChartTitle(location.label),
      note: location.note,
      years,
      areaLabelSingular: location.areaLabelSingular,
      areaLabelPlural: location.areaLabelPlural,
      districtCount: location.districts.length,
      categoryCount: location.categories.length,
      sources: location.sources.map((source) => ({
        label: source.label,
        url: source.url ?? undefined,
      })),
      supportsRate: location.records.some((record) => record.ratePer100k !== null),
    };
  });
});

async function getLocationsBySlugs(locationSlugs: string[]) {
  const uniqueSlugs = [...new Set(locationSlugs)].filter(Boolean);
  const loaded = await Promise.all(uniqueSlugs.map((slug) => loadLocation(slug)));
  return loaded.filter((location): location is LocationDataset => Boolean(location));
}

function buildDefaultDistrictSlugs(location: LocationDataset) {
  const latestYear = location.years.at(-1);
  if (!latestYear) {
    return location.districts.slice(0, 2).map((item) => item.value);
  }

  const preferredCategorySlugs = getDefaultLocationCategorySlugs(location.categories);

  const districtTotals = new Map<string, number>();

  for (const record of location.records) {
    if (record.year !== latestYear || !preferredCategorySlugs.includes(record.categorySlug)) {
      continue;
    }

    districtTotals.set(record.districtSlug, (districtTotals.get(record.districtSlug) ?? 0) + record.count);
  }

  const topDistricts = [...districtTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([districtSlug]) => districtSlug);

  return topDistricts.length > 0 ? topDistricts : location.districts.slice(0, 2).map((item) => item.value);
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
    scope: location.scope,
    country: location.country,
    chartTitle: buildSimpleChartTitle(location.label),
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
    defaultCategorySlugs: getDefaultLocationCategorySlugs(location.categories),
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

  const scope = locations[0]?.scope;
  if (!scope || locations.some((location) => location.scope !== scope)) {
    return null;
  }

  const resolvedMappingsByLocation = new Map<string, Map<string, ResolvedComparisonMapping>>();

  for (const location of locations) {
    const resolvedMappings = new Map<string, ResolvedComparisonMapping>();

    for (const mapping of location.comparisonMappings) {
      resolvedMappings.set(mapping.canonicalKey, {
        canonicalKey: mapping.canonicalKey,
        sourceCategoryValues: mapping.sourceCategoryValues,
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
    scope,
    locations: locations.map((location) => ({
      slug: location.slug,
      label: location.label,
      scope: location.scope,
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
      `Only canonical categories with exact or close official equivalents across all selected ${getScopeLabel(scope, { plural: true })} are included. Rate per 100k is enabled when every selected location has a verified official yearly population series for comparison.`,
    seriesByCategory,
    methodologyByCategory,
  };
}

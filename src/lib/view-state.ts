import type { ComparisonData, FilterMetadata, Metric } from "@/lib/dashboard-data";
import {
  findAllOffensesCategorySlug,
  normalizeLocationCategorySlugs,
} from "@/lib/location-category-selection";
import type { LocationScope } from "@/lib/location-scope";

type LocationSearchStateInput = {
  districts?: string;
  categories?: string;
  metric?: string;
};

type CompareSearchStateInput = {
  locations?: string;
  cities?: string;
  category?: string;
  metric?: string;
  scope?: string;
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function splitParam(value?: string | null) {
  return unique(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim()),
  );
}

export function resolveLocationViewState(meta: FilterMetadata, searchState: LocationSearchStateInput) {
  const validDistricts = new Set(meta.districts.map((district) => district.value));
  const validCategories = new Set(meta.categories.map((category) => category.value));
  const allOffensesCategorySlug = findAllOffensesCategorySlug(meta.categories);

  const districtSlugs = splitParam(searchState.districts).filter((slug) => validDistricts.has(slug));
  const requestedCategorySlugs =
    searchState.categories === "all"
      ? meta.categories
          .map((category) => category.value)
          .filter((slug) => slug !== allOffensesCategorySlug)
      : splitParam(searchState.categories).filter((slug) => validCategories.has(slug));

  return {
    districtSlugs: districtSlugs.length > 0 ? districtSlugs : meta.defaultDistrictSlugs,
    categorySlugs: normalizeLocationCategorySlugs(meta.categories, requestedCategorySlugs),
    metric: searchState.metric === "rate" && meta.supportsRate ? ("rate" as const) : ("count" as const),
  };
}

export function buildLocationSearchParams(input: {
  meta: FilterMetadata;
  districtSlugs: string[];
  categorySlugs: string[];
  metric: Metric;
}) {
  const params = new URLSearchParams();
  const normalizedCategorySlugs = normalizeLocationCategorySlugs(input.meta.categories, input.categorySlugs);
  params.set("districts", unique(input.districtSlugs).join(","));
  params.set("categories", normalizedCategorySlugs.join(","));
  params.set("metric", input.metric);
  return params;
}

export function resolveCompareViewState(data: ComparisonData, searchState: CompareSearchStateInput) {
  const resolvedCategorySlug =
    data.categories.find((category) => category.value === searchState.category)?.value ??
    data.defaultCategorySlug ??
    data.categories[0]?.value ??
    "";

  const resolvedMetric =
    !data.supportsRate
      ? ("count" as const)
      : searchState.metric === "count"
        ? ("count" as const)
        : ("rate" as const);

  return {
    locations: splitParam(searchState.locations ?? searchState.cities),
    categorySlug: resolvedCategorySlug,
    metric: resolvedMetric,
  };
}

export function buildCompareSearchParams(input: {
  locations: string[];
  categorySlug?: string;
  metric?: Metric;
  scope?: LocationScope;
}) {
  const params = new URLSearchParams();
  params.set("locations", unique(input.locations).join(","));

  if (input.scope) {
    params.set("scope", input.scope);
  }

  if (input.categorySlug) {
    params.set("category", input.categorySlug);
  }

  if (input.metric) {
    params.set("metric", input.metric);
  }

  return params;
}

export function formatCrimeSelection(labels: string[]) {
  if (labels.length === 0) {
    return "Crime";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  if (labels.length <= 4) {
    return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
  }

  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`;
}

export function formatAreaCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}
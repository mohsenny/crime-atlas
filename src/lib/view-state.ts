import type { ComparisonData, FilterMetadata, Metric } from "@/lib/dashboard-data";

type LocationSearchStateInput = {
  districts?: string;
  categories?: string;
  metric?: string;
};

type CompareSearchStateInput = {
  cities?: string;
  category?: string;
  metric?: string;
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

  const districtSlugs = splitParam(searchState.districts).filter((slug) => validDistricts.has(slug));
  const requestedCategorySlugs =
    searchState.categories === "all"
      ? meta.categories.map((category) => category.value)
      : splitParam(searchState.categories).filter((slug) => validCategories.has(slug));

  return {
    districtSlugs: districtSlugs.length > 0 ? districtSlugs : meta.defaultDistrictSlugs,
    categorySlugs:
      requestedCategorySlugs.length > 0
        ? requestedCategorySlugs
        : (meta.defaultCategorySlugs.length > 0
            ? meta.defaultCategorySlugs
            : meta.categories.map((category) => category.value)),
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
  params.set("districts", unique(input.districtSlugs).join(","));
  params.set(
    "categories",
    input.categorySlugs.length === input.meta.categories.length ? "all" : unique(input.categorySlugs).join(","),
  );
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
    searchState.metric === "rate" && data.supportsRate
      ? ("rate" as const)
      : ("count" as const);

  return {
    cities: splitParam(searchState.cities),
    categorySlug: resolvedCategorySlug,
    metric: resolvedMetric,
  };
}

export function buildCompareSearchParams(input: {
  cities: string[];
  categorySlug: string;
  metric: Metric;
}) {
  const params = new URLSearchParams();
  params.set("cities", unique(input.cities).join(","));
  params.set("category", input.categorySlug);
  params.set("metric", input.metric);
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
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ComparisonPageClient } from "@/components/comparison/comparison-page-client";
import { getComparisonData, getLocationSummaries } from "@/lib/dashboard-data";
import { buildOverviewHref, isLocationScope } from "@/lib/location-scope";
import { buildCompareSearchParams, formatCrimeSelection, resolveCompareViewState } from "@/lib/view-state";

type ComparePageProps = {
  searchParams: Promise<{
    locations?: string;
    cities?: string;
    category?: string;
    metric?: string;
    scope?: string;
  }>;
};

function splitLocations(value?: string) {
  return value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { category, cities, locations: rawLocations, metric, scope: rawScope } = await searchParams;
  const selectedLocations = splitLocations(rawLocations ?? cities);
  const requestedScope = isLocationScope(rawScope) ? rawScope : undefined;

  if (selectedLocations.length < 2 || selectedLocations.length > 3) {
    redirect(buildOverviewHref(requestedScope ?? "city"));
  }

  const [locations, data] = await Promise.all([
    getLocationSummaries(),
    getComparisonData(selectedLocations),
  ]);

  if (!data) {
    redirect(buildOverviewHref(requestedScope ?? "city"));
  }

  const viewState = resolveCompareViewState(data, { locations: rawLocations, cities, category, metric, scope: rawScope });
  const initialMetric = data.supportsRate
    ? metric === "count"
      ? "count"
      : "rate"
    : "count";

  return (
    <ComparisonPageClient
      data={data}
      initialCategorySlug={viewState.categorySlug}
      initialMetric={initialMetric}
      locations={locations.filter((location) => location.scope === data.scope)}
    />
  );
}

export async function generateMetadata({ searchParams }: ComparePageProps): Promise<Metadata> {
  const { category, cities, locations, metric } = await searchParams;
  const selectedLocations = splitLocations(locations ?? cities);

  if (selectedLocations.length < 2 || selectedLocations.length > 3) {
    return {};
  }

  const data = await getComparisonData(selectedLocations);

  if (!data) {
    return {};
  }

  const viewState = resolveCompareViewState(data, { locations, cities, category, metric });
  const selectedCategory = data.categories.find((item) => item.value === viewState.categorySlug);
  const locationLabels = data.locations.map((location) => location.label);
  const crimeLabel = selectedCategory ? formatCrimeSelection([selectedCategory.shortLabel ?? selectedCategory.label]) : "Crime";
  const title = `${locationLabels.join(" vs ")}: ${crimeLabel}`;
  const description = `${crimeLabel} • ${viewState.metric === "rate" ? "Rate per 100k" : "Case counts"}.`;
  const canonicalPath = `/compare?${buildCompareSearchParams({
    locations: data.locations.map((location) => location.slug),
    categorySlug: viewState.categorySlug,
    metric: viewState.metric,
    scope: data.scope,
  }).toString()}`;
  const imagePath = `/api/og/compare?${buildCompareSearchParams({
    locations: data.locations.map((location) => location.slug),
    categorySlug: viewState.categorySlug,
    metric: viewState.metric,
    scope: data.scope,
  }).toString()}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: "Crime Atlas",
      images: [imagePath],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imagePath],
    },
  };
}

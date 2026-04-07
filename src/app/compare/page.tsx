import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ComparisonPageClient } from "@/components/comparison/comparison-page-client";
import { getComparisonData, getLocationSummaries } from "@/lib/dashboard-data";
import { buildCompareSearchParams, formatCrimeSelection, resolveCompareViewState } from "@/lib/view-state";

type ComparePageProps = {
  searchParams: Promise<{
    cities?: string;
    category?: string;
    metric?: string;
  }>;
};

function splitCities(value?: string) {
  return value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { category, cities, metric } = await searchParams;
  const selectedCities = splitCities(cities);

  if (selectedCities.length < 2 || selectedCities.length > 3) {
    redirect("/");
  }

  const [locations, data] = await Promise.all([
    getLocationSummaries(),
    getComparisonData(selectedCities),
  ]);

  if (!data) {
    redirect("/");
  }

  const viewState = resolveCompareViewState(data, { cities, category, metric });

  return (
    <ComparisonPageClient
      data={data}
      initialCategorySlug={viewState.categorySlug}
      initialMetric={viewState.metric}
      locations={locations}
    />
  );
}

export async function generateMetadata({ searchParams }: ComparePageProps): Promise<Metadata> {
  const { cities, category, metric } = await searchParams;
  const selectedCities = splitCities(cities);

  if (selectedCities.length < 2 || selectedCities.length > 3) {
    return {};
  }

  const data = await getComparisonData(selectedCities);

  if (!data) {
    return {};
  }

  const viewState = resolveCompareViewState(data, { cities, category, metric });
  const selectedCategory = data.categories.find((item) => item.value === viewState.categorySlug);
  const locationLabels = data.locations.map((location) => location.label);
  const crimeLabel = selectedCategory ? formatCrimeSelection([selectedCategory.shortLabel ?? selectedCategory.label]) : "Crime";
  const title = `${locationLabels.join(" vs ")}: ${crimeLabel}`;
  const description = `${crimeLabel} • ${viewState.metric === "rate" ? "Rate per 100k" : "Case counts"}.`;
  const imagePath = `/api/og/compare?${buildCompareSearchParams({
    cities: data.locations.map((location) => location.slug),
    categorySlug: viewState.categorySlug,
    metric: viewState.metric,
  }).toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
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

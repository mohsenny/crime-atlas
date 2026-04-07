import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getFilterMetadata, getLocationSummaries } from "@/lib/dashboard-data";
import { buildLocationSearchParams, formatAreaCount, formatCrimeSelection, resolveLocationViewState } from "@/lib/view-state";

type LocationPageProps = {
  params: Promise<{
    locationSlug: string;
  }>;
  searchParams: Promise<{
    districts?: string;
    categories?: string;
    metric?: string;
  }>;
};

export async function generateStaticParams() {
  const locations = await getLocationSummaries();
  return locations.map((location) => ({ locationSlug: location.slug }));
}

export async function generateMetadata({ params, searchParams }: LocationPageProps): Promise<Metadata> {
  const { locationSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const meta = await getFilterMetadata(locationSlug);

  if (!meta) {
    return {};
  }

  const viewState = resolveLocationViewState(meta, resolvedSearchParams);
  const selectedCategoryLabels = meta.categories
    .filter((category) => viewState.categorySlugs.includes(category.value))
    .map((category) => category.shortLabel ?? category.label);
  const areaSummary = formatAreaCount(viewState.districtSlugs.length, meta.areaLabelSingular.toLowerCase(), meta.areaLabelPlural.toLowerCase());
  const crimeSummary =
    viewState.categorySlugs.length === meta.categories.length
      ? "All crimes"
      : formatCrimeSelection(selectedCategoryLabels);
  const imageParams = buildLocationSearchParams({
    meta,
    districtSlugs: viewState.districtSlugs,
    categorySlugs: viewState.categorySlugs,
    metric: viewState.metric,
  });
  imageParams.set("location", meta.slug);
  const title = `${meta.label}: ${crimeSummary} across ${areaSummary}`;
  const description = `${crimeSummary} across ${areaSummary}. ${viewState.metric === "rate" ? "Rate per 100k" : "Case counts"}.`;
  const imagePath = `/api/og/city?${imageParams.toString()}`;

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

export default async function LocationPage({ params, searchParams }: LocationPageProps) {
  const { locationSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const [meta, locations] = await Promise.all([getFilterMetadata(locationSlug), getLocationSummaries()]);

  if (!meta) {
    notFound();
  }

  const viewState = resolveLocationViewState(meta, resolvedSearchParams);

  return (
    <DashboardClient
      backHref="/"
      backLabel="All locations"
      initialCategorySlugs={viewState.categorySlugs}
      initialDistrictSlugs={viewState.districtSlugs}
      initialMetric={viewState.metric}
      locations={locations}
      meta={meta}
    />
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getFilterMetadata, getLocationSummaries } from "@/lib/dashboard-data";
import { buildOverviewHref, getScopeLabel } from "@/lib/location-scope";
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
  const canonicalPath = `/${meta.slug}?${buildLocationSearchParams({
    meta,
    districtSlugs: viewState.districtSlugs,
    categorySlugs: viewState.categorySlugs,
    metric: viewState.metric,
  }).toString()}`;
  const imagePath = `/api/og/city?${imageParams.toString()}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.crime-atlas.com";
  const imageUrl = new URL(imagePath, siteUrl).toString();
  const imageAlt = `${meta.label} crime chart preview`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalPath,
      siteName: "Crime Atlas",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: imageAlt,
        },
      ],
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
      backHref={buildOverviewHref("city")}
      backLabel={`All ${getScopeLabel("city", { plural: true, capitalized: true })}`}
      initialCategorySlugs={viewState.categorySlugs}
      initialDistrictSlugs={viewState.districtSlugs}
      initialMetric={viewState.metric}
      locations={locations.filter((location) => location.scope === meta.scope)}
      meta={meta}
    />
  );
}

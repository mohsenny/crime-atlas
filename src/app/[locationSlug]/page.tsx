import { notFound } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getFilterMetadata, getLocationSummaries } from "@/lib/dashboard-data";

type LocationPageProps = {
  params: Promise<{
    locationSlug: string;
  }>;
};

export async function generateStaticParams() {
  const locations = await getLocationSummaries();
  return locations.map((location) => ({ locationSlug: location.slug }));
}

export default async function LocationPage({ params }: LocationPageProps) {
  const { locationSlug } = await params;
  const [meta, locations] = await Promise.all([getFilterMetadata(locationSlug), getLocationSummaries()]);

  if (!meta) {
    notFound();
  }

  return <DashboardClient backHref="/" backLabel="All locations" locations={locations} meta={meta} />;
}

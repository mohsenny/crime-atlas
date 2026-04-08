import { OverviewPageClient } from "@/components/overview/overview-page-client";
import { getLocationSummaries } from "@/lib/dashboard-data";
import { DEFAULT_LOCATION_SCOPE, isLocationScope } from "@/lib/location-scope";

type HomePageProps = {
  searchParams: Promise<{
    scope?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const locations = await getLocationSummaries();
  const resolvedSearchParams = await searchParams;
  const initialScope = isLocationScope(resolvedSearchParams.scope) ? resolvedSearchParams.scope : DEFAULT_LOCATION_SCOPE;

  return <OverviewPageClient initialScope={initialScope} locations={locations} />;
}

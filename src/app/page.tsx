import { OverviewPageClient } from "@/components/overview/overview-page-client";
import { getLocationSummaries } from "@/lib/dashboard-data";

export default async function HomePage() {
  const locations = await getLocationSummaries();

  return <OverviewPageClient locations={locations} />;
}

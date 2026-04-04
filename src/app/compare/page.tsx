import { redirect } from "next/navigation";

import { ComparisonPageClient } from "@/components/comparison/comparison-page-client";
import { getComparisonData, getLocationSummaries } from "@/lib/dashboard-data";

type ComparePageProps = {
  searchParams: Promise<{
    cities?: string;
    category?: string;
  }>;
};

function splitCities(value?: string) {
  return value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { category, cities } = await searchParams;
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

  return <ComparisonPageClient data={data} initialCategorySlug={category} locations={locations} />;
}

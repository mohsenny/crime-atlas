import { NextResponse } from "next/server";
import { z } from "zod";

import { getChartData } from "@/lib/dashboard-data";

const querySchema = z.object({
  location: z.string().min(1),
  districts: z.string().optional(),
  categories: z.string().optional(),
  metric: z.enum(["count", "rate"]).optional(),
});

function splitParam(value?: string) {
  return value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    location: url.searchParams.get("location") ?? undefined,
    districts: url.searchParams.get("districts") ?? undefined,
    categories: url.searchParams.get("categories") ?? undefined,
    metric: url.searchParams.get("metric") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const payload = await getChartData({
    locationSlug: parsed.data.location,
    districtSlugs: splitParam(parsed.data.districts),
    categorySlugs: splitParam(parsed.data.categories),
    metric: parsed.data.metric,
  });

  if (!payload) {
    return NextResponse.json({ error: "Unknown location." }, { status: 404 });
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

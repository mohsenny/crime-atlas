import { NextResponse } from "next/server";
import { z } from "zod";

import { getFilterMetadata } from "@/lib/dashboard-data";

const querySchema = z.object({
  location: z.string().min(1),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    location: url.searchParams.get("location") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Location is required.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const payload = await getFilterMetadata(parsed.data.location);

  if (!payload) {
    return NextResponse.json({ error: "Unknown location." }, { status: 404 });
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { searchNominatimAddress } from "@/lib/nominatimGeoService";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchNominatimAddress(query.trim(), 6);

    return NextResponse.json({
      success: true,
      query: query.trim(),
      results,
    });
  } catch (error: any) {
    console.error("Geocoding API error:", error);
    return NextResponse.json({ error: error.message || "Geocoding failed" }, { status: 500 });
  }
}

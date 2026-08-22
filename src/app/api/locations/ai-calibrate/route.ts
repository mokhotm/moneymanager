import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { calibrateLocationsWithAI } from "@/agents/geoAgent";
import { getEffectiveUserId } from "@/lib/session";

const OVERRIDES_FILE = path.join(process.cwd(), "merchant_overrides.json");

function saveOverrides(newOverrides: Record<string, any>) {
  try {
    let existing: Record<string, any> = {};
    if (fs.existsSync(OVERRIDES_FILE)) {
      existing = JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf-8"));
    }
    const merged = { ...existing, ...newOverrides };
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return merged;
  } catch (e) {
    console.error("Error updating overrides file:", e);
    return newOverrides;
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { merchants, autoSave = true } = body;

    const listToProcess: string[] = Array.isArray(merchants)
      ? merchants
      : typeof merchants === "string" && merchants.trim()
      ? [merchants.trim()]
      : [];

    if (listToProcess.length === 0) {
      return NextResponse.json({ error: "No merchant descriptions provided" }, { status: 400 });
    }

    const aiResults = await calibrateLocationsWithAI(listToProcess);

    if (autoSave && aiResults.length > 0) {
      const overridesToSave: Record<string, any> = {};
      for (const res of aiResults) {
        const key = res.cleanMerchant || res.merchant;
        overridesToSave[key] = {
          cleanMerchant: res.cleanMerchant,
          locationName: res.locationName,
          address: res.locationName,
          lat: res.lat,
          lng: res.lng,
          suburb: res.suburb,
          city: res.city,
          region: res.region,
          category: res.category,
          confidence: res.confidence,
          rationale: res.rationale,
          verifiedByAI: true,
          updatedAt: new Date().toISOString(),
        };
      }
      saveOverrides(overridesToSave);
    }

    return NextResponse.json({
      success: true,
      count: aiResults.length,
      results: aiResults,
      message: `AI Agent successfully analyzed and geocoded ${aiResults.length} merchant location(s).`,
    });
  } catch (error: any) {
    console.error("AI Calibrate API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute AI location calibration" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { calibrateLocationsWithAI } from "@/agents/geoAgent";
import { getEffectiveUserId } from "@/lib/session";

const OVERRIDES_FILE = path.join(process.cwd(), "merchant_overrides.json");

function saveOverrides(userId: string, newOverrides: Record<string, any>) {
  try {
    let existing: Record<string, any> = {};
    if (fs.existsSync(OVERRIDES_FILE)) {
      existing = JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf-8"));
    }
    const userOverrides = existing[userId] || {};
    const merged = {
      ...existing,
      [userId]: {
        ...userOverrides,
        ...newOverrides,
      },
    };
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return merged;
  } catch (e) {
    console.error("Error updating overrides file:", e);
    return { [userId]: newOverrides };
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { merchants, autoSave = true, manualOverride } = body;

    // Case 1: Manual Interactive Pin Calibration (Direct User Pin Calibration)
    if (manualOverride) {
      const key = manualOverride.merchant || manualOverride.cleanMerchant;
      if (!key) {
        return NextResponse.json({ error: "Merchant identifier required" }, { status: 400 });
      }

      const overrideData = {
        cleanMerchant: manualOverride.cleanMerchant || key,
        locationName: manualOverride.locationName || manualOverride.address || key,
        address: manualOverride.locationName || manualOverride.address || key,
        lat: Number(manualOverride.lat),
        lng: Number(manualOverride.lng),
        suburb: manualOverride.suburb || "Springs Central",
        city: manualOverride.city || "Springs",
        region: manualOverride.region || "Springs & Bakerton",
        category: manualOverride.category || "Auto & Repairs",
        confidence: 1.0,
        rationale: "User verified and calibrated exact map marker location.",
        verifiedByUser: true,
        updatedAt: new Date().toISOString(),
      };

      saveOverrides(userId, { [key]: overrideData });

      return NextResponse.json({
        success: true,
        override: overrideData,
        message: `Successfully calibrated location for "${overrideData.cleanMerchant}".`,
      });
    }

    // Case 2: Batch AI Agent Verification
    const listToProcess: string[] = Array.isArray(merchants)
      ? merchants
      : typeof merchants === "string" && merchants.trim()
      ? [merchants.trim()]
      : [];

    if (listToProcess.length === 0) {
      return NextResponse.json({ error: "No merchant descriptions provided" }, { status: 400 });
    }

    const aiResults = await calibrateLocationsWithAI(listToProcess, userId);

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
      saveOverrides(userId, overridesToSave);
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

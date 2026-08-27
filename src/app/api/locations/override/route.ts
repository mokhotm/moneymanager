import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getEffectiveUserId } from "@/lib/session";

const OVERRIDES_FILE = path.join(process.cwd(), "merchant_overrides.json");

function getOverrides(): Record<string, Record<string, any>> {
  try {
    if (fs.existsSync(OVERRIDES_FILE)) {
      return JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf-8"));
    }
    return {};
  } catch (e) {
    console.error("Error reading merchant_overrides.json:", e);
    return {};
  }
}

function saveOverrides(allOverrides: Record<string, Record<string, any>>) {
  try {
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(allOverrides, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing merchant_overrides.json:", e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allOverrides = getOverrides();
    const userOverrides = allOverrides[userId] || {};

    return NextResponse.json({
      success: true,
      overrides: userOverrides,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { merchant, cleanMerchant, locationName, address, lat, lng, suburb, city, region, category } = body;

    const key = merchant || cleanMerchant;
    if (!key) {
      return NextResponse.json({ error: "Merchant identifier is required" }, { status: 400 });
    }

    const allOverrides = getOverrides();
    const userOverrides = allOverrides[userId] || {};

    const overrideRecord = {
      cleanMerchant: cleanMerchant || key,
      locationName: locationName || address || key,
      address: address || locationName || key,
      lat: Number(lat),
      lng: Number(lng),
      suburb: suburb || "Springs Central",
      city: city || "Springs",
      region: region || "Springs & Bakerton",
      category: category || "Auto & Repairs",
      confidence: 1.0,
      verifiedByUser: true,
      updatedAt: new Date().toISOString(),
    };

    allOverrides[userId] = {
      ...userOverrides,
      [key]: overrideRecord,
    };

    saveOverrides(allOverrides);

    return NextResponse.json({
      success: true,
      override: overrideRecord,
      message: `Location successfully calibrated and saved for "${overrideRecord.cleanMerchant}".`,
    });
  } catch (error: any) {
    console.error("Error saving location override:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

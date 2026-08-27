import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getEffectiveUserId } from "@/lib/session";

const OVERRIDES_FILE = path.join(process.cwd(), "merchant_overrides.json");

function loadOverrides(): Record<string, any> {
  try {
    if (fs.existsSync(OVERRIDES_FILE)) {
      const data = fs.readFileSync(OVERRIDES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading merchant_overrides.json:", e);
  }
  return {};
}

function saveOverrides(overrides: Record<string, any>) {
  try {
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing merchant_overrides.json:", e);
  }
}

export async function GET(req: NextRequest) {
  const userId = await getEffectiveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const overrides = loadOverrides();
  return NextResponse.json({ overrides: overrides[userId] || {} });
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { merchant, cleanMerchant, locationName, address, lat, lng, suburb, city, region, category } = body;

    if (!merchant || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "Missing required location fields (merchant, lat, lng)" }, { status: 400 });
    }

    const key = cleanMerchant || merchant;
    const overrides = loadOverrides();
    if (!overrides[userId]) {
      overrides[userId] = {};
    }

    overrides[userId][key] = {
      cleanMerchant: key,
      locationName: locationName || address || merchant,
      address: address || "",
      lat: Number(lat),
      lng: Number(lng),
      suburb: suburb || "",
      city: city || "",
      region: region || "",
      category: category || "",
      updatedAt: new Date().toISOString(),
    };

    saveOverrides(overrides);

    return NextResponse.json({
      success: true,
      message: `Location for "${key}" saved successfully.`,
      override: overrides[userId][key],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save location override" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const merchant = searchParams.get("merchant");

    if (!merchant) {
      return NextResponse.json({ error: "Merchant parameter required" }, { status: 400 });
    }

    const overrides = loadOverrides();
    if (overrides[userId]) {
      delete overrides[userId][merchant];
    }
    saveOverrides(overrides);

    return NextResponse.json({ success: true, message: `Override for "${merchant}" removed.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to remove override" }, { status: 500 });
  }
}

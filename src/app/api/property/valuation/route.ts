import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkFeatureAccess } from "@/lib/subscriptionGate";
import crypto from "crypto";

const ENC_KEY = (process.env.ENCRYPTION_KEY ?? "money_manager_secret_key_32bytes!!").padEnd(32).slice(0, 32);
const IV = Buffer.alloc(16, 0);

function decrypt(enc: string): string {
  try {
    const d = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENC_KEY), IV);
    return d.update(enc, "hex", "utf8") + d.final("utf8");
  } catch { return ""; }
}

/**
 * POST /api/property/valuation
 * Body: { erfCode?: string, address?: string, assetId?: string }
 * On success, optionally updates Asset.currentValue + valueSource.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const featureCheck = await checkFeatureAccess(user.id, "windeedValuations");
  if (!featureCheck.allowed) {
    return NextResponse.json(
      {
        error: "FEATURE_LOCKED",
        requiredTier: "EXECUTIVE_ENTERPRISE",
        message: "Windeed & Lightstone Deed Valuations require Executive Enterprise subscription tier. Upgrade your plan in Profile settings.",
      },
      { status: 403 }
    );
  }

  const cfg = await prisma.propertyDataConfig.findUnique({ where: { userId: user.id } });
  if (!cfg?.lightstoneApiKeyEnc) {
    return NextResponse.json({ error: "Lightstone API key not configured. Add it in Settings → Property Data Services." }, { status: 424 });
  }

  const body = await req.json();
  const { erfCode, address, assetId } = body;
  if (!erfCode && !address) return NextResponse.json({ error: "erfCode or address is required" }, { status: 400 });

  const apiKey = decrypt(cfg.lightstoneApiKeyEnc);

  try {
    // Lightstone AVM endpoint
    const params = new URLSearchParams();
    if (erfCode) params.set("erfCode", erfCode);
    if (address) params.set("address", address);

    const res = await fetch(`https://api.lightstone.co.za/properties/v1/valuation?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });

    if (res.status === 401) {
      await prisma.propertyDataConfig.update({ where: { userId: user.id }, data: { lightstoneStatus: "INVALID_CREDENTIALS" } });
      return NextResponse.json({ error: "Lightstone API key is invalid. Please reconnect in Settings." }, { status: 401 });
    }
    if (!res.ok) return NextResponse.json({ error: `Lightstone error: ${res.status}` }, { status: 502 });

    const data = await res.json();
    const estimatedValue: number = data.avm ?? data.estimatedValue ?? data.value;

    // Optionally apply valuation to an Asset record
    if (assetId && estimatedValue) {
      const asset = await prisma.asset.findFirst({ where: { id: assetId, userId: user.id } });
      if (asset) {
        await prisma.asset.update({
          where: { id: assetId },
          data: {
            currentValue: estimatedValue,
            valueSource: `Lightstone AVM — ${new Date().toISOString().slice(0, 10)}`,
            valueConfidence: "ESTIMATED",
          },
        });
      }
    }

    return NextResponse.json({ estimatedValue, rawResponse: data, appliedToAsset: !!assetId });
  } catch (err: any) {
    if (err?.name === "TimeoutError") return NextResponse.json({ error: "Lightstone request timed out" }, { status: 504 });
    throw err;
  }
}

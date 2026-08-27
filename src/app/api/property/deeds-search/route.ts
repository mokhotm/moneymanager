import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkFeatureAccess } from "@/lib/subscriptionGate";
import crypto from "crypto";

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }

  const trimmed = raw.trim();
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const asBase64 = Buffer.from(trimmed, "base64");
  if (asBase64.length === 32 && asBase64.toString("base64").replace(/=+$/, "") === trimmed.replace(/=+$/, "")) {
    return asBase64;
  }

  const asUtf8 = Buffer.from(raw, "utf8");
  if (asUtf8.length === 32) {
    return asUtf8;
  }

  throw new Error("ENCRYPTION_KEY must be 32-byte UTF-8, 64-char hex, or base64-encoded 32 bytes");
}

function decrypt(enc: string): string {
  if (!enc.includes(":")) {
    throw new Error("Unsupported legacy ciphertext format");
  }

  const [ivHex, dataHex] = enc.split(":");
  if (!ivHex || !dataHex) {
    throw new Error("Invalid ciphertext payload");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

export interface DeedsResult {
  erfNumber: string;
  township: string;
  extent: string;
  titleDeedNumber: string;
  registeredOwner: string;
  idNumber: string;
  purchasePrice: number | null;
  transferDate: string | null;
  bonds: Array<{ bondholder: string; amount: number; registrationDate: string }>;
  municipalValue: number | null;
  address: string;
  source: "WINDEED";
}

/**
 * POST /api/property/deeds-search
 * Body: { query: string, searchType: "ID_NUMBER" | "ERF_NUMBER" | "ADDRESS", province?: string }
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
  if (!cfg?.windeedUsername || !cfg?.windeedPasswordEnc) {
    return NextResponse.json({ error: "Windeed credentials not configured. Add them in Settings → Property Data Services." }, { status: 424 });
  }
  if (cfg.windeedStatus !== "ACTIVE") {
    return NextResponse.json({ error: "Windeed credentials are invalid. Please reconnect in Settings." }, { status: 424 });
  }

  const body = await req.json();
  const { query, searchType = "ADDRESS", province = "GP" } = body;
  if (!query?.trim()) return NextResponse.json({ error: "query is required" }, { status: 400 });

  let password = "";
  try {
    password = decrypt(cfg.windeedPasswordEnc);
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Failed to decrypt Windeed credentials" }, { status: 424 });
  }

  try {
    // Step 1: authenticate
    const authRes = await fetch("https://www.windeed.co.za/WindeedWS/api/Auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cfg.windeedUsername, password }),
      signal: AbortSignal.timeout(15000),
    });

    if (!authRes.ok) {
      await prisma.propertyDataConfig.update({ where: { userId: user.id }, data: { windeedStatus: "INVALID_CREDENTIALS" } });
      return NextResponse.json({ error: "Windeed authentication failed. Please reconnect in Settings." }, { status: 401 });
    }

    const { token } = await authRes.json();

    // Step 2: search deeds
    const searchEndpoint = {
      ID_NUMBER:  "https://www.windeed.co.za/WindeedWS/api/Deeds/SearchByOwner",
      ERF_NUMBER: "https://www.windeed.co.za/WindeedWS/api/Deeds/SearchByErf",
      ADDRESS:    "https://www.windeed.co.za/WindeedWS/api/Deeds/SearchByAddress",
    }[searchType as string];

    if (!searchEndpoint) {
      return NextResponse.json({ error: "Invalid search type provided" }, { status: 400 });
    }

    const searchRes = await fetch(searchEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: query.trim(), province }),
      signal: AbortSignal.timeout(20000),
    });

    if (!searchRes.ok) {
      return NextResponse.json({ error: `Windeed search failed: ${searchRes.status}` }, { status: 502 });
    }

    const results = await searchRes.json();
    return NextResponse.json({ results, source: "WINDEED" });
  } catch (err: any) {
    if (err?.name === "TimeoutError") return NextResponse.json({ error: "Windeed request timed out" }, { status: 504 });
    throw err;
  }
}

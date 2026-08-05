import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import crypto from "crypto";

const ENC_KEY = (process.env.ENCRYPTION_KEY ?? "money_manager_secret_key_32bytes!!").padEnd(32).slice(0, 32);
const IV = Buffer.alloc(16, 0);

function encrypt(plain: string): string {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENC_KEY), IV);
  return cipher.update(plain, "utf8", "hex") + cipher.final("hex");
}

function decrypt(enc: string): string {
  try {
    const d = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENC_KEY), IV);
    return d.update(enc, "hex", "utf8") + d.final("utf8");
  } catch { return ""; }
}

function mask(s: string | null): string {
  if (!s) return "";
  const plain = decrypt(s);
  return plain.length > 4 ? "••••" + plain.slice(-4) : "••••";
}

/** GET /api/settings/property-data — return config with masked credentials */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cfg = await prisma.propertyDataConfig.findUnique({ where: { userId: user.id } });
  if (!cfg) return NextResponse.json({ windeedStatus: "UNVERIFIED", lightstoneStatus: "UNVERIFIED" });

  return NextResponse.json({
    windeedUsername: cfg.windeedUsername ?? "",
    windeedPasswordMasked: mask(cfg.windeedPasswordEnc),
    windeedStatus: cfg.windeedStatus,
    lightstoneKeyMasked: mask(cfg.lightstoneApiKeyEnc),
    lightstoneStatus: cfg.lightstoneStatus,
  });
}

/** POST /api/settings/property-data — save/update credentials and test them */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { provider, username, password, apiKey } = body;

  if (provider === "WINDEED") {
    if (!username || !password) return NextResponse.json({ error: "username and password required" }, { status: 400 });

    const status = await testWindeed(username, password);
    await prisma.propertyDataConfig.upsert({
      where: { userId: user.id },
      update: { windeedUsername: username, windeedPasswordEnc: encrypt(password), windeedStatus: status },
      create: { userId: user.id, windeedUsername: username, windeedPasswordEnc: encrypt(password), windeedStatus: status },
    });
    return NextResponse.json({ status });
  }

  if (provider === "LIGHTSTONE") {
    if (!apiKey) return NextResponse.json({ error: "apiKey required" }, { status: 400 });

    const status = await testLightstone(apiKey);
    await prisma.propertyDataConfig.upsert({
      where: { userId: user.id },
      update: { lightstoneApiKeyEnc: encrypt(apiKey), lightstoneStatus: status },
      create: { userId: user.id, lightstoneApiKeyEnc: encrypt(apiKey), lightstoneStatus: status },
    });
    return NextResponse.json({ status });
  }

  return NextResponse.json({ error: "provider must be WINDEED or LIGHTSTONE" }, { status: 400 });
}

/** DELETE /api/settings/property-data?provider=WINDEED|LIGHTSTONE */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");

  if (provider === "WINDEED") {
    await prisma.propertyDataConfig.upsert({
      where: { userId: user.id },
      update: { windeedUsername: null, windeedPasswordEnc: null, windeedStatus: "UNVERIFIED" },
      create: { userId: user.id, windeedStatus: "UNVERIFIED" },
    });
  } else if (provider === "LIGHTSTONE") {
    await prisma.propertyDataConfig.upsert({
      where: { userId: user.id },
      update: { lightstoneApiKeyEnc: null, lightstoneStatus: "UNVERIFIED" },
      create: { userId: user.id, lightstoneStatus: "UNVERIFIED" },
    });
  }
  return NextResponse.json({ ok: true });
}

// ─── Connection testers ───────────────────────────────────────────────────────

async function testWindeed(username: string, password: string): Promise<string> {
  try {
    // Windeed token endpoint — POST credentials, receive Bearer token
    const res = await fetch("https://www.windeed.co.za/WindeedWS/api/Auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok ? "ACTIVE" : "INVALID_CREDENTIALS";
  } catch {
    // Network unreachable in dev — treat as unverified, not invalid
    return "UNVERIFIED";
  }
}

async function testLightstone(apiKey: string): Promise<string> {
  try {
    const res = await fetch("https://api.lightstone.co.za/properties/v1/ping", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    return res.ok ? "ACTIVE" : "INVALID_CREDENTIALS";
  } catch {
    return "UNVERIFIED";
  }
}

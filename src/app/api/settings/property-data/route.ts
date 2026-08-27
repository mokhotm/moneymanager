import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
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

function encrypt(plain: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
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
  const data = Buffer.from(dataHex, "hex");
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Failed to decrypt property-data secret");
  }
}

function mask(s: string | null): string {
  if (!s) return "";
  const plain = decrypt(s);
  return plain.length > 4 ? "••••" + plain.slice(-4) : "••••";
}

/** GET /api/settings/property-data — return config with masked credentials */
export async function GET(req: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error("GET /api/settings/property-data error:", error);
    return NextResponse.json({ error: error.message ?? "Failed to load property data settings" }, { status: 500 });
  }
}

/** POST /api/settings/property-data — save/update credentials and test them */
export async function POST(req: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error("POST /api/settings/property-data error:", error);
    return NextResponse.json({ error: error.message ?? "Failed to save property data settings" }, { status: 500 });
  }
}

/** DELETE /api/settings/property-data?provider=WINDEED|LIGHTSTONE */
export async function DELETE(req: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error("DELETE /api/settings/property-data error:", error);
    return NextResponse.json({ error: error.message ?? "Failed to delete property data settings" }, { status: 500 });
  }
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
    return "CONNECTION_ERROR";
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
    return "CONNECTION_ERROR";
  }
}

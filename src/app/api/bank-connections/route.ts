import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
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

function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decryptToken(encrypted: string): string {
  const key = getEncryptionKey();
  const [ivHex, dataHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

/** GET /api/bank-connections — list all connections for accounts owned by the current user */
export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const connections = await prisma.bankConnection.findMany({
      where: { account: { userId } },
      include: { account: { select: { id: true, name: true, institution: true, type: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Never expose the access token in list response
    return NextResponse.json(connections.map(({ accessTokenEncrypted: _, ...c }) => c));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST /api/bank-connections — add a new consent-based connection */
export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { accountId, providerType, providerName, accessToken, consentExpiresAt, syncFrequency } = body;

    if (!accountId || !providerType || !providerName || !accessToken) {
      return NextResponse.json({ error: "accountId, providerType, providerName, and accessToken are required" }, { status: 400 });
    }

    // Verify the account belongs to the requesting user
    const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const connection = await prisma.bankConnection.create({
      data: {
        accountId,
        providerType,
        providerName,
        accessTokenEncrypted: encryptToken(accessToken),
        consentStatus: "ACTIVE",
        consentGrantedAt: new Date(),
        consentExpiresAt: consentExpiresAt ? new Date(consentExpiresAt) : null,
        syncFrequency: syncFrequency ?? "ON_DEMAND",
      },
      include: { account: { select: { id: true, name: true, institution: true } } },
    });

    const { accessTokenEncrypted: _, ...safe } = connection;
    return NextResponse.json(safe, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

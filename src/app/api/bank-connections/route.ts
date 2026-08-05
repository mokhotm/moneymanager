import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "fallback-dev-key-32-bytes-padding";

function encryptToken(token: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decryptToken(encrypted: string): string {
  const [ivHex, dataHex] = encrypted.split(":");
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
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

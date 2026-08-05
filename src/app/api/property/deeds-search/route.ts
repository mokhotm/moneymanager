import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import crypto from "crypto";

const ENC_KEY = (process.env.ENCRYPTION_KEY ?? "money_manager_secret_key_32bytes!!").padEnd(32).slice(0, 32);
const IV = Buffer.alloc(16, 0);

function decrypt(enc: string): string {
  try {
    const d = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENC_KEY), IV);
    return d.update(enc, "hex", "utf8") + d.final("utf8");
  } catch { return ""; }
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

  const cfg = await prisma.propertyDataConfig.findUnique({ where: { userId: user.id } });
  if (!cfg?.windeedUsername || !cfg?.windeedPasswordEnc) {
    return NextResponse.json({ error: "Windeed credentials not configured. Add them in Settings → Property Data Services." }, { status: 424 });
  }
  if (cfg.windeedStatus !== "ACTIVE" && cfg.windeedStatus !== "UNVERIFIED") {
    return NextResponse.json({ error: "Windeed credentials are invalid. Please reconnect in Settings." }, { status: 424 });
  }

  const body = await req.json();
  const { query, searchType = "ADDRESS", province = "GP" } = body;
  if (!query?.trim()) return NextResponse.json({ error: "query is required" }, { status: 400 });

  const password = decrypt(cfg.windeedPasswordEnc);

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

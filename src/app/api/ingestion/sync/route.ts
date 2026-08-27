import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/session";
import { syncAggregatorAccount } from "@/services/openBankingAggregator";
import { prisma } from "@/lib/prisma";

const ALLOWED_PROVIDERS = new Set(["STITCH", "MONO", "PLAID", "SALT_EDGE"]);

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountId, provider } = body;

    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }
    if (!provider || typeof provider !== "string" || !ALLOWED_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: "provider must be one of STITCH, MONO, PLAID, SALT_EDGE" }, { status: 400 });
    }

    const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const result = await syncAggregatorAccount(accountId, provider as any);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Ingestion sync error:", error);
    return NextResponse.json({ error: error.message || "Failed to trigger aggregator sync" }, { status: 500 });
  }
}

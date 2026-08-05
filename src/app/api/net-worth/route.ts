import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({
        totalAssets: 0,
        totalDebts: 0,
        netWorth: 0,
        assetTotal: 0,
        bankAssetsTotal: 0,
        assets: [],
        debts: [],
        snapshots: [],
      });
    }

    const [assets, debts, accounts, snapshots] = await Promise.all([
      prisma.asset.findMany({ where: { userId } }),
      prisma.debt.findMany({
        where: {
          status: "ACTIVE",
          account: { userId },
        },
        include: { account: true },
      }),
      prisma.account.findMany({
        where: {
          userId,
          isDebt: false,
        },
      }),
      prisma.netWorthSnapshot.findMany({ orderBy: { snapshotDate: "asc" } }),
    ]);

    const assetTotal = assets.reduce((s, a) => s + Number(a.currentValue), 0);
    const bankAssetsTotal = accounts.reduce((s, a) => s + Math.max(0, Number(a.openingBalance)), 0);
    const totalAssets = assetTotal + bankAssetsTotal;

    const totalDebts = debts.reduce((s, d) => s + Number(d.currentBalance), 0);
    const netWorth = totalAssets - totalDebts;

    return NextResponse.json({
      totalAssets,
      totalDebts,
      netWorth,
      assetTotal,
      bankAssetsTotal,
      assets,
      debts,
      snapshots,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { evaluatePortfolioAnalytics } from "@/engine/portfolioAnalytics";
import { AssetType } from "@prisma/client";
import { buildUserFlowWhere } from "@/lib/moneyFlowRefs";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [assets, accounts, debts] = await Promise.all([
      prisma.asset.findMany({ where: { userId } }),
      prisma.account.findMany({ where: { userId } }),
      prisma.debt.findMany({ where: { account: { userId } } }),
    ]);

    const debtById = new Map(debts.map((d) => [d.id, d]));
    const currentPortfolioValue = assets.reduce((sum, a) => sum + Number(a.currentValue), 0);

    const userFlowWhere = buildUserFlowWhere(accounts, debts);
    const investmentFlows = userFlowWhere.OR.length === 0
      ? []
      : await prisma.moneyFlow.findMany({
          where: {
            AND: [
              userFlowWhere,
              {
                flowType: {
                  in: ["INVESTMENT", "GOAL_CONTRIBUTION", "ASSET_PURCHASE", "ASSET_SALE", "DIVIDEND", "INTEREST"],
                },
              },
            ],
          },
          orderBy: { createdAt: "asc" },
        });

    const cashflows = investmentFlows.map((f) => {
      const isOutflow = f.flowType === "INVESTMENT" || f.flowType === "GOAL_CONTRIBUTION" || f.flowType === "ASSET_PURCHASE";
      return {
        date: f.createdAt,
        amount: isOutflow ? -Math.abs(Number(f.amount)) : Math.abs(Number(f.amount)),
      };
    });

    if (currentPortfolioValue > 0) {
      cashflows.push({ date: new Date(), amount: currentPortfolioValue });
    }

    const allocationByClass = new Map<string, number>();
    const classForType = (type: AssetType): string => {
      if (type === AssetType.INVESTMENT_PORTFOLIO || type === AssetType.RETIREMENT_FUND) return "Equities & Funds";
      if (type === AssetType.PROPERTY) return "Property";
      if (type === AssetType.CASH) return "Cash";
      if (type === AssetType.VEHICLE) return "Vehicles";
      return "Other Assets";
    };

    for (const asset of assets) {
      const key = classForType(asset.type);
      allocationByClass.set(key, (allocationByClass.get(key) ?? 0) + Number(asset.currentValue));
    }

    const strategicTargets: Record<string, number> = {
      "Equities & Funds": 45,
      Property: 30,
      Cash: 15,
      Vehicles: 5,
      "Other Assets": 5,
    };

    const classes = Array.from(allocationByClass.entries()).filter(([, value]) => value > 0);
    const targetDenominator = classes.reduce((sum, [cls]) => sum + (strategicTargets[cls] ?? 0), 0);
    const targetAllocations = classes.map(([assetClass, actualValue]) => ({
      assetClass,
      targetWeightPct: targetDenominator > 0
        ? Number((((strategicTargets[assetClass] ?? 0) / targetDenominator) * 100).toFixed(2))
        : Number((100 / Math.max(classes.length, 1)).toFixed(2)),
      actualValue,
    }));

    const hasInflowAndOutflow = cashflows.some((c) => c.amount > 0) && cashflows.some((c) => c.amount < 0);
    const portfolioAnalytics = hasInflowAndOutflow && targetAllocations.length > 0
      ? evaluatePortfolioAnalytics(cashflows, targetAllocations)
      : {
          xirrAnnualizedPct: 0,
          totalInvested: Math.abs(cashflows.filter((c) => c.amount < 0).reduce((sum, c) => sum + c.amount, 0)),
          currentPortfolioValue,
          netGainLoss: currentPortfolioValue,
          roiPct: 0,
          assetAllocationDrift: [],
        };

    const propertyAsset = assets
      .filter((a) => a.type === AssetType.PROPERTY)
      .sort((a, b) => Number(b.currentValue) - Number(a.currentValue))[0];
    const propertyDebt = propertyAsset?.linkedDebtId ? debtById.get(propertyAsset.linkedDebtId) : null;
    const propertyValue = propertyAsset ? Number(propertyAsset.currentValue) : 0;
    const propertyDebtBal = propertyDebt ? Number(propertyDebt.currentBalance) : 0;
    const propertyValuation = propertyAsset
      ? {
          propertyAddress: propertyAsset.name,
          estimatedMarketValue: propertyValue,
          lowConfidenceBand: Number((propertyValue * 0.94).toFixed(2)),
          highConfidenceBand: Number((propertyValue * 1.06).toFixed(2)),
          netEquity: Number((propertyValue - propertyDebtBal).toFixed(2)),
          loanToValuePct: propertyValue > 0 ? Number(((propertyDebtBal / propertyValue) * 100).toFixed(2)) : 0,
          capitalAppreciationTotal: 0,
          capitalAppreciationAnnualPct: 0,
          valuationSource: propertyAsset.valueSource || "Asset Register",
          lastUpdated: propertyAsset.updatedAt.toISOString().slice(0, 10),
        }
      : null;

    const vehicleAsset = assets
      .filter((a) => a.type === AssetType.VEHICLE)
      .sort((a, b) => Number(b.currentValue) - Number(a.currentValue))[0];
    const vehicleDebt = vehicleAsset?.linkedDebtId ? debtById.get(vehicleAsset.linkedDebtId) : null;
    const vehicleValue = vehicleAsset ? Number(vehicleAsset.currentValue) : 0;
    const vehicleDebtBal = vehicleDebt ? Number(vehicleDebt.currentBalance) : 0;
    const vehicleValuation = vehicleAsset
      ? {
          makeModel: vehicleAsset.name,
          estimatedTradeValue: Number((vehicleValue * 0.88).toFixed(2)),
          estimatedRetailValue: vehicleValue,
          netEquity: Number(((vehicleValue * 0.88) - vehicleDebtBal).toFixed(2)),
          depreciationTotal: 0,
          depreciationPct: 0,
          loanToValuePct: vehicleValue > 0 ? Number(((vehicleDebtBal / vehicleValue) * 100).toFixed(2)) : 0,
          valuationSource: vehicleAsset.valueSource || "Asset Register",
        }
      : null;

    return NextResponse.json({
      success: true,
      portfolioAnalytics,
      propertyValuation,
      vehicleValuation,
    });
  } catch (error: any) {
    console.error("Portfolio Analytics API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load portfolio analytics" }, { status: 500 });
  }
}

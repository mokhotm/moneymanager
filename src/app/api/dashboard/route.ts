import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { currentMonthKey } from "@/lib/formatters";
import { getEffectiveUserId } from "@/lib/session";
import { getActiveCycleMonthKey } from "@/lib/budgetCycle";
import { resolveSpendingLocations } from "@/lib/geoResolver";
import { getUserEntityScope, isRecommendationOwnedByUser } from "@/lib/userEntityScope";
import { buildUserFlowWhere } from "@/lib/moneyFlowRefs";

/**
 * GET /api/dashboard
 * Returns aggregated stats for the dashboard (scoped to current authenticated user):
 * - Total debt / total assets / net worth
 * - Current month Net Margin (recurring vs actual)
 * - Urgency-flagged debts
 * - Debts by clearance order
 * - Scoped pending recommendation count & goals progress
 * - Dynamic financial health score
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Log in to view dashboard." },
        { status: 401 }
      );
    }

    // Fetch all domain data & snapshots in parallel with connection resilience
    const [cycleMonth, debts, accounts, incomes, snapshots, dbAssets, goals, scope, allPendingRecs] = await Promise.all([
      getActiveCycleMonthKey(userId).catch(() => currentMonthKey()),
      prisma.debt.findMany({
        where: {
          status: "ACTIVE",
          account: { userId },
        },
        include: { account: { select: { name: true, institution: true, type: true } } },
        orderBy: [{ urgencyFlag: "asc" }, { priorityOverride: "asc" }],
      }).catch((err) => {
        console.warn("prisma.debt.findMany connection warning:", err?.message || err);
        return [];
      }),
      prisma.account.findMany({
        where: { userId },
        select: { id: true, name: true, type: true, openingBalance: true, isDebt: true },
      }).catch((err) => {
        console.warn("prisma.account.findMany connection warning:", err?.message || err);
        return [];
      }),
      prisma.income.findMany({
        where: { userId },
        select: { recurringAmount: true },
      }).catch((err) => {
        console.warn("prisma.income.findMany connection warning:", err?.message || err);
        return [];
      }),
      prisma.netWorthSnapshot.findMany({
        orderBy: { snapshotDate: "asc" },
        take: 12,
      }).catch((err) => {
        console.warn("prisma.netWorthSnapshot.findMany connection warning:", err?.message || err);
        return [];
      }),
      prisma.asset.findMany({ where: { userId } }).catch((err) => {
        console.warn("prisma.asset.findMany connection warning:", err?.message || err);
        return [];
      }),
      prisma.goal.findMany({
        where: { userId, status: "ACTIVE" },
        orderBy: { priority: "asc" },
      }).catch((err) => {
        console.warn("prisma.goal.findMany connection warning:", err?.message || err);
        return [];
      }),
      getUserEntityScope(userId).catch(() => null),
      prisma.agentRecommendation.findMany({
        where: { status: "PENDING" },
      }).catch((err) => {
        console.warn("prisma.agentRecommendation.findMany connection warning:", err?.message || err);
        return [];
      }),
    ]);

    // Compute user scoped pending recommendations
    const userPendingRecs = scope && scope.allEntityIds.length > 0
      ? allPendingRecs.filter((r) => isRecommendationOwnedByUser(r.payload, scope))
      : [];
    const pendingRecsCount = userPendingRecs.length;

    // Goals calculation
    const goalsCount = goals.length;
    const topGoal = goals[0] || null;
    const topGoalName = topGoal ? topGoal.name : "No active goals created yet";
    const topGoalProgress = topGoal && topGoal.targetAmount && Number(topGoal.targetAmount) > 0
      ? Math.min(100, Math.round((Number(topGoal.currentAmount) / Number(topGoal.targetAmount)) * 100))
      : 0;

    const userFlowWhere = buildUserFlowWhere(accounts, debts);

    const flows = userFlowWhere.OR.length === 0
      ? []
      : await prisma.moneyFlow.findMany({
          where: {
            ...userFlowWhere,
          },
          orderBy: { createdAt: "desc" },
        }).catch((err) => {
          console.warn("prisma.moneyFlow.findMany connection warning:", err?.message || err);
          return [];
        });

    // Budget items query uses resolved cycle month with latest-month fallback
    let budgetItems = await prisma.budgetLineItem.findMany({
      where: { userId, month: cycleMonth },
      select: { category: true, amount: true, month: true },
    }).catch((err) => {
      console.warn("prisma.budgetLineItem.findMany connection warning:", err?.message || err);
      return [];
    });

    if (budgetItems.length === 0) {
      const allUserItems = await prisma.budgetLineItem.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { category: true, amount: true, month: true },
      }).catch(() => []);

      if (allUserItems.length > 0) {
        const latestMonth = allUserItems[0].month;
        budgetItems = allUserItems.filter((i) => i.month === latestMonth);
      }
    }

    const totalDebt = debts.reduce((sum, d) => sum + Number(d.currentBalance), 0);

    // Compute total assets incorporating unlinked physical assets without double-counting liquid bank accounts
    const unlinkedAssets = dbAssets.filter((a) => !a.accountId && a.type !== "CASH");
    const physicalAssetTotal = unlinkedAssets.reduce((sum, a) => sum + Number(a.currentValue), 0);
    const bankAssetsTotal = accounts.filter((a) => !a.isDebt).reduce((sum, a) => sum + Math.max(0, Number(a.openingBalance)), 0);
    const totalAssets = physicalAssetTotal + bankAssetsTotal;
    const effectiveTotalDebt = totalDebt;
    const netWorth = totalAssets - effectiveTotalDebt;

    const hasUserData = accounts.length > 0 || debts.length > 0 || incomes.length > 0 || dbAssets.length > 0 || (budgetItems && budgetItems.length > 0);

    // Income & budget margins
    const totalRecurringIncome = incomes.reduce((sum, i) => sum + Number(i.recurringAmount), 0);
    const recurringItems = budgetItems.filter((i) => i.category !== "ONE_OFF_UNEXPECTED");
    const oneOffItems = budgetItems.filter((i) => i.category === "ONE_OFF_UNEXPECTED");
    const totalRecurringExpenses = recurringItems.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalOneOff = oneOffItems.reduce((sum, i) => sum + Number(i.amount), 0);
    const netMarginRecurring = totalRecurringIncome - totalRecurringExpenses;
    const netMarginActual = netMarginRecurring - totalOneOff;

    // Category Spending Breakdown
    const categoryTotals: Record<string, number> = {
      FIXED_HOUSEHOLD_OBLIGATIONS: 0,
      DEBT_ACCELERATION_PLAN: 0,
      GOAL_CONTRIBUTIONS: 0,
      FAMILY_AND_DISCRETIONARY: 0,
      ONE_OFF_UNEXPECTED: 0,
    };

    if (budgetItems && budgetItems.length > 0) {
      budgetItems.forEach((item) => {
        const cat = String(item.category);
        const val = Number(item.amount) || 0;
        if (categoryTotals[cat] !== undefined) {
          categoryTotals[cat] += val;
        }
      });
    }

    const totalSpending = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    const CATEGORY_COLORS: Record<string, string> = {
      FIXED_HOUSEHOLD_OBLIGATIONS: "#3b82f6", // Blue
      DEBT_ACCELERATION_PLAN: "#f43f5e",     // Red
      GOAL_CONTRIBUTIONS: "#10b981",         // Green
      FAMILY_AND_DISCRETIONARY: "#f59e0b",   // Amber Gold
      ONE_OFF_UNEXPECTED: "#8b5cf6",         // Purple
    };

    const CATEGORY_LABELS: Record<string, string> = {
      FIXED_HOUSEHOLD_OBLIGATIONS: "Fixed Household",
      DEBT_ACCELERATION_PLAN: "Debt Acceleration",
      GOAL_CONTRIBUTIONS: "Goal Contributions",
      FAMILY_AND_DISCRETIONARY: "Discretionary & Family",
      ONE_OFF_UNEXPECTED: "One-off Unexpected",
    };

    const spendingByCategory = Object.entries(categoryTotals).map(([catKey, amount]) => ({
      key: catKey,
      name: CATEGORY_LABELS[catKey] || catKey,
      amount,
      percentage: totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
      color: CATEGORY_COLORS[catKey] || "#64748b",
    }));

    // Net worth history from persisted snapshots only (no synthetic interpolation)
    const netWorthHistory = snapshots
      .slice(-6)
      .map((snap) => {
        const snapDate = new Date(snap.snapshotDate);
        return {
          month: snapDate.toLocaleDateString("en-ZA", { month: "short", year: "numeric" }),
          netWorth: Number(snap.netWorth),
          totalAssets: Number(snap.totalAssets),
          totalDebts: Number(snap.totalDebts),
        };
      });

    // Cash flow history from recorded money flows only (no modeled values)
    const monthlyFlowMap = new Map<string, { income: number; expenses: number; debtService: number }>();
    for (const flow of flows) {
      const amount = Number(flow.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const date = flow.createdAt instanceof Date ? flow.createdAt : new Date(flow.createdAt);
      const key = date.toISOString().slice(0, 7);
      const bucket = monthlyFlowMap.get(key) || { income: 0, expenses: 0, debtService: 0 };

      if (flow.flowType === "INCOME") {
        bucket.income += amount;
      } else {
        bucket.expenses += amount;
        if (flow.flowType === "DEBT_PAYMENT") {
          bucket.debtService += amount;
        }
      }

      monthlyFlowMap.set(key, bucket);
    }

    const cashFlowHistory = [...monthlyFlowMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([monthKey, bucket]) => {
        const [yy, mm] = monthKey.split("-");
        const monthDate = new Date(Date.UTC(Number(yy), Number(mm) - 1, 1));
        return {
          month: monthDate.toLocaleDateString("en-ZA", { month: "short" }),
          income: bucket.income,
          expenses: bucket.expenses,
          debtService: bucket.debtService,
          netSurplus: bucket.income - bucket.expenses,
        };
      });

    // 30-Day Daily Spending Intensity Heatmap
    const spendingHeatmap = [];
    const today = new Date();
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = dayLabels[d.getDay()];

      // Aggregate actual flows on this date
      const dateFlows = flows.filter((f) => f.createdAt.toISOString().split("T")[0] === dateStr);
      const amount = dateFlows.reduce((sum, f) => sum + Number(f.amount), 0);
      const count = dateFlows.length;

      let intensity = 0;
      if (amount > 10000) intensity = 4;
      else if (amount > 2000) intensity = 3;
      else if (amount > 800) intensity = 2;
      else if (amount > 0) intensity = 1;

      spendingHeatmap.push({
        date: dateStr,
        dayName,
        amount,
        count,
        intensity,
      });
    }

    // Geotagged spending locations & radar with user-calibrated overrides
    let userOverrides: Record<string, any> = {};
    try {
      const overridesPath = path.join(process.cwd(), "merchant_overrides.json");
      if (fs.existsSync(overridesPath)) {
        const allOverrides = JSON.parse(fs.readFileSync(overridesPath, "utf-8"));
        userOverrides = allOverrides[userId] || {};
      }
    } catch (e) {
      console.warn("Could not load merchant overrides:", e);
    }

    const geoIntelligence = resolveSpendingLocations(flows, userOverrides);
    const spendingLocations = geoIntelligence.physicalLocations;

    // Debt Breakdown Progress
    const debtDistribution = debts.map((d) => {
      const bal = Number(d.currentBalance);
      const min = Number(d.minimumPayment);
      const original = d.originalPrincipal ? Number(d.originalPrincipal) : bal * 1.3;
      const paid = Math.max(0, original - bal);
      const progress = Math.min(100, Math.round((paid / original) * 100));

      return {
        id: d.id,
        debtName: d.account.name,
        institution: d.account.institution,
        currentBalance: bal,
        minimumPayment: min,
        annualInterestRate: Number(d.annualInterestRate || 0) * 100,
        progress,
        urgencyFlag: d.urgencyFlag,
      };
    });

    // Dynamic Financial Health Score Calculation
    let financialHealth;
    if (!hasUserData) {
      financialHealth = {
        score: 0,
        tier: "ROOKIE",
        tierLabel: "New Account (Unranked)",
        factors: [
          { name: "Account Setup", status: "ATTENTION", detail: "Awaiting statement or account creation" },
          { name: "Emergency Buffer", status: "ATTENTION", detail: "R 0,00 emergency fund" },
          { name: "Recurring Net Surplus", status: "ATTENTION", detail: "R 0,00 / month" },
          { name: "Debt-to-Asset Ratio", status: "ATTENTION", detail: "0% leverage ratio" },
        ],
      };
    } else {
      let baseScore = 500;
      if (netWorth > 0) baseScore += 150;
      if (netMarginRecurring > 0) baseScore += 100;
      if (effectiveTotalDebt === 0) baseScore += 100;
      else if (totalAssets > 0 && effectiveTotalDebt / totalAssets < 0.5) baseScore += 50;

      const healthScore = Math.min(950, Math.max(300, baseScore));
      const tierLabel = healthScore >= 800 ? "Elite Wealth Strategist" : healthScore >= 700 ? "Expert Wealth Strategist" : healthScore >= 600 ? "Competitor" : "Enthusiast";

      financialHealth = {
        score: healthScore,
        tier: healthScore >= 800 ? "ELITE" : healthScore >= 700 ? "EXPERT" : "ENTHUSIAST",
        tierLabel,
        factors: [
          { name: "Debt Paydown Velocity", status: effectiveTotalDebt > 0 ? "EXCELLENT" : "STRONG", detail: effectiveTotalDebt > 0 ? "Active snowball plan" : "Zero debt liability" },
          { name: "Emergency Buffer", status: bankAssetsTotal > 15000 ? "STRONG" : "MODERATE", detail: `${bankAssetsTotal > 0 ? "Funded" : "0%"} buffer` },
          { name: "Recurring Net Surplus", status: netMarginRecurring > 0 ? "STRONG" : "ATTENTION", detail: `R ${Math.round(netMarginRecurring).toLocaleString("en-ZA")},00 monthly surplus` },
          { name: "Debt-to-Asset Ratio", status: totalAssets > 0 && (effectiveTotalDebt / totalAssets) < 0.8 ? "EXCELLENT" : "ATTENTION", detail: `${totalAssets > 0 ? Math.round((effectiveTotalDebt / totalAssets) * 100) : 0}% leverage ratio` },
        ],
      };
    }

    // Urgency-flagged debts
    const urgentDebts = debts.filter((d) => d.urgencyFlag !== "NONE");
    const unknownDebts = debts.filter((d) => d.balanceConfidence === "UNKNOWN");
    const confirmedDebts = debts.filter((d) => d.balanceConfidence === "CONFIRMED");

    return NextResponse.json({
      totalDebt: effectiveTotalDebt,
      totalAssets,
      netWorth,
      totalRecurringIncome,
      totalRecurringExpenses,
      totalOneOff,
      netMarginRecurring,
      netMarginActual,
      hasOneOffExpenses: oneOffItems.length > 0,
      urgentDebts,
      debtCount: debts.length,
      unknownDebtCount: unknownDebts.length,
      confirmedDebtCount: confirmedDebts.length,
      pendingRecsCount,
      goalsCount,
      topGoalName,
      topGoalProgress,
      currentMonth: currentMonthKey(),
      // Advanced Analytics Payload
      spendingByCategory,
      netWorthHistory,
      cashFlowHistory,
      spendingHeatmap,
      spendingLocations,
      digitalServices: geoIntelligence.digitalServices,
      spendingIntelligence: geoIntelligence,
      debtDistribution,
      financialHealth,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to fetch dashboard data", detail: message }, { status: 500 });
  }
}

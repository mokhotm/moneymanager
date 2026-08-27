import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { createPayoffPlan, computePositionAndDrift } from "@/engine/payoffPlan";
import { DebtInput } from "@/engine/snowball";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const strategy = (searchParams.get("strategy") as "SNOWBALL" | "AVALANCHE") || "SNOWBALL";

    // Load user's real debts & income from DB (mokhotm data)
    const [debts, incomes] = await Promise.all([
      prisma.debt.findMany({
        where: {
          status: "ACTIVE",
          account: { userId },
        },
        include: { account: true },
        orderBy: [{ priorityOverride: "asc" }, { createdAt: "asc" }],
      }),
      prisma.income.findMany({ where: { userId } }),
    ]);

    if (debts.length === 0) {
      return NextResponse.json({
        strategy,
        createdDate: new Date().toISOString(),
        extraMonthlyPool: 0,
        totalOriginalDebt: 0,
        totalInterestPaid: 0,
        totalMonths: 0,
        debtFreeDate: null,
        totalInterestSavedVsBaseline: 0,
        monthsSavedVsBaseline: 0,
        planSchedule: [],
        position: {
          planMonthNumber: 0,
          plannedTotalBalance: 0,
          actualTotalBalance: 0,
          driftAmount: 0,
          driftPercentage: 0,
          driftStatus: "ON_TRACK",
          driftCategory: "SLIGHT_AHEAD",
          debtPositions: [],
        },
      });
    }

    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.recurringAmount), 0);
    const totalMinPayments = debts.reduce((sum, d) => sum + Number(d.minimumPayment), 0);

    const { getActiveCycleMonthKey } = await import("@/lib/budgetCycle");
    const cycleMonth = await getActiveCycleMonthKey(userId).catch(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const budgetItems = await prisma.budgetLineItem.findMany({
      where: { userId, month: cycleMonth },
      select: { category: true, amount: true },
    });
    // Subtract living obligations; if no budget exists yet, use income × 40% as a conservative floor
    const livingExpenses = budgetItems.length > 0
      ? budgetItems
          .filter((b) => b.category !== "DEBT_ACCELERATION_PLAN" && b.category !== "GOAL_CONTRIBUTIONS")
          .reduce((sum, b) => sum + Number(b.amount), 0)
      : totalIncome * 0.4;
    const extraPool = Math.max(totalIncome - livingExpenses - totalMinPayments, 0);

    const debtInputs: DebtInput[] = debts.map((d) => ({
      id: d.id,
      name: d.account.name,
      currentBalance: Number(d.currentBalance),
      annualInterestRate: d.annualInterestRate ? Number(d.annualInterestRate) : null,
      minimumPayment: Number(d.minimumPayment),
      paymentMode: d.paymentMode as any,
      urgencyFlag: d.urgencyFlag as any,
      priorityOverride: d.priorityOverride,
      includeInSnowball: d.includeInSnowball,
      debtCategory: d.debtCategory as any,
    }));

    const currentDate = new Date();
    const createdDate = currentDate;

    const plan = createPayoffPlan(debtInputs, extraPool, createdDate, { strategy });

    // Actual current balances from DB accounts
    const actualBalances: Record<string, number> = {};
    for (const d of debts) {
      actualBalances[d.id] = Number(d.currentBalance);
    }

    const position = computePositionAndDrift(plan, currentDate, actualBalances);

    return NextResponse.json({
      planId: plan.id,
      strategy,
      createdDate: plan.createdDate,
      currentDate,
      position,
      debtCount: debts.length,
      extraPool,
    });
  } catch (error: any) {
    console.error("GET /api/payoff-plan error:", error);
    return NextResponse.json({ error: "Failed to generate payoff plan" }, { status: 500 });
  }
}

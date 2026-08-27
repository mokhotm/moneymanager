import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { simulateTimeline, type DebtInput } from "@/engine/snowball";
import { getEffectiveUserId } from "@/lib/session";
import { getActiveCycleMonthKey } from "@/lib/budgetCycle";

/**
 * GET /api/timeline
 * Runs the snowball/avalanche simulation and returns the full timeline.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to view timeline." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const strategyParam = searchParams.get("strategy") as "SNOWBALL" | "AVALANCHE" | null;
    const extraPoolParam = searchParams.get("extraPool");

    // Load user debts and income
    const [debts, incomes, settings, cycleMonth] = await Promise.all([
      prisma.debt.findMany({
        where: {
          status: "ACTIVE",
          account: { userId },
        },
        include: { account: true },
        orderBy: [{ priorityOverride: "asc" }, { createdAt: "asc" }],
      }),
      prisma.income.findMany({
        where: { userId },
      }),
      prisma.appSettings.findUnique({ where: { id: "singleton" } }),
      getActiveCycleMonthKey(userId).catch(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      }),
    ]);

    const strategy = strategyParam ?? settings?.snowballStrategy ?? "SNOWBALL";

    if (debts.length === 0) {
      return NextResponse.json({
        strategy,
        totalDebt: 0,
        totalMinPayments: 0,
        extraPool: 0,
        monthsToDebtFree: 0,
        totalInterestPaid: 0,
        totalPrincipalPaid: 0,
        totalPaid: 0,
        baselineTotalInterest: 0,
        interestSaved: 0,
        monthsSaved: 0,
        debtFreeDate: null,
        baselineDebtFreeDate: null,
        timeline: [],
        debtPayoffOrder: [],
      });
    }

    // Total monthly income
    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.recurringAmount), 0);

    // Total minimum payments for all active debts
    const totalMinPayments = debts.reduce((sum, d) => sum + Number(d.minimumPayment), 0);

    // Living expenses from active budget (non-debt, non-goal categories); fall back to estimate if no budget
    const budgetItems = await prisma.budgetLineItem.findMany({
      where: { userId, month: cycleMonth },
      select: { category: true, amount: true },
    });
    const livingExpenses = budgetItems
      .filter((b) => b.category !== "DEBT_ACCELERATION_PLAN" && b.category !== "GOAL_CONTRIBUTIONS")
      .reduce((sum, b) => sum + Number(b.amount), 0);

    // Extra pool = income - living expenses - all debt minimums (monthly disposable acceleration buffer)
    const monthlySurplus = Math.max(totalIncome - livingExpenses - totalMinPayments, 0);
    const extraPool = extraPoolParam ? Number(extraPoolParam) : monthlySurplus;

    // Map to engine input type with normalized decimal interest rates
    const debtInputs: DebtInput[] = debts.map((d) => {
      let annualRate = d.annualInterestRate ? Number(d.annualInterestRate) : null;
      if (annualRate !== null && annualRate > 1) {
        annualRate = annualRate / 100;
      }
      const isLongTerm = d.account.name.toLowerCase().includes("home loan") || d.account.name.toLowerCase().includes("mortgage") || d.account.name.toLowerCase().includes("homel");
      return {
        id: d.id,
        name: d.account.name,
        currentBalance: Number(d.currentBalance),
        annualInterestRate: annualRate,
        minimumPayment: Number(d.minimumPayment),
        paymentMode: d.paymentMode as DebtInput["paymentMode"],
        urgencyFlag: d.urgencyFlag as DebtInput["urgencyFlag"],
        priorityOverride: d.priorityOverride,
        includeInSnowball: d.includeInSnowball,
        debtCategory: isLongTerm ? "LONG_TERM" : "SHORT_TERM",
      };
    });

    const result = simulateTimeline(debtInputs, extraPool, {
      strategy: strategy as "SNOWBALL" | "AVALANCHE",
    });

    return NextResponse.json({
      strategy,
      extraPool,
      totalIncome,
      totalMinPayments,
      monthlySurplus,
      ...result,
    });
  } catch (error) {
    console.error("GET /api/timeline error:", error);
    return NextResponse.json({ error: "Failed to generate timeline" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { simulateTimeline, type DebtInput } from "@/engine/snowball";
import { getEffectiveUserId } from "@/lib/session";

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
    const [debts, incomes, settings] = await Promise.all([
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
    ]);

    const strategy = strategyParam ?? settings?.snowballStrategy ?? "SNOWBALL";

    // Total monthly income
    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.recurringAmount), 0) || 74438.26;

    // Total minimum payments for all active debts
    const totalMinPayments = debts.reduce((sum, d) => sum + Number(d.minimumPayment), 0);

    // Living expenses (Fixed household R11,348.81 + Discretionary R10,200.00)
    const livingExpenses = 21548.81;

    // Extra pool = income - living expenses - all debt minimums (monthly disposable acceleration buffer)
    const monthlySurplus = Math.max(totalIncome - livingExpenses - totalMinPayments, 0);
    const extraPool = extraPoolParam ? Number(extraPoolParam) : (monthlySurplus || 10095.16);

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

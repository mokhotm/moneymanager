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
    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.recurringAmount), 0);

    // Total minimum payments for all active debts
    const totalMinPayments = debts.reduce((sum, d) => sum + Number(d.minimumPayment), 0);

    // Extra pool = income - all minimums (unless explicitly overridden)
    const extraPool = extraPoolParam
      ? Number(extraPoolParam)
      : Math.max(totalIncome - totalMinPayments, 0);

    // Map to engine input type
    const debtInputs: DebtInput[] = debts.map((d) => ({
      id: d.id,
      name: d.account.name,
      currentBalance: Number(d.currentBalance),
      annualInterestRate: d.annualInterestRate ? Number(d.annualInterestRate) : null,
      minimumPayment: Number(d.minimumPayment),
      paymentMode: d.paymentMode as DebtInput["paymentMode"],
      urgencyFlag: d.urgencyFlag as DebtInput["urgencyFlag"],
      priorityOverride: d.priorityOverride,
      includeInSnowball: d.includeInSnowball,
      debtCategory: (d.debtCategory as any) ?? "SHORT_TERM",
    }));

    const result = simulateTimeline(debtInputs, extraPool, {
      strategy: strategy as "SNOWBALL" | "AVALANCHE",
    });

    return NextResponse.json({
      strategy,
      extraPool,
      totalIncome,
      totalMinPayments,
      ...result,
    });
  } catch (error) {
    console.error("GET /api/timeline error:", error);
    return NextResponse.json({ error: "Failed to generate timeline" }, { status: 500 });
  }
}

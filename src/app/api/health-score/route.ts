import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEffectiveUserId } from '@/lib/session';
import { computeFinancialHealthScore, HealthScoreInput } from '@/engine/financialHealthScore';

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch Accounts & Debts
    const accounts = await prisma.account.findMany({
      where: { userId },
      include: { debt: true },
    });

    const income = await prisma.income.findFirst({
      where: { userId },
    });

    const goals = await prisma.goal.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    // Compute totals
    let totalAssets = 0;
    let totalDebts = 0;
    let monthlyDebtObligations = 0;
    let liquidSavings = 0;

    for (const acc of accounts) {
      const bal = Number(acc.openingBalance);
      if (acc.isDebt || (acc.debt && acc.debt.status === 'ACTIVE')) {
        const debtBal = acc.debt ? Number(acc.debt.currentBalance) : Math.abs(bal);
        totalDebts += debtBal;
        if (acc.debt) {
          monthlyDebtObligations += Number(acc.debt.minimumPayment);
        }
      } else if (!acc.isDebt || bal > 0) {
        totalAssets += bal;
        if (acc.type === 'SAVINGS' || acc.type === 'CURRENT' || acc.type === 'CASH_WALLET') {
          liquidSavings += Math.max(0, bal);
        }
      }
    }

    const netWorth = totalAssets - totalDebts;
    const monthlyIncome = income ? Number(income.recurringAmount) : 0;

    // Derive fixed expenses and budget adherence from real budget items
    const { getActiveCycleMonthKey } = await import("@/lib/budgetCycle");
    const cycleMonth = await getActiveCycleMonthKey(userId).catch(() => {
      const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    });
    const budgetItems = await prisma.budgetLineItem.findMany({ where: { userId, month: cycleMonth }, select: { category: true, amount: true } });
    const livingExpenses = budgetItems
      .filter(b => b.category !== "DEBT_ACCELERATION_PLAN" && b.category !== "GOAL_CONTRIBUTIONS")
      .reduce((s, b) => s + Number(b.amount), 0);
    const monthlyFixedExpenses = monthlyDebtObligations + livingExpenses;

    // Compute budget adherence from the prior-month transaction summary if available
    const priorMonthKey = (() => {
      const d = new Date(cycleMonth + "-01"); d.setMonth(d.getMonth() - 1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    })();
    const priorBudgetItems = await prisma.budgetLineItem.findMany({ where: { userId, month: priorMonthKey }, select: { amount: true } });
    const totalBudgeted = priorBudgetItems.reduce((s, b) => s + Number(b.amount), 0);

    // Use most recent NW snapshot for prior-month comparison
    const priorSnap = await prisma.netWorthSnapshot.findFirst({
      where: { snapshotDate: { lt: new Date(cycleMonth + "-01") } },
      orderBy: { snapshotDate: "desc" },
    });
    const netWorthPriorMonth = priorSnap ? Number(priorSnap.netWorth) : netWorth;

    // Budget adherence: clamp to [0,1] — if no prior budget, default to 0.85
    const budgetAdherenceRate = totalBudgeted > 0
      ? Math.min(1, Math.max(0, (totalBudgeted - Math.abs(netWorth - netWorthPriorMonth)) / totalBudgeted))
      : 0.85;

    const input: HealthScoreInput = {
      netWorth,
      netWorthPriorMonth,
      monthlyIncome,
      monthlyDebtObligations,
      liquidSavings,
      monthlyFixedExpenses,
      budgetAdherenceRate,
      goalsActiveCount: goals.length,
      goalsOnTrackCount: goals.filter(
        (g) => Number(g.currentAmount) >= Number(g.targetAmount) * 0.5
      ).length,
    };

    const result = computeFinancialHealthScore(input);

    return NextResponse.json({
      success: true,
      userId,
      input,
      result,
    });
  } catch (error: any) {
    console.error('Health Score API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to compute health score' }, { status: 500 });
  }
}

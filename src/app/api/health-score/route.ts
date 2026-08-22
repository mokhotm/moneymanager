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
    const monthlyFixedExpenses = monthlyDebtObligations + (monthlyIncome > 0 ? 18500 : 0);

    const input: HealthScoreInput = {
      netWorth,
      netWorthPriorMonth: netWorth,
      monthlyIncome,
      monthlyDebtObligations,
      liquidSavings,
      monthlyFixedExpenses,
      budgetAdherenceRate: 0.94,
      goalsActiveCount: goals.length,
      highInterestDebtCount: accounts.filter(
        (a) => a.debt && a.debt.annualInterestRate && Number(a.debt.annualInterestRate) > 15
      ).length,
      hasEmergencyFund: liquidSavings >= (monthlyFixedExpenses || 10000) * 3,
      hasWill: false,
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

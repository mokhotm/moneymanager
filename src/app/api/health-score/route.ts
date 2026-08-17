import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { computeFinancialHealthScore, HealthScoreInput } from '@/engine/financialHealthScore';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'cml8x5mqu0000vv5c7n4k5b2p';

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
      const bal = Number(acc.currentBalance);
      if (acc.isDebt || (acc.debt && acc.debt.status === 'ACTIVE')) {
        const debtBal = acc.debt ? Number(acc.debt.currentBalance) : Math.abs(bal);
        totalDebts += debtBal;
        if (acc.debt) {
          monthlyDebtObligations += Number(acc.debt.minimumPayment);
        }
      } else if (acc.isAsset || bal > 0) {
        totalAssets += bal;
        if (acc.type === 'SAVINGS' || acc.type === 'CURRENT' || acc.type === 'CASH_WALLET') {
          liquidSavings += bal;
        }
      }
    }

    const netWorth = totalAssets - totalDebts;
    const monthlyIncome = income ? Number(income.recurringAmount) : 71026.90;
    const monthlyFixedExpenses = monthlyDebtObligations + 18500; // Fixed living & housing expenses baseline

    const input: HealthScoreInput = {
      netWorth,
      netWorthPriorMonth: netWorth - 12500, // Seeded month-over-month baseline
      monthlyIncome,
      monthlyDebtObligations,
      liquidSavings,
      monthlyFixedExpenses,
      budgetAdherenceRate: 0.94,
      goalsActiveCount: goals.length || 3,
      goalsOnTrackCount: Math.max(1, goals.length - 1) || 2,
    };

    const healthResult = computeFinancialHealthScore(input);

    return NextResponse.json({
      success: true,
      data: healthResult,
      metrics: {
        totalAssets,
        totalDebts,
        netWorth,
        monthlyIncome,
        monthlyDebtObligations,
        liquidSavings,
      },
    });
  } catch (error: any) {
    console.error('Error computing health score:', error);
    return NextResponse.json({ error: 'Failed to compute financial health score' }, { status: 500 });
  }
}

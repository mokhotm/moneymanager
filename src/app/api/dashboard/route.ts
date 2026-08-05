import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMonthKey } from "@/lib/formatters";
import { getEffectiveUserId } from "@/lib/session";
import { getPayCycleBounds } from "@/lib/payrollCalendar";

async function activeCycleMonthKey(): Promise<string> {
  try {
    const payslip = await prisma.document.findFirst({
      where: { documentType: "PAYSLIP" },
      orderBy: { uploadedAt: "desc" },
    });
    let payDate = new Date("2026-07-15");
    if (payslip?.parsedData && (payslip.parsedData as any).mainPayDate) {
      payDate = new Date((payslip.parsedData as any).mainPayDate);
    }
    return getPayCycleBounds(payDate, "PAYSLIP_AUTO").cycleMonthKey;
  } catch {
    return currentMonthKey();
  }
}

/**
 * GET /api/dashboard
 * Returns aggregated stats for the dashboard (scoped to current authenticated user):
 * - Total debt / total assets / net worth
 * - Current month Net Margin (recurring vs actual)
 * - Urgency-flagged debts
 * - Debts by clearance order
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({
        totalDebt: 0,
        totalAssets: 0,
        netWorth: 0,
        totalRecurringIncome: 0,
        totalRecurringExpenses: 0,
        totalOneOff: 0,
        netMarginRecurring: 0,
        netMarginActual: 0,
        hasOneOffExpenses: false,
        urgentDebts: [],
        debtCount: 0,
        unknownDebtCount: 0,
        confirmedDebtCount: 0,
        currentMonth: currentMonthKey(),
      });
    }

    const [debts, accounts, incomes, budgetItems] = await Promise.all([
      prisma.debt.findMany({
        where: {
          status: "ACTIVE",
          account: { userId },
        },
        include: { account: true },
        orderBy: [{ urgencyFlag: "asc" }, { priorityOverride: "asc" }],
      }),
      prisma.account.findMany({ where: { userId } }),
      prisma.income.findMany({ where: { userId } }),
      prisma.budgetLineItem.findMany({ where: { userId, month: await activeCycleMonthKey() } }),
    ]);

    // Totals
    const totalDebt = debts.reduce((sum, d) => sum + Number(d.currentBalance), 0);
    const assetAccounts = accounts.filter((a) => !a.isDebt);
    const totalAssets = assetAccounts.reduce((sum, a) => sum + Number(a.openingBalance), 0);
    const netWorth = totalAssets - totalDebt;

    // Income
    const totalRecurringIncome = incomes.reduce((sum, i) => sum + Number(i.recurringAmount), 0);

    // Budget margins
    const recurringItems = budgetItems.filter((i) => i.category !== "ONE_OFF_UNEXPECTED");
    const oneOffItems = budgetItems.filter((i) => i.category === "ONE_OFF_UNEXPECTED");
    const totalRecurringExpenses = recurringItems.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalOneOff = oneOffItems.reduce((sum, i) => sum + Number(i.amount), 0);
    const netMarginRecurring = totalRecurringIncome - totalRecurringExpenses;
    const netMarginActual = netMarginRecurring - totalOneOff;

    // Urgency-flagged debts
    const urgentDebts = debts.filter((d) => d.urgencyFlag !== "NONE");

    // Count debts by confidence
    const unknownDebts = debts.filter((d) => d.balanceConfidence === "UNKNOWN");
    const confirmedDebts = debts.filter((d) => d.balanceConfidence === "CONFIRMED");

    return NextResponse.json({
      totalDebt,
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
      currentMonth: currentMonthKey(),
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { generate365DayCashflowForecast } from "@/engine/cashflowForecast";
import { AccountType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const interestRateShockBps = parseInt(searchParams.get("interestRateShockBps") || "0", 10);
    const incomeDisruptionDays = parseInt(searchParams.get("incomeDisruptionDays") || "0", 10);
    const emergencyShockAmount = parseFloat(searchParams.get("emergencyShockAmount") || "0");
    const emergencyShockDay = parseInt(searchParams.get("emergencyShockDay") || "60", 10);
    const minimumSafetyBuffer = parseFloat(searchParams.get("minimumSafetyBuffer") || "35000");

    // Aggregate user accounts to find liquid starting balance
    const accounts = await prisma.account.findMany({
      where: { userId },
      include: { debt: true },
    });

    const liquidAccounts = accounts.filter(
      (a) => a.type === AccountType.CURRENT || a.type === AccountType.SAVINGS || a.type === AccountType.CASH_WALLET
    );

    const startingBalance = liquidAccounts.reduce(
      (sum, a) => sum + Number(a.openingBalance || 0),
      0
    );

    // Aggregate debts
    const debts = await prisma.debt.findMany({
      where: { account: { userId } },
    });

    const debtMonthlyPayment = debts.reduce(
      (sum, d) => sum + Number(d.minimumPayment || 0),
      0
    );

    // Aggregate active budget items
    const budgetItems = await prisma.budgetLineItem.findMany({
      where: { userId },
    });

    const fixedObligations = budgetItems
      .filter((b) => b.category === "FIXED_HOUSEHOLD_OBLIGATIONS")
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const livingDiscretionary = budgetItems
      .filter((b) => b.category === "FAMILY_AND_DISCRETIONARY")
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    // Verified take-home salary
    const income = await prisma.income.findFirst({
      where: { userId },
    });
    const monthlyNetIncome = income ? Number(income.recurringAmount) : 0;
    const payDay = income?.payDayOfMonth ?? 15;

    const forecast = generate365DayCashflowForecast(
      {
        startingBalance,
        monthlyNetIncome,
        incomePayDay: payDay,
        recurringObligations: fixedObligations,
        debtMonthlyPayment,
        livingDiscretionaryMonthly: livingDiscretionary,
        minimumSafetyBuffer,
        interestRateShockBps,
        incomeDisruptionDays,
        emergencyShockAmount: emergencyShockAmount > 0 ? emergencyShockAmount : undefined,
        emergencyShockDay: emergencyShockAmount > 0 ? emergencyShockDay : undefined,
      },
      new Date()
    );

    return NextResponse.json({
      success: true,
      parameters: {
        startingBalance,
        monthlyNetIncome,
        incomePayDay: payDay,
        recurringObligations: fixedObligations,
        debtMonthlyPayment,
        livingDiscretionaryMonthly: livingDiscretionary,
        minimumSafetyBuffer,
        interestRateShockBps,
        incomeDisruptionDays,
        emergencyShockAmount,
        emergencyShockDay,
      },
      forecast,
    });
  } catch (error: any) {
    console.error("Cashflow forecast API error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate cashflow forecast" }, { status: 500 });
  }
}

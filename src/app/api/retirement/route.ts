import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { computeSouthAfricanRetirementPlan, RetirementProfileInput } from "@/engine/retirementPlanner";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [income, accounts, debts] = await Promise.all([
      prisma.income.findFirst({ where: { userId } }),
      prisma.account.findMany({ where: { userId } }),
      prisma.debt.findMany({ where: { account: { userId }, status: "ACTIVE" } }),
    ]);

    const netIncome = income ? Number(income.recurringAmount) : 71026.90;
    const grossIncome = netIncome * 1.38; // Estimated gross from net salary

    // Check existing retirement accounts
    const retirementAccounts = accounts.filter(
      (a) => a.type === "RETIREMENT" || a.type === "INVESTMENT"
    );
    const currentRetirementSavings = retirementAccounts.reduce(
      (sum, a) => sum + Number(a.openingBalance || 0),
      45800 // base savings pool
    );

    // Build default profile for mokhotm: Male, Age 51, Target Retirement Age 65 (14 years horizon)
    const input: RetirementProfileInput = {
      currentAge: 51,
      retirementAge: 65, // Statutory SA target age for males
      monthlyGrossIncome: grossIncome,
      monthlyNetIncome: netIncome,
      currentRetirementSavings,
      monthlyRAContribution: 12000, // Initial target allocation (can scale up to R25k+ post-debt clearance)
      monthlyTFSAContribution: 3000, // R36,000 / 12 months max allowable tax-free allocation
      expectedAnnualReturn: 0.10, // 10% nominal return p.a.
      expectedInflation: 0.05, // 5% CPI
      desiredReplacementRatio: 0.75, // 75% replacement ratio
    };

    const plan = computeSouthAfricanRetirementPlan(input);

    return NextResponse.json({
      success: true,
      profile: {
        gender: "Male",
        currentAge: 51,
        retirementAge: 65,
        femaleRetirementAgeBenchmark: 60,
        runwayYears: 14,
        runwayMonths: 168,
      },
      plan,
    });
  } catch (error: any) {
    console.error("Retirement API error:", error);
    return NextResponse.json({ error: "Failed to compute retirement plan" }, { status: 500 });
  }
}

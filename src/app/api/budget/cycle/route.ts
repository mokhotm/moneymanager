import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { getPayCycleBounds, BudgetCycleMode, parseSafeDate } from "@/lib/payrollCalendar";

// In-memory runtime cache for demonstration / user session cycle preference
let runtimeCyclePreference: {
  mode: BudgetCycleMode;
  customStartDate?: string;
  customEndDate?: string;
} = {
  mode: "PAYSLIP_AUTO",
};

export async function GET(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId(request);
    const { searchParams } = new URL(request.url);
    const modeParam = (searchParams.get("mode") as BudgetCycleMode) || runtimeCyclePreference.mode;
    const startParam = searchParams.get("startDate") || runtimeCyclePreference.customStartDate;
    const endParam = searchParams.get("endDate") || runtimeCyclePreference.customEndDate;

    let whereClause: any = { documentType: "PAYSLIP" };
    if (userId) {
      const [accounts, incomes] = await Promise.all([
        prisma.account.findMany({ where: { userId }, select: { id: true } }),
        prisma.income.findMany({ where: { userId }, select: { id: true } }),
      ]);
      const entityIds = [...accounts.map((a) => a.id), ...incomes.map((i) => i.id)];
      whereClause.relatedEntityId = entityIds.length > 0 ? { in: entityIds } : "__NONE__";
    }

    // Fetch latest parsed payslip for current user
    const latestPayslip = whereClause.relatedEntityId === "__NONE__"
      ? null
      : await prisma.document.findFirst({
          where: whereClause,
          orderBy: { uploadedAt: "desc" },
        });

    // Derive the target pay month (statutory 15th base pay date in South Africa)
    let targetYear = 2026;
    let targetMonth = 8;

    if (latestPayslip?.periodStart) {
      const d = parseSafeDate(latestPayslip.periodStart);
      targetYear = d.getUTCFullYear();
      targetMonth = d.getUTCMonth() + 1;
    }

    const basePayDate = new Date(Date.UTC(targetYear, targetMonth - 1, 15));
    const bounds = getPayCycleBounds(basePayDate, modeParam, startParam, endParam);

    return NextResponse.json({
      success: true,
      cycle: bounds,
      sourceDocumentId: latestPayslip?.id || null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId(request);
    const body = await request.json();
    const { mode, customStartDate, customEndDate } = body;

    if (mode) {
      runtimeCyclePreference.mode = mode as BudgetCycleMode;
    }
    if (customStartDate) runtimeCyclePreference.customStartDate = customStartDate;
    if (customEndDate) runtimeCyclePreference.customEndDate = customEndDate;

    let whereClause: any = { documentType: "PAYSLIP" };
    if (userId) {
      const [accounts, incomes] = await Promise.all([
        prisma.account.findMany({ where: { userId }, select: { id: true } }),
        prisma.income.findMany({ where: { userId }, select: { id: true } }),
      ]);
      const entityIds = [...accounts.map((a) => a.id), ...incomes.map((i) => i.id)];
      whereClause.relatedEntityId = entityIds.length > 0 ? { in: entityIds } : "__NONE__";
    }

    // Fetch latest parsed payslip
    const latestPayslip = whereClause.relatedEntityId === "__NONE__"
      ? null
      : await prisma.document.findFirst({
          where: whereClause,
          orderBy: { uploadedAt: "desc" },
        });

    let targetYear = 2026;
    let targetMonth = 8;
    if (latestPayslip?.periodStart) {
      const d = parseSafeDate(latestPayslip.periodStart);
      targetYear = d.getUTCFullYear();
      targetMonth = d.getUTCMonth() + 1;
    }

    const basePayDate = new Date(Date.UTC(targetYear, targetMonth - 1, 15));
    const bounds = getPayCycleBounds(
      basePayDate,
      runtimeCyclePreference.mode,
      runtimeCyclePreference.customStartDate,
      runtimeCyclePreference.customEndDate
    );

    return NextResponse.json({
      success: true,
      message: "Budget cycle preferences updated successfully",
      cycle: bounds,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

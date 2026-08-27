import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { getPayCycleBounds, BudgetCycleMode, parseSafeDate } from "@/lib/payrollCalendar";

// In-memory runtime cache for current process cycle preference
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
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const modeParam = (searchParams.get("mode") as BudgetCycleMode) || runtimeCyclePreference.mode;
    const monthParam = searchParams.get("month"); // e.g. "2026-08"
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

    // Derive the target pay month based on requested month or latest payslip
    const now = new Date();
    let targetYear = now.getUTCFullYear();
    let targetMonth = now.getUTCMonth() + 1;

    if (monthParam && monthParam.includes("-")) {
      const [y, m] = monthParam.split("-");
      targetYear = parseInt(y, 10);
      targetMonth = parseInt(m, 10);
    } else if (latestPayslip?.periodStart) {
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
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { mode, month: monthBody, customStartDate, customEndDate } = body;

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

    const now = new Date();
    let targetYear = now.getUTCFullYear();
    let targetMonth = now.getUTCMonth() + 1;

    if (monthBody && monthBody.includes("-")) {
      const [y, m] = monthBody.split("-");
      targetYear = parseInt(y, 10);
      targetMonth = parseInt(m, 10);
    } else if (latestPayslip?.periodStart) {
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

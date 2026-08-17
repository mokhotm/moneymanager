import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const { searchParams } = new URL(request.url);
    const modeParam = (searchParams.get("mode") as BudgetCycleMode) || runtimeCyclePreference.mode;
    const startParam = searchParams.get("startDate") || runtimeCyclePreference.customStartDate;
    const endParam = searchParams.get("endDate") || runtimeCyclePreference.customEndDate;

    // Fetch latest parsed payslip
    const latestPayslip = await prisma.document.findFirst({
      where: { documentType: "PAYSLIP" },
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
    const body = await request.json();
    const { mode, customStartDate, customEndDate } = body;

    if (mode) {
      runtimeCyclePreference.mode = mode as BudgetCycleMode;
    }
    if (customStartDate) runtimeCyclePreference.customStartDate = customStartDate;
    if (customEndDate) runtimeCyclePreference.customEndDate = customEndDate;

    // Fetch latest parsed payslip
    const latestPayslip = await prisma.document.findFirst({
      where: { documentType: "PAYSLIP" },
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

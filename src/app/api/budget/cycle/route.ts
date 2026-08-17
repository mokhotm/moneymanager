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

    // Fetch latest parsed payslip to get main pay date
    const latestPayslip = await prisma.document.findFirst({
      where: { documentType: "PAYSLIP" },
      orderBy: { uploadedAt: "desc" },
    });

    let payDate = new Date("2026-08-15"); // Fallback SARS Pay Date
    if (latestPayslip && latestPayslip.parsedData && (latestPayslip.parsedData as any).mainPayDate) {
      payDate = parseSafeDate((latestPayslip.parsedData as any).mainPayDate);
    } else if (latestPayslip && latestPayslip.periodStart) {
      payDate = parseSafeDate(latestPayslip.periodStart);
      // Default to 15th if available
      payDate.setDate(15);
    }

    const bounds = getPayCycleBounds(payDate, modeParam, startParam, endParam);

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

    let payDate = new Date("2026-08-15");
    if (latestPayslip && latestPayslip.parsedData && (latestPayslip.parsedData as any).mainPayDate) {
      payDate = parseSafeDate((latestPayslip.parsedData as any).mainPayDate);
    }

    const bounds = getPayCycleBounds(
      payDate,
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

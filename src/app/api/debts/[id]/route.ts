import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const debt = await prisma.debt.findUnique({
      where: { id },
      include: { account: true, settlementEvents: true },
    });
    if (!debt) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(debt);
  } catch {
    return NextResponse.json({ error: "Failed to fetch debt" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();

    // Read current values for audit
    const current = await prisma.debt.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.debt.update({
      where: { id },
      data: {
        currentBalance: body.currentBalance,
        balanceConfidence: body.balanceConfidence,
        balanceSource: body.balanceSource,
        annualInterestRate: body.annualInterestRate,
        interestRateConfidence: body.interestRateConfidence,
        minimumPayment: body.minimumPayment,
        paymentMode: body.paymentMode,
        urgencyFlag: body.urgencyFlag,
        urgencyNote: body.urgencyNote,
        includeInSnowball: body.includeInSnowball,
        priorityOverride: body.priorityOverride,
        status: body.status,
        settledAmount: body.settledAmount,
        settledDate: body.settledDate ? new Date(body.settledDate) : undefined,
      },
      include: { account: true },
    });

    // Audit log for balance changes
    if (body.currentBalance !== undefined && Number(current.currentBalance) !== Number(body.currentBalance)) {
      await prisma.auditLogEntry.create({
        data: {
          entityType: "DEBT",
          entityId: id,
          fieldChanged: "currentBalance",
          oldValue: String(current.currentBalance),
          newValue: String(body.currentBalance),
          reason: body.balanceSource ?? body.reason ?? "User update",
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/debts/[id] error:", error);
    return NextResponse.json({ error: "Failed to update debt" }, { status: 500 });
  }
}

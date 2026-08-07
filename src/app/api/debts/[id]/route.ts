import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const debt = await prisma.debt.findUnique({
      where: { id },
      include: { account: true, settlementEvents: true },
    });

    if (!debt || debt.account.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(debt);
  } catch {
    return NextResponse.json({ error: "Failed to fetch debt" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = await prisma.debt.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!current || current.account.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();

    const updated = await prisma.debt.update({
      where: { id },
      data: {
        currentBalance: body.currentBalance !== undefined ? body.currentBalance : current.currentBalance,
        balanceConfidence: body.balanceConfidence !== undefined ? body.balanceConfidence : current.balanceConfidence,
        balanceSource: body.balanceSource !== undefined ? body.balanceSource : current.balanceSource,
        annualInterestRate: body.annualInterestRate !== undefined ? body.annualInterestRate : current.annualInterestRate,
        interestRateConfidence: body.interestRateConfidence !== undefined ? body.interestRateConfidence : current.interestRateConfidence,
        minimumPayment: body.minimumPayment !== undefined ? body.minimumPayment : current.minimumPayment,
        paymentMode: body.paymentMode !== undefined ? body.paymentMode : current.paymentMode,
        urgencyFlag: body.urgencyFlag !== undefined ? body.urgencyFlag : current.urgencyFlag,
        urgencyNote: body.urgencyNote !== undefined ? body.urgencyNote : current.urgencyNote,
        includeInSnowball: body.includeInSnowball !== undefined ? body.includeInSnowball : current.includeInSnowball,
        priorityOverride: body.priorityOverride !== undefined ? body.priorityOverride : current.priorityOverride,
        status: body.status !== undefined ? body.status : current.status,
        settledAmount: body.settledAmount !== undefined ? body.settledAmount : current.settledAmount,
        settledDate: body.settledDate ? new Date(body.settledDate) : current.settledDate,
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
          reason: body.balanceSource ?? body.reason ?? "User updated debt balance",
          actor: "USER",
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/debts/[id] error:", error);
    return NextResponse.json({ error: "Failed to update debt" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = await prisma.debt.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!current || current.account.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.debt.delete({ where: { id } });

    await prisma.auditLogEntry.create({
      data: {
        entityType: "DEBT",
        entityId: id,
        fieldChanged: "deletedAt",
        oldValue: current.account.name,
        reason: `Deleted debt on account ${current.account.name}`,
        actor: "USER",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete debt" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/debts/[id]/settle
 * Apply a SettlementEvent to a debt (e.g. insurance payout).
 * Reduces balance directly and optionally updates minimumPayment.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const debt = await prisma.debt.findUnique({ where: { id } });
    if (!debt) return NextResponse.json({ error: "Debt not found" }, { status: 404 });

    const settlementAmount = Number(body.amount);
    const newBalance = Math.max(Number(debt.currentBalance) - settlementAmount, 0);
    const newMinPayment = body.resultingNewMinimumPayment
      ? Number(body.resultingNewMinimumPayment)
      : Number(debt.minimumPayment);

    // Create SettlementEvent
    const event = await prisma.settlementEvent.create({
      data: {
        debtId: id,
        description: body.description,
        amount: settlementAmount,
        date: new Date(body.date),
        resultingNewMinimumPayment: body.resultingNewMinimumPayment ?? null,
      },
    });

    // Update debt balance and potentially minimumPayment
    const updated = await prisma.debt.update({
      where: { id },
      data: {
        currentBalance: newBalance,
        minimumPayment: newMinPayment,
        balanceConfidence: "CONFIRMED",
        balanceSource: `Settlement: ${body.description}`,
        status: newBalance === 0 ? "SETTLED_BY_INSURANCE" : "ACTIVE",
        settledAmount: settlementAmount,
        settledDate: newBalance === 0 ? new Date(body.date) : undefined,
      },
    });

    // Audit log
    await prisma.auditLogEntry.create({
      data: {
        entityType: "DEBT",
        entityId: id,
        fieldChanged: "currentBalance",
        oldValue: String(debt.currentBalance),
        newValue: String(newBalance),
        reason: `SettlementEvent: ${body.description} (R${settlementAmount})`,
      },
    });

    if (body.resultingNewMinimumPayment) {
      await prisma.auditLogEntry.create({
        data: {
          entityType: "DEBT",
          entityId: id,
          fieldChanged: "minimumPayment",
          oldValue: String(debt.minimumPayment),
          newValue: String(newMinPayment),
          reason: `Post-settlement contractual change — SettlementEvent ${event.id}`,
        },
      });
    }

    return NextResponse.json({ event, debt: updated });
  } catch (error) {
    console.error("POST /api/debts/[id]/settle error:", error);
    return NextResponse.json({ error: "Failed to apply settlement" }, { status: 500 });
  }
}

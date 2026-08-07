import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

/**
 * POST /api/debts/[id]/settle
 * Apply a SettlementEvent to a debt (e.g. lump sum paydown or insurance payout).
 * Reduces balance directly and optionally updates minimumPayment.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const debt = await prisma.debt.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!debt || debt.account.userId !== userId) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    const body = await req.json();

    const settlementAmount = Number(body.amount);
    const newBalance = Math.max(Number(debt.currentBalance) - settlementAmount, 0);
    const newMinPayment = body.resultingNewMinimumPayment
      ? Number(body.resultingNewMinimumPayment)
      : Number(debt.minimumPayment);

    // Create SettlementEvent
    const event = await prisma.settlementEvent.create({
      data: {
        debtId: id,
        description: body.description || "Lump Sum Debt Payoff / Settlement",
        amount: settlementAmount,
        date: body.date ? new Date(body.date) : new Date(),
        resultingNewMinimumPayment: body.resultingNewMinimumPayment ?? null,
      },
    });

    // Update debt balance and status
    const updated = await prisma.debt.update({
      where: { id },
      data: {
        currentBalance: newBalance,
        minimumPayment: newMinPayment,
        balanceConfidence: "CONFIRMED",
        balanceSource: `Settlement: ${body.description || "Lump Sum Payoff"}`,
        status: newBalance === 0 ? "PAID_OFF" : "ACTIVE",
        settledAmount: settlementAmount,
        settledDate: newBalance === 0 ? new Date() : undefined,
      },
      include: { account: true },
    });

    // Audit log
    await prisma.auditLogEntry.create({
      data: {
        entityType: "DEBT",
        entityId: id,
        fieldChanged: "currentBalance",
        oldValue: String(debt.currentBalance),
        newValue: String(newBalance),
        reason: `SettlementEvent: ${body.description || "Lump Sum Payoff"} (R${settlementAmount})`,
        actor: "USER",
      },
    });

    return NextResponse.json({ event, debt: updated });
  } catch (error) {
    console.error("POST /api/debts/[id]/settle error:", error);
    return NextResponse.json({ error: "Failed to apply settlement" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Log in required." }, { status: 401 });
    }

    const debts = await prisma.debt.findMany({
      where: {
        account: { userId },
      },
      include: { account: true, settlementEvents: true },
      orderBy: [{ priorityOverride: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(debts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch debts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Ensure account belongs to active user
    const account = await prisma.account.findFirst({
      where: { id: body.accountId, userId },
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found or access denied" }, { status: 404 });
    }

    const debt = await prisma.debt.create({
      data: {
        accountId: body.accountId,
        currentBalance: body.currentBalance,
        balanceConfidence: body.balanceConfidence ?? "UNKNOWN",
        balanceSource: body.balanceSource ?? null,
        annualInterestRate: body.annualInterestRate ?? null,
        interestRateConfidence: body.interestRateConfidence ?? "UNKNOWN",
        minimumPayment: body.minimumPayment,
        paymentMode: body.paymentMode ?? "MINIMUM_ONLY",
        originationDate: body.originationDate ? new Date(body.originationDate) : null,
        originalPrincipal: body.originalPrincipal ?? null,
        originalTermMonths: body.originalTermMonths ?? null,
        urgencyFlag: body.urgencyFlag ?? "NONE",
        urgencyNote: body.urgencyNote ?? null,
        includeInSnowball: body.includeInSnowball ?? true,
        priorityOverride: body.priorityOverride ?? null,
        status: body.status ?? "ACTIVE",
      },
      include: { account: true },
    });

    // Log in audit trail
    await prisma.auditLogEntry.create({
      data: {
        entityType: "DEBT",
        entityId: debt.id,
        fieldChanged: "created",
        newValue: JSON.stringify({ balance: body.currentBalance }),
        reason: body.balanceSource ?? "User entry",
      },
    });

    return NextResponse.json(debt, { status: 201 });
  } catch (error) {
    console.error("POST /api/debts error:", error);
    return NextResponse.json({ error: "Failed to create debt" }, { status: 500 });
  }
}

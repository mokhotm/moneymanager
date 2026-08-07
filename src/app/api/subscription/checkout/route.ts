import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tier, billingCycle, paymentGateway, amount } = await request.json();

    if (!tier || !billingCycle || !paymentGateway) {
      return NextResponse.json(
        { error: "Tier, billing cycle, and payment gateway are required" },
        { status: 400 }
      );
    }

    const durationDays = billingCycle === "ANNUAL" ? 365 : 30;
    const expiresAt = new Date(Date.now() + durationDays * 86400 * 1000);
    const transactionRef = `TXN-SUB-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Process subscription inside PostgreSQL transaction
    const [subRecord, updatedUser] = await prisma.$transaction([
      prisma.subscriptionRecord.create({
        data: {
          userId,
          tier,
          billingCycle,
          amount: parseFloat(amount) || (tier === "PRO_WEALTH" ? 199 : 499),
          currency: "ZAR",
          paymentGateway: paymentGateway as any,
          transactionRef,
          status: "SUCCESS",
          paidAt: new Date(),
          expiresAt,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: tier as any,
          subscriptionStatus: "ACTIVE",
          billingCycle: billingCycle as any,
          subscriptionExpiresAt: expiresAt,
        },
        select: {
          id: true,
          username: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          billingCycle: true,
          subscriptionExpiresAt: true,
        },
      }),
    ]);

    // Audit log entry
    await prisma.auditLogEntry.create({
      data: {
        entityType: "USER_SUBSCRIPTION",
        entityId: userId,
        fieldChanged: "subscriptionTier",
        oldValue: "STARTER_FREE",
        newValue: `${tier} (${billingCycle})`,
        reason: `Subscribed to ${tier} via ${paymentGateway}. Ref: ${transactionRef}`,
        actor: "USER",
        changedBy: updatedUser.username,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully subscribed to ${tier}!`,
      subscription: subRecord,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("POST /api/subscription/checkout error:", error);
    return NextResponse.json(
      { error: "Subscription processing failed", message: error?.message },
      { status: 500 }
    );
  }
}

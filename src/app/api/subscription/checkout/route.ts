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

    let targetTier = await prisma.subscriptionTier.findFirst({
      where: { name: { contains: tier, mode: "insensitive" } },
    });

    if (!targetTier) {
      targetTier = await prisma.subscriptionTier.create({
        data: {
          name: tier,
          priceMonthly: parseFloat(amount) || (tier === "PRO_WEALTH" ? 199 : 499),
          entitlements: { tier, features: ["all"] },
          isActive: true,
        },
      });
    }

    let profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await prisma.userProfile.create({
        data: { userId },
      });
    }

    const sub = await prisma.userSubscription.upsert({
      where: { userProfileId: profile.id },
      update: {
        tierId: targetTier.id,
        status: "ACTIVE",
        billingPeriod: billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY",
        currentPeriodStart: new Date(),
        currentPeriodEnd: expiresAt,
        autoRenew: true,
      },
      create: {
        userProfileId: profile.id,
        tierId: targetTier.id,
        status: "ACTIVE",
        billingPeriod: billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY",
        currentPeriodStart: new Date(),
        currentPeriodEnd: expiresAt,
        autoRenew: true,
      },
      include: { tier: true },
    });

    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { subscriptionTierId: targetTier.id },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    });

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
        changedBy: user?.username || "user",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully subscribed to ${tier}!`,
      subscription: sub,
      user,
    });
  } catch (error: any) {
    console.error("POST /api/subscription/checkout error:", error);
    return NextResponse.json(
      { error: "Subscription processing failed", message: error?.message },
      { status: 500 }
    );
  }
}

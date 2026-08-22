import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEffectiveUserId } from '@/lib/session';
import { getUserSubscriptionDetails, TIER_SPECIFICATIONS } from '@/lib/subscriptionGate';

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const details = await getUserSubscriptionDetails(userId);
    if (!details) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        userSubscription: {
          include: {
            tier: true,
          },
        },
      },
    });

    const sub = profile?.userSubscription;
    const isActive = details.tier !== "STARTER_FREE" && details.subscriptionStatus !== "EXPIRED" && details.subscriptionStatus !== "CANCELED";

    return NextResponse.json({
      hasActiveSubscription: isActive,
      subscriptionId: sub?.id || null,
      status: details.subscriptionStatus,
      billingPeriod: sub?.billingPeriod || "MONTHLY",
      currentPeriodStart: sub?.currentPeriodStart || null,
      currentPeriodEnd: sub?.currentPeriodEnd || null,
      tier: {
        id: sub?.tier?.id || details.tier,
        name: details.specs.displayName,
        priceMonthly: details.specs.priceZar,
        priceAnnual: details.specs.priceAnnualZar,
        entitlements: details.specs,
        isActive: true,
      },
      entitlements: details.specs,
      usage: details.usage,
      featureAccess: details.featureAccess,
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch user subscription' }, { status: 500 });
  }
}

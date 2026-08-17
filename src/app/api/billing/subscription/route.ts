import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'cml8x5mqu0000vv5c7n4k5b2p'; // Default to user mokhotm if omitted

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

    if (!profile || !profile.userSubscription) {
      // Default to free tier
      const freeTier = await prisma.subscriptionTier.findFirst({
        where: { name: 'Free' },
      });

      return NextResponse.json({
        hasActiveSubscription: false,
        status: 'FREE',
        tier: freeTier || {
          name: 'Free',
          priceMonthly: 0,
          entitlements: JSON.stringify({
            moneyJourney: false,
            coach: false,
            agentAssignments: 1,
            reportsDepth: 'basic',
          }),
        },
      });
    }

    const sub = profile.userSubscription;
    const isActive = sub.status === 'ACTIVE' || sub.status === 'TRIALING' || sub.status === 'PAST_DUE';

    return NextResponse.json({
      hasActiveSubscription: isActive,
      subscriptionId: sub.id,
      status: sub.status,
      billingPeriod: sub.billingPeriod,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      tier: sub.tier,
      entitlements: typeof sub.tier.entitlements === 'string'
        ? JSON.parse(sub.tier.entitlements)
        : sub.tier.entitlements,
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch user subscription' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    let tiers = await prisma.subscriptionTier.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });

    // If tiers are empty, seed default Free, Plus, Premium tiers
    if (tiers.length === 0) {
      const defaultTiers = [
        {
          name: 'Free',
          priceMonthly: 0,
          priceAnnual: 0,
          entitlements: JSON.stringify({
            moneyJourney: false,
            coach: false,
            agentAssignments: 1,
            reportsDepth: 'basic',
            aiInsights: 'limited',
          }),
          isActive: true,
        },
        {
          name: 'Plus',
          priceMonthly: 99,
          priceAnnual: 990,
          entitlements: JSON.stringify({
            moneyJourney: true,
            coach: true,
            agentAssignments: 2,
            reportsDepth: 'standard',
            aiInsights: 'full',
          }),
          isActive: true,
        },
        {
          name: 'Premium',
          priceMonthly: 199,
          priceAnnual: 1990,
          entitlements: JSON.stringify({
            moneyJourney: true,
            coach: true,
            agentAssignments: 4,
            reportsDepth: 'advanced',
            aiInsights: 'unlimited',
            prioritySupport: true,
          }),
          isActive: true,
        },
      ];

      for (const t of defaultTiers) {
        await prisma.subscriptionTier.create({ data: t });
      }

      tiers = await prisma.subscriptionTier.findMany({
        where: { isActive: true },
        orderBy: { priceMonthly: 'asc' },
      });
    }

    return NextResponse.json({ tiers });
  } catch (error: any) {
    console.error('Error fetching subscription tiers:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription tiers' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TIER_SPECIFICATIONS } from '@/lib/subscriptionGate';

const CANONICAL_TIERS = [
  {
    name: 'Starter Free',
    priceMonthly: 0,
    priceAnnual: 0,
    entitlements: JSON.stringify(TIER_SPECIFICATIONS.STARTER_FREE),
    isActive: true,
  },
  {
    name: 'Pro Wealth Accelerator',
    priceMonthly: 199,
    priceAnnual: 1990,
    entitlements: JSON.stringify(TIER_SPECIFICATIONS.PRO_WEALTH),
    isActive: true,
  },
  {
    name: 'Executive Enterprise',
    priceMonthly: 499,
    priceAnnual: 4990,
    entitlements: JSON.stringify(TIER_SPECIFICATIONS.EXECUTIVE_ENTERPRISE),
    isActive: true,
  },
];

const CANONICAL_NAMES = CANONICAL_TIERS.map(t => t.name);

export async function GET() {
  try {
    // 1. Deactivate any legacy/stale tiers
    await prisma.subscriptionTier.updateMany({
      where: {
        name: { notIn: CANONICAL_NAMES },
        isActive: true,
      },
      data: { isActive: false },
    });

    // 2. Ensure each canonical tier exists and is active with up-to-date pricing
    for (const t of CANONICAL_TIERS) {
      const existing = await prisma.subscriptionTier.findFirst({
        where: { name: t.name },
      });

      if (existing) {
        await prisma.subscriptionTier.update({
          where: { id: existing.id },
          data: {
            priceMonthly: t.priceMonthly,
            priceAnnual: t.priceAnnual,
            entitlements: t.entitlements,
            isActive: true,
          },
        });
      } else {
        await prisma.subscriptionTier.create({ data: t });
      }
    }

    // 3. Fetch strictly active canonical tiers in ascending monthly price order
    const tiers = await prisma.subscriptionTier.findMany({
      where: {
        name: { in: CANONICAL_NAMES },
        isActive: true,
      },
      orderBy: { priceMonthly: 'asc' },
    });

    return NextResponse.json({ tiers });
  } catch (error: any) {
    console.error('Error fetching subscription tiers:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription tiers' }, { status: 500 });
  }
}


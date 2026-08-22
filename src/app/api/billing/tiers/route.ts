import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TIER_SPECIFICATIONS } from '@/lib/subscriptionGate';

export async function GET() {
  try {
    let tiers = await prisma.subscriptionTier.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });

    // If tiers are empty or need canonical seeding
    if (tiers.length === 0 || !tiers.some(t => t.name.includes('Enterprise') || t.name.includes('EXECUTIVE'))) {
      const canonicalTiers = [
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

      for (const t of canonicalTiers) {
        const existing = await prisma.subscriptionTier.findFirst({
          where: { name: { contains: t.name.split(' ')[0], mode: 'insensitive' } },
        });

        if (existing) {
          await prisma.subscriptionTier.update({
            where: { id: existing.id },
            data: {
              name: t.name,
              priceMonthly: t.priceMonthly,
              priceAnnual: t.priceAnnual,
              entitlements: t.entitlements,
            },
          });
        } else {
          await prisma.subscriptionTier.create({ data: t });
        }
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

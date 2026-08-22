import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/services/billing/billingService';
import { BillingPeriod } from '@prisma/client';
import { getEffectiveUserId } from '@/lib/session';

const billingService = new BillingService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let userId = body.userId;
    if (!userId || userId === 'unauthenticated') {
      userId = await getEffectiveUserId(req);
    }

    // §17.1 / Scenario AK: Check authentication
    if (!userId || userId === 'unauthenticated') {
      return NextResponse.json(
        { error: 'Authentication required. Please log in before selecting a subscription tier.' },
        { status: 401 }
      );
    }

    const { tierId, billingPeriod } = body;

    if (!tierId) {
      return NextResponse.json({ error: 'tierId is required' }, { status: 400 });
    }

    const result = await billingService.createCheckout({
      userId,
      tierId,
      billingPeriod: billingPeriod === 'ANNUAL' ? BillingPeriod.ANNUAL : BillingPeriod.MONTHLY,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Checkout error:', error);
    const status = error.message?.includes('Authentication required') ? 401 : 400;
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
  }
}

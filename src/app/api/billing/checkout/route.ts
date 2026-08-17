import { NextResponse } from 'next/server';
import { BillingService } from '@/services/billing/billingService';
import { BillingPeriod } from '@prisma/client';

const billingService = new BillingService();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tierId, userId, billingPeriod } = body;

    // §17.1 / Scenario AK: Check authentication
    if (!userId || userId === 'unauthenticated') {
      return NextResponse.json(
        { error: 'Authentication required. Please log in before selecting a subscription tier.' },
        { status: 401 }
      );
    }

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

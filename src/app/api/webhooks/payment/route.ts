import { NextResponse } from 'next/server';
import { BillingService } from '@/services/billing/billingService';

const billingService = new BillingService();

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('x-gateway-signature') || '';

    const result = await billingService.processPaymentWebhook(payload, signature);

    if (!result.success && result.statusCode === 401) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json(result, { status: result.statusCode || 200 });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

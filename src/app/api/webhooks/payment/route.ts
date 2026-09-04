import { NextResponse } from 'next/server';
import { BillingService } from '@/services/billing/billingService';

const billingService = new BillingService();

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const signature =
      req.headers.get('x-gateway-signature') ||
      req.headers.get('x-stitch-signature') ||
      req.headers.get('x-paystack-signature') ||
      req.headers.get('stitch-signature') ||
      '';
    const webhookSecret = process.env.GATEWAY_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || 'whsec_local_dev_webhook_signing_secret_32b';

    if (!webhookSecret) {
      return NextResponse.json({ error: 'Gateway webhook secret is not configured' }, { status: 500 });
    }

    const result = await billingService.processPaymentWebhook(payload, signature, webhookSecret);

    if (!result.success && result.statusCode === 401) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json(result, { status: result.statusCode || 200 });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export interface CheckoutSession {
  url: string;
  sessionId: string;
}

export interface PaymentMethodToken {
  token: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
}

export interface ChargeResult {
  success: boolean;
  transactionId: string;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
}

export interface PaymentGatewayProvider {
  createHostedCheckoutSession(amount: number, currency: string, metadata: any): Promise<CheckoutSession>;
  tokenizePaymentMethod(sessionResult: any): Promise<PaymentMethodToken>;
  chargeRecurring(paymentMethodToken: string, amount: number): Promise<ChargeResult>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
  refund(chargeId: string, amount: number): Promise<RefundResult>;
}

export class UnconfiguredPaymentGateway implements PaymentGatewayProvider {
  async createHostedCheckoutSession(amount: number, currency: string, metadata: any): Promise<CheckoutSession> {
    throw new Error('Payment gateway provider is not configured.');
  }

  async tokenizePaymentMethod(sessionResult: any): Promise<PaymentMethodToken> {
    throw new Error('Payment gateway provider is not configured.');
  }

  async chargeRecurring(paymentMethodToken: string, amount: number): Promise<ChargeResult> {
    throw new Error('Payment gateway provider is not configured.');
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    return false;
  }

  async refund(chargeId: string, amount: number): Promise<RefundResult> {
    throw new Error('Payment gateway provider is not configured.');
  }
}

export class MockPaymentGateway implements PaymentGatewayProvider {
  private secret: string;

  constructor(secret: string = 'test_webhook_secret') {
    this.secret = secret;
  }

  async createHostedCheckoutSession(amount: number, currency: string, metadata: any): Promise<CheckoutSession> {
    return {
      url: `https://checkout.sandbox.payment.gateway/pay?session=sess_${Date.now()}`,
      sessionId: `sess_${Date.now()}`,
    };
  }

  async tokenizePaymentMethod(sessionResult: any): Promise<PaymentMethodToken> {
    return {
      token: `tok_sandbox_${Date.now()}`,
      last4: '4242',
      expiryMonth: '12',
      expiryYear: '2028',
    };
  }

  async chargeRecurring(paymentMethodToken: string, amount: number): Promise<ChargeResult> {
    return {
      success: true,
      transactionId: `txn_rec_${Date.now()}`,
    };
  }

  signPayload(payload: string, secret?: string): string {
    const key = secret || this.secret;
    const crypto = require('crypto');
    return crypto.createHmac('sha256', key).update(payload).digest('hex');
  }

  verifyWebhookSignature(payload: string, signature: string, secret?: string): boolean {
    const key = secret || this.secret;
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', key).update(payload).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return signature === expected;
    }
  }

  async refund(chargeId: string, amount: number): Promise<RefundResult> {
    return {
      success: true,
      refundId: `ref_${Date.now()}`,
    };
  }
}


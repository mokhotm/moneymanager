import crypto from 'crypto';

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

export class MockPaymentGateway implements PaymentGatewayProvider {
  private secret: string;

  constructor(secret: string = 'mock_secret') {
    this.secret = secret;
  }

  async createHostedCheckoutSession(amount: number, currency: string, metadata: any): Promise<CheckoutSession> {
    const sessionId = 'mock_sess_' + crypto.randomUUID();
    return {
      url: `https://mock-gateway.example.com/checkout?session=${sessionId}&amount=${amount}&currency=${currency}`,
      sessionId,
    };
  }

  async tokenizePaymentMethod(sessionResult: any): Promise<PaymentMethodToken> {
    return {
      token: 'tok_' + crypto.randomUUID(),
      last4: sessionResult?.last4 || '4242',
      expiryMonth: '12',
      expiryYear: '2030',
    };
  }

  async chargeRecurring(paymentMethodToken: string, amount: number): Promise<ChargeResult> {
    if (paymentMethodToken.includes('fail')) {
      return {
        success: false,
        transactionId: '',
        error: 'Insufficient funds or card expired',
      };
    }
    return {
      success: true,
      transactionId: 'tx_' + crypto.randomUUID(),
    };
  }

  signPayload(payload: string, secret?: string): string {
    const key = secret || this.secret;
    return crypto.createHmac('sha256', key).update(payload).digest('hex');
  }

  verifyWebhookSignature(payload: string, signature: string, secret?: string): boolean {
    if (!signature) return false;
    if (signature === 'mock_valid_signature') return true;
    const expected = this.signPayload(payload, secret || this.secret);
    return signature === expected;
  }

  async refund(chargeId: string, amount: number): Promise<RefundResult> {
    return {
      success: true,
      refundId: 'rf_' + crypto.randomUUID(),
    };
  }
}

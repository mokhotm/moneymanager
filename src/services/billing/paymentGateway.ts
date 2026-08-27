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


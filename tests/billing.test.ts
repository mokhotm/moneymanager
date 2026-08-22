import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService } from '../src/services/billing/billingService';
import { MockPaymentGateway } from '../src/services/billing/paymentGateway';
import { PaymentStatus, SubscriptionStatus, BillingPeriod } from '@prisma/client';

describe('v5 Billing & Payment Processing Engine (§17 / Scenarios AK–AP)', () => {
  let mockPrisma: any;
  let mockGateway: MockPaymentGateway;
  let billingService: BillingService;

  beforeEach(() => {
    mockGateway = new MockPaymentGateway('test_webhook_secret');

    mockPrisma = {
      subscriptionTier: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      pendingPayment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      userProfile: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      userSubscription: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
      agentRecommendation: {
        create: vi.fn(),
      },
      alert: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb: any) => cb(mockPrisma)),
    };

    billingService = new BillingService(mockPrisma, mockGateway);
  });

  // Scenario AK — Unauthenticated purchase attempt blocked
  it('Scenario AK: blocks unauthenticated purchase attempts and requires login', async () => {
    const unauthCheck1 = billingService.validateAuthentication(null);
    expect(unauthCheck1.authenticated).toBe(false);
    expect(unauthCheck1.error).toMatch(/Authentication required/i);

    const unauthCheck2 = billingService.validateAuthentication('unauthenticated');
    expect(unauthCheck2.authenticated).toBe(false);

    expect(() => {
      billingService.assertAuthenticated(null);
    }).toThrowError(/Authentication required/i);

    await expect(
      billingService.createCheckout({
        userId: '',
        tierId: 'tier_plus_123',
      })
    ).rejects.toThrowError(/Authentication required/i);

    expect(mockPrisma.pendingPayment.create).not.toHaveBeenCalled();
  });

  // Scenario AL — Successful card payment activates tier exactly once + idempotency
  it('Scenario AL: activates correct tier on signed webhook and handles replays idempotently', async () => {
    const pendingPayment = {
      id: 'pay_12345',
      userId: 'user_mokhotm',
      tierId: 'tier_plus_123',
      amount: 99,
      status: PaymentStatus.PENDING,
    };

    mockPrisma.pendingPayment.findUnique.mockResolvedValue(pendingPayment);
    mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'prof_123', userId: 'user_mokhotm' });

    const payloadObj = {
      pendingPaymentId: 'pay_12345',
      status: 'SUCCESS',
      billingPeriod: 'MONTHLY',
    };
    const payloadRaw = JSON.stringify(payloadObj);
    const validSignature = mockGateway.signPayload(payloadRaw, 'test_webhook_secret');

    // 1. Process valid webhook
    const result = await billingService.processPaymentWebhook(payloadRaw, validSignature, 'test_webhook_secret');

    expect(result.success).toBe(true);
    expect(result.activatedTierId).toBe('tier_plus_123');
    expect(mockPrisma.pendingPayment.update).toHaveBeenCalledWith({
      where: { id: 'pay_12345' },
      data: { status: PaymentStatus.SUCCESS },
    });
    expect(mockPrisma.userSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userProfileId: 'prof_123' },
        create: expect.objectContaining({
          tierId: 'tier_plus_123',
          status: SubscriptionStatus.ACTIVE,
        }),
      })
    );

    // 2. Replay identical webhook — must be idempotent with no duplicate updates
    mockPrisma.pendingPayment.findUnique.mockResolvedValue({
      ...pendingPayment,
      status: PaymentStatus.SUCCESS,
    });
    mockPrisma.userSubscription.upsert.mockClear();

    const replayResult = await billingService.processPaymentWebhook(payloadRaw, validSignature, 'test_webhook_secret');

    expect(replayResult.success).toBe(true);
    expect(replayResult.alreadyProcessed).toBe(true);
    expect(mockPrisma.userSubscription.upsert).not.toHaveBeenCalled();
  });

  // Scenario AM — Failed payment leaves tier unchanged
  it('Scenario AM: failed payment marks payment FAILED and leaves user tier unchanged', async () => {
    const pendingPayment = {
      id: 'pay_fail_001',
      userId: 'user_mokhotm',
      tierId: 'tier_premium_999',
      amount: 199,
      status: PaymentStatus.PENDING,
    };

    mockPrisma.pendingPayment.findUnique.mockResolvedValue(pendingPayment);

    const payloadObj = {
      pendingPaymentId: 'pay_fail_001',
      status: 'FAILED',
    };
    const payloadRaw = JSON.stringify(payloadObj);
    const signature = mockGateway.signPayload(payloadRaw, 'test_webhook_secret');

    const result = await billingService.processPaymentWebhook(payloadRaw, signature, 'test_webhook_secret');

    expect(result.success).toBe(false);
    expect(mockPrisma.pendingPayment.update).toHaveBeenCalledWith({
      where: { id: 'pay_fail_001' },
      data: { status: PaymentStatus.FAILED },
    });
    expect(mockPrisma.userSubscription.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.userProfile.update).not.toHaveBeenCalled();
  });

  // Scenario AN — EFT activates only on confirmed webhook, rejecting invalid signatures
  it('Scenario AN: rejects unconfirmed or invalid signature webhooks before activation', async () => {
    const payloadRaw = JSON.stringify({ pendingPaymentId: 'pay_eft_999', status: 'SUCCESS' });
    const invalidSignature = 'invalid_signature_hex';

    const result = await billingService.processPaymentWebhook(payloadRaw, invalidSignature, 'test_webhook_secret');

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(mockPrisma.pendingPayment.update).not.toHaveBeenCalled();
  });

  // Scenario AO — Failed recurring renewal triggers PAST_DUE grace period & raises Alert
  it('Scenario AO: failed renewal enters PAST_DUE grace period and creates dunning alert', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub_active_123',
      userProfileId: 'prof_mokhotm',
      status: SubscriptionStatus.ACTIVE,
      tier: { name: 'Plus Plan' },
    });

    mockPrisma.userSubscription.update.mockResolvedValue({
      status: SubscriptionStatus.PAST_DUE,
    });

    const result = await billingService.handleRenewalFailure('prof_mokhotm', 7);

    expect(result.status).toBe(SubscriptionStatus.PAST_DUE);
    expect(result.gracePeriodDays).toBe(7);
    expect(mockPrisma.userSubscription.update).toHaveBeenCalledWith({
      where: { userProfileId: 'prof_mokhotm' },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
    expect(mockPrisma.agentRecommendation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agent: 'COACH',
        title: expect.stringContaining('Grace Period'),
        description: expect.stringContaining('grace period'),
      }),
    });
  });

  // Scenario AP — Settlement is never routed to Luno or crypto destinations
  it('Scenario AP: strictly prohibits crypto / Luno settlement destinations and enforces merchant bank accounts', () => {
    // 1. Prohibit Luno / Crypto
    expect(() => {
      billingService.validateSettlementAccount({
        institution: 'Luno Crypto Exchange',
        accountNumberMasked: 'luno_btc_001928',
        accountType: 'Crypto Wallet',
      });
    }).toThrowError(/Invalid settlement destination.*crypto exchange/i);

    expect(() => {
      billingService.validateSettlementAccount({
        institution: 'VALR Exchange',
        accountNumberMasked: 'valr_zar_001928',
        accountType: 'Crypto Account',
      });
    }).toThrowError(/Invalid settlement destination.*crypto exchange/i);

    // 2. Allow verified South African registered merchant bank account
    const validResult = billingService.validateSettlementAccount({
      institution: 'Standard Bank of South Africa',
      accountNumberMasked: '0029-xxxx-xxxx-1902',
      accountType: 'Business Cheque / Merchant Account',
    });

    expect(validResult.valid).toBe(true);
  });
});

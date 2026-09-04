import { PrismaClient, PaymentStatus, SubscriptionStatus, BillingPeriod, UrgencyFlag } from '@prisma/client';
import { PaymentGatewayProvider, getPaymentGatewayProvider } from './paymentGateway';
import crypto from 'crypto';

export class BillingService {
  private prisma: PrismaClient;
  private gateway: PaymentGatewayProvider | null;

  constructor(prismaClient?: PrismaClient, gatewayProvider?: PaymentGatewayProvider) {
    this.prisma = prismaClient || new PrismaClient();
    this.gateway = gatewayProvider || null;
  }

  async getGateway(): Promise<PaymentGatewayProvider> {
    if (!this.gateway) {
      this.gateway = await getPaymentGatewayProvider(this.prisma);
    }
    return this.gateway;
  }

  /**
   * §17.1 / Scenario AK: Unauthenticated visitors cannot purchase a tier
   */
  validateAuthentication(userId?: string | null): { authenticated: boolean; error?: string } {
    if (!userId || userId.trim() === '' || userId === 'unauthenticated') {
      const errorMsg = 'Authentication required. Please sign in or create an account to subscribe to a plan.';
      return {
        authenticated: false,
        error: errorMsg,
      };
    }
    return { authenticated: true };
  }

  assertAuthenticated(userId?: string | null): void {
    const check = this.validateAuthentication(userId);
    if (!check.authenticated) {
      throw new Error(check.error || 'Authentication required.');
    }
  }

  /**
   * §17.5 / Step 1-3: Initiates checkout session with idempotency
   */
  async createCheckout(params: {
    userId: string;
    tierId: string;
    billingPeriod?: BillingPeriod;
    gatewayId?: string;
  }) {
    this.assertAuthenticated(params.userId);

    const tier = await this.prisma.subscriptionTier.findUnique({
      where: { id: params.tierId },
    });

    if (!tier || !tier.isActive) {
      throw new Error('Selected subscription tier is invalid or inactive');
    }

    const isAnnual = params.billingPeriod === BillingPeriod.ANNUAL;
    const amount = isAnnual && tier.priceAnnual != null
      ? Number(tier.priceAnnual)
      : Number(tier.priceMonthly);

    const idempotencyKey = crypto.randomUUID();

    const pendingPayment = await this.prisma.pendingPayment.create({
      data: {
        userId: params.userId,
        tierId: params.tierId,
        amount,
        idempotencyKey,
        status: PaymentStatus.PENDING,
      },
    });

    const gateway = await this.getGateway();
    const session = await gateway.createHostedCheckoutSession(amount, 'ZAR', {
      pendingPaymentId: pendingPayment.id,
      idempotencyKey,
      userId: params.userId,
      tierId: params.tierId,
      billingPeriod: params.billingPeriod || BillingPeriod.MONTHLY,
    });

    return {
      pendingPaymentId: pendingPayment.id,
      idempotencyKey,
      checkoutUrl: session.url,
      sessionId: session.sessionId,
      amount,
      currency: 'ZAR',
    };
  }

  /**
   * §17.5 / Scenario AL, AM, AN: Process signed webhook callback exactly once
   */
  async processPaymentWebhook(payloadRaw: string, signature: string, secret: string) {
    if (!secret) {
      return { success: false, statusCode: 500, error: 'Webhook secret is not configured' };
    }
    const gateway = await this.getGateway();
    const isValid = gateway.verifyWebhookSignature(payloadRaw, signature, secret);
    if (!isValid) {
      return { success: false, statusCode: 401, error: 'Invalid webhook signature' };
    }

    const payload = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : payloadRaw;
    const { pendingPaymentId, status, billingPeriod = 'MONTHLY' } = payload;

    if (!pendingPaymentId) {
      return { success: false, statusCode: 400, error: 'Missing pendingPaymentId' };
    }

    const pendingPayment = await this.prisma.pendingPayment.findUnique({
      where: { id: pendingPaymentId },
    });

    if (!pendingPayment) {
      return { success: false, statusCode: 404, error: 'Pending payment record not found' };
    }

    // Scenario AL: Idempotency protection — if already SUCCESS, no further changes
    if (pendingPayment.status === PaymentStatus.SUCCESS) {
      return {
        success: true,
        statusCode: 200,
        message: 'Payment already processed and activated (idempotent)',
        alreadyProcessed: true,
      };
    }

    if (status === 'success' || status === 'SUCCESS') {
      await this.prisma.$transaction(async (tx) => {
        // Mark payment successful
        await tx.pendingPayment.update({
          where: { id: pendingPayment.id },
          data: { status: PaymentStatus.SUCCESS },
        });

        // Ensure user profile exists
        let profile = await tx.userProfile.findUnique({
          where: { userId: pendingPayment.userId },
        });

        if (!profile) {
          profile = await tx.userProfile.create({
            data: {
              userId: pendingPayment.userId,
            },
          });
        }

        const now = new Date();
        const periodEnd = new Date(now);
        if (billingPeriod === 'ANNUAL') {
          periodEnd.setFullYear(now.getFullYear() + 1);
        } else {
          periodEnd.setMonth(now.getMonth() + 1);
        }

        // Upsert active subscription
        await tx.userSubscription.upsert({
          where: { userProfileId: profile.id },
          update: {
            tierId: pendingPayment.tierId,
            status: SubscriptionStatus.ACTIVE,
            billingPeriod: billingPeriod === 'ANNUAL' ? BillingPeriod.ANNUAL : BillingPeriod.MONTHLY,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            autoRenew: true,
          },
          create: {
            userProfileId: profile.id,
            tierId: pendingPayment.tierId,
            status: SubscriptionStatus.ACTIVE,
            billingPeriod: billingPeriod === 'ANNUAL' ? BillingPeriod.ANNUAL : BillingPeriod.MONTHLY,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            autoRenew: true,
          },
        });

        // Update cached tier pointer in UserProfile
        await tx.userProfile.update({
          where: { id: profile.id },
          data: { subscriptionTierId: pendingPayment.tierId },
        });
      });

      return { success: true, statusCode: 200, activatedTierId: pendingPayment.tierId };
    } else {
      // Scenario AM: Failed payment leaves tier unchanged
      await this.prisma.pendingPayment.update({
        where: { id: pendingPayment.id },
        data: { status: PaymentStatus.FAILED },
      });

      return {
        success: false,
        statusCode: 200,
        message: 'Payment failed at gateway. Subscription tier was not changed.',
      };
    }
  }

  /**
   * §17.5 Step 9 / Scenario AO: Failed recurring renewal enters PAST_DUE grace period & raises Alert
   */
  async handleRenewalFailure(userProfileId: string, graceDays: number = 7) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userProfileId },
      include: { tier: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updated = await this.prisma.userSubscription.update({
      where: { userProfileId },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });

    // Create dunning recommendation
    await this.prisma.agentRecommendation.create({
      data: {
        agent: 'COACH',
        title: `Subscription Renewal Grace Period (${subscription.tier.name})`,
        description: `Your subscription renewal for ${subscription.tier.name} failed. You have a ${graceDays}-day grace period to update payment details before access expires.`,
        rationale: 'Preserve user tier entitlements while resolving billing gateway dunning.',
        payload: { userProfileId, subscriptionId: subscription.id, graceDays },
        status: 'PENDING',
      },
    });

    return {
      status: updated.status,
      gracePeriodDays: graceDays,
      message: 'Subscription marked PAST_DUE. Entitlements preserved during grace period.',
    };
  }

  /**
   * §17.4 / Scenario AP: Settlement account configuration validation
   * Prohibits crypto exchanges (e.g., Luno) and requires registered merchant bank accounts.
   */
  validateSettlementAccount(account: {
    institution: string;
    accountNumberMasked: string;
    accountType: string;
  }) {
    const prohibitedKeywords = ['luno', 'crypto', 'valr', 'binance', 'wallet_crypto', 'exchange'];
    const instLower = (account.institution || '').toLowerCase();
    const typeLower = (account.accountType || '').toLowerCase();

    for (const keyword of prohibitedKeywords) {
      if (instLower.includes(keyword) || typeLower.includes(keyword)) {
        throw new Error(
          `Invalid settlement destination: Direct settlement to crypto exchange / wallet '${account.institution}' is prohibited per §17.4. Payouts must settle to a verified South African merchant bank account. Crypto diversification must be modeled as a post-settlement treasury transfer.`
        );
      }
    }

    const recognizedBankKeywords = ['bank', 'cheque', 'current', 'commercial', 'corporate', 'merchant', 'business'];
    const isRecognized = recognizedBankKeywords.some(k => instLower.includes(k) || typeLower.includes(k));

    if (!isRecognized) {
      throw new Error(
        `Invalid settlement destination: Institution '${account.institution}' must be a registered merchant banking institution.`
      );
    }

    return { valid: true };
  }
}

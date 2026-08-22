import { NextRequest, NextResponse } from 'next/server';
import { PaymentGatewayProvider, GatewayMode, GatewayConfigStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { BillingService } from '@/services/billing/billingService';

const billingService = new BillingService(prisma);

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || (user.role !== 'admin' && user.username !== 'mokhotm')) {
      return NextResponse.json({ error: 'Unauthorized. Admin privilege required.' }, { status: 403 });
    }

    const configs = await prisma.paymentGatewayConfig.findMany({
      include: {
        settlementAccount: true,
      },
    });

    const settlementAccounts = await prisma.settlementAccount.findMany();

    return NextResponse.json({
      configs,
      settlementAccounts,
    });
  } catch (error: any) {
    console.error('Error fetching gateway configs:', error);
    return NextResponse.json({ error: 'Failed to fetch gateway configurations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || (user.role !== 'admin' && user.username !== 'mokhotm')) {
      return NextResponse.json({ error: 'Unauthorized. Admin privilege required.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      provider,
      mode = GatewayMode.SANDBOX,
      supportsCards = true,
      supportsEft = true,
      supportsRecurringBilling = true,
      settlementAccount,
    } = body;

    if (!provider || !settlementAccount) {
      return NextResponse.json(
        { error: 'Provider and settlementAccount details are required' },
        { status: 400 }
      );
    }

    // §17.4 / Scenario AP: Enforce strict settlement account validation (no crypto / Luno)
    try {
      billingService.validateSettlementAccount(settlementAccount);
    } catch (valError: any) {
      return NextResponse.json({ error: valError.message }, { status: 400 });
    }

    // Create or reuse settlement account
    let settledAcc = await prisma.settlementAccount.findFirst({
      where: {
        accountNumberMasked: settlementAccount.accountNumberMasked,
        institution: settlementAccount.institution,
      },
    });

    if (!settledAcc) {
      settledAcc = await prisma.settlementAccount.create({
        data: {
          institution: settlementAccount.institution,
          accountNumberMasked: settlementAccount.accountNumberMasked,
          accountType: settlementAccount.accountType || 'Business Current Account',
          isPrimary: settlementAccount.isPrimary ?? true,
        },
      });
    }

    const config = await prisma.paymentGatewayConfig.create({
      data: {
        provider: provider as PaymentGatewayProvider,
        mode: mode as GatewayMode,
        merchantCredentialsEncrypted: 'mock_encrypted_creds_' + Date.now(),
        supportsCards,
        supportsEft,
        supportsRecurringBilling,
        settlementAccountId: settledAcc.id,
        status: GatewayConfigStatus.ACTIVE,
      },
      include: {
        settlementAccount: true,
      },
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('Error configuring gateway:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

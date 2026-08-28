import { NextRequest, NextResponse } from 'next/server';
import { PaymentGatewayProvider, GatewayMode, GatewayConfigStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { BillingService } from '@/services/billing/billingService';
import crypto from 'crypto';

const billingService = new BillingService(prisma);

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'moneymanager_default_super_secure_vault_key_2026';
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptCredentials(data: any): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'admin') {
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
    if (!user || user.role !== 'admin') {
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
      merchantCredentials,
      merchantCredentialsEncrypted,
    } = body;

    if (!provider || !settlementAccount) {
      return NextResponse.json(
        { error: 'Provider and settlementAccount details are required' },
        { status: 400 }
      );
    }

    let finalEncrypted = merchantCredentialsEncrypted;
    if (!finalEncrypted && merchantCredentials) {
      finalEncrypted = encryptCredentials(merchantCredentials);
    }

    if (!finalEncrypted) {
      return NextResponse.json(
        { error: 'Merchant credentials are required' },
        { status: 400 }
      );
    }

    // Mask raw account number if full number provided
    let rawAccNum = settlementAccount.accountNumber || settlementAccount.accountNumberMasked || '•••• 0000';
    let maskedAccNum = rawAccNum;
    if (!rawAccNum.includes('•') && rawAccNum.length > 4) {
      maskedAccNum = `•••• ${rawAccNum.slice(-4)}`;
    }

    const normalizedSettlement = {
      institution: settlementAccount.institution || 'First National Bank (FNB)',
      accountNumberMasked: maskedAccNum,
      accountType: settlementAccount.accountType || 'Business Cheque Account',
      isPrimary: settlementAccount.isPrimary ?? true,
    };

    // Enforce strict settlement account validation (no crypto / Luno)
    try {
      billingService.validateSettlementAccount(normalizedSettlement);
    } catch (valError: any) {
      return NextResponse.json({ error: valError.message }, { status: 400 });
    }

    // Create or reuse settlement account
    let settledAcc = await prisma.settlementAccount.findFirst({
      where: {
        accountNumberMasked: normalizedSettlement.accountNumberMasked,
        institution: normalizedSettlement.institution,
      },
    });

    if (!settledAcc) {
      settledAcc = await prisma.settlementAccount.create({
        data: normalizedSettlement,
      });
    } else {
      settledAcc = await prisma.settlementAccount.update({
        where: { id: settledAcc.id },
        data: {
          accountType: normalizedSettlement.accountType,
          isPrimary: true,
        },
      });
    }

    // Check if configuration already exists for this provider
    const existingConfig = await prisma.paymentGatewayConfig.findFirst({
      where: { provider: provider as PaymentGatewayProvider },
    });

    let config;
    if (existingConfig) {
      config = await prisma.paymentGatewayConfig.update({
        where: { id: existingConfig.id },
        data: {
          mode: mode as GatewayMode,
          merchantCredentialsEncrypted: finalEncrypted,
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
    } else {
      config = await prisma.paymentGatewayConfig.create({
        data: {
          provider: provider as PaymentGatewayProvider,
          mode: mode as GatewayMode,
          merchantCredentialsEncrypted: finalEncrypted,
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
    }

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('Error configuring gateway:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

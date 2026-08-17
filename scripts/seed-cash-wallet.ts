import { PrismaClient, FlowType, FlowEndpointType, FlowConfidence, AccountType } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAndSeedCashWallet() {
  const userId = 'cmss0o4qk000agythu0bm5hxf'; // mokhotm

  // 1. Ensure Cash Wallet Account exists
  let cashAccount = await prisma.account.findFirst({
    where: { userId, type: AccountType.CASH_WALLET },
  });

  if (!cashAccount) {
    cashAccount = await prisma.account.create({
      data: {
        user: { connect: { id: userId } },
        name: 'Physical Cash Wallet',
        institution: 'Physical Cash',
        accountNumberMasked: 'CASH-WALLET-01',
        type: AccountType.CASH_WALLET,
        currency: 'ZAR',
        openingBalance: 850.00,
        isAsset: true,
        isDebt: false,
        notes: 'Physical cash on hand for domestic worker, garden services, and cash expenses',
      },
    });
  }

  console.log('Cash Wallet Account ID:', cashAccount.id);

  // 2. Find cheque account for ATM source
  const chequeAccount = await prisma.account.findFirst({
    where: { userId, type: AccountType.CURRENT },
  });

  // 3. Clear old cash flows for this cash account
  await prisma.moneyFlow.deleteMany({
    where: {
      OR: [
        { destinationRef: cashAccount.id },
        { sourceRef: cashAccount.id },
      ],
    },
  });

  // 4. Seed ATM Withdrawal and Specific Domestic & Garden Cash Expenses
  const flowsToCreate = [
    {
      sourceType: FlowEndpointType.ACCOUNT,
      sourceRef: chequeAccount?.id || 'standard-bank-cheque',
      destinationType: FlowEndpointType.CASH_WALLET,
      destinationRef: cashAccount.id,
      amount: 2500.00,
      currentAmount: 2500.00,
      flowType: FlowType.CASH_WITHDRAWAL,
      confidence: FlowConfidence.CONFIRMED,
      createdAt: new Date('2026-08-01T09:30:00Z'),
    },
    {
      sourceType: FlowEndpointType.CASH_WALLET,
      sourceRef: cashAccount.id,
      destinationType: FlowEndpointType.EXTERNAL,
      destinationRef: 'Domestic Worker Cash Wage (Cleaning & Housekeeping)',
      amount: 950.00,
      currentAmount: 950.00,
      flowType: FlowType.CASH_SPENDING,
      confidence: FlowConfidence.CONFIRMED,
      createdAt: new Date('2026-08-03T14:00:00Z'),
    },
    {
      sourceType: FlowEndpointType.CASH_WALLET,
      sourceRef: cashAccount.id,
      destinationType: FlowEndpointType.EXTERNAL,
      destinationRef: 'Garden Services & Grounds Maintenance',
      amount: 700.00,
      currentAmount: 700.00,
      flowType: FlowType.CASH_SPENDING,
      confidence: FlowConfidence.CONFIRMED,
      createdAt: new Date('2026-08-05T11:15:00Z'),
    },
  ];

  for (const f of flowsToCreate) {
    await prisma.moneyFlow.create({ data: f });
  }

  // Update cash wallet balance: 2500 - 950 - 700 = 850
  await prisma.account.update({
    where: { id: cashAccount.id },
    data: { openingBalance: 850.00 },
  });

  console.log('Successfully seeded ATM withdrawal (R2,500), Domestic Worker (R950), and Garden Services (R700) for mokhotm!');
}

checkAndSeedCashWallet().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient, BudgetCategory, BalanceConfidence } from '@prisma/client';
const prisma = new PrismaClient();

async function seedBudgetAndSubscriptions() {
  const userId = 'cmss0o4qk000agythu0bm5hxf'; // user mokhotm
  const monthKey = '2026-08';

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error('User not found!');
    return;
  }

  // Define comprehensive budget line items matching actual bank statements & subscriptions
  const budgetItems = [
    // Fixed Household & Subscriptions
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Netflix ZA Subscription',
      amount: 229.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Recurring monthly streaming debit from Titanium Credit Card',
      sourceRef: 'statement:XXXX4469:netflix',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Google Workspace & AI Premium (Antigravity)',
      amount: 450.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Developer & AI cloud services subscription',
      sourceRef: 'statement:google_cloud',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Vodacom Mobile Fibre & Cellular',
      amount: 1499.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Monthly recurring connectivity contract',
      sourceRef: 'account:vodacom',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Ekurhuleni Rates & Electricity',
      amount: 3900.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Municipal utilities & rates',
      sourceRef: 'account:municipal',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Short-Term Comprehensive Insurance',
      amount: 1850.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Vehicle and household contents cover',
      sourceRef: 'insurance:debit',
      isComputed: false,
    },

    // Family & Discretionary
    {
      category: BudgetCategory.FAMILY_AND_DISCRETIONARY,
      label: 'Groceries & Household Supplies',
      amount: 6500.00,
      confidence: BalanceConfidence.ESTIMATED,
      note: 'Woolworths / Pick n Pay monthly allocation',
      isComputed: false,
    },
    {
      category: BudgetCategory.FAMILY_AND_DISCRETIONARY,
      label: 'Fuel & Transportation',
      amount: 3200.00,
      confidence: BalanceConfidence.ESTIMATED,
      note: 'Monthly fuel and toll costs',
      isComputed: false,
    },
    {
      category: BudgetCategory.FAMILY_AND_DISCRETIONARY,
      label: 'Family Discretionary & Dining',
      amount: 2500.00,
      confidence: BalanceConfidence.ESTIMATED,
      note: 'Restaurants, weekends, and entertainment',
      isComputed: false,
    },

    // Goal Contributions
    {
      category: BudgetCategory.GOAL_CONTRIBUTIONS,
      label: 'Nedbank Emergency Reserve Allocation',
      amount: 15000.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Monthly transfer to liquid savings',
      sourceRef: 'goal:emergency_fund',
      isComputed: true,
    },

    // Debt Acceleration Plan (Contractual minimums)
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Standard Bank Home Loan Minimum',
      amount: 14500.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Contractual bond repayment',
      sourceRef: 'debt:homeloan',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'WesBank Vehicle Finance Minimum',
      amount: 3800.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Vehicle instalment',
      sourceRef: 'debt:wesbank',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Personal Loan Contractual Minimum',
      amount: 2010.03,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Fixed instalment personal loan',
      sourceRef: 'debt:personalloan',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Telkom Debt Settlement',
      amount: 2000.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Agreed settlement monthly payment',
      sourceRef: 'debt:telkom',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Titanium Credit Card Minimum',
      amount: 700.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Credit card contractual minimum payment',
      sourceRef: 'debt:creditcard',
      isComputed: true,
    },
  ];

  // Upsert or recreate for current month
  await prisma.budgetLineItem.deleteMany({
    where: { userId, month: monthKey },
  });

  for (const item of budgetItems) {
    await prisma.budgetLineItem.create({
      data: {
        userId,
        month: monthKey,
        ...item,
      },
    });
  }

  console.log(`Successfully seeded ${budgetItems.length} budget line items for user mokhotm (${monthKey}).`);

  // Also seed previous month (2026-07)
  await prisma.budgetLineItem.deleteMany({
    where: { userId, month: '2026-07' },
  });

  for (const item of budgetItems) {
    await prisma.budgetLineItem.create({
      data: {
        userId,
        month: '2026-07',
        ...item,
      },
    });
  }

  // Ensure UserProfile is linked
  let profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.userProfile.create({
      data: {
        userId,
        fullName: 'Ezrom Mokhotla',
        jobTitle: 'Wealth Manager',
        employerName: 'SARS',
        taxReference: '9843920194',
        preferredCurrency: 'ZAR',
      },
    });
    console.log('Created UserProfile for mokhotm.');
  }
}

seedBudgetAndSubscriptions().catch(console.error).finally(() => prisma.$disconnect());

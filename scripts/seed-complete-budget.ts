import { PrismaClient, BudgetCategory, BalanceConfidence } from '@prisma/client';
const prisma = new PrismaClient();

export async function seedCompleteBudget() {
  const user = await prisma.user.findFirst({
    where: { username: 'mokhotm' }
  });

  if (!user) {
    console.error('User mokhotm not found!');
    return;
  }

  const userId = user.id;
  console.log(`Found user: ${user.username} (${userId})`);

  // Complete, verified list of actual obligations & allocations matching source documents
  const comprehensiveBudgetItems = [
    // 1. Fixed Household Obligations & Subscriptions (Bank Account Outflows)
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Vodacom Mobile Fibre & Cellular',
      amount: 1499.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Monthly recurring connectivity contract & mobile lines (071 282 1432 & 077 986 82053)',
      sourceRef: 'account:vodacom',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Ekurhuleni Rates & Electricity',
      amount: 3900.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'City of Ekurhuleni municipal utilities, water, electricity & property rates',
      sourceRef: 'account:municipal',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Short-Term Comprehensive Insurance',
      amount: 1850.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Vehicle comprehensive cover & household asset protection',
      sourceRef: 'insurance:debit',
      isComputed: false,
    },
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
      label: 'Banking Account Fees & Overdraft Service Charges',
      amount: 593.49,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Standard Bank Prestige account fee & bundled transactional charges',
      sourceRef: 'statement:standardbank',
      isComputed: false,
    },

    // 2. Debt Acceleration Plan (Contractual Debts & DebiCheck Minimums)
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Standard Bank Home Loan Minimum',
      amount: 14500.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Primary mortgage bond contractual repayment',
      sourceRef: 'debt:homeloan',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Standard Bank Revolving Credit Plan Minimum',
      amount: 7457.66,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Revolving credit facility contractual minimum instalment',
      sourceRef: 'debt:rcp',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'WesBank Vehicle Finance (Hyundai Grand i10)',
      amount: 722.13,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Hyundai Grand i10 DebiCheck debit order (Account: 85401320912)',
      sourceRef: 'debt:wesbank',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Nedbank Personal Loan Instalment',
      amount: 2010.03,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Fixed instalment personal loan contract (PLN 152327766)',
      sourceRef: 'debt:personalloan',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Telkom Debt Settlement',
      amount: 2000.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Agreed settlement monthly payment plan',
      sourceRef: 'debt:telkom',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'University Fees Payment Plan',
      amount: 2660.30,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'University tertiary tuition fee payment arrangement',
      sourceRef: 'debt:university',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'School Fees Arrears Payment',
      amount: 1333.33,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Bakerton school fees arrears structured payment plan',
      sourceRef: 'debt:schoolfees',
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
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Municipal Arrears Arrangement',
      amount: 650.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Structured municipal arrears arrangement payment',
      sourceRef: 'debt:municipal_arrears',
      isComputed: true,
    },

    // 3. Goal Contributions (Savings Reserves)
    {
      category: BudgetCategory.GOAL_CONTRIBUTIONS,
      label: 'Nedbank Emergency Reserve Allocation',
      amount: 15000.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Monthly priority allocation to liquid emergency savings',
      sourceRef: 'goal:emergency_fund',
      isComputed: true,
    },

    // 4. Family & Discretionary (Variable & Everyday Living)
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
      note: 'Monthly fuel, toll, and routine vehicle costs',
      isComputed: false,
    },
    {
      category: BudgetCategory.FAMILY_AND_DISCRETIONARY,
      label: 'Family Discretionary & Dining',
      amount: 2500.00,
      confidence: BalanceConfidence.ESTIMATED,
      note: 'Restaurants, weekends, and family leisure entertainment',
      isComputed: false,
    },
  ];

  // Target months to seed: 2026-07, 2026-08, 2026-09, 2026-12 (so whichever month is viewed, complete data is loaded)
  const targetMonths = ['2026-07', '2026-08', '2026-09', '2026-12'];

  for (const m of targetMonths) {
    await prisma.budgetLineItem.deleteMany({
      where: { userId, month: m }
    });

    for (const item of comprehensiveBudgetItems) {
      await prisma.budgetLineItem.create({
        data: {
          userId,
          month: m,
          category: item.category,
          label: item.label,
          amount: item.amount,
          confidence: item.confidence,
          note: item.note,
          sourceRef: item.sourceRef,
          isComputed: item.isComputed,
        }
      });
    }
    console.log(`Seeded ${comprehensiveBudgetItems.length} budget items for month [${m}].`);
  }

  // Ensure UserProfile exists
  const existingProfile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!existingProfile) {
    await prisma.userProfile.create({
      data: {
        userId,
        firstName: 'Ezrom Mote',
        lastName: 'Mokhotla',
        fullName: 'Ezrom Mote Mokhotla',
        jobTitle: 'Senior Specialist Developer (NAT/MS/JAVA)',
        employerName: 'South African Revenue Service (SARS)',
        taxReference: '0123279143',
        preferredCurrency: 'ZAR',
      }
    });
    console.log('Created UserProfile for mokhotm.');
  }

  console.log('Successfully completed budget synchronization for user mokhotm.');
}

if (require.main === module) {
  seedCompleteBudget().catch(console.error).finally(() => prisma.$disconnect());
}

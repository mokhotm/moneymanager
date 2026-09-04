import { PrismaClient, BudgetCategory, BalanceConfidence } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { username: 'mokhotm' }
  });

  if (!user) {
    console.error('User mokhotm not found!');
    return;
  }

  const userId = user.id;

  // 100% Ground Truth from Standard Bank Current Account (XXXX4469), Credit Card (XXXX3529),
  // Revolving Credit (XXXX5510), WesBank, Nedbank, Ekurhuleni, and Vodacom statements.
  const verifiedBankStatementBudget = [
    // --- 1. FIXED HOUSEHOLD OBLIGATIONS & SUBSCRIPTIONS ---
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Discovery Insure (Short-Term Vehicle & Asset Cover)',
      amount: 5390.80,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Comprehensive vehicle and property short-term insurance (Policy: 89597389)',
      sourceRef: 'statement:XXXX4469:discinsure',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Discovery Life (Personal Protection & Risk Cover)',
      amount: 1697.28,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Personal life and disability policy cover (Policy: 5131714297)',
      sourceRef: 'statement:XXXX4469:disclife',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Ekurhuleni Municipal Rates & Electricity',
      amount: 3423.83,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'City of Ekurhuleni base rates, electricity, water & refuse (Acc: 3505137295)',
      sourceRef: 'account:municipal',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Vodacom Mobile Fibre & Cellular',
      amount: 1499.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Vodacom mobile contracts (071 282 1432 & 077 986 82053) & home fibre (Acc: I2754234-5)',
      sourceRef: 'account:vodacom',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Banking Account Fees & Overdraft Service Charges',
      amount: 593.49,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Prestige account fee (R260), overdraft service fee (R69) & transaction fees',
      sourceRef: 'statement:XXXX4469:fees',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Vehicle Tracking & Telematics (Cartrack & Tracker)',
      amount: 403.49,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Cartrack (R204.49) + Tracker (R199.00) vehicle security recovery units',
      sourceRef: 'statement:XXXX4469:tracking',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Google Workspace & AI Premium (Antigravity)',
      amount: 450.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Developer cloud and AI platform subscription',
      sourceRef: 'statement:google_cloud',
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: 'Netflix ZA Subscription',
      amount: 229.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Monthly streaming entertainment debit on Titanium Credit Card',
      sourceRef: 'statement:XXXX3529:netflix',
      isComputed: false,
    },

    // --- 2. DEBT ACCELERATION PLAN (CONTRACTUAL DEBTS & DEBICHECK ORDERS) ---
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Standard Bank Home Loan (Bond Repayment)',
      amount: 17786.45,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Primary mortgage bond repayment debit order (Account: SBSA HOMEL 534812597)',
      sourceRef: 'statement:XXXX4469:sbsa_homel',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Standard Bank Revolving Credit Plan Minimum',
      amount: 7457.66,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Revolving credit facility contractual minimum DebiCheck (Acc: 22043551000022)',
      sourceRef: 'statement:XXXX4469:sbsa_rcp',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'WesBank Vehicle Finance (Renault Clio V)',
      amount: 5468.02,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Renault Clio V 1.0t Zen DebiCheck debit order (Acc: 85361174582)',
      sourceRef: 'statement:XXXX4469:wesbank_clio',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'WesBank Vehicle Finance (Hyundai Grand i10)',
      amount: 722.13,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Hyundai Grand i10 1.0 Fluid DebiCheck debit order (Acc: 85401320912)',
      sourceRef: 'statement:XXXX4469:wesbank_i10',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'University Fees Payment Plan',
      amount: 2660.30,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Tertiary university tuition structured payment arrangement',
      sourceRef: 'debt:university',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Nedbank Personal Loan Instalment',
      amount: 2010.03,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Fixed personal loan instalment DebiCheck debit order (Acc: PLN 152327766)',
      sourceRef: 'statement:XXXX4469:nedbank_loan',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Telkom Debt Settlement Arrangement',
      amount: 2000.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Agreed structured settlement monthly repayment for overdue lines',
      sourceRef: 'debt:telkom',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'School Fees Arrears Payment Plan',
      amount: 1333.33,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Bakerton school fees arrears monthly arrangement',
      sourceRef: 'debt:schoolfees',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Standard Bank Titanium Credit Card Minimum',
      amount: 700.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Titanium Prestige credit card contractual minimum payment (5239-xxxx-xxxx-3529)',
      sourceRef: 'statement:XXXX3529:min',
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: 'Ekurhuleni Municipal Arrears Arrangement',
      amount: 650.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Structured municipal arrears repayment arrangement',
      sourceRef: 'debt:municipal_arrears',
      isComputed: true,
    },

    // --- 3. GOAL CONTRIBUTIONS & RESERVES ---
    {
      category: BudgetCategory.GOAL_CONTRIBUTIONS,
      label: 'Nedbank Emergency Reserve Allocation',
      amount: 5000.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: 'Monthly liquid emergency fund contribution',
      sourceRef: 'goal:emergency_fund',
      isComputed: true,
    },

    // --- 4. FAMILY & DISCRETIONARY (EVERYDAY LIVING) ---
    {
      category: BudgetCategory.FAMILY_AND_DISCRETIONARY,
      label: 'Groceries & Household Supplies',
      amount: 6500.00,
      confidence: BalanceConfidence.ESTIMATED,
      note: 'SuperSpar, Woolworths & Pick n Pay monthly allocation',
      sourceRef: null,
      isComputed: false,
    },
    {
      category: BudgetCategory.FAMILY_AND_DISCRETIONARY,
      label: 'Fuel & Transportation',
      amount: 3200.00,
      confidence: BalanceConfidence.ESTIMATED,
      note: 'Engen, TotalEnergies fuel and routine toll fees',
      sourceRef: null,
      isComputed: false,
    },
    {
      category: BudgetCategory.FAMILY_AND_DISCRETIONARY,
      label: 'Family Discretionary & Dining',
      amount: 2500.00,
      confidence: BalanceConfidence.ESTIMATED,
      note: 'Family allowances, weekend dining & leisure',
      sourceRef: null,
      isComputed: false,
    },
  ];

  const targetMonths = ['2026-07', '2026-08'];

  for (const m of targetMonths) {
    await prisma.budgetLineItem.deleteMany({
      where: { userId, month: m }
    });

    for (const item of verifiedBankStatementBudget) {
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
    console.log(`Synchronized ${verifiedBankStatementBudget.length} items for month [${m}].`);
  }

  // Also update Debt table for Standard Bank Home Loan currentBalance & minimumPayment
  const homeloanAccount = await prisma.account.findFirst({
    where: { userId, name: { contains: 'Home Loan', mode: 'insensitive' } }
  });
  if (homeloanAccount) {
    await prisma.debt.updateMany({
      where: { accountId: homeloanAccount.id },
      data: {
        minimumPayment: 17786.45,
        balanceSource: 'Standard Bank Statement (XXXX4469 / SBSA HOMEL 534812597)',
      }
    });
    console.log('Updated Standard Bank Home Loan debt record with minimumPayment: R 17,786.45');
  }

  console.log('Successfully completed full bank statement alignment for mokhotm.');
}

main().catch(console.error).finally(() => prisma.$disconnect());

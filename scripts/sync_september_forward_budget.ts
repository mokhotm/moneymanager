import { PrismaClient, BudgetCategory, BalanceConfidence } from "@prisma/client";

const prisma = new PrismaClient();

async function syncSeptemberForwardBudget() {
  console.log("Starting September Forward Budget Realignment...");

  const user = await prisma.user.findFirst({
    where: { username: "mokhotm" },
    include: { profile: true },
  });

  if (!user) {
    throw new Error("Primary user 'mokhotm' not found in database.");
  }

  const userId = user.id;

  // 1. Update UserProfile with verified South African ID Number
  await prisma.userProfile.update({
    where: { userId },
    data: {
      idNumber: "7508245305086",
    },
  });
  console.log("✅ Updated UserProfile with verified RSA ID: 7508245305086");

  // 2. Define realigned 22 budget line items for September 2026 onwards:
  // - Vehicle Tracking (Cartrack & Tracker) REMOVED (Cancelled: R 403.49 savings)
  // - Vodacom adjusted to Home Openserve Fibre only: R 864.61 (Cellular lines cancelled: R 634.39 savings)
  // - Car Transmission Repair Sinking Fund increased by R 1,037.88 -> R 11,133.04
  // - Discovery Insure remains REMOVED (Confirmed cancelled)
  // - One-off August expenses (Brakes R3,812.25, Vacation R5,920) sunset
  const forwardBudgetItems = [
    // ── FIXED HOUSEHOLD OBLIGATIONS (R 10,310.93) ──
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: "Ekurhuleni Property Rates, Water & Refuse",
      amount: 3423.83,
      confidence: BalanceConfidence.CONFIRMED,
      note: "City of Ekurhuleni property rates, refuse removal, water & sanitation (Acc: 3505137295)",
      sourceRef: "account:municipal",
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: "Domestic Worker Cash Wage (Cleaning & Housekeeping)",
      amount: 2200.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Monthly recurring cash wage for domestic cleaning and housekeeping",
      sourceRef: null,
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: "Household Electricity (Prepaid Tokens)",
      amount: 2000.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Monthly estimated prepaid electricity token purchases",
      sourceRef: null,
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: "Vodacom Openserve Home Fibre (50Mbps Uncapped)",
      amount: 864.61,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Vodacom Openserve 50Mbps Uncapped Home Fibre (Acc: I2754234-5, 03 Blossom Road). Cellular lines 071 & 079 cancelled.",
      sourceRef: "account:vodacom:fibre",
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: "Banking Account Fees & Overdraft Service Charges",
      amount: 593.49,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Prestige account fee (R260), overdraft service fee (R69) & transaction fees",
      sourceRef: "statement:XXXX4469:fees",
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: "Garden Services & Grounds Maintenance",
      amount: 550.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Monthly recurring cash service fee for garden and lawn maintenance",
      sourceRef: null,
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: "Google Workspace & AI Premium (Antigravity)",
      amount: 450.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Developer cloud and AI platform subscription",
      sourceRef: "statement:google_cloud",
      isComputed: false,
    },
    {
      category: BudgetCategory.FIXED_HOUSEHOLD_OBLIGATIONS,
      label: "Netflix ZA Subscription",
      amount: 229.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Monthly streaming entertainment debit on Titanium Credit Card",
      sourceRef: "statement:XXXX3529:netflix",
      isComputed: false,
    },

    // ── DEBT ACCELERATION PLAN (CONTRACTUAL MINIMUMS: R 42,794.29) ──
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: "Standard Bank Home Loan (Bond Repayment)",
      amount: 17786.45,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Primary mortgage bond repayment debit order (Account: SBSA HOMEL 534812597)",
      sourceRef: "statement:XXXX4469:sbsa_homel",
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: "Standard Bank Revolving Credit Plan Minimum",
      amount: 7457.66,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Revolving credit facility contractual minimum DebiCheck (Acc: 22043551000022)",
      sourceRef: "statement:XXXX4469:sbsa_rcp",
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: "WesBank Vehicle Finance (Renault Clio V)",
      amount: 5468.02,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Renault Clio V 1.0t Zen DebiCheck debit order (Acc: 85361174582)",
      sourceRef: "statement:XXXX4469:wesbank_clio",
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: "University Fees Payment Plan",
      amount: 4000.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Accelerated tertiary tuition repayment (cleared in 12 months by Aug 2027)",
      sourceRef: "debt:university",
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: "Nedbank Personal Loan Instalment",
      amount: 2010.03,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Fixed personal loan instalment DebiCheck debit order (Acc: PLN 152327766)",
      sourceRef: "statement:XXXX4469:nedbank_loan",
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: "Telkom Debt Settlement Arrangement",
      amount: 2000.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Agreed structured settlement monthly repayment for overdue lines",
      sourceRef: "debt:telkom",
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: "School Fees Arrears Payment Plan",
      amount: 2000.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Accelerated school fees arrears repayment (cleared in 10 months by Jun 2027)",
      sourceRef: "debt:schoolfees",
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: "WesBank Vehicle Finance (Hyundai Grand i10)",
      amount: 722.13,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Hyundai Grand i10 1.0 Fluid DebiCheck debit order (Acc: 85401320912)",
      sourceRef: "statement:XXXX4469:wesbank_i10",
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: "Standard Bank Titanium Credit Card Minimum",
      amount: 700.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Titanium Prestige credit card contractual minimum payment (5239-xxxx-xxxx-3529)",
      sourceRef: "statement:XXXX3529:min",
      isComputed: true,
    },
    {
      category: BudgetCategory.DEBT_ACCELERATION_PLAN,
      label: "Municipal Arrears Arrangement",
      amount: 650.00,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Structured municipal arrears repayment arrangement",
      sourceRef: "debt:municipal_arrears",
      isComputed: true,
    },

    // ── FAMILY & DISCRETIONARY (R 7,700.00) ──
    {
      category: BudgetCategory.FAMILY_AND_DISCRETIONARY,
      label: "Groceries & Household Supplies",
      amount: 4000.00,
      confidence: BalanceConfidence.ESTIMATED,
      note: "SuperSpar, Woolworths & Pick n Pay monthly allocation",
      sourceRef: null,
      isComputed: false,
    },
    {
      category: BudgetCategory.FAMILY_AND_DISCRETIONARY,
      label: "Fuel & Transportation",
      amount: 1200.00,
      confidence: BalanceConfidence.ESTIMATED,
      note: "WFH schedule: 3-4 office trips/month @ R250/trip + local errands (R1,200 total)",
      sourceRef: null,
      isComputed: false,
    },
    {
      category: BudgetCategory.FAMILY_AND_DISCRETIONARY,
      label: "Family Discretionary & Dining",
      amount: 2500.00,
      confidence: BalanceConfidence.ESTIMATED,
      note: "Family allowances, weekend dining & leisure",
      sourceRef: null,
      isComputed: false,
    },

    // ── GOAL CONTRIBUTIONS (R 13,633.04) ──
    {
      category: BudgetCategory.GOAL_CONTRIBUTIONS,
      label: "Car Transmission Repair Sinking Fund",
      amount: 13633.04,
      confidence: BalanceConfidence.CONFIRMED,
      note: "Target: R 40,000.00 transmission overhaul fund (Allocating full verified liquid surplus R 13,633.04/mo from SARS net salary R 74,438.26 · Target: Nov 2026)",
      sourceRef: "goal:car_transmission_repair",
      isComputed: true,
    },
  ];

  const forwardMonths = ["2026-09", "2026-10", "2026-11", "2026-12"];

  for (const m of forwardMonths) {
    await prisma.budgetLineItem.deleteMany({
      where: { userId, month: m },
    });

    for (const item of forwardBudgetItems) {
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
        },
      });
    }

    const monthTotal = forwardBudgetItems.reduce((acc, it) => acc + it.amount, 0);
    console.log(`✅ Month [${m}]: Synchronized ${forwardBudgetItems.length} budget items (Total: R ${monthTotal.toFixed(2)})`);
  }

  console.log("Realignment complete for all forward months (2026-09 through 2026-12).");
}

syncSeptemberForwardBudget()
  .catch((err) => {
    console.error("❌ Error syncing September forward budget:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

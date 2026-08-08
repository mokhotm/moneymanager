import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateEmbeddingVector } from "../src/lib/embeddings";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with User, UserProfile, Assets, Goals, Agent Recommendations, and Artifact data...");

  // Clear existing
  await prisma.documentEmbedding.deleteMany();
  await prisma.agentModelAssignment.deleteMany();
  await prisma.lLMProviderConfig.deleteMany();
  await prisma.agentRecommendation.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.netWorthSnapshot.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.document.deleteMany();
  await prisma.settlementEvent.deleteMany();
  await prisma.budgetLineItem.deleteMany();
  await prisma.incomeEvent.deleteMany();
  await prisma.income.deleteMany();
  await prisma.debt.deleteMany();
  await prisma.account.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appSettings.deleteMany();

  // Settings
  await prisma.appSettings.create({
    data: {
      id: "singleton",
      snowballStrategy: "SNOWBALL",
      currency: "ZAR",
    },
  });

  // ─── LLM PROVIDER BYOK CONFIGURATIONS (NEW v3) ─────────────────────────────

  const claudeConfig = await prisma.lLMProviderConfig.create({
    data: {
      provider: "ANTHROPIC",
      displayName: "Anthropic Claude (Personal BYOK Key)",
      apiKeyEncrypted: "enc_sk-ant-api03-demo-key-masked",
      modelName: "claude-3-7-sonnet-20250219",
      supportsVision: true,
      status: "ACTIVE",
      lastValidatedAt: new Date(),
    },
  });

  const gptConfig = await prisma.lLMProviderConfig.create({
    data: {
      provider: "OPENAI",
      displayName: "OpenAI GPT-4o (Work Account Key)",
      apiKeyEncrypted: "enc_sk-proj-demo-openai-key-masked",
      modelName: "gpt-4o",
      supportsVision: true,
      status: "ACTIVE",
      lastValidatedAt: new Date(),
    },
  });

  // Agent Assignments
  await prisma.agentModelAssignment.create({
    data: {
      agent: "DOCUMENT_AGENT",
      llmProviderConfigId: claudeConfig.id,
      isDefault: true,
    },
  });

  await prisma.agentModelAssignment.create({
    data: {
      agent: "BUDGET_AGENT",
      llmProviderConfigId: gptConfig.id,
    },
  });

  await prisma.agentModelAssignment.create({
    data: {
      agent: "DEBT_AGENT",
      llmProviderConfigId: claudeConfig.id,
    },
  });

  await prisma.agentModelAssignment.create({
    data: {
      agent: "GOALS_AGENT",
      llmProviderConfigId: claudeConfig.id,
    },
  });

  // ─── USER & PROFILE ─────────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash("Engim002@85590", 10);

  const user = await prisma.user.create({
    data: {
      username: "mokhotm",
      passwordHash,
      email: "Ezrom.Mokhotla@sars.gov.za",
      role: "user",
      subscriptionTier: "PRO_WEALTH" as any,
      subscriptionStatus: "ACTIVE",
      billingCycle: "MONTHLY" as any,
      subscriptionExpiresAt: new Date(Date.now() + 365 * 86400 * 1000),
    },
  });

  await prisma.userProfile.create({
    data: {
      userId: user.id,
      firstName: "Ezrom Mote",
      lastName: "Mokhotla",
      fullName: "Ezrom Mote Mokhotla",
      jobTitle: "Senior Specialist Developer (NAT/MS/JAVA)",
      employerName: "South African Revenue Service (SARS)",
      taxReference: "0123279143",
      preferredCurrency: "ZAR",
    },
  });

  console.log(`Created system user: ${user.username} (ID: ${user.id})`);

  // ─── ACCOUNTS & DEBTS ───────────────────────────────────────────────────────

  // 1. Ekurhuleni Municipality Account
  const accMuni = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Ekurhuleni Municipal Account",
      institution: "City of Ekurhuleni",
      accountNumberMasked: "3505-xxxx-95",
      type: "MUNICIPAL",
      currency: "ZAR",
      openingBalance: -6900.0,
      openingBalanceDate: new Date("2026-06-10"),
      isDebt: true,
      notes: "Rates, water, refuse, electricity. Pre-termination notice issued on 10 June 2026 statement.",
    },
  });

  const doc1 = await prisma.document.create({
    data: {
      relatedEntityType: "INCOME",
      relatedEntityId: "TEMP_ID",
      documentType: "PAYSLIP",
      fileUrl: "/documents/SARS_Payslip_July2026.pdf",
      fileHash: "8a4f91c5b8e90123456789abcdef0123456789abcdef0123456789abcdefb7e2",
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-07-31"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: {
        employer: "South African Revenue Service (SARS)",
        employeeName: "Ezrom Mote Mokhotla",
        taxNumber: "0123279143",
        basicSalary: 95400.0,
        groupLifeInsurance: -2061.84,
        payeTaxDeduction: -22311.26,
        nettPay: 71026.9,
        backdatedRetroLumpSum: 13645.44,
      },
    },
  });

  const doc2 = await prisma.document.create({
    data: {
      relatedEntityType: "DEBT",
      relatedEntityId: accMuni.id,
      documentType: "MUNICIPAL_BILL",
      fileUrl: "/documents/CityOfEkurhuleni_Invoice_June2026.pdf",
      fileHash: "1b7f40289a0123456789abcdef0123456789abcdef0123456789abcdefe9a0",
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
      parsed: true,
      parseStatus: "PARSED_AWAITING_REVIEW",
      parsedData: {
        municipality: "City of Ekurhuleni",
        accountNumber: "201938475",
        totalBalanceOwed: 6900.0,
        monthlyArrearsInstalment: 650.0,
        urgencyNotice: "PRE-TERMINATION NOTICE ISSUED — Electricity disconnection risk",
      },
    },
  });

  await prisma.documentEmbedding.create({
    data: {
      documentId: doc1.id,
      contentChunk: "South African Revenue Service (SARS) Payslip Ezrom Mote Mokhotla Tax: 0123279143 Basic: R95,400 PAYE: -R22,311.26 Group Life: -R2,061.84 Nett Pay: R71,026.90 Backdated Retro Lump Sum: R13,645.44",
      embeddingJson: generateEmbeddingVector("SARS Payslip Ezrom Mote Mokhotla Tax 0123279143 Basic R95,400 PAYE -R22,311.26 Nett Pay R71,026.90 Retro R13,645.44"),
      metadataJson: { institution: "SARS", documentType: "PAYSLIP", nettPay: 71026.9 },
    },
  });

  await prisma.documentEmbedding.create({
    data: {
      documentId: doc2.id,
      contentChunk: "City of Ekurhuleni Municipal Tax Invoice Acc: 201938475 Total Balance: R6,900.00 Monthly Arrears Instalment: R650.00 PRE-TERMINATION NOTICE ISSUED Electricity disconnection risk",
      embeddingJson: generateEmbeddingVector("City of Ekurhuleni Municipal Tax Invoice Acc 201938475 Total Balance R6,900 Monthly Arrears R650 PRE-TERMINATION NOTICE Electricity disconnection"),
      metadataJson: { institution: "City of Ekurhuleni", documentType: "MUNICIPAL_BILL", totalBalance: 6900.0 },
    },
  });

  await prisma.debt.create({
    data: {
      accountId: accMuni.id,
      currentBalance: 6900.0,
      balanceConfidence: "CONFIRMED",
      balanceSource: "Municipal Copy Tax Invoice dated 2026-06-10",
      annualInterestRate: 0,
      interestRateConfidence: "CONFIRMED",
      minimumPayment: 650.0,
      paymentMode: "FIXED_INSTALMENT",
      urgencyFlag: "SERVICE_INTERRUPTION_RISK",
      urgencyNote: "Pre-termination notice issued — electricity disconnection and prepaid block risk without payment.",
      includeInSnowball: true,
      priorityOverride: 1,
      status: "ACTIVE",
    },
  });

  // 2. Telkom Account
  const accTelkom = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Telkom Landline / Broadband",
      institution: "Telkom SA",
      accountNumberMasked: "3456-xxxx-38",
      type: "SERVICE_ACCOUNT",
      currency: "ZAR",
      openingBalance: -21745.9,
      openingBalanceDate: new Date("2026-07-09"),
      isDebt: true,
      notes: "Includes R14,000 termination penalty + R7,632.97 age analysis arrears.",
    },
  });
  await prisma.debt.create({
    data: {
      accountId: accTelkom.id,
      currentBalance: 21745.9,
      balanceConfidence: "CONFIRMED",
      balanceSource: "Telkom Invoice 345669338 dated 2026-07-09",
      annualInterestRate: 0,
      interestRateConfidence: "CONFIRMED",
      minimumPayment: 2000.0,
      paymentMode: "FIXED_INSTALMENT",
      urgencyFlag: "NONE",
      includeInSnowball: true,
      priorityOverride: 2,
      status: "ACTIVE",
    },
  });

  // 3. School Arrears
  const accSchool = await prisma.account.create({
    data: {
      userId: user.id,
      name: "School Fees Arrears",
      institution: "School Admin",
      accountNumberMasked: null,
      type: "SERVICE_ACCOUNT",
      currency: "ZAR",
      openingBalance: -20000.0,
      isDebt: true,
      notes: "0% interest, straight-line payoff agreement.",
    },
  });
  await prisma.debt.create({
    data: {
      accountId: accSchool.id,
      currentBalance: 20000.0,
      balanceConfidence: "ESTIMATED",
      balanceSource: "Agreed repayment schedule",
      annualInterestRate: 0,
      interestRateConfidence: "CONFIRMED",
      minimumPayment: 1333.33,
      paymentMode: "FIXED_TERM_LOAN",
      urgencyFlag: "NONE",
      includeInSnowball: true,
      status: "ACTIVE",
    },
  });

  // 4. University Fees
  const accUni = await prisma.account.create({
    data: {
      userId: user.id,
      name: "University Tuition Fees",
      institution: "University Finance",
      accountNumberMasked: null,
      type: "SERVICE_ACCOUNT",
      currency: "ZAR",
      openingBalance: -47885.42,
      isDebt: true,
      notes: "0% interest, 18-month payment plan.",
    },
  });
  await prisma.debt.create({
    data: {
      accountId: accUni.id,
      currentBalance: 47885.42,
      balanceConfidence: "CONFIRMED",
      balanceSource: "University fee statement",
      annualInterestRate: 0,
      interestRateConfidence: "CONFIRMED",
      minimumPayment: 2660.3,
      paymentMode: "FIXED_TERM_LOAN",
      urgencyFlag: "NONE",
      includeInSnowball: true,
      status: "ACTIVE",
    },
  });

  // 5. Standard Bank Credit Card
  const accCard = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Titanium Prestige Credit Card",
      institution: "Standard Bank",
      accountNumberMasked: "5239-xxxx-xxxx-3529",
      type: "CREDIT_CARD",
      currency: "ZAR",
      openingBalance: -13914.44,
      openingBalanceDate: new Date("2026-07-15"),
      isDebt: true,
      notes: "Statement dated 15 July 2026.",
    },
  });
  await prisma.debt.create({
    data: {
      accountId: accCard.id,
      currentBalance: 13914.44,
      balanceConfidence: "CONFIRMED",
      balanceSource: "Standard Bank Statement dated 2026-07-15",
      annualInterestRate: 0.21,
      interestRateConfidence: "CONFIRMED",
      minimumPayment: 700.0,
      paymentMode: "MINIMUM_ONLY",
      urgencyFlag: "NONE",
      includeInSnowball: true,
      status: "ACTIVE",
    },
  });

  // 6. Nedbank Personal Loan
  const accNedbank = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Nedbank Personal Loan",
      institution: "Nedbank",
      accountNumberMasked: "8005-xxxx-0001",
      type: "LOAN",
      currency: "ZAR",
      openingBalance: -39751.99,
      openingBalanceDate: new Date("2026-03-20"),
      isDebt: true,
      notes: "Policy P000057737399 linked.",
    },
  });
  await prisma.debt.create({
    data: {
      accountId: accNedbank.id,
      currentBalance: 39751.99,
      balanceConfidence: "ESTIMATED",
      balanceSource: "Nedbank loan schedule & policy schedule",
      annualInterestRate: 0.37,
      interestRateConfidence: "ESTIMATED",
      minimumPayment: 2010.03,
      paymentMode: "FIXED_TERM_LOAN",
      originalTermMonths: 48,
      urgencyFlag: "NONE",
      includeInSnowball: true,
      status: "ACTIVE",
    },
  });

  // 8. Standard Bank Home Loan (Mortgage Bond)
  const accHomeLoan = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Standard Bank Home Loan (Mortgage Bond)",
      institution: "Standard Bank",
      accountNumberMasked: "02-xxx-bond-001",
      type: "LOAN",
      currency: "ZAR",
      openingBalance: -1780000.0,
      openingBalanceDate: new Date("2026-07-15"),
      isDebt: true,
      notes: "Primary residence bond repayment. Statement debit order: STD BANK BOND REPAYMENT R17,459.76/month.",
    },
  });
  const debtHomeLoan = await prisma.debt.create({
    data: {
      accountId: accHomeLoan.id,
      currentBalance: 1780000.0,
      balanceConfidence: "CONFIRMED",
      balanceSource: "Standard Bank Statement & Municipal Property Valuation",
      annualInterestRate: 0.1175,
      interestRateConfidence: "CONFIRMED",
      minimumPayment: 17459.76,
      paymentMode: "FIXED_INSTALMENT",
      debtCategory: "LONG_TERM",
      urgencyFlag: "NONE",
      includeInSnowball: true,
      priorityOverride: 1,
      status: "ACTIVE",
    },
  });

  // 9. Standard Bank Revolving Credit Plan Loan
  const accRev = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Revolving Credit Plan Loan",
      institution: "Standard Bank",
      accountNumberMasked: "22-043-551-0",
      type: "LOAN",
      currency: "ZAR",
      openingBalance: -284578.28,
      openingBalanceDate: new Date("2026-07-15"),
      isDebt: true,
      notes: "Revolving facility at ~18.47% p.a. interest rate.",
    },
  });
  await prisma.debt.create({
    data: {
      accountId: accRev.id,
      currentBalance: 284578.28,
      balanceConfidence: "CONFIRMED",
      balanceSource: "Standard Bank Statement dated 2026-07-15",
      annualInterestRate: 0.18375,
      interestRateConfidence: "CONFIRMED",
      minimumPayment: 7457.66,
      paymentMode: "MINIMUM_ONLY",
      urgencyFlag: "NONE",
      includeInSnowball: true,
      status: "ACTIVE",
    },
  });

  // Bank Accounts (Assets)
  const accPrestige = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Prestige Current Account",
      institution: "Standard Bank",
      accountNumberMasked: "02-307-446-9",
      type: "CURRENT",
      currency: "ZAR",
      openingBalance: 39749.06,
      openingBalanceDate: new Date("2026-07-15"),
      isDebt: false,
      isAsset: true,
    },
  });

  const accMyMo = await prisma.account.create({
    data: {
      userId: user.id,
      name: "MyMo Current Account",
      institution: "Standard Bank",
      accountNumberMasked: "02-593-650-6",
      type: "CURRENT",
      currency: "ZAR",
      openingBalance: 6386.09,
      openingBalanceDate: new Date("2026-07-15"),
      isDebt: false,
      isAsset: true,
    },
  });

  // ─── ASSETS (NEW v2) ────────────────────────────────────────────────────────

  await prisma.asset.create({
    data: {
      userId: user.id,
      name: "3 Blossom Road, Bakerton Ext 4 (Primary Residence)",
      type: "PROPERTY",
      currentValue: 1780000.0,
      valueConfidence: "CONFIRMED",
      valueSource: "Ekurhuleni Municipal Bill 2026-06-10 — Sectional Title Valuation | ERF X28 004 00000287 | 943 m²",
      lastValuedDate: new Date("2026-06-10"),
      linkedDebtId: debtHomeLoan.id,
    },
  });

  await prisma.asset.create({
    data: {
      userId: user.id,
      name: "GEPF SARS Pension / Provident Fund",
      type: "RETIREMENT_FUND",
      currentValue: 420000.0,
      valueConfidence: "CONFIRMED",
      valueSource: "GEPF Benefit Statement dated 2026-03-31",
      lastValuedDate: new Date("2026-03-31"),
    },
  });

  await prisma.asset.create({
    data: {
      userId: user.id,
      name: "Family Vehicle (Trade-in Value)",
      type: "VEHICLE",
      currentValue: 185000.0,
      valueConfidence: "ESTIMATED",
      valueSource: "TransUnion Auto Market Guide",
      lastValuedDate: new Date("2026-06-01"),
    },
  });

  await prisma.asset.create({
    data: {
      userId: user.id,
      accountId: accPrestige.id,
      name: "Cash Reserves (Prestige & MyMo Accounts)",
      type: "CASH",
      currentValue: 46135.15,
      valueConfidence: "CONFIRMED",
      valueSource: "Standard Bank Bank Statements",
      lastValuedDate: new Date("2026-07-15"),
    },
  });

  // Net Worth Snapshot Initial
  await prisma.netWorthSnapshot.create({
    data: {
      snapshotDate: new Date("2026-07-15"),
      totalAssets: 2101135.15,
      totalDebts: 434776.11,
      netWorth: 1666359.04,
      generatedBy: "SCHEDULED",
    },
  });

  // ─── GOALS (NEW v2) ─────────────────────────────────────────────────────────

  await prisma.goal.create({
    data: {
      userId: user.id,
      name: "3-Month Emergency Fund",
      type: "EMERGENCY_FUND",
      targetAmount: 210000.0,
      targetFormula: "3 * fixed_obligations_subtotal",
      currentAmount: 46135.15,
      monthlyContribution: 3500.0,
      priority: 1,
      status: "ACTIVE",
      projectedCompletionDate: new Date("2028-06-01"),
      note: "Covers 3 months of essential fixed household obligations.",
    },
  });

  await prisma.goal.create({
    data: {
      userId: user.id,
      name: "Complete Debt Freedom",
      type: "DEBT_FREE_BY_DATE",
      targetAmount: 434776.11,
      currentAmount: 0,
      monthlyContribution: 7000.0,
      priority: 2,
      status: "ACTIVE",
      projectedCompletionDate: new Date("2028-12-01"),
      note: "Eliminate all 7 outstanding debt accounts via snowball strategy.",
    },
  });

  await prisma.goal.create({
    data: {
      userId: user.id,
      name: "Investment & Property Deposit Fund",
      type: "HOUSE_DEPOSIT",
      targetAmount: 150000.0,
      currentAmount: 15000.0,
      monthlyContribution: 1500.0,
      priority: 3,
      status: "ACTIVE",
      projectedCompletionDate: new Date("2030-01-01"),
      note: "Capital accumulation for secondary property investment.",
    },
  });

  // ─── INCOME ─────────────────────────────────────────────────────────────────

  const incSARS = await prisma.income.create({
    data: {
      userId: user.id,
      sourceName: "SARS Salary (Nett)",
      recurringAmount: 71026.9,
      recurringAmountConfidence: "CONFIRMED",
      payDayOfMonth: 15,
      lastConfirmedDate: new Date("2026-07-15"),
    },
  });

  // Income Event
  await prisma.incomeEvent.create({
    data: {
      incomeId: incSARS.id,
      description: "Backdated salary increase, Apr–Jun 2026 (Add Nett Pay)",
      amount: 13645.44,
      dateReceived: new Date("2026-07-15"),
      recommendedUse: "DEBT_PAYDOWN",
      applied: false,
    },
  });

  // ─── BUDGET LINE ITEMS (100% COMPLETE STATEMENT & DEBIT ORDER BREAKDOWN) ───

  const currentMonth = "2026-07";

  const budgetItems = [
    // 1. Fixed Household Obligations (Bank Account Outflows)
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Standard Bank Home Loan (Bond Repayment)", amount: 17459.76, confidence: "CONFIRMED" },
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Primary Insurance Premium (Short Term & Asset Cover)", amount: 5390.80, confidence: "CONFIRMED" },
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Secondary Insurance Premium (Personal Protection)", amount: 1697.28, confidence: "CONFIRMED" },
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Municipal Rates, Water & Refuse Base", amount: 3423.83, confidence: "CONFIRMED" },
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Banking Account Fees & Overdraft Service Charges", amount: 593.49, confidence: "CONFIRMED" },

    // 2. Debt Acceleration Plan (DebiCheck & Debt Repayments)
    { category: "DEBT_ACCELERATION_PLAN", label: "Revolving Credit Plan Minimum (Standard Bank)", amount: 7457.66, isComputed: true },
    { category: "DEBT_ACCELERATION_PLAN", label: "University Fees Payment Plan", amount: 2660.30, isComputed: true },
    { category: "DEBT_ACCELERATION_PLAN", label: "Nedbank Personal Loan Instalment", amount: 2010.03, isComputed: true },
    { category: "DEBT_ACCELERATION_PLAN", label: "Telkom SA Broadband / Line Payment", amount: 2000.00, isComputed: true },
    { category: "DEBT_ACCELERATION_PLAN", label: "School Fees Arrears Payment", amount: 1333.33, isComputed: true },
    { category: "DEBT_ACCELERATION_PLAN", label: "Vehicle Finance (DebiCheck)", amount: 722.13, isComputed: true },
    { category: "DEBT_ACCELERATION_PLAN", label: "Standard Bank Credit Card Minimum", amount: 700.00, isComputed: true },
    { category: "DEBT_ACCELERATION_PLAN", label: "Municipal Arrears Arrangement", amount: 650.00, isComputed: true },

    // 3. Goal Contributions
    { category: "GOAL_CONTRIBUTIONS", label: "3-Month Emergency Fund Contribution", amount: 3500.00, isComputed: true },
    { category: "GOAL_CONTRIBUTIONS", label: "Property & Investment Deposit Contribution", amount: 1500.00, isComputed: true },

    // 4. Family & Discretionary Monthly Spend
    { category: "FAMILY_AND_DISCRETIONARY", label: "Groceries & Household Expenses", amount: 12000.00, confidence: "CONFIRMED" },
    { category: "FAMILY_AND_DISCRETIONARY", label: "Transport & Fuel", amount: 4500.00, confidence: "CONFIRMED" },
    { category: "FAMILY_AND_DISCRETIONARY", label: "Family Allowances & Support", amount: 3500.00, confidence: "CONFIRMED" },
  ];

  for (const b of budgetItems) {
    await prisma.budgetLineItem.create({
      data: {
        userId: user.id,
        category: b.category as any,
        label: b.label,
        amount: b.amount,
        isComputed: b.isComputed ?? false,
        confidence: (b.confidence as any) ?? "CONFIRMED",
        month: currentMonth,
      },
    });
  }

  // ─── AGENT RECOMMENDATIONS INBOX (NEW v2) ───────────────────────────────────

  await prisma.agentRecommendation.create({
    data: {
      agent: "DOCUMENT_AGENT",
      title: "Confirm July 2026 Payslip Nett Pay Increase",
      description: "Parsed SARS Payslip dated 2026-07-15 shows updated recurring nett salary of R71,026.90 (+R5,590.56 raise).",
      rationale: "Matching payslip hash verifies recurring nett pay. Proposes updating recurring income from R65,436.34 to R71,026.90.",
      payload: { incomeId: incSARS.id, newRecurringAmount: 71026.9, effectiveDate: "2026-07-15" },
      status: "PENDING",
    },
  });

  await prisma.agentRecommendation.create({
    data: {
      agent: "DEBT_AGENT",
      title: "Redirect Municipal Instalment Pool (Month 6)",
      description: "Ekurhuleni municipal arrangement (R650/mo) will clear in Month 6. Recommend redirecting R650/mo into Telkom instalment.",
      rationale: "Maximizes snowball velocity and shortens Telkom clearance by 2 months.",
      payload: { sourceDebtId: accMuni.id, targetDebtId: accTelkom.id, amount: 650 },
      status: "PENDING",
    },
  });

  await prisma.agentRecommendation.create({
    data: {
      agent: "GOALS_AGENT",
      title: "Allocate Backdated Lump Sum (R13,645.44) to Emergency Fund",
      description: "Unallocated retro salary lump sum of R13,645.44 received on 2026-07-15.",
      rationale: "Boosts Emergency Fund from R46,135 to R59,780, accelerating 3-month target completion date by 4 months.",
      payload: { incomeEventId: "inc_event_1", amount: 13645.44 },
      status: "PENDING",
    },
  });

  // ─── AUDIT LOGS ─────────────────────────────────────────────────────────────

  await prisma.auditLogEntry.create({
    data: {
      entityType: "INCOME",
      entityId: incSARS.id,
      fieldChanged: "recurringAmount",
      oldValue: "65436.34",
      newValue: "71026.90",
      reason: "Confirmed raise from July 2026 SARS payslip",
      actor: "DOCUMENT_AGENT",
      changedBy: user.username,
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "DEBT",
      entityId: accMuni.id,
      fieldChanged: "urgencyFlag",
      oldValue: "NONE",
      newValue: "SERVICE_INTERRUPTION_RISK",
      reason: "Pre-termination notice parsed from 10 June 2026 Ekurhuleni statement",
      actor: "DOCUMENT_AGENT",
      changedBy: user.username,
    },
  });

  console.log("Database successfully seeded with v2 Assets, Goals, Net Worth Snapshots, Agent Recommendations, and Artifact data!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

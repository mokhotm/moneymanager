import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { generateEmbeddingVector } from "../src/lib/embeddings";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with User, UserProfile, Assets, Goals, Agent Recommendations, and Artifact data...");

  // Clear existing
  await prisma.moneyFlow.deleteMany();
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

  // ─── LLM PROVIDER BYOK CONFIGURATIONS & PRESERVATION ─────────────────────
  // Check for environment keys (GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, etc.)
  const geminiEnvKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  const anthropicEnvKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  const openaiEnvKey = (process.env.OPENAI_API_KEY || "").trim();
  const deepseekEnvKey = (process.env.DEEPSEEK_API_KEY || "").trim();
  const groqEnvKey = (process.env.GROQ_API_KEY || "").trim();

  // Helper encryption
  const encKeyBuffer = Buffer.from(
    (process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || "money-manager-vault-key-32-chars-aes256")
      .padEnd(32)
      .slice(0, 32)
  );

  function seedEncrypt(plain: string): string {
    const cipher = crypto.createCipheriv("aes-256-cbc", encKeyBuffer, Buffer.alloc(16, 0));
    let enc = cipher.update(plain, "utf8", "hex");
    enc += cipher.final("hex");
    return enc;
  }

  // 1. Google Gemini (Gemini 3.7 Flash)
  const geminiConfig = await prisma.lLMProviderConfig.create({
    data: {
      provider: "GOOGLE",
      displayName: geminiEnvKey ? "Google Gemini (Active Key)" : "Google Gemini 3.7 Flash",
      apiKeyEncrypted: geminiEnvKey ? seedEncrypt(geminiEnvKey) : seedEncrypt("AIzaSy-demo-gemini-key-masked"),
      modelName: "gemini-3.7-flash",
      supportsVision: true,
      status: geminiEnvKey ? "ACTIVE" : "ACTIVE",
      lastValidatedAt: new Date(),
    },
  });

  // 2. Anthropic Claude (Claude 3.7 Sonnet)
  const claudeConfig = await prisma.lLMProviderConfig.create({
    data: {
      provider: "ANTHROPIC",
      displayName: anthropicEnvKey ? "Anthropic Claude (Active Key)" : "Anthropic Claude (Personal BYOK Key)",
      apiKeyEncrypted: anthropicEnvKey ? seedEncrypt(anthropicEnvKey) : seedEncrypt("sk-ant-demo-claude-key-masked"),
      modelName: "claude-3-7-sonnet-20250219",
      supportsVision: true,
      status: anthropicEnvKey ? "ACTIVE" : "ACTIVE",
      lastValidatedAt: new Date(),
    },
  });

  // 3. OpenAI (GPT-4o)
  const gptConfig = await prisma.lLMProviderConfig.create({
    data: {
      provider: "OPENAI",
      displayName: openaiEnvKey ? "OpenAI GPT-4o (Active Key)" : "OpenAI GPT-4o (Work Account Key)",
      apiKeyEncrypted: openaiEnvKey ? seedEncrypt(openaiEnvKey) : seedEncrypt("sk-proj-demo-openai-key-masked"),
      modelName: "gpt-4o",
      supportsVision: true,
      status: openaiEnvKey ? "ACTIVE" : "ACTIVE",
      lastValidatedAt: new Date(),
    },
  });

  // 4. DeepSeek (if env set or starter)
  let deepseekConfig = null;
  if (deepseekEnvKey) {
    deepseekConfig = await prisma.lLMProviderConfig.create({
      data: {
        provider: "CUSTOM",
        displayName: "DeepSeek V3 (Active Key)",
        apiKeyEncrypted: seedEncrypt(deepseekEnvKey),
        modelName: "deepseek-chat",
        baseUrl: "https://api.deepseek.com/v1",
        supportsVision: false,
        status: "ACTIVE",
        lastValidatedAt: new Date(),
      },
    });
  }

  // 5. Groq (if env set)
  if (groqEnvKey) {
    await prisma.lLMProviderConfig.create({
      data: {
        provider: "CUSTOM",
        displayName: "Groq Cloud Llama 3.3 70B",
        apiKeyEncrypted: seedEncrypt(groqEnvKey),
        modelName: "llama-3.3-70b-versatile",
        baseUrl: "https://api.groq.com/openai/v1",
        supportsVision: false,
        status: "ACTIVE",
        lastValidatedAt: new Date(),
      },
    });
  }

  // Assign Primary Agents (Defaulting to Gemini if available, or Claude/GPT)
  const primaryConfig = geminiEnvKey ? geminiConfig : claudeConfig;
  const secondaryConfig = openaiEnvKey ? gptConfig : (geminiEnvKey ? geminiConfig : gptConfig);

  await prisma.agentModelAssignment.create({
    data: {
      agent: "DOCUMENT_AGENT",
      llmProviderConfigId: primaryConfig.id,
      isDefault: true,
    },
  });

  await prisma.agentModelAssignment.create({
    data: {
      agent: "BUDGET_AGENT",
      llmProviderConfigId: secondaryConfig.id,
    },
  });

  await prisma.agentModelAssignment.create({
    data: {
      agent: "DEBT_AGENT",
      llmProviderConfigId: primaryConfig.id,
    },
  });

  await prisma.agentModelAssignment.create({
    data: {
      agent: "GOALS_AGENT",
      llmProviderConfigId: primaryConfig.id,
    },
  });

  // ─── USER & PROFILE ─────────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash("Engim002@85590", 10);

  const user = await prisma.user.create({
    data: {
      username: "mokhotm",
      passwordHash,
      email: "mokhotm@gmail.com",
      role: "user",
    },
  });

  const tierFree = await prisma.subscriptionTier.create({
    data: {
      name: "Starter Free",
      priceMonthly: 0,
      priceAnnual: 0,
      entitlements: { byokLLM: false, dualTrackWaterfall: false },
    },
  });

  const tierPro = await prisma.subscriptionTier.create({
    data: {
      name: "Pro Wealth Accelerator",
      priceMonthly: 199,
      priceAnnual: 1990,
      entitlements: { byokLLM: true, dualTrackWaterfall: true, spendingLocationRadar: true },
    },
  });

  const tierEnterprise = await prisma.subscriptionTier.create({
    data: {
      name: "Executive Enterprise",
      priceMonthly: 499,
      priceAnnual: 4990,
      entitlements: { byokLLM: true, dualTrackWaterfall: true, spendingLocationRadar: true, windeedValuations: true },
    },
  });

  const profile = await prisma.userProfile.create({
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

  await prisma.userSubscription.create({
    data: {
      userProfileId: profile.id,
      tierId: tierEnterprise.id,
      status: "ACTIVE",
      billingPeriod: "MONTHLY",
      currentPeriodStart: new Date("2026-08-01"),
      currentPeriodEnd: new Date("2027-08-01"),
      autoRenew: true,
    },
  });

  console.log(`Created system user: ${user.username} (ID: ${user.id}) with Executive Enterprise subscription.`);

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
      accountNumberMasked: "SCH-2026-881",
      type: "EDUCATION",
      currency: "ZAR",
      openingBalance: -20000.0,
      isDebt: true,
      notes: "0% interest, agreed repayment plan of R2,000.00/mo.",
    },
  });
  await prisma.debt.create({
    data: {
      accountId: accSchool.id,
      currentBalance: 20000.0,
      balanceConfidence: "CONFIRMED",
      balanceSource: "Agreed repayment schedule",
      annualInterestRate: 0,
      interestRateConfidence: "CONFIRMED",
      minimumPayment: 2000.0,
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
      name: "University Tuition Fees (Tertiary)",
      institution: "University Finance",
      accountNumberMasked: "UNI-2026-992",
      type: "EDUCATION",
      currency: "ZAR",
      openingBalance: -47885.42,
      isDebt: true,
      notes: "0% interest, active tuition payment plan of R4,000.00/mo.",
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
      minimumPayment: 4000.0,
      paymentMode: "FIXED_TERM_LOAN",
      urgencyFlag: "NONE",
      includeInSnowball: true,
      status: "ACTIVE",
    },
  });

  // WesBank Renault Clio V
  const accWesClio = await prisma.account.create({
    data: {
      userId: user.id,
      name: "WesBank Vehicle Finance (Renault Clio V)",
      institution: "WesBank",
      accountNumberMasked: "85361174582",
      type: "LOAN",
      currency: "ZAR",
      openingBalance: -221615.41,
      openingBalanceDate: new Date("2026-07-31"),
      isDebt: true,
      notes: "Renault Clio V 1.0t Zen. Monthly instalment R5,468.02.",
    },
  });
  await prisma.debt.create({
    data: {
      accountId: accWesClio.id,
      currentBalance: 221615.41,
      balanceConfidence: "CONFIRMED",
      balanceSource: "WesBank Statement 85361174582 dated 2026-07-31",
      annualInterestRate: 0.125,
      interestRateConfidence: "CONFIRMED",
      minimumPayment: 5468.02,
      paymentMode: "FIXED_TERM_LOAN",
      urgencyFlag: "NONE",
      includeInSnowball: true,
      status: "ACTIVE",
    },
  });

  // WesBank Hyundai Grand i10
  const accWesi10 = await prisma.account.create({
    data: {
      userId: user.id,
      name: "WesBank Vehicle Finance (Hyundai Grand i10)",
      institution: "WesBank",
      accountNumberMasked: "85401320912",
      type: "LOAN",
      currency: "ZAR",
      openingBalance: -26533.30,
      openingBalanceDate: new Date("2026-07-31"),
      isDebt: true,
      notes: "Hyundai Grand i10 1.0 Fluid. Monthly instalment R722.13.",
    },
  });
  await prisma.debt.create({
    data: {
      accountId: accWesi10.id,
      currentBalance: 26533.30,
      balanceConfidence: "CONFIRMED",
      balanceSource: "WesBank Statement 85401320912 dated 2026-07-31",
      annualInterestRate: 0.125,
      interestRateConfidence: "CONFIRMED",
      minimumPayment: 722.13,
      paymentMode: "FIXED_TERM_LOAN",
      urgencyFlag: "NONE",
      includeInSnowball: true,
      status: "ACTIVE",
    },
  });

  // Vodacom Mobile Contract
  const accVodacom = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Vodacom Mobile Contract",
      institution: "Vodacom",
      accountNumberMasked: "I2754234-5",
      type: "SERVICE_ACCOUNT",
      currency: "ZAR",
      openingBalance: 0,
      openingBalanceDate: new Date("2026-07-01"),
      isDebt: false,
      notes: "Vodacom cellular contract & monthly fiber. Monthly billing: R1,499.00.",
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
      minimumPayment: 17786.45,
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

  const accCashWallet = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Physical Cash Wallet",
      institution: "Physical Cash",
      accountNumberMasked: "CASH-WALLET-01",
      type: "CASH_WALLET",
      currency: "ZAR",
      openingBalance: 0,
      openingBalanceDate: new Date("2026-07-15"),
      isDebt: false,
      isAsset: true,
      notes: "Physical cash on hand withdrawn from ATM bank accounts.",
    },
  });

  // ─── MONEY FLOWS (COMPLETE 1,357 BANK STATEMENT TRANSACTIONS & CASH WALLET) ──
  const dbPath = path.join(process.cwd(), "transactions_db.json");
  if (fs.existsSync(dbPath)) {
    const rawTx: any[] = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    const accountMap: Record<string, string | undefined> = {
      prestige: accPrestige.id,
      mymo: accMyMo.id,
      creditcard: accCard.id,
      credit: accCard.id,
      rcp: accRev.id,
      revolving: accRev.id,
      plusplan: accRev.id,
    };

    const flowsToInsert: any[] = [];

    for (let idx = 0; idx < rawTx.length; idx++) {
      const t = rawTx[idx];
      const sourceAccId = accountMap[t.account] || accPrestige.id;
      const desc1 = (t.desc1 || "").trim();
      const desc2 = (t.desc2 || "").trim();
      const fullDesc = `${desc1} ${desc2}`.trim();
      const fullDescLower = fullDesc.toLowerCase();
      const rawAmt = Number(t.amount);
      const absAmt = Math.abs(rawAmt);

      let flowType = "OTHER";
      let sourceType = "ACCOUNT";
      let sourceRef = sourceAccId;
      let destinationType = "EXTERNAL";
      let destinationRef = fullDesc || "Transaction";
      let status = "ACTIVE";

      if (rawAmt > 0) {
        flowType = "INCOME";
        sourceType = "EXTERNAL";
        sourceRef = fullDescLower.includes("salary") || absAmt > 45000 ? "SARS Primary Salary Inflow" : desc1 || "Income Deposit";
        destinationType = "ACCOUNT";
        destinationRef = sourceAccId;
      } else {
        sourceType = "ACCOUNT";
        sourceRef = sourceAccId;

        if (fullDescLower.includes("autobank cash") || fullDescLower.includes("atm cash") || fullDescLower.includes("cash withdrawal") || fullDescLower.includes("cash to")) {
          flowType = "CASH_WITHDRAWAL";
          destinationType = "CASH_WALLET";
          destinationRef = accCashWallet.id;
          status = "PARTIALLY_CONSUMED";
        } else if (fullDescLower.includes("home loan") || fullDescLower.includes("homel") || fullDescLower.includes("534812597")) {
          flowType = "DEBT_PAYMENT";
          destinationType = "DEBT";
          destinationRef = accHomeLoan.id;
        } else if (fullDescLower.includes("nedbank") || fullDescLower.includes("nedbpl") || fullDescLower.includes("80056262500")) {
          flowType = "DEBT_PAYMENT";
          destinationType = "DEBT";
          destinationRef = accNedbank.id;
        } else if (fullDescLower.includes("wesbank") || fullDescLower.includes("clio") || fullDescLower.includes("hyundai") || fullDescLower.includes("85361174582") || fullDescLower.includes("85401320912")) {
          flowType = "DEBT_PAYMENT";
          destinationType = "DEBT";
          destinationRef = fullDescLower.includes("85401320912") || fullDescLower.includes("hyundai") ? accWesi10.id : accWesClio.id;
        } else if (fullDescLower.includes("titanium") || fullDescLower.includes("credit card") || fullDescLower.includes("5773529")) {
          flowType = "DEBT_PAYMENT";
          destinationType = "ACCOUNT";
          destinationRef = accCard.id;
        } else if (fullDescLower.includes("rcp") || fullDescLower.includes("revolving") || fullDescLower.includes("22043551000022")) {
          flowType = "DEBT_PAYMENT";
          destinationType = "ACCOUNT";
          destinationRef = accRev.id;
        } else if (fullDescLower.includes("sbg sec") || fullDescLower.includes("money market") || fullDescLower.includes("securities")) {
          flowType = "INVESTMENT";
          destinationType = "EXTERNAL";
          destinationRef = "SBG Securities Money Market Trust";
        } else if (fullDescLower.includes("ib transfer") || fullDescLower.includes("transfer to") || fullDescLower.includes("inter account")) {
          flowType = "TRANSFER";
          destinationType = "ACCOUNT";
          destinationRef = t.account === "mymo" ? accPrestige.id : accMyMo.id;
        } else if (fullDescLower.includes("fee") || fullDescLower.includes("ucount") || fullDescLower.includes("monthly fee")) {
          flowType = "FEE";
          destinationType = "EXTERNAL";
          destinationRef = fullDesc || "Bank Service Fee";
        } else if (fullDescLower.includes("spar") || fullDescLower.includes("pick n pay") || fullDescLower.includes("checkers") || fullDescLower.includes("bakerton") || fullDescLower.includes("al-aswad")) {
          flowType = "CASH_SPENDING";
          destinationType = "EXTERNAL";
          destinationRef = fullDesc || "Groceries & Daily Essentials";
        } else {
          flowType = "OTHER";
          destinationType = "EXTERNAL";
          destinationRef = fullDesc || "Card Purchase / EFT";
        }
      }

      flowsToInsert.push({
        originTransactionId: t.id || `txn_stmt_${idx + 1}`,
        sourceType: sourceType as any,
        sourceRef,
        destinationType: destinationType as any,
        destinationRef,
        amount: absAmt,
        currentAmount: absAmt,
        flowType: flowType as any,
        status: status as any,
        confidence: "CONFIRMED" as const,
        createdAt: new Date(t.date || "2026-08-01T00:00:00Z"),
      });
    }

    // Insert in chunks of 100
    for (let i = 0; i < flowsToInsert.length; i += 100) {
      await prisma.moneyFlow.createMany({
        data: flowsToInsert.slice(i, i + 100),
      });
    }

    // Cash wallet child splits
    const latestAtmFlow = await prisma.moneyFlow.findFirst({
      where: { flowType: "CASH_WITHDRAWAL" },
      orderBy: { createdAt: "desc" },
    });

    if (latestAtmFlow) {
      await prisma.moneyFlow.create({
        data: {
          parentFlowId: latestAtmFlow.id,
          sourceType: "CASH_WALLET",
          sourceRef: accCashWallet.id,
          destinationType: "EXTERNAL",
          destinationRef: "Domestic Worker Weekly Wage",
          amount: 950.0,
          currentAmount: 0,
          flowType: "CASH_SPENDING",
          status: "FULLY_CONSUMED",
          confidence: "CONFIRMED",
          createdAt: new Date(latestAtmFlow.createdAt.getTime() + 3600000),
        },
      });

      await prisma.moneyFlow.create({
        data: {
          parentFlowId: latestAtmFlow.id,
          sourceType: "CASH_WALLET",
          sourceRef: accCashWallet.id,
          destinationType: "EXTERNAL",
          destinationRef: "Garden Services & Grounds Maintenance",
          amount: 700.0,
          currentAmount: 0,
          flowType: "CASH_SPENDING",
          status: "FULLY_CONSUMED",
          confidence: "CONFIRMED",
          createdAt: new Date(latestAtmFlow.createdAt.getTime() + 7200000),
        },
      });

      await prisma.moneyFlow.create({
        data: {
          parentFlowId: latestAtmFlow.id,
          sourceType: "CASH_WALLET",
          sourceRef: accCashWallet.id,
          destinationType: "EXTERNAL",
          destinationRef: "Bakerton Fresh Produce & Local Bakeries",
          amount: 600.0,
          currentAmount: 0,
          flowType: "CASH_SPENDING",
          status: "FULLY_CONSUMED",
          confidence: "CONFIRMED",
          createdAt: new Date(latestAtmFlow.createdAt.getTime() + 14400000),
        },
      });
    }
  }

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
      totalAssets: 2431135.15,
      totalDebts: 2218311.94,
      netWorth: 212823.21,
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
      recurringAmount: 74438.26,
      recurringAmountConfidence: "CONFIRMED",
      payDayOfMonth: 15,
      lastConfirmedDate: new Date("2026-08-14"),
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

  // ─── DOCUMENTS (ALL 24 UPLOADED PDFs FROM Artifacts FOLDER) ─────────────────

  // --- SARS Payslips (2 PDFs) ---
  const docPayslipJul = await prisma.document.create({
    data: {
      relatedEntityType: "INCOME",
      relatedEntityId: incSARS.id,
      documentType: "PAYSLIP",
      fileUrl: "Artifacts/SARS/Paystub_202706.pdf",
      fileHash: "8a4f91c5b8e90123456789abcdef0123456789abcdef0123456789abcdefb7e2",
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
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
  const docPayslipMay = await prisma.document.create({
    data: {
      relatedEntityType: "INCOME",
      relatedEntityId: incSARS.id,
      documentType: "PAYSLIP",
      fileUrl: "Artifacts/SARS/Paystub_202705.pdf",
      fileHash: "c2a8bf1d3e4f5678901234567890abcdef1234567890abcdef1234567890ab01",
      periodStart: new Date("2026-05-01"),
      periodEnd: new Date("2026-05-31"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: {
        employer: "South African Revenue Service (SARS)",
        employeeName: "Ezrom Mote Mokhotla",
        taxNumber: "0123279143",
        basicSalary: 89900.0,
        nettPay: 65436.34,
      },
    },
  });

  // --- Ekurhuleni Municipality (2 PDFs) ---
  const docMuniBill = await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accMuni.id,
      documentType: "MUNICIPAL_BILL",
      fileUrl: "Artifacts/EkurhuleniMunicipality/2026-06_3505137295_Statement.pdf",
      fileHash: "1b7f40289a0123456789abcdef0123456789abcdef0123456789abcdefe9a0",
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: {
        municipality: "City of Ekurhuleni",
        accountNumber: "3505137295",
        totalBalanceOwed: 6900.0,
        monthlyArrearsInstalment: 650.0,
        urgencyNotice: "PRE-TERMINATION NOTICE ISSUED — Electricity disconnection risk",
      },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accMuni.id,
      documentType: "MUNICIPAL_BILL",
      fileUrl: "Artifacts/EkurhuleniMunicipality/GenerateBill.pdf",
      fileHash: "3d9e2f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d",
      periodStart: new Date("2026-05-01"),
      periodEnd: new Date("2026-05-31"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: {
        municipality: "City of Ekurhuleni",
        accountNumber: "3505137295",
        propertyValuation: 1780000.0,
        erfNumber: "X28 004 00000287",
      },
    },
  });

  // --- Telkom Invoices (2 PDFs) ---
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accTelkom.id,
      documentType: "INVOICE",
      fileUrl: "Artifacts/Telkom/Telkom_Invoice_345669338.pdf",
      fileHash: "4e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e",
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-07-31"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: {
        provider: "Telkom SA SOC Ltd",
        invoiceNumber: "345669338",
        totalAmountDue: 21745.9,
        terminationPenalty: 14000.0,
        ageAnalysisArrears: 7632.97,
      },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accTelkom.id,
      documentType: "INVOICE",
      fileUrl: "Artifacts/Telkom/Telkom_Invoice_345612241.pdf",
      fileHash: "5f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: {
        provider: "Telkom SA SOC Ltd",
        invoiceNumber: "345612241",
        totalAmountDue: 19845.9,
      },
    },
  });

  // --- Vodacom (3 PDFs) ---
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accVodacom.id,
      documentType: "INVOICE",
      fileUrl: "Artifacts/Vodacom/inv-I2754234-27798682053-2026-07-01_509.PDF",
      fileHash: "6a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-07-31"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: {
        provider: "Vodacom (Pty) Ltd",
        accountNumber: "I2754234-5",
        totalAmountDue: 3535.91,
        monthlySubscription: 722.13,
      },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accVodacom.id,
      documentType: "INVOICE",
      fileUrl: "Artifacts/Vodacom/sta-I2754234-2026-07-03_014.PDF",
      fileHash: "7b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-07-31"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: {
        provider: "Vodacom (Pty) Ltd",
        accountNumber: "I2754234-5",
        documentSubtype: "Account Statement",
      },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accVodacom.id,
      documentType: "INVOICE",
      fileUrl: "Artifacts/Vodacom/vbi-I2754234-VC1-14TY-2026-07-01_809.PDF",
      fileHash: "8c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-07-31"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: {
        provider: "Vodacom (Pty) Ltd",
        accountNumber: "I2754234-5",
        documentSubtype: "Value Bundle Invoice",
      },
    },
  });

  // --- Nedbank Personal Loan (3 PDFs) ---
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accNedbank.id,
      documentType: "OTHER",
      fileUrl: "Artifacts/Nedbank/PLN_ANNIVERSARY_LETTER_PLN_152327766_03-21-2026.pdf",
      fileHash: "9d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
      periodStart: new Date("2026-03-21"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: {
        institution: "Nedbank Ltd",
        policyNumber: "P000057737399",
        documentSubtype: "Anniversary Letter",
        loanBalance: 39751.99,
      },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accNedbank.id,
      documentType: "OTHER",
      fileUrl: "Artifacts/Nedbank/PLN_POLICY_SCHEDULE_PLN_A_152327767_03-21-2026.pdf",
      fileHash: "ae6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
      periodStart: new Date("2026-03-21"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: {
        institution: "Nedbank Ltd",
        policyNumber: "P000057737399",
        documentSubtype: "Policy Schedule",
        monthlyInstalment: 2010.03,
      },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accNedbank.id,
      documentType: "OTHER",
      fileUrl: "Artifacts/Nedbank/Policy_Wording_PLN_03-21-2026.pdf",
      fileHash: "bf7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
      periodStart: new Date("2026-03-21"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: {
        institution: "Nedbank Ltd",
        documentSubtype: "Policy Wording (Terms & Conditions)",
      },
    },
  });

  // --- Standard Bank Statements — July 2026 Batch (5 PDFs) ---
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accPrestige.id,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260715/XXXX4469.pdf",
      fileHash: "ca8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
      periodStart: new Date("2026-06-16"),
      periodEnd: new Date("2026-07-15"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: { institution: "Standard Bank", accountSuffix: "4469", batchDate: "2026-07-15" },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accMyMo.id,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260715/XXXX6506.pdf",
      fileHash: "db9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
      periodStart: new Date("2026-06-16"),
      periodEnd: new Date("2026-07-15"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: { institution: "Standard Bank", accountSuffix: "6506", batchDate: "2026-07-15" },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accRev.id,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260715/XXXX7592.pdf",
      fileHash: "ec0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c",
      periodStart: new Date("2026-06-16"),
      periodEnd: new Date("2026-07-15"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: { institution: "Standard Bank", accountSuffix: "7592", accountType: "Revolving Credit Plan", batchDate: "2026-07-15" },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accHomeLoan.id,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260715/XXXXX5510.pdf",
      fileHash: "fd1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
      periodStart: new Date("2026-06-16"),
      periodEnd: new Date("2026-07-15"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: { institution: "Standard Bank", accountSuffix: "5510", accountType: "Home Loan (Mortgage Bond)", batchDate: "2026-07-15" },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accCard.id,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260715/XXXXXXXXXXXX3529.pdf",
      fileHash: "0e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e",
      periodStart: new Date("2026-06-16"),
      periodEnd: new Date("2026-07-15"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: { institution: "Standard Bank", accountSuffix: "3529", accountType: "Titanium Prestige Credit Card", batchDate: "2026-07-15" },
    },
  });

  // --- Standard Bank Statements — August 2026 Batch (5 PDFs) ---
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accPrestige.id,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260813/XXXX4469.pdf",
      fileHash: "1f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
      periodStart: new Date("2026-07-16"),
      periodEnd: new Date("2026-08-13"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: { institution: "Standard Bank", accountSuffix: "4469", batchDate: "2026-08-13" },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accMyMo.id,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260813/XXXX6506.pdf",
      fileHash: "2a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a",
      periodStart: new Date("2026-07-16"),
      periodEnd: new Date("2026-08-13"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: { institution: "Standard Bank", accountSuffix: "6506", batchDate: "2026-08-13" },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accRev.id,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260813/XXXX7592.pdf",
      fileHash: "3b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b",
      periodStart: new Date("2026-07-16"),
      periodEnd: new Date("2026-08-13"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: { institution: "Standard Bank", accountSuffix: "7592", accountType: "Revolving Credit Plan", batchDate: "2026-08-13" },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accHomeLoan.id,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260813/XXXXX5510.pdf",
      fileHash: "4c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c",
      periodStart: new Date("2026-07-16"),
      periodEnd: new Date("2026-08-13"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: { institution: "Standard Bank", accountSuffix: "5510", accountType: "Home Loan (Mortgage Bond)", batchDate: "2026-08-13" },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accCard.id,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260813/XXXXXXXXXXXX3529.pdf",
      fileHash: "5d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
      periodStart: new Date("2026-07-16"),
      periodEnd: new Date("2026-08-13"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: { institution: "Standard Bank", accountSuffix: "3529", accountType: "Titanium Prestige Credit Card", batchDate: "2026-08-13" },
    },
  });

  // --- WesBank Vehicle Finance (2 PDFs) ---
  // WesBank statements — no WesBank account in seed, link to Prestige as source of debit orders
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accPrestige.id,
      documentType: "OTHER",
      fileUrl: "Artifacts/WesBank/stmnn_sp_rstm003wbamh20260731_85361174582e_155900004_36.pdf",
      fileHash: "6e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e",
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-07-31"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: { institution: "WesBank (FirstRand)", documentSubtype: "Vehicle Finance Statement" },
    },
  });
  await prisma.document.create({
    data: {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: accPrestige.id,
      documentType: "OTHER",
      fileUrl: "Artifacts/WesBank/stmnn_sp_rstm003wbwbm20260731_85401320912e_155900005_11.pdf",
      fileHash: "7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-07-31"),
      parsed: true,
      parseStatus: "APPLIED",
      parsedData: { institution: "WesBank (FirstRand)", documentSubtype: "Vehicle Finance Statement (WBM)" },
    },
  });

  // --- Document Embeddings (key text chunks for RAG search) ---
  await prisma.documentEmbedding.create({
    data: {
      documentId: docPayslipJul.id,
      contentChunk: "South African Revenue Service (SARS) Payslip Ezrom Mote Mokhotla Tax: 0123279143 Basic: R95,400 PAYE: -R22,311.26 Group Life: -R2,061.84 Nett Pay: R71,026.90 Backdated Retro Lump Sum: R13,645.44",
      embeddingJson: generateEmbeddingVector("SARS Payslip Ezrom Mote Mokhotla Tax 0123279143 Basic R95,400 PAYE -R22,311.26 Nett Pay R71,026.90 Retro R13,645.44"),
      metadataJson: { institution: "SARS", documentType: "PAYSLIP", nettPay: 71026.9 },
    },
  });
  await prisma.documentEmbedding.create({
    data: {
      documentId: docMuniBill.id,
      contentChunk: "City of Ekurhuleni Municipal Tax Invoice Acc: 3505137295 Total Balance: R6,900.00 Monthly Arrears Instalment: R650.00 PRE-TERMINATION NOTICE ISSUED Electricity disconnection risk",
      embeddingJson: generateEmbeddingVector("City of Ekurhuleni Municipal Tax Invoice Acc 3505137295 Total Balance R6,900 Monthly Arrears R650 PRE-TERMINATION NOTICE Electricity disconnection"),
      metadataJson: { institution: "City of Ekurhuleni", documentType: "MUNICIPAL_BILL", totalBalance: 6900.0 },
    },
  });


  // ─── BUDGET LINE ITEMS (100% COMPLETE STATEMENT & DEBIT ORDER BREAKDOWN) ───

  const currentMonth = "2026-08";

  const budgetItems = [
    // 1. Fixed Household Obligations & Subscriptions (Bank & Cash Wallet Outflows)
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Ekurhuleni Property Rates, Water & Refuse", amount: 3423.83, confidence: "CONFIRMED", note: "City of Ekurhuleni property rates, refuse removal, water & sanitation (Acc: 3505137295)", sourceRef: "account:municipal" },
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Domestic Worker Cash Wage (Cleaning & Housekeeping)", amount: 2200.00, confidence: "CONFIRMED", note: "Monthly recurring cash wage for domestic cleaning and housekeeping", sourceRef: "cash_wallet:domestic_worker" },
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Household Electricity (Prepaid Tokens)", amount: 2000.00, confidence: "ESTIMATED", note: "Monthly estimated prepaid electricity token purchases", sourceRef: "utility:electricity" },
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Vodacom Mobile Fibre & Cellular", amount: 1499.00, confidence: "CONFIRMED", note: "Vodacom mobile contracts (071 282 1432 & 077 986 82053) & home fibre (Acc: I2754234-5)", sourceRef: "account:vodacom" },
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Banking Account Fees & Overdraft Service Charges", amount: 593.49, confidence: "CONFIRMED", note: "Prestige account fee (R260), overdraft service fee (R69) & transaction fees", sourceRef: "statement:XXXX4469:fees" },
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Garden Services & Grounds Maintenance", amount: 550.00, confidence: "CONFIRMED", note: "Monthly recurring cash service fee for garden and lawn maintenance", sourceRef: "cash_wallet:garden_services" },
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Google Workspace & AI Premium (Antigravity)", amount: 450.00, confidence: "CONFIRMED", note: "Developer cloud and AI platform subscription", sourceRef: "statement:google_cloud" },
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Vehicle Tracking & Telematics (Cartrack & Tracker)", amount: 403.49, confidence: "CONFIRMED", note: "Cartrack (R204.49) + Tracker (R199.00) vehicle security recovery units", sourceRef: "statement:XXXX4469:tracking" },
    { category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Netflix ZA Subscription", amount: 229.00, confidence: "CONFIRMED", note: "Monthly streaming entertainment debit on Titanium Credit Card", sourceRef: "statement:XXXX3529:netflix" },

    // 2. Debt Acceleration Plan (DebiCheck & Contractual Debt Repayments)
    { category: "DEBT_ACCELERATION_PLAN", label: "Standard Bank Home Loan (Bond Repayment)", amount: 17786.45, isComputed: true, confidence: "CONFIRMED", note: "Primary mortgage bond repayment debit order (Account: SBSA HOMEL 534812597)", sourceRef: "statement:XXXX4469:sbsa_homel" },
    { category: "DEBT_ACCELERATION_PLAN", label: "Standard Bank Revolving Credit Plan Minimum", amount: 7457.66, isComputed: true, confidence: "CONFIRMED", note: "Revolving credit facility contractual minimum DebiCheck (Acc: 22043551000022)", sourceRef: "statement:XXXX4469:sbsa_rcp" },
    { category: "DEBT_ACCELERATION_PLAN", label: "WesBank Vehicle Finance (Renault Clio V)", amount: 5468.02, isComputed: true, confidence: "CONFIRMED", note: "Renault Clio V 1.0t Zen DebiCheck debit order (Acc: 85361174582)", sourceRef: "statement:XXXX4469:wesbank_clio" },
    { category: "DEBT_ACCELERATION_PLAN", label: "University Fees Payment Plan", amount: 4000.00, isComputed: true, confidence: "CONFIRMED", note: "Accelerated tertiary tuition repayment (cleared in 12 months by Aug 2027)", sourceRef: "debt:university" },
    { category: "DEBT_ACCELERATION_PLAN", label: "Nedbank Personal Loan Instalment", amount: 2010.03, isComputed: true, confidence: "CONFIRMED", note: "Fixed personal loan instalment DebiCheck debit order (Acc: PLN 152327766)", sourceRef: "statement:XXXX4469:nedbank_loan" },
    { category: "DEBT_ACCELERATION_PLAN", label: "Telkom Debt Settlement Arrangement", amount: 2000.00, isComputed: true, confidence: "CONFIRMED", note: "Agreed structured settlement monthly repayment for overdue lines", sourceRef: "debt:telkom" },
    { category: "DEBT_ACCELERATION_PLAN", label: "School Fees Arrears Payment Plan", amount: 2000.00, isComputed: true, confidence: "CONFIRMED", note: "Accelerated school fees arrears repayment (cleared in 10 months by Jun 2027)", sourceRef: "debt:schoolfees" },
    { category: "DEBT_ACCELERATION_PLAN", label: "WesBank Vehicle Finance (Hyundai Grand i10)", amount: 722.13, isComputed: true, confidence: "CONFIRMED", note: "Hyundai Grand i10 1.0 Fluid DebiCheck debit order (Acc: 85401320912)", sourceRef: "statement:XXXX4469:wesbank_i10" },
    { category: "DEBT_ACCELERATION_PLAN", label: "Standard Bank Titanium Credit Card Minimum", amount: 700.00, isComputed: true, confidence: "CONFIRMED", note: "Titanium Prestige credit card contractual minimum payment (5239-xxxx-xxxx-3529)", sourceRef: "statement:XXXX3529:min" },
    { category: "DEBT_ACCELERATION_PLAN", label: "Municipal Arrears Arrangement", amount: 650.00, isComputed: true, confidence: "CONFIRMED", note: "Structured municipal arrears repayment arrangement", sourceRef: "debt:municipal_arrears" },

    // 3. Goal Contributions
    { category: "GOAL_CONTRIBUTIONS", label: "Car Transmission Repair Sinking Fund", amount: 10095.16, isComputed: true, confidence: "CONFIRMED", note: "Target: R 40,000.00 transmission overhaul fund (Allocating full liquid surplus R 10,095.16/mo · Target: Dec 2026)", sourceRef: "goal:car_transmission_repair" },

    // 4. Family & Discretionary Monthly Spend
    { category: "FAMILY_AND_DISCRETIONARY", label: "Groceries & Household Supplies", amount: 4000.00, confidence: "CONFIRMED", note: "SuperSpar, Woolworths & Pick n Pay monthly allocation" },
    { category: "FAMILY_AND_DISCRETIONARY", label: "Fuel & Transportation", amount: 1200.00, confidence: "ESTIMATED", note: "WFH schedule: 3-4 office trips/month @ R250/trip + local errands (R1,200 total)" },
    { category: "FAMILY_AND_DISCRETIONARY", label: "Family Discretionary & Dining", amount: 2500.00, confidence: "ESTIMATED", note: "Family allowances, weekend dining & leisure" },

    // 5. One-Off / Unexpected Expenses
    { category: "ONE_OFF_UNEXPECTED", label: "Car Brakes and Disk Repairs", amount: 3812.25, confidence: "CONFIRMED", note: "One-off vehicle maintenance: brake pads and disk replacement" },
    { category: "ONE_OFF_UNEXPECTED", label: "Weekend Getaway", amount: 5920.00, confidence: "CONFIRMED", note: "One-off family leisure trip & accommodation" },
  ];

  const monthsToSeed = ["2026-05", "2026-06", "2026-07", "2026-08"];

  for (const m of monthsToSeed) {
    for (const b of budgetItems) {
      await prisma.budgetLineItem.create({
        data: {
          userId: user.id,
          category: b.category as any,
          label: b.label,
          amount: b.amount,
          isComputed: b.isComputed ?? false,
          confidence: (b.confidence as any) ?? "CONFIRMED",
          note: b.note ?? null,
          sourceRef: (b as any).sourceRef ?? null,
          month: m,
        },
      });
    }
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

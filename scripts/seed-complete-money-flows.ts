import { prisma } from "../src/lib/prisma";
import fs from "fs";
import path from "path";

export async function seedCompleteMoneyFlows(forceReSeed = true) {
  const user = await prisma.user.findFirst({
    where: { username: "mokhotm" },
  });

  if (!user) {
    console.error("❌ User 'mokhotm' not found in database.");
    return { count: 0 };
  }

  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const debts = await prisma.debt.findMany({
    where: { account: { userId: user.id } },
    include: { account: true },
  });

  // Identify Accounts
  const accPrestige = accounts.find((a) => a.name.includes("Prestige Current")) ?? accounts.find((a) => a.type === "CURRENT");
  const accMyMo = accounts.find((a) => a.name.includes("MyMo")) ?? accounts.find((a) => a.name.includes("XXXX6506"));
  const accCreditCard = accounts.find((a) => a.type === "CREDIT_CARD") ?? accounts.find((a) => a.name.includes("Titanium"));
  const accRevolving = accounts.find((a) => a.name.includes("Revolving")) ?? accounts.find((a) => a.name.includes("RCP"));
  const accCashWallet = accounts.find((a) => a.type === "CASH_WALLET") ?? accounts.find((a) => a.name.includes("Cash Wallet"));

  // Identify Specific Debts
  const debtHomeLoan = debts.find((d) => d.account.name.includes("Home Loan"));
  const debtNedbank = debts.find((d) => d.account.name.includes("Nedbank"));
  const debtWesbankClio = debts.find((d) => d.account.name.includes("Renault Clio"));
  const debtWesbankHyundai = debts.find((d) => d.account.name.includes("Hyundai"));

  const accountMap: Record<string, string | undefined> = {
    prestige: accPrestige?.id,
    mymo: accMyMo?.id,
    creditcard: accCreditCard?.id,
    credit: accCreditCard?.id,
    rcp: accRevolving?.id,
    revolving: accRevolving?.id,
    plusplan: accRevolving?.id,
  };

  const dbPath = path.join(process.cwd(), "transactions_db.json");
  if (!fs.existsSync(dbPath)) {
    console.error("❌ transactions_db.json file not found at:", dbPath);
    return { count: 0 };
  }

  const transactions: any[] = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  console.log(`📂 Read ${transactions.length} transactions from transactions_db.json`);

  if (forceReSeed) {
    console.log("🗑️ Clearing old MoneyFlow records...");
    await prisma.moneyFlow.deleteMany({});
  }

  const flowsToInsert: any[] = [];

  for (let idx = 0; idx < transactions.length; idx++) {
    const t = transactions[idx];
    const sourceAccId = accountMap[t.account] || accPrestige?.id;
    if (!sourceAccId) continue;

    const desc1 = (t.desc1 || "").trim();
    const desc2 = (t.desc2 || "").trim();
    const fullDesc = `${desc1} ${desc2}`.trim();
    const fullDescLower = fullDesc.toLowerCase();
    const rawAmt = Number(t.amount);
    const absAmt = Math.abs(rawAmt);

    let flowType: string = "OTHER";
    let sourceType: string = "ACCOUNT";
    let sourceRef: string = sourceAccId;
    let destinationType: string = "EXTERNAL";
    let destinationRef: string = fullDesc || "Transaction";
    let status: string = "ACTIVE";

    if (rawAmt > 0) {
      // ─── INFLOWS / SALARY / DEPOSITS ───
      flowType = "INCOME";
      sourceType = "EXTERNAL";
      if (fullDescLower.includes("salary") || fullDescLower.includes("employer") || absAmt > 45000) {
        sourceRef = "SARS Primary Salary Inflow";
      } else if (fullDescLower.includes("interest")) {
        sourceRef = "Credit Interest Received";
      } else if (fullDescLower.includes("refund")) {
        sourceRef = "Merchant Refund / Inflow";
      } else {
        sourceRef = desc1 || "Income Deposit";
      }
      destinationType = "ACCOUNT";
      destinationRef = sourceAccId;
    } else {
      // ─── OUTFLOWS ───
      sourceType = "ACCOUNT";
      sourceRef = sourceAccId;

      if (
        fullDescLower.includes("autobank cash") ||
        fullDescLower.includes("atm cash") ||
        fullDescLower.includes("cash withdrawal") ||
        fullDescLower.includes("cash to")
      ) {
        // ATM Cash Withdrawal
        flowType = "CASH_WITHDRAWAL";
        destinationType = "CASH_WALLET";
        destinationRef = accCashWallet?.id || "cash-wallet-primary";
        status = "PARTIALLY_CONSUMED";
      } else if (
        fullDescLower.includes("home loan") ||
        fullDescLower.includes("homel") ||
        fullDescLower.includes("534812597") ||
        fullDescLower.includes("bond repayment") ||
        fullDescLower.includes("bond settlement")
      ) {
        // Home Loan Bond
        flowType = "DEBT_PAYMENT";
        destinationType = "DEBT";
        destinationRef = debtHomeLoan?.id || "Standard Bank Home Loan (Mortgage Bond)";
      } else if (fullDescLower.includes("nedbank") || fullDescLower.includes("nedbpl") || fullDescLower.includes("152327766") || fullDescLower.includes("80056262500")) {
        // Nedbank Personal Loan
        flowType = "DEBT_PAYMENT";
        destinationType = "DEBT";
        destinationRef = debtNedbank?.id || "Nedbank Personal Loan";
      } else if (fullDescLower.includes("wesbank") || fullDescLower.includes("clio") || fullDescLower.includes("hyundai") || fullDescLower.includes("85361174582") || fullDescLower.includes("85401320912")) {
        // Wesbank Vehicle Finance
        flowType = "DEBT_PAYMENT";
        destinationType = "DEBT";
        destinationRef = fullDescLower.includes("85401320912") || fullDescLower.includes("hyundai")
          ? debtWesbankHyundai?.id || "WesBank Vehicle Finance (Hyundai Grand i10)"
          : debtWesbankClio?.id || "WesBank Vehicle Finance (Renault Clio V)";
      } else if (fullDescLower.includes("titanium") || fullDescLower.includes("credit card") || fullDescLower.includes("5773529")) {
        // Credit Card Repayment / Transfer
        flowType = "DEBT_PAYMENT";
        destinationType = "ACCOUNT";
        destinationRef = accCreditCard?.id || "Titanium Prestige Credit Card";
      } else if (fullDescLower.includes("rcp") || fullDescLower.includes("revolving") || fullDescLower.includes("22043551000022")) {
        // Revolving Credit Plan Loan
        flowType = "DEBT_PAYMENT";
        destinationType = "ACCOUNT";
        destinationRef = accRevolving?.id || "Revolving Credit Plan Loan";
      } else if (
        fullDescLower.includes("sbg sec") ||
        fullDescLower.includes("money market") ||
        fullDescLower.includes("securities") ||
        fullDescLower.includes("allan gray") ||
        fullDescLower.includes("sygnia")
      ) {
        // Investments
        flowType = "INVESTMENT";
        destinationType = "EXTERNAL";
        destinationRef = "SBG Securities Money Market Trust";
      } else if (
        fullDescLower.includes("ib transfer") ||
        fullDescLower.includes("transfer to") ||
        fullDescLower.includes("inter account") ||
        fullDescLower.includes("inter-account")
      ) {
        // Inter-account transfer
        flowType = "TRANSFER";
        destinationType = "ACCOUNT";
        if (t.account === "mymo") {
          destinationRef = accPrestige?.id || "Prestige Current Account";
        } else {
          destinationRef = accMyMo?.id || "MyMo Current Account";
        }
      } else if (
        fullDescLower.includes("fee") ||
        fullDescLower.includes("ucount") ||
        fullDescLower.includes("monthly fee") ||
        fullDescLower.includes("service fee") ||
        fullDescLower.includes("transaction fee")
      ) {
        // Bank Fees
        flowType = "FEE";
        destinationType = "EXTERNAL";
        destinationRef = fullDesc || "Bank Service Fee";
      } else if (
        fullDescLower.includes("spar") ||
        fullDescLower.includes("pick n pay") ||
        fullDescLower.includes("checkers") ||
        fullDescLower.includes("woolworths") ||
        fullDescLower.includes("shoprite") ||
        fullDescLower.includes("food lover") ||
        fullDescLower.includes("bakerton") ||
        fullDescLower.includes("al-aswad") ||
        fullDescLower.includes("butchery")
      ) {
        // Groceries & Daily Needs
        flowType = "CASH_SPENDING";
        destinationType = "EXTERNAL";
        destinationRef = fullDesc || "Groceries & Food Stores";
      } else if (
        fullDescLower.includes("engen") ||
        fullDescLower.includes("shell") ||
        fullDescLower.includes("bp ") ||
        fullDescLower.includes("sasol") ||
        fullDescLower.includes("total") ||
        fullDescLower.includes("astron")
      ) {
        // Fuel & Transport
        flowType = "OTHER";
        destinationType = "EXTERNAL";
        destinationRef = fullDesc || "Fuel & Vehicle Refueling";
      } else if (
        fullDescLower.includes("ekurhuleni") ||
        fullDescLower.includes("electricity") ||
        fullDescLower.includes("rates") ||
        fullDescLower.includes("vas002") ||
        fullDescLower.includes("vodacom") ||
        fullDescLower.includes("telkom")
      ) {
        // Utilities & Municipal
        flowType = "OTHER";
        destinationType = "EXTERNAL";
        destinationRef = fullDesc || "Municipal Utilities & Connectivity";
      } else if (fullDescLower.includes("ufs") || fullDescLower.includes("tuition") || fullDescLower.includes("hoerskool") || fullDescLower.includes("school")) {
        // Education
        flowType = "OTHER";
        destinationType = "EXTERNAL";
        destinationRef = fullDesc || "Education & Tuition";
      } else if (fullDescLower.includes("kabelo") || fullDescLower.includes("kamohelo") || fullDescLower.includes("raphuti") || fullDescLower.includes("allowance")) {
        // Family Allowance Support
        flowType = "OTHER";
        destinationType = "EXTERNAL";
        destinationRef = fullDesc || "Family Support & Allowance";
      } else {
        flowType = "OTHER";
        destinationType = "EXTERNAL";
        destinationRef = fullDesc || "Card Purchase / EFT";
      }
    }

    flowsToInsert.push({
      originTransactionId: t.id || `txn_stmt_${idx + 1}`,
      sourceType,
      sourceRef,
      destinationType,
      destinationRef,
      amount: absAmt,
      currentAmount: absAmt,
      flowType,
      status,
      confidence: "CONFIRMED",
      createdAt: new Date(t.date || "2026-08-01T00:00:00Z"),
    });
  }

  console.log(`🚀 Inserting ${flowsToInsert.length} complete MoneyFlow records in batches...`);

  // Batch insert in chunks of 100 for safety and speed
  const CHUNK_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < flowsToInsert.length; i += CHUNK_SIZE) {
    const chunk = flowsToInsert.slice(i, i + CHUNK_SIZE);
    await prisma.moneyFlow.createMany({
      data: chunk,
    });
    inserted += chunk.length;
  }

  console.log(`✅ Successfully seeded all ${inserted} MoneyFlow records into PostgreSQL!`);

  // Seed sample cash wallet breakdown child flows for the latest ATM withdrawal
  const latestAtmFlow = await prisma.moneyFlow.findFirst({
    where: { flowType: "CASH_WITHDRAWAL" },
    orderBy: { createdAt: "desc" },
  });

  if (latestAtmFlow && accCashWallet) {
    const child1 = await prisma.moneyFlow.create({
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

    const child2 = await prisma.moneyFlow.create({
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

    const child3 = await prisma.moneyFlow.create({
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

    console.log("✅ Seeded detailed cash wallet child split lineage nodes.");
  }

  return { count: inserted };
}

if (require.main === module) {
  seedCompleteMoneyFlows(true)
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

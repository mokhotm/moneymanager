import { prisma } from "../src/lib/prisma";
import fs from "fs";
import path from "path";

async function reseedAccurateMoneyFlows() {
  const user = await prisma.user.findFirst({
    where: { username: "mokhotm" },
    include: { accounts: true },
  });

  if (!user) {
    throw new Error("User mokhotm not found");
  }

  const accPrestige = user.accounts.find((a) => a.name.includes("Prestige Current") || (a.type === "CURRENT" && a.name.includes("Prestige")));
  const accMyMo = user.accounts.find((a) => a.name.includes("MyMo"));
  const accCard = user.accounts.find((a) => a.name.includes("Titanium") || a.type === "CREDIT_CARD");
  const accRevolving = user.accounts.find((a) => a.name.includes("Revolving") || a.name.includes("RCP"));
  const accCashWallet = user.accounts.find((a) => a.type === "CASH_WALLET");

  const debts = await prisma.debt.findMany({
    where: { account: { userId: user.id } },
    include: { account: true },
  });

  const debtHomeLoan = debts.find((d) => d.account.name.includes("Home Loan") || d.account.name.includes("Bond"));
  const debtRevolving = debts.find((d) => d.account.name.includes("Revolving") || d.account.name.includes("RCP"));
  const debtNedbank = debts.find((d) => d.account.name.includes("Nedbank"));
  const debtWesbankClio = debts.find((d) => d.account.name.includes("Renault") || d.account.name.includes("Clio") || d.account.name.includes("Triber"));
  const debtWesbankHyundai = debts.find((d) => d.account.name.includes("Hyundai"));
  const debtTelkom = debts.find((d) => d.account.name.includes("Telkom"));
  const debtMuni = debts.find((d) => d.account.name.includes("Ekurhuleni") || d.account.name.includes("Municipal"));
  const debtSchool = debts.find((d) => d.account.name.includes("School"));
  const debtUni = debts.find((d) => d.account.name.includes("University") || d.account.name.includes("Tuition"));

  console.log("Mapped Core Accounts:", {
    prestige: accPrestige?.id,
    mymo: accMyMo?.id,
    card: accCard?.id,
    revolving: accRevolving?.id,
    cashWallet: accCashWallet?.id,
  });

  console.log("Mapped Core Debts:", {
    homeLoan: debtHomeLoan?.id,
    revolving: debtRevolving?.id,
    nedbank: debtNedbank?.id,
    wesbankClio: debtWesbankClio?.id,
    wesbankHyundai: debtWesbankHyundai?.id,
    telkom: debtTelkom?.id,
    muni: debtMuni?.id,
    school: debtSchool?.id,
    uni: debtUni?.id,
  });

  // Read transactions_db.json
  const dbPath = path.join(process.cwd(), "transactions_db.json");
  const rawTx: any[] = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

  const accountMap: Record<string, string | undefined> = {
    prestige: accPrestige?.id,
    mymo: accMyMo?.id,
    creditcard: accCard?.id,
    credit: accCard?.id,
    rcp: accRevolving?.id,
    revolving: accRevolving?.id,
    plusplan: accRevolving?.id,
  };

  const flowsToInsert: any[] = [];

  for (let idx = 0; idx < rawTx.length; idx++) {
    const t = rawTx[idx];
    const sourceAccId = accountMap[t.account] || accPrestige?.id || "prestige";
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
      // ─── INFLOWS / SALARY / DEPOSITS / TRANSFERS IN ───
      if (
        fullDescLower.includes("ib transfer from") ||
        fullDescLower.includes("transfer from") ||
        fullDescLower.includes("payshap payment from") ||
        fullDescLower.includes("fund transfers")
      ) {
        // Internal transfer received
        flowType = "TRANSFER";
        sourceType = "ACCOUNT";
        if (t.account === "mymo") {
          sourceRef = fullDescLower.includes("5773529") || fullDescLower.includes("3529")
            ? accCard?.id || "Titanium Prestige Credit Card"
            : accPrestige?.id || "Prestige Current Account";
          destinationType = "ACCOUNT";
          destinationRef = accMyMo?.id || "MyMo Current Account";
        } else if (t.account === "creditcard") {
          sourceRef = accPrestige?.id || "Prestige Current Account";
          destinationType = "ACCOUNT";
          destinationRef = accCard?.id || "Titanium Prestige Credit Card";
        } else {
          sourceRef = accMyMo?.id || "MyMo Current Account";
          destinationType = "ACCOUNT";
          destinationRef = accPrestige?.id || "Prestige Current Account";
        }
      } else {
        flowType = "INCOME";
        sourceType = "EXTERNAL";
        if (fullDescLower.includes("salary") || fullDescLower.includes("employer") || fullDescLower.includes("sarssaid") || absAmt > 45000) {
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
      }
    } else {
      // ─── OUTFLOWS ───
      sourceType = "ACCOUNT";
      sourceRef = sourceAccId;

      if (
        fullDescLower.includes("autobank cash") ||
        fullDescLower.includes("atm cash") ||
        fullDescLower.includes("cash withdrawal") ||
        fullDescLower.includes("cash to") ||
        (fullDescLower.includes("00004472") && absAmt === 4000) ||
        (fullDescLower.includes("0000h514") && absAmt === 3000)
      ) {
        // ATM Cash Withdrawal
        flowType = "CASH_WITHDRAWAL";
        destinationType = "CASH_WALLET";
        destinationRef = accCashWallet?.id || "Physical Cash Wallet";
        status = "PARTIALLY_CONSUMED";
      } else if (
        fullDescLower.includes("home loan") ||
        fullDescLower.includes("homel") ||
        fullDescLower.includes("534812597") ||
        fullDescLower.includes("bond repayment") ||
        fullDescLower.includes("bond settlement")
      ) {
        // Home Loan Bond Repayment
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
      } else if (fullDescLower.includes("rcp") || fullDescLower.includes("revolving") || fullDescLower.includes("22043551000022")) {
        // Revolving Credit Plan Loan
        flowType = "DEBT_PAYMENT";
        destinationType = "DEBT";
        destinationRef = debtRevolving?.id || "Revolving Credit Plan Loan";
      } else if (
        fullDescLower.includes("int acnt trf") ||
        fullDescLower.includes("ib transfer to") ||
        fullDescLower.includes("transfer to") ||
        fullDescLower.includes("inter account") ||
        fullDescLower.includes("inter-account") ||
        fullDescLower.includes("5773529 ib transfer")
      ) {
        // Inter-account transfer
        flowType = "TRANSFER";
        destinationType = "ACCOUNT";
        if (fullDescLower.includes("5773529") || fullDescLower.includes("titanium") || fullDescLower.includes("credit card")) {
          destinationRef = accCard?.id || "Titanium Prestige Credit Card";
        } else if (t.account === "creditcard" && (fullDescLower.includes("5936") || fullDescLower.includes("marsh"))) {
          destinationRef = accMyMo?.id || "MyMo Current Account";
        } else if (t.account === "prestige") {
          destinationRef = accMyMo?.id || "MyMo Current Account";
        } else {
          destinationRef = accPrestige?.id || "Prestige Current Account";
        }
      } else if (
        fullDescLower.includes("sbg sec") ||
        fullDescLower.includes("money market") ||
        fullDescLower.includes("securities") ||
        fullDescLower.includes("allan gray") ||
        fullDescLower.includes("sygnia")
      ) {
        // Investments / Wealth Reserve
        flowType = "INVESTMENT";
        destinationType = "EXTERNAL";
        destinationRef = "SBG Securities Money Market Trust";
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
      } else if (fullDescLower.includes("ekurhuleni") || fullDescLower.includes("rates")) {
        flowType = "DEBT_PAYMENT";
        destinationType = "DEBT";
        destinationRef = debtMuni?.id || "Ekurhuleni Municipal Account";
      } else if (fullDescLower.includes("school") || fullDescLower.includes("hoerskool")) {
        flowType = "DEBT_PAYMENT";
        destinationType = "DEBT";
        destinationRef = debtSchool?.id || "School Fees Arrears";
      } else if (fullDescLower.includes("tuition") || fullDescLower.includes("university") || fullDescLower.includes("ufs")) {
        flowType = "DEBT_PAYMENT";
        destinationType = "DEBT";
        destinationRef = debtUni?.id || "University Tuition Fees (Tertiary)";
      } else if (fullDescLower.includes("telkom")) {
        flowType = "DEBT_PAYMENT";
        destinationType = "DEBT";
        destinationRef = debtTelkom?.id || "Telkom Landline / Broadband";
      } else if (fullDescLower.includes("electricity") || fullDescLower.includes("vas002") || fullDescLower.includes("vodacom")) {
        flowType = "OTHER";
        destinationType = "EXTERNAL";
        destinationRef = fullDesc || "Municipal Utilities & Connectivity";
      } else if (fullDescLower.includes("kabelo") || fullDescLower.includes("kamohelo") || fullDescLower.includes("allowance") || fullDescLower.includes("wifey") || fullDescLower.includes("lekoa")) {
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

  // Also add the monthly funding inter-account transfer from Prestige -> MyMo for August 2026 (15 Aug 2026)
  // This funds the MyMo account to pay the Home Loan (R17,786.45), Ekurhuleni (R4,073.83), School (R2,000), Vodacom (R1,499), and ATM cash (R4,000)
  flowsToInsert.push({
    originTransactionId: "txn_transfer_prestige_mymo_aug2026",
    sourceType: "ACCOUNT",
    sourceRef: accPrestige?.id || "Prestige Current Account",
    destinationType: "ACCOUNT",
    destinationRef: accMyMo?.id || "MyMo Current Account",
    amount: 29359.28,
    currentAmount: 29359.28,
    flowType: "TRANSFER",
    status: "ACTIVE",
    confidence: "CONFIRMED",
    createdAt: new Date("2026-08-15T07:30:00Z"),
  });

  // Also add the transfer from Prestige -> Credit Card for August 2026 (14 Aug 2026)
  flowsToInsert.push({
    originTransactionId: "txn_transfer_prestige_card_aug2026",
    sourceType: "ACCOUNT",
    sourceRef: accPrestige?.id || "Prestige Current Account",
    destinationType: "ACCOUNT",
    destinationRef: accCard?.id || "Titanium Prestige Credit Card",
    amount: 1000.00,
    currentAmount: 1000.00,
    flowType: "TRANSFER",
    status: "ACTIVE",
    confidence: "CONFIRMED",
    createdAt: new Date("2026-08-14T08:00:00Z"),
  });

  console.log(`Prepared ${flowsToInsert.length} MoneyFlow items.`);

  // Clear existing MoneyFlow records
  await prisma.moneyFlow.deleteMany({});
  console.log("Deleted existing MoneyFlow records.");

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < flowsToInsert.length; i += batchSize) {
    const batch = flowsToInsert.slice(i, i + batchSize);
    await prisma.moneyFlow.createMany({ data: batch });
  }

  console.log(`Successfully seeded ${flowsToInsert.length} MoneyFlow records!`);

  // Verify August cycle summary
  const augustFlows = await prisma.moneyFlow.findMany({
    where: {
      createdAt: {
        gte: new Date("2026-08-14T00:00:00Z"),
        lte: new Date("2026-09-14T23:59:59Z"),
      },
    },
  });

  console.log("\n=== AUGUST 2026 FLOW SUMMARY ===");
  console.log("Total August Flows:", augustFlows.length);
  const typeMap: Record<string, number> = {};
  const sumMap: Record<string, number> = {};
  augustFlows.forEach((f) => {
    typeMap[f.flowType] = (typeMap[f.flowType] || 0) + 1;
    sumMap[f.flowType] = (sumMap[f.flowType] || 0) + Number(f.amount);
  });
  console.log("Counts by type:", typeMap);
  console.log("Amounts by type (ZAR):", sumMap);

  const transferFlows = augustFlows.filter((f) => f.flowType === "TRANSFER");
  console.log("\nAugust Transfer Flows:");
  transferFlows.forEach((f) => {
    console.log(`- ${f.createdAt.toISOString().slice(0, 10)} | Amount: R${f.amount} | Source: ${f.sourceRef} -> Dest: ${f.destinationRef}`);
  });

  const debtFlows = augustFlows.filter((f) => f.flowType === "DEBT_PAYMENT");
  console.log("\nAugust Debt Flows:");
  debtFlows.forEach((f) => {
    console.log(`- ${f.createdAt.toISOString().slice(0, 10)} | Amount: R${f.amount} | Source: ${f.sourceRef} -> Dest: ${f.destinationRef}`);
  });
}

reseedAccurateMoneyFlows()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

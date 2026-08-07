import { prisma } from "../src/lib/prisma";

export async function seedMoneyFlowsForUser(forceReSeed = false) {
  const user = await prisma.user.findFirst({
    where: { username: "mokhotm" },
  });

  if (!user) {
    console.log("No user mokhotm found");
    return;
  }

  if (forceReSeed) {
    console.log("Force re-seed requested. Deleting existing MoneyFlow records...");
    await prisma.moneyFlow.deleteMany({});
  } else {
    const existingCount = await prisma.moneyFlow.count();
    if (existingCount > 0) {
      console.log(`MoneyFlows already seeded (${existingCount} records).`);
      return;
    }
  }

  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const debts = await prisma.debt.findMany({
    where: { account: { userId: user.id } },
    include: { account: true },
  });
  const incomes = await prisma.income.findMany({ where: { userId: user.id } });

  const prestigeAcc = accounts.find((a) => a.name.includes("Prestige Current")) ?? accounts.find((a) => a.type === "CURRENT");
  const myMoAcc = accounts.find((a) => a.name.includes("MyMo"));
  const savingsAcc = accounts.find((a) => a.type === "SAVINGS");
  const creditCardAcc = accounts.find((a) => a.type === "CREDIT_CARD");

  const createdFlows = [];

  // 1. Primary Salary Inflow to Prestige Current Account
  const salaryAmount = incomes.length > 0
    ? incomes.reduce((s, i) => s + Number(i.recurringAmount), 0)
    : 71026.9;

  const salaryFlow = await prisma.moneyFlow.create({
    data: {
      sourceType: "EXTERNAL",
      sourceRef: "Primary Salary (SARS Employer)",
      destinationType: "ACCOUNT",
      destinationRef: prestigeAcc?.id ?? "account-prestige",
      amount: salaryAmount,
      currentAmount: salaryAmount,
      flowType: "INCOME",
      status: "ACTIVE",
      confidence: "CONFIRMED",
      createdAt: new Date("2026-07-15T08:30:00Z"),
    },
  });
  createdFlows.push(salaryFlow);

  // 2. Transfer from Prestige to PlusPlan Savings
  if (savingsAcc && prestigeAcc) {
    const transferFlow = await prisma.moneyFlow.create({
      data: {
        parentFlowId: salaryFlow.id,
        sourceType: "ACCOUNT",
        sourceRef: prestigeAcc.id,
        destinationType: "ACCOUNT",
        destinationRef: savingsAcc.id,
        amount: 15000,
        currentAmount: 15000,
        flowType: "TRANSFER",
        status: "ACTIVE",
        confidence: "CONFIRMED",
        createdAt: new Date("2026-07-16T09:15:00Z"),
      },
    });
    createdFlows.push(transferFlow);

    // Savings Interest Inflow
    const interestFlow = await prisma.moneyFlow.create({
      data: {
        sourceType: "EXTERNAL",
        sourceRef: "Standard Bank Savings Interest",
        destinationType: "ACCOUNT",
        destinationRef: savingsAcc.id,
        amount: 87.50,
        currentAmount: 87.50,
        flowType: "INCOME",
        status: "ACTIVE",
        confidence: "CONFIRMED",
        createdAt: new Date("2026-07-31T23:59:00Z"),
      },
    });
    createdFlows.push(interestFlow);
  }

  // 3. Transactions on MyMo Current Account
  if (myMoAcc) {
    const myMoDeposit = await prisma.moneyFlow.create({
      data: {
        sourceType: "EXTERNAL",
        sourceRef: "Consulting & Secondary Income",
        destinationType: "ACCOUNT",
        destinationRef: myMoAcc.id,
        amount: 6386.09,
        currentAmount: 6386.09,
        flowType: "INCOME",
        status: "ACTIVE",
        confidence: "CONFIRMED",
        createdAt: new Date("2026-07-10T11:00:00Z"),
      },
    });
    createdFlows.push(myMoDeposit);

    const myMoFee = await prisma.moneyFlow.create({
      data: {
        sourceType: "ACCOUNT",
        sourceRef: myMoAcc.id,
        destinationType: "EXTERNAL",
        destinationRef: "Standard Bank Account Fee",
        amount: 6.50,
        currentAmount: 6.50,
        flowType: "GOAL_CONTRIBUTION",
        status: "ACTIVE",
        confidence: "CONFIRMED",
        createdAt: new Date("2026-07-12T00:05:00Z"),
      },
    });
    createdFlows.push(myMoFee);

    const WoolworthsSpend = await prisma.moneyFlow.create({
      data: {
        sourceType: "ACCOUNT",
        sourceRef: myMoAcc.id,
        destinationType: "EXTERNAL",
        destinationRef: "Woolworths Food & Household",
        amount: 680.00,
        currentAmount: 680.00,
        flowType: "CASH_SPENDING",
        status: "ACTIVE",
        confidence: "CONFIRMED",
        createdAt: new Date("2026-07-20T14:22:00Z"),
      },
    });
    createdFlows.push(WoolworthsSpend);
  }

  // 4. Credit Card Direct Spend Transactions (Titanium Credit Card)
  if (creditCardAcc) {
    const fuelSpend = await prisma.moneyFlow.create({
      data: {
        sourceType: "ACCOUNT",
        sourceRef: creditCardAcc.id,
        destinationType: "EXTERNAL",
        destinationRef: "Engen QuickShop & Fuel",
        amount: 1200.00,
        currentAmount: 1200.00,
        flowType: "CASH_SPENDING",
        status: "ACTIVE",
        confidence: "CONFIRMED",
        createdAt: new Date("2026-07-18T17:45:00Z"),
      },
    });
    createdFlows.push(fuelSpend);

    const streamingSpend = await prisma.moneyFlow.create({
      data: {
        sourceType: "ACCOUNT",
        sourceRef: creditCardAcc.id,
        destinationType: "EXTERNAL",
        destinationRef: "Netflix & Digital Services",
        amount: 249.00,
        currentAmount: 249.00,
        flowType: "CASH_SPENDING",
        status: "ACTIVE",
        confidence: "CONFIRMED",
        createdAt: new Date("2026-07-22T02:00:00Z"),
      },
    });
    createdFlows.push(streamingSpend);
  }

  // 5. Debt Paydown Flows for ALL active debts
  for (const debt of debts) {
    if (!prestigeAcc) break;
    const paymentFlow = await prisma.moneyFlow.create({
      data: {
        parentFlowId: salaryFlow.id,
        sourceType: "ACCOUNT",
        sourceRef: prestigeAcc.id,
        destinationType: "DEBT",
        destinationRef: debt.id,
        amount: Number(debt.minimumPayment),
        currentAmount: Number(debt.minimumPayment),
        flowType: "DEBT_PAYMENT",
        status: "ACTIVE",
        confidence: "CONFIRMED",
        createdAt: new Date("2026-07-16T10:00:00Z"),
      },
    });
    createdFlows.push(paymentFlow);
  }

  // 6. Fixed Insurance Premiums from Prestige Current Account
  if (prestigeAcc) {
    const primaryInsurance = await prisma.moneyFlow.create({
      data: {
        parentFlowId: salaryFlow.id,
        sourceType: "ACCOUNT",
        sourceRef: prestigeAcc.id,
        destinationType: "EXTERNAL",
        destinationRef: "Santam Short-Term Vehicle & Home Cover",
        amount: 5390.80,
        currentAmount: 5390.80,
        flowType: "DEBT_PAYMENT",
        status: "ACTIVE",
        confidence: "CONFIRMED",
        createdAt: new Date("2026-07-16T10:30:00Z"),
      },
    });
    createdFlows.push(primaryInsurance);

    const secondaryInsurance = await prisma.moneyFlow.create({
      data: {
        parentFlowId: salaryFlow.id,
        sourceType: "ACCOUNT",
        sourceRef: prestigeAcc.id,
        destinationType: "EXTERNAL",
        destinationRef: "Discovery Life & Personal Protection",
        amount: 1697.28,
        currentAmount: 1697.28,
        flowType: "DEBT_PAYMENT",
        status: "ACTIVE",
        confidence: "CONFIRMED",
        createdAt: new Date("2026-07-16T10:35:00Z"),
      },
    });
    createdFlows.push(secondaryInsurance);
  }

  // 7. Cash Withdrawal & Spend
  if (prestigeAcc) {
    const cashWithdrawal = await prisma.moneyFlow.create({
      data: {
        parentFlowId: salaryFlow.id,
        sourceType: "ACCOUNT",
        sourceRef: prestigeAcc.id,
        destinationType: "CASH_WALLET",
        destinationRef: "cash-wallet-primary",
        amount: 2500,
        currentAmount: 1250,
        flowType: "CASH_WITHDRAWAL",
        status: "PARTIALLY_CONSUMED",
        confidence: "CONFIRMED",
        createdAt: new Date("2026-07-17T12:00:00Z"),
      },
    });
    createdFlows.push(cashWithdrawal);

    const cashSpend = await prisma.moneyFlow.create({
      data: {
        parentFlowId: cashWithdrawal.id,
        sourceType: "CASH_WALLET",
        sourceRef: "cash-wallet-primary",
        destinationType: "EXTERNAL",
        destinationRef: "Groceries & Daily Cash Spend",
        amount: 1250,
        currentAmount: 1250,
        flowType: "CASH_SPENDING",
        status: "ACTIVE",
        confidence: "CONFIRMED",
        createdAt: new Date("2026-07-19T15:30:00Z"),
      },
    });
    createdFlows.push(cashSpend);
  }

  console.log(`Successfully seeded ${createdFlows.length} MoneyFlow records across all banking accounts for user mokhotm.`);
}

if (require.main === module) {
  seedMoneyFlowsForUser(true)
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

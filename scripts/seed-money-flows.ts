import { prisma } from "../src/lib/prisma";
import fs from "fs";
import path from "path";

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

  const prestigeAcc = accounts.find((a) => a.name.includes("Prestige Current")) ?? accounts.find((a) => a.type === "CURRENT");
  const myMoAcc = accounts.find((a) => a.name.includes("MyMo"));
  const creditCardAcc = accounts.find((a) => a.type === "CREDIT_CARD");
  const revolvingAcc = accounts.find((a) => a.name.includes("Revolving"));

  const accountMap = {
    "prestige": prestigeAcc?.id,
    "mymo": myMoAcc?.id,
    "credit": creditCardAcc?.id,
    "revolving": revolvingAcc?.id
  };

  const dbPath = path.join(process.cwd(), "transactions_db.json");
  const transactions = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

  const createdFlows = [];

  for (const t of transactions) {
    const sourceAccId = accountMap[t.account as keyof typeof accountMap];
    if (!sourceAccId) continue;

    // Determine type
    let flowType = "OTHER";
    let destinationType = "EXTERNAL";
    let destinationRef = t.desc1 + (t.desc2 ? ` ${t.desc2}` : "");
    
    if (t.amount > 0) {
       flowType = "INCOME";
       destinationType = "ACCOUNT";
       destinationRef = sourceAccId;
    } else {
       if (t.desc1.toLowerCase().includes("debit") || t.desc1.toLowerCase().includes("fee") || t.desc2.toLowerCase().includes("fee")) {
         flowType = "FEE";
       } else if (t.desc1.toLowerCase().includes("transfer") || t.desc2.toLowerCase().includes("transfer")) {
         flowType = "TRANSFER";
       } else if (t.desc1.toLowerCase().includes("cash to") || t.desc2.toLowerCase().includes("cash to")) {
         flowType = "CASH_WITHDRAWAL";
         destinationType = "CASH_WALLET";
         destinationRef = "cash-wallet-primary";
       } else {
         // Default for negative is cash spending or debt
         if (t.desc2.toLowerCase().includes("debicheck") || t.desc2.toLowerCase().includes("loan")) {
            flowType = "DEBT_PAYMENT";
         } else {
            flowType = "CASH_SPENDING";
         }
       }
    }

    try {
      const created = await prisma.moneyFlow.create({
        data: {
          sourceType: t.amount > 0 ? "EXTERNAL" : "ACCOUNT",
          sourceRef: t.amount > 0 ? destinationRef : sourceAccId,
          destinationType: destinationType as any,
          destinationRef: destinationRef,
          amount: Math.abs(t.amount),
          currentAmount: Math.abs(t.amount),
          flowType: flowType as any,
          status: flowType === "CASH_WITHDRAWAL" ? "PARTIALLY_CONSUMED" : "ACTIVE",
          confidence: "CONFIRMED",
          createdAt: new Date(t.date),
        },
      });
      createdFlows.push(created);
    } catch(e) {
      console.error("Error inserting", t, e);
    }
  }

  console.log(`Successfully seeded ${createdFlows.length} MoneyFlow records from bank statements.`);
}

if (require.main === module) {
  seedMoneyFlowsForUser(true)
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

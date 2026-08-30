import { prisma } from "../src/lib/prisma";
import { resolveSalaryCycleRange } from "../src/lib/payrollCalendar";
import { reconcileBudgetItemsForMonth } from "../src/lib/budgetReconciliation";

async function diagnose() {
  console.log("=== DIAGNOSING BUDGET RECONCILIATION SPEED ===");
  
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user in DB!");
    return;
  }
  const userId = user.id;
  const month = "2026-08";
  console.log(`Found user: ${user.name || user.email} (${userId})`);

  console.time("1. resolveSalaryCycleRange");
  const cycleRange = resolveSalaryCycleRange(month);
  console.timeEnd("1. resolveSalaryCycleRange");
  console.log("Cycle range:", cycleRange);

  console.time("2. fetch accounts");
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true, name: true, institution: true, accountNumberMasked: true },
  });
  console.timeEnd("2. fetch accounts");
  console.log("Accounts count:", accounts.length);

  console.time("3. fetch moneyFlows");
  const moneyFlows = await prisma.moneyFlow.findMany({
    where: {
      createdAt: { gte: cycleRange.start, lte: cycleRange.end },
    },
    orderBy: { createdAt: "desc" },
  });
  console.timeEnd("3. fetch moneyFlows");
  console.log("MoneyFlows count:", moneyFlows.length);

  console.time("4. fetch bankStatementDocs");
  const searchStart = new Date(cycleRange.start.getTime() - 7 * 24 * 60 * 60 * 1000);
  const searchEnd = new Date(cycleRange.end.getTime() + 7 * 24 * 60 * 60 * 1000);

  const bankStatementDocs = await prisma.document.findMany({
    where: {
      documentType: "BANK_STATEMENT",
      relatedEntityId: { in: accounts.map((a) => a.id) },
      OR: [
        { periodStart: { lte: searchEnd }, periodEnd: { gte: searchStart } },
        { periodStart: null },
      ],
    },
    select: {
      id: true,
      title: true,
      relatedEntityId: true,
      parsedData: true,
      fileUrl: true,
    },
  });
  console.timeEnd("4. fetch bankStatementDocs");
  console.log("bankStatementDocs count:", bankStatementDocs.length);

  for (const doc of bankStatementDocs) {
    const pd = doc.parsedData as any;
    console.log(`Doc ${doc.id} (${doc.title}): fileUrl=${doc.fileUrl}, hasTxArray=${Boolean(pd?.transactions?.length)}, hasRawText=${Boolean(pd?.rawText || pd?.fullText)}`);
  }

  const items = await prisma.budgetLineItem.findMany({
    where: { userId, month },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });
  console.log("Budget items count:", items.length);

  console.time("5. Full reconcileBudgetItemsForMonth");
  const rec = await reconcileBudgetItemsForMonth(userId, month, items);
  console.timeEnd("5. Full reconcileBudgetItemsForMonth");
  console.log(`Reconciled items: ${rec.items.length}, percentage: ${rec.summary.executionPercentage}%`);
}

diagnose().finally(() => prisma.$disconnect());

import { prisma } from "../src/lib/prisma";
import { resolveSalaryCycleRange } from "../src/lib/payrollCalendar";
import { reconcileBudgetItemsForMonth } from "../src/lib/budgetReconciliation";

async function runBenchmark() {
  const user = await prisma.user.findFirst();
  if (!user) return;
  const userId = user.id;
  const month = "2026-08";

  const items = await prisma.budgetLineItem.findMany({
    where: { userId, month },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  console.time("⏱️ reconcileBudgetItemsForMonth");
  const result = await reconcileBudgetItemsForMonth(userId, month, items);
  console.timeEnd("⏱️ reconcileBudgetItemsForMonth");

  console.log(`Reconciled ${result.items.length} items in ${month}. Executed percentage: ${result.summary.executionPercentage.toFixed(1)}%`);
}

runBenchmark().finally(() => prisma.$disconnect());

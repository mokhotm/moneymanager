import { prisma } from "../src/lib/prisma";
import { reconcileBudgetItemsForMonth } from "../src/lib/budgetReconciliation";
import { getActiveCycleMonthKey } from "../src/lib/budgetCycle";

async function measureBudgetLoading() {
  console.log("=== MEASURING BUDGET RECONCILIATION SPEED ===");
  
  const user = await prisma.user.findFirst({
    where: { email: "mokhotm@gmail.com" },
  });
  if (!user) {
    console.log("User not found!");
    return;
  }

  const userId = user.id;
  const month = "2026-08";

  console.time("1. Query budgetLineItem");
  const items = await prisma.budgetLineItem.findMany({
    where: { userId, month },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });
  console.timeEnd("1. Query budgetLineItem");
  console.log(`Found ${items.length} budget items.`);

  console.time("2. reconcileBudgetItemsForMonth");
  const reconciliation = await reconcileBudgetItemsForMonth(userId, month, items);
  console.timeEnd("2. reconcileBudgetItemsForMonth");

  console.log(`Reconciled ${reconciliation.items.length} items. Summary execution: ${reconciliation.summary.executionPercentage}%`);
}

measureBudgetLoading().finally(() => prisma.$disconnect());

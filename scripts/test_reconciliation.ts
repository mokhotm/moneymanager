import { prisma } from "@/lib/prisma";
import { reconcileBudgetItemsForMonth } from "@/lib/budgetReconciliation";

async function main() {
  const user = await prisma.user.findFirst({ where: { username: "mokhotm" } });
  if (!user) {
    console.log("No user found");
    return;
  }

  const items = await prisma.budgetLineItem.findMany({
    where: { userId: user.id, month: "2026-08" },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  console.log("Budget items found:", items.length);
  if (items.length === 0) return;

  const result = await reconcileBudgetItemsForMonth(user.id, "2026-08", items);

  console.log("\n=== RECONCILIATION SUMMARY ===");
  console.log(JSON.stringify(result.summary, null, 2));

  console.log("\n=== ITEM RESULTS ===");
  for (const item of result.items) {
    const e = item.execution;
    const status = e.executionStatus.padEnd(8);
    const label = item.label.slice(0, 50).padEnd(52);
    const amounts = "R" + item.amount.toFixed(0).padStart(7) + " => R" + e.executedAmount.toFixed(0).padStart(7);
    const doc = e.statementDocName || "-";
    const strategy = (e as any).matchStrategy || "-";
    const confidence = (e as any).matchConfidence ? "(" + ((e as any).matchConfidence * 100).toFixed(0) + "%)" : "";
    console.log("[" + status + "] " + label + " " + amounts + " | " + doc.slice(0, 40) + " | " + strategy.slice(0, 30) + " " + confidence);
  }
}

main()
  .catch((e) => {
    console.error("ERROR:", e.message, e.stack);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { prisma } from "@/lib/prisma";
import { resolveSalaryCycleRange } from "@/lib/payrollCalendar";

async function main() {
  const user = await prisma.user.findFirst({ where: { username: "mokhotm" } });
  if (!user) { console.log("No user"); return; }

  const cycle = resolveSalaryCycleRange("2026-08");
  console.log("Cycle range:", cycle.startDate.toISOString(), "->", cycle.endDate.toISOString());

  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, accountNumberMasked: true },
  });
  console.log("\nAccounts:", accounts.length);
  accounts.forEach(a => console.log("  ", a.id.slice(0, 12), a.name, a.accountNumberMasked));

  // Fetch bank statement docs that overlap the cycle
  const docs = await prisma.document.findMany({
    where: {
      documentType: "BANK_STATEMENT",
      relatedEntityId: { in: accounts.map(a => a.id) },
      OR: [
        { periodStart: { lte: cycle.endDate }, periodEnd: { gte: cycle.startDate } },
        { periodStart: null },
      ],
    },
    select: { id: true, relatedEntityId: true, parsedData: true, fileUrl: true, periodStart: true, periodEnd: true },
  });

  console.log("\nDocs found for cycle:", docs.length);
  for (const doc of docs) {
    const pd = doc.parsedData as any;
    const hasTxs = pd?.transactions && Array.isArray(pd.transactions) ? pd.transactions.length : 0;
    const acc = accounts.find(a => a.id === doc.relatedEntityId);
    console.log("  ", doc.fileUrl);
    console.log("    account:", acc?.name || "?");
    console.log("    period:", doc.periodStart?.toISOString()?.slice(0, 10), "->", doc.periodEnd?.toISOString()?.slice(0, 10));
    console.log("    transactions:", hasTxs);
    if (hasTxs > 0) {
      // Show first 3 transactions and check date range
      for (let i = 0; i < Math.min(3, pd.transactions.length); i++) {
        const tx = pd.transactions[i];
        const txDate = new Date(tx.date);
        const inRange = txDate >= cycle.startDate && txDate <= cycle.endDate;
        console.log("      tx:", tx.description?.slice(0, 40), "R" + tx.amount, tx.date?.slice(0, 10), inRange ? "IN-RANGE" : "OUT-OF-RANGE");
      }
    }
  }
}

main().catch(e => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());

import { prisma } from "../src/lib/prisma";
import { SA_MERCHANT_RULES, DIGITAL_SERVICE_PATTERNS } from "../src/lib/geoResolver";

async function main() {
  const flows = await prisma.moneyFlow.findMany({
    orderBy: { createdAt: "desc" },
  });

  const unmatched: Record<string, { count: number; total: number; samples: any[] }> = {};

  for (const f of flows) {
    const rawDest = (f.destinationRef || "").trim();
    const rawSrc = (f.sourceRef || "").trim();
    const combined = `${rawDest} ${rawSrc}`;
    const amount = Number(f.amount || f.currentAmount || 0);

    if (f.flowType === "INCOME") continue;
    if (f.flowType === "DEBT_PAYMENT" || f.flowType === "INTERNAL_TRANSFER" || f.flowType === "CASH_WITHDRAWAL") continue;

    // Check physical rules
    const physicalRule = SA_MERCHANT_RULES.some((r) => r.pattern.test(combined));
    if (physicalRule) continue;

    // Check digital rules
    const digitalRule = DIGITAL_SERVICE_PATTERNS.some((d) => d.pattern.test(combined));
    if (digitalRule) continue;

    const key = rawDest || "UNKNOWN";
    if (!unmatched[key]) {
      unmatched[key] = { count: 0, total: 0, samples: [] };
    }
    unmatched[key].count++;
    unmatched[key].total += amount;
    if (unmatched[key].samples.length < 3) {
      unmatched[key].samples.push({
        id: f.id,
        date: f.createdAt.toISOString().slice(0, 10),
        amount,
        sourceRef: rawSrc,
        destinationRef: rawDest,
      });
    }
  }

  const sorted = Object.entries(unmatched).sort((a, b) => b[1].total - a[1].total);
  console.log(`\nFound ${sorted.length} distinct unmatched merchant descriptions:`);
  for (const [name, data] of sorted) {
    console.log(`- "${name}": R ${data.total.toFixed(2)} (${data.count} txs)`);
    data.samples.forEach((s) => console.log(`    ${s.date} | R ${s.amount} | src: ${s.sourceRef}`));
  }
}

main().finally(() => prisma.$disconnect());

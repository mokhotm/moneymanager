import { prisma } from "../src/lib/prisma";
import { SA_MERCHANT_RULES } from "../src/lib/geoResolver";

async function checkNonGauteng() {
  const flows = await prisma.moneyFlow.findMany({
    orderBy: { createdAt: "desc" },
  });

  console.log("=== CHECKING ALL NON-GAUTENG & NATIONAL LOCATION MATCHES ===");
  
  for (const f of flows) {
    const rawDest = (f.destinationRef || "").trim();
    const rawSrc = (f.sourceRef || "").trim();
    const combined = `${rawDest} ${rawSrc}`;
    const amount = Number(f.amount || f.currentAmount || 0);

    for (const r of SA_MERCHANT_RULES) {
      if (r.pattern.test(combined)) {
        if (r.region === "National / Other" || r.region === "Bloemfontein" || r.city !== "Springs" && r.city !== "Pretoria" && r.city !== "Centurion" && r.city !== "Johannesburg" && r.city !== "Benoni" && r.city !== "Boksburg" && r.city !== "Brakpan" && r.city !== "Bapsfontein") {
          console.log(`\nMatched Rule: ${r.cleanMerchant} (${r.locationName}, ${r.city} - ${r.region})`);
          console.log(`  Raw Tx: "${combined}" | Amount: R ${amount} | Date: ${f.createdAt.toISOString().slice(0, 10)}`);
        }
        break;
      }
    }
  }
}

checkNonGauteng().finally(() => prisma.$disconnect());

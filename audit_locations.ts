import { prisma } from "./src/lib/prisma";
import { resolveSpendingLocations } from "./src/lib/geoResolver";
import { searchNominatimAddress } from "./src/lib/nominatimGeoService";
import fs from "fs";
import path from "path";

async function runAudit() {
  try {
    console.log("=== STARTING COMPREHENSIVE LOCATION AUDIT ===");

    const flows = await prisma.moneyFlow.findMany({
      orderBy: { createdAt: "desc" },
    });

    console.log(`Loaded ${flows.length} total MoneyFlow transactions.`);

    // Load existing overrides
    const overridesPath = path.join(process.cwd(), "merchant_overrides.json");
    let userOverrides: Record<string, any> = {};
    if (fs.existsSync(overridesPath)) {
      const all = JSON.parse(fs.readFileSync(overridesPath, "utf-8"));
      // merge all user overrides
      for (const uid of Object.keys(all)) {
        userOverrides = { ...userOverrides, ...all[uid] };
      }
    }

    const intelligence = resolveSpendingLocations(flows, userOverrides);
    const physical = intelligence.physicalLocations;
    const digital = intelligence.digitalServices;

    console.log(`\nFound ${physical.length} physical in-store locations and ${digital.length} digital services.`);

    const auditResults = [];

    for (let i = 0; i < physical.length; i++) {
      const loc = physical[i];
      const rawSample = loc.recentTransactions?.[0]?.description || loc.merchant;
      console.log(`[${i + 1}/${physical.length}] Auditing: ${loc.merchant} | ${loc.locationName}`);

      auditResults.push({
        id: loc.id,
        merchant: loc.merchant,
        category: loc.category,
        currentLocationName: loc.locationName,
        currentSuburb: loc.suburb,
        currentCity: loc.city,
        currentRegion: loc.region,
        currentLat: loc.lat,
        currentLng: loc.lng,
        totalSpend: loc.amount || loc.totalAmount,
        txCount: loc.transactionCount,
        sampleRawTx: rawSample,
        allTransactions: loc.recentTransactions,
      });
    }

    const auditReport = {
      timestamp: new Date().toISOString(),
      totalFlows: flows.length,
      physicalCount: physical.length,
      digitalCount: digital.length,
      totalPhysicalSpend: intelligence.totalPhysicalSpend,
      totalDigitalSpend: intelligence.totalDigitalSpend,
      merchants: auditResults,
      digitalServices: digital.map((d) => ({
        name: d.serviceName,
        category: d.category,
        totalSpend: d.totalAmount,
        txCount: d.transactionCount,
        sampleRawTx: d.recentTransactions?.[0]?.description,
      })),
    };

    const outPath = path.join(process.cwd(), "location_audit_report.json");
    fs.writeFileSync(outPath, JSON.stringify(auditReport, null, 2), "utf-8");
    console.log(`\n=== AUDIT COMPLETE: SAVED ${physical.length} LOCATIONS TO ${outPath} ===`);
    process.exit(0);
  } catch (err) {
    console.error("Audit error:", err);
    process.exit(1);
  }
}

runAudit();

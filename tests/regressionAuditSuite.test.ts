import { describe, it, expect } from "vitest";
import { resolveSpendingLocations, SA_MERCHANT_RULES, DIGITAL_SERVICE_PATTERNS } from "../src/lib/geoResolver";

describe("Corrected Issues Regression Suite (Zero-Regression Enforcement)", () => {
  // ── FIX-001: Shell Middel Street Geocoding Regression ──────────────────
  it("FIX-001: Shell Middelstraat must resolve to Pretoria (Nieuw Muckleneuk) and NEVER Middelburg", () => {
    const mockTxs = [
      {
        id: "tx-shell-1",
        destinationRef: "SHELL MIDDELSTRAAT MO Water shell middelstraat mo water",
        amount: 150.00,
        createdAt: new Date("2026-07-05T10:00:00Z"),
      },
      {
        id: "tx-shell-2",
        destinationRef: "SHELL MIDDELS 5196*8010 27 JUL DEBIT CARD PURCHASE FROM",
        amount: 200.00,
        createdAt: new Date("2026-07-29T14:30:00Z"),
      },
    ];

    const resolved = resolveSpendingLocations(mockTxs);

    // Must find Shell Middel Street in Pretoria
    const shellPretoria = resolved.physicalLocations.find(
      (l) => l.merchant.includes("Middel Street") || l.locationName.includes("Middel St")
    );
    expect(shellPretoria).toBeDefined();
    expect(shellPretoria?.city).toBe("Pretoria");
    expect(shellPretoria?.region).toBe("Pretoria & Centurion");
    expect(shellPretoria?.totalAmount).toBe(350.00);

    // Zero locations must map to Middelburg or Mpumalanga
    const middelburg = resolved.physicalLocations.find(
      (l) => l.city.toLowerCase().includes("middelburg") || l.merchant.toLowerCase().includes("middelburg")
    );
    expect(middelburg).toBeUndefined();
  });

  // ── FIX-002: Minimum Physical Merchant Rules Recognition ────────────────
  it("FIX-002: Geo merchant rules directory must contain comprehensive South African retail coverage (>= 80 rules)", () => {
    expect(SA_MERCHANT_RULES.length).toBeGreaterThanOrEqual(80);

    // Assert key core retail hubs exist in rule set
    const hasBrooklynCheckers = SA_MERCHANT_RULES.some((r) => r.cleanMerchant.includes("Checkers Brooklyn"));
    const hasWaterkloofSpur = SA_MERCHANT_RULES.some((r) => r.cleanMerchant.includes("Spur Phoenix"));
    const hasSpringsPnP = SA_MERCHANT_RULES.some((r) => r.cleanMerchant.includes("Pick n Pay Springs"));
    const hasBakertonSpar = SA_MERCHANT_RULES.some((r) => r.cleanMerchant.includes("SPAR Bakerton"));
    const hasCastleGate = SA_MERCHANT_RULES.some((r) => r.cleanMerchant.includes("Castle Gate"));

    expect(hasBrooklynCheckers).toBe(true);
    expect(hasWaterkloofSpur).toBe(true);
    expect(hasSpringsPnP).toBe(true);
    expect(hasBakertonSpar).toBe(true);
    expect(hasCastleGate).toBe(true);
  });

  // ── FIX-003: Digital Service & Banking Fee Segregation ─────────────────
  it("FIX-003: Bank service fees, airtime purchases and PayShap P2P must be classified as Digital Services", () => {
    const mockTxs = [
      {
        id: "tx-fee-1",
        destinationRef: "+#CARD FEE +#card fee",
        amount: 70.00,
        createdAt: new Date("2026-07-15T00:00:00Z"),
      },
      {
        id: "tx-fee-2",
        destinationRef: "OVERDRAFT SERVICE FEE NO LIMIT",
        amount: 69.00,
        createdAt: new Date("2026-06-30T00:00:00Z"),
      },
      {
        id: "tx-payshap",
        destinationRef: "THABO PAYSHAP PAYMENT TO",
        amount: 300.00,
        createdAt: new Date("2026-03-02T00:00:00Z"),
      },
      {
        id: "tx-airtime",
        destinationRef: "VAS00243995372 VODA0723811177 PREPAID MOBILE PURCHASE",
        amount: 29.00,
        createdAt: new Date("2026-07-06T00:00:00Z"),
      },
    ];

    const resolved = resolveSpendingLocations(mockTxs);

    // Must NOT be in physical locations
    expect(resolved.physicalLocations.length).toBe(0);

    // Must be in digital services
    expect(resolved.digitalServices.length).toBeGreaterThanOrEqual(3);

    const bankFees = resolved.digitalServices.find((d) => d.category === "Banking Fees");
    expect(bankFees).toBeDefined();
    expect(bankFees?.totalAmount).toBe(139.00);

    const payshap = resolved.digitalServices.find((d) => d.category === "P2P Transfers");
    expect(payshap).toBeDefined();
    expect(payshap?.totalAmount).toBe(300.00);
  });

  // ── FIX-004: Pretoria Regional Alignment for Total & Holiday Inn ───────
  it("FIX-004: Total Capital Park and Holiday Inn Express must resolve to Pretoria", () => {
    const mockTxs = [
      {
        id: "tx-total",
        destinationRef: "Total Venters 5196*8010 24 JAN DEBIT CARD PURCHASE FROM",
        amount: 139.80,
        createdAt: new Date("2026-01-27T00:00:00Z"),
      },
      {
        id: "tx-inn",
        destinationRef: "HOLIDAY INN R 5196*8010 10 JUL DEBIT CARD PURCHASE FROM",
        amount: 297.60,
        createdAt: new Date("2026-07-13T00:00:00Z"),
      },
    ];

    const resolved = resolveSpendingLocations(mockTxs);

    expect(resolved.physicalLocations.length).toBe(2);

    const total = resolved.physicalLocations.find((l) => l.merchant.includes("TotalEnergies"));
    expect(total?.city).toBe("Pretoria");
    expect(total?.region).toBe("Pretoria & Centurion");

    const inn = resolved.physicalLocations.find((l) => l.merchant.includes("Holiday Inn"));
    expect(inn?.city).toBe("Pretoria");
    expect(inn?.region).toBe("Pretoria & Centurion");
  });

  // ── FIX-005: Inbound Email Statement Parsing & Institution Recognition ──
  it("FIX-005: Email Ingestion Classifier must accurately identify top South African financial institutions", async () => {
    const { classifyEmailContent } = await import("../src/services/emailIngestionService");

    const sb = classifyEmailContent("statements@standardbank.co.za", "Standard Bank Statement - Prestige Current");
    expect(sb.institution).toBe("Standard Bank");
    expect(sb.isFinancial).toBe(true);

    const ned = classifyEmailContent("donotreply@nedbank.co.za", "Your Nedbank e-Statement is ready");
    expect(ned.institution).toBe("Nedbank");
    expect(ned.isFinancial).toBe(true);

    const fnb = classifyEmailContent("noreply@fnb.co.za", "FNB eWallet & Account Statement");
    expect(fnb.institution).toContain("FNB");
    expect(fnb.isFinancial).toBe(true);

    const capitec = classifyEmailContent("clientcare@capitecbank.co.za", "Capitec Bank Live Statement");
    expect(capitec.institution).toBe("Capitec");
    expect(capitec.isFinancial).toBe(true);

    const disc = classifyEmailContent("statements@discovery.co.za", "Discovery Card Statement");
    expect(disc.institution).toBe("Discovery Bank");
    expect(disc.isFinancial).toBe(true);

    const ekur = classifyEmailContent("billing@ekurhuleni.gov.za", "Monthly Municipal Assessment Rates");
    expect(ekur.institution).toBe("City of Ekurhuleni");
    expect(ekur.docType).toBe("MUNICIPAL_BILL");
  });

  // ── FIX-006: Open Banking Stitch Token & Password Security Layer ──────────
  it("FIX-006: Open Banking and Email Ingestion encryption must round-trip tokens safely", async () => {
    const { encryptToken } = await import("../src/services/stitchOpenBankingService");
    const { encryptPassword, decryptPassword, maskPassword } = await import("../src/services/emailIngestionService");

    const sampleToken = "stitch_live_token_sec_99481239857";
    const encToken = encryptToken(sampleToken);
    expect(encToken).toBeDefined();
    expect(encToken).not.toBe(sampleToken);

    const samplePass = "GoogleAppPassword_16Chars";
    const encPass = encryptPassword(samplePass);
    expect(encPass).not.toBe(samplePass);
    const decPass = decryptPassword(encPass);
    expect(decPass).toBe(samplePass);

    const masked = maskPassword(encPass);
    expect(masked).toBe("••••••••••••");
  });

  // ── FIX-007: Composite Municipal & Utility Matching Invariants ──────────
  it("FIX-007: Ekurhuleni municipal debit orders must classify as Municipal Utilities in Springs & Bakerton", () => {
    const mockTxs = [
      {
        id: "tx-muni",
        destinationRef: "EKURHULENI 3505137295 DEBICHECK DEBIT ORDER",
        amount: 650.00,
        createdAt: new Date("2026-08-15T08:00:00Z"),
      },
    ];

    const resolved = resolveSpendingLocations(mockTxs);
    expect(resolved.physicalLocations.length).toBe(1);

    const muni = resolved.physicalLocations[0];
    expect(muni.merchant).toBe("City of Ekurhuleni Municipality");
    expect(muni.city).toBe("Springs");
    expect(muni.region).toBe("Springs & Bakerton");
    expect(muni.category).toBe("Municipal Utilities");
    expect(muni.locationType).toBe("MUNICIPAL_OR_CAMPUS");
  });
});

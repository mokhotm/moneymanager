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
});

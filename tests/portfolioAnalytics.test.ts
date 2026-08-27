import { describe, it, expect } from "vitest";
import { calculateXIRR, calculateAssetAllocationDrift, evaluatePortfolioAnalytics } from "../src/engine/portfolioAnalytics";

describe("Institutional Portfolio & Real Asset Analytics (§Vector 5)", () => {
  it("calculates accurate annualized XIRR for multi-period cashflows", () => {
    const cashflows = [
      { date: "2024-01-01", amount: -100000 },
      { date: "2025-01-01", amount: -50000 },
      { date: "2026-01-01", amount: 180000 },
    ];

    const xirr = calculateXIRR(cashflows);
    expect(xirr).toBeGreaterThan(8.0);
    expect(xirr).toBeLessThan(20.0);
  });

  it("calculates asset allocation drift and generates actionable rebalancing orders", () => {
    const allocations = [
      { assetClass: "Equities", targetWeightPct: 60, actualValue: 750000 }, // Overweight
      { assetClass: "Bonds", targetWeightPct: 20, actualValue: 150000 }, // Underweight
      { assetClass: "Real Estate", targetWeightPct: 15, actualValue: 100000 },
      { assetClass: "Cash", targetWeightPct: 5, actualValue: 0 },
    ];

    const drift = calculateAssetAllocationDrift(allocations);
    expect(drift).toHaveLength(4);

    const equities = drift.find((d) => d.assetClass === "Equities");
    expect(equities?.rebalanceAction).toContain("Overweight");

    const bonds = drift.find((d) => d.assetClass === "Bonds");
    expect(bonds?.rebalanceAction).toContain("Underweight");
  });
});

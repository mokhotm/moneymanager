import { describe, it, expect } from "vitest";
import { computeSouthAfricanRetirementPlan, RetirementProfileInput } from "../src/engine/retirementPlanner";

describe("South African Retirement Planning Engine (§11.3 / Age 51 to 65 Runway)", () => {
  const mockInput: RetirementProfileInput = {
    currentAge: 51,
    retirementAge: 65,
    monthlyGrossIncome: 98000,
    monthlyNetIncome: 71026.90,
    currentRetirementSavings: 50000,
    monthlyRAContribution: 12000,
    monthlyTFSAContribution: 3000,
    expectedAnnualReturn: 0.10,
    expectedInflation: 0.05,
    desiredReplacementRatio: 0.75,
  };

  it("calculates 14-year runway from age 51 to 65 with positive compound growth", () => {
    const plan = computeSouthAfricanRetirementPlan(mockInput);

    expect(plan.currentAge).toBe(51);
    expect(plan.retirementAge).toBe(65);
    expect(plan.yearsToRetirement).toBe(14);
    expect(plan.yearlyProjections.length).toBe(14);
    expect(plan.projectedLumpSumAt65).toBeGreaterThan(4000000); // Expect > R4.5M
  });

  it("computes Section 11F annual SARS tax rebate potential", () => {
    const plan = computeSouthAfricanRetirementPlan(mockInput);

    // R12,000 * 12 = R144,000 annual RA contribution * 41% marginal rate ~= R59,040 tax refund
    expect(plan.annualTaxRebatePotentialZAR).toBeGreaterThan(50000);
    expect(plan.annualTaxRebatePotentialZAR).toBeLessThan(70000);
  });

  it("computes Two-Pot breakdown at age 65 (1/3 accessible savings pot, 2/3 annuitized retirement pot)", () => {
    const plan = computeSouthAfricanRetirementPlan(mockInput);

    const totalLumpSum = plan.projectedLumpSumAt65;
    const { savingsPotAccessible, retirementPotAnnuitized } = plan.twoPotBreakdownAt65;

    expect(savingsPotAccessible + retirementPotAnnuitized).toBeCloseTo(totalLumpSum, -2);
    expect(savingsPotAccessible / totalLumpSum).toBeCloseTo(0.333, 1);
    expect(retirementPotAnnuitized / totalLumpSum).toBeCloseTo(0.667, 1);
  });

  it("includes Standard Bank Stanlib and low-cost market alternatives (Sygnia, 10X, Allan Gray, TFSA)", () => {
    const plan = computeSouthAfricanRetirementPlan(mockInput);

    const providers = plan.topProductOptions.map((p) => p.provider);
    expect(providers.some((p) => p.includes("Standard Bank") || p.includes("Stanlib"))).toBe(true);
    expect(providers.some((p) => p.includes("Sygnia"))).toBe(true);
    expect(providers.some((p) => p.includes("10X"))).toBe(true);
    expect(providers.some((p) => p.includes("Allan Gray"))).toBe(true);
    expect(providers.some((p) => p.includes("EasyEquities"))).toBe(true);
  });
});

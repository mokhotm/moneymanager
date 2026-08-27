import { describe, it, expect } from "vitest";
import { evaluateTaxOptimization } from "../src/engine/taxOptimization";

describe("Tax & Compliance Optimization Engine (§Vector 6)", () => {
  it("enforces Section 11F Retirement Annuity cap at 27.5% up to R350,000 ceiling", () => {
    const result = evaluateTaxOptimization({
      grossAnnualIncome: 1200000.0, // R1.2M
      retirementAnnuityAnnualContributions: 200000.0,
      solarCapitalExpenditure: 65000.0,
      businessExpensesTotal: 40000.0,
      tfsaAnnualContributions: 36000.0,
      medicalAidMembersCount: 3,
    });

    const raSection = result.sections.section11F_RetirementAnnuity;
    // 27.5% of 1.2M = 330,000 (< 350,000 cap)
    expect(raSection.maxAllowableDeduction).toBe(330000.0);
    expect(raSection.claimedDeduction).toBe(200000.0);
    expect(raSection.remainingTaxFreeHeadroom).toBe(130000.0);
    expect(result.potentialAnnualTaxSavings).toBeGreaterThan(50000.0);
  });

  it("calculates Section 12B Solar clean energy 100% upfront depreciation benefit", () => {
    const result = evaluateTaxOptimization({
      grossAnnualIncome: 900000.0,
      retirementAnnuityAnnualContributions: 100000.0,
      solarCapitalExpenditure: 80000.0,
    });

    const solarSection = result.sections.section12B_CleanEnergy;
    expect(solarSection.allowableDeduction).toBe(80000.0);
    expect(solarSection.taxBenefit).toBeGreaterThan(25000.0);
  });
});

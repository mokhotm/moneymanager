import { describe, it, expect } from "vitest";
import { evaluateTaxOptimization, calculateProgressiveTax, JURISDICTIONS } from "../src/engine/taxOptimization";

describe("Global Tax & Compliance Optimization Engine (§Vector 6 / 100x)", () => {
  describe("South Africa (SARS) Jurisdiction", () => {
    it("enforces Section 11F Retirement Annuity cap at 27.5% up to R350,000 ceiling", () => {
      const result = evaluateTaxOptimization({
        jurisdiction: "ZA",
        grossAnnualIncome: 1200000.0, // R1.2M
        retirementAnnuityAnnualContributions: 200000.0,
        solarCapitalExpenditure: 65000.0,
        businessExpensesTotal: 40000.0,
        tfsaAnnualContributions: 36000.0,
        medicalAidMembersCount: 3,
      });

      const raSection = result.sections.retirementAnnuity;
      // 27.5% of 1.2M = 330,000 (< 350,000 cap)
      expect(raSection.maxAllowableDeduction).toBe(330000.0);
      expect(raSection.claimedDeduction).toBe(200000.0);
      expect(raSection.remainingTaxFreeHeadroom).toBe(130000.0);
      expect(result.potentialAnnualTaxSavings).toBeGreaterThan(50000.0);
    });

    it("calculates Section 12B Solar clean energy 100% upfront depreciation benefit", () => {
      const result = evaluateTaxOptimization({
        jurisdiction: "ZA",
        grossAnnualIncome: 900000.0,
        retirementAnnuityAnnualContributions: 100000.0,
        solarCapitalExpenditure: 80000.0,
      });

      const solarSection = result.sections.cleanEnergy;
      expect(solarSection.allowableDeduction).toBe(80000.0);
      expect(solarSection.taxBenefit).toBeGreaterThan(25000.0);
    });

    it("preserves backwards compatibility aliases for section11F and section12B", () => {
      const result = evaluateTaxOptimization({
        jurisdiction: "ZA",
        grossAnnualIncome: 1000000.0,
        retirementAnnuityAnnualContributions: 150000.0,
        solarCapitalExpenditure: 50000.0,
      });

      expect(result.sections.section11F_RetirementAnnuity).toBeDefined();
      expect(result.sections.section12B_CleanEnergy).toBeDefined();
      expect(result.sections.section11F_RetirementAnnuity.claimedDeduction).toBe(150000.0);
    });
  });

  describe("United States (IRS) Jurisdiction", () => {
    it("calculates IRS Federal progressive tax, 401(k) deduction, and Section 25D 30% solar credit", () => {
      const result = evaluateTaxOptimization({
        jurisdiction: "US",
        grossAnnualIncome: 180000.0, // $180k USD
        retirementAnnuityAnnualContributions: 23000.0, // max 401(k)
        solarCapitalExpenditure: 30000.0, // $30k solar system
        businessExpensesTotal: 12000.0,
        tfsaAnnualContributions: 7000.0,
      });

      expect(result.jurisdiction.authority).toBe("IRS");
      expect(result.jurisdiction.currencySymbol).toBe("$");
      expect(result.sections.cleanEnergy.taxBenefit).toBe(9000.0); // 30% of $30,000
      expect(result.potentialAnnualTaxSavings).toBeGreaterThan(10000.0);
      expect(result.effectiveTaxRate).toBeLessThan(result.baselineEffectiveRate);
    });
  });

  describe("United Kingdom (HMRC) Jurisdiction", () => {
    it("calculates HMRC Personal Allowance, Workplace Pension relief, and ISA monitoring", () => {
      const result = evaluateTaxOptimization({
        jurisdiction: "UK",
        grossAnnualIncome: 95000.0, // £95k GBP
        retirementAnnuityAnnualContributions: 20000.0,
        solarCapitalExpenditure: 12000.0,
        businessExpensesTotal: 5000.0,
        tfsaAnnualContributions: 20000.0,
      });

      expect(result.jurisdiction.authority).toBe("HMRC");
      expect(result.jurisdiction.currencySymbol).toBe("£");
      expect(result.marginalTaxRate).toBe(40); // £95k is in 40% Higher Rate band
      expect(result.sections.retirementAnnuity.taxBenefit).toBe(8000.0); // 40% of £20,000
      expect(result.sections.taxShelteredSavings.complianceStatus).toBe("COMPLIANT");
    });
  });

  describe("Canada (CRA) Jurisdiction", () => {
    it("calculates CRA RRSP 18% allowance and Federal/Provincial progressive tiers", () => {
      const result = evaluateTaxOptimization({
        jurisdiction: "CA",
        grossAnnualIncome: 150000.0, // $150k CAD
        retirementAnnuityAnnualContributions: 25000.0,
        solarCapitalExpenditure: 15000.0,
      });

      expect(result.jurisdiction.authority).toBe("CRA");
      expect(result.sections.retirementAnnuity.maxAllowableDeduction).toBe(27000.0); // 18% of 150,000 = 27,000
      expect(result.sections.retirementAnnuity.claimedDeduction).toBe(25000.0);
      expect(result.sections.retirementAnnuity.remainingTaxFreeHeadroom).toBe(2000.0);
    });
  });

  describe("Australia (ATO) Jurisdiction", () => {
    it("calculates ATO Stage 3 brackets and Concessional Superannuation $30k cap", () => {
      const result = evaluateTaxOptimization({
        jurisdiction: "AU",
        grossAnnualIncome: 160000.0, // $160k AUD
        retirementAnnuityAnnualContributions: 27500.0,
        solarCapitalExpenditure: 10000.0,
      });

      expect(result.jurisdiction.authority).toBe("ATO");
      expect(result.sections.retirementAnnuity.maxAllowableDeduction).toBe(30000.0);
      expect(result.sections.retirementAnnuity.claimedDeduction).toBe(27500.0);
      expect(result.sections.retirementAnnuity.remainingTaxFreeHeadroom).toBe(2500.0);
    });
  });

  describe("European Union (EU) & Global Universal", () => {
    it("calculates EU and Global standard tax optimization", () => {
      const euResult = evaluateTaxOptimization({
        jurisdiction: "EU",
        grossAnnualIncome: 110000.0, // €110k EUR
        retirementAnnuityAnnualContributions: 10000.0,
      });
      expect(euResult.jurisdiction.currencySymbol).toBe("€");
      expect(euResult.potentialAnnualTaxSavings).toBeGreaterThan(0);

      const globalMap = evaluateTaxOptimization({
        jurisdiction: "GLOBAL",
        grossAnnualIncome: 120000.0,
        retirementAnnuityAnnualContributions: 25000.0,
      });
      expect(globalMap.jurisdiction.code).toBe("GLOBAL");
      expect(globalMap.bracketBreakdown.length).toBeGreaterThan(3);
    });
  });

  describe("calculateProgressiveTax helper", () => {
    it("correctly identifies active bracket tier and computes headroom to next bracket", () => {
      const { totalTax, marginalRate, currentBracket, headroomToNext } = calculateProgressiveTax(300000, "ZA");
      // 300,000 in ZA: Bracket 2 (237,100 to 370,500 at 26%)
      expect(marginalRate).toBe(0.26);
      expect(currentBracket.ratePercent).toBe("26%");
      expect(headroomToNext).toBe(70500); // 370,500 - 300,000
      expect(totalTax).toBeGreaterThan(0);
    });
  });
});

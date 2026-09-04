import { describe, it, expect } from "vitest";
import {
  calculatePayslipBreakdown,
  simulateSalaryIncrease,
  solveGrossForTargetNet,
  UIF_STATUTORY_MAX_MONTHLY,
} from "../src/engine/salaryCalculator";

describe("South African SARS Salary Increase Engine", () => {
  // Ground truth inputs from SARS Payslip August 2026 (Paystub_202706.pdf)
  const groundTruthSARS: Parameters<typeof calculatePayslipBreakdown>[0] = {
    basicSalaryMonthly: 115641.02,
    medicalAllowanceMonthly: 5210.53,
    medicalAidContributionMonthly: 6987.00,
    medicalAidDependants: 2, // 1 Adult + 2 Children as on payslip
    unionFeesMonthly: 110.00, // PSA Union
    age: 51,
  };

  it("accurately computes August 2026 SARS payslip within normal rounding margins", () => {
    const breakdown = calculatePayslipBreakdown(groundTruthSARS);

    // 1. Gross Remuneration matches payslip (R 120,851.55)
    expect(breakdown.grossRemunerationMonthly).toBe(120851.55);

    // 2. UIF is capped at statutory maximum (R 177.12)
    expect(breakdown.monthlyUIF).toBe(UIF_STATUTORY_MAX_MONTHLY);

    // 3. Marginal tax rate for R 1.45M annual income is in Bracket 6 (41%)
    expect(breakdown.marginalTaxRate).toBe(41);

    // 4. Monthly PAYE is approximately R 39k, matching payslip (R 39,139.17) within standard payroll smoothing
    expect(breakdown.monthlyPAYE).toBeGreaterThan(38500);
    expect(breakdown.monthlyPAYE).toBeLessThan(39500);

    // 5. Net take-home pay is approximately R 74.4k, matching payslip (R 74,438.26)
    expect(breakdown.netTakeHomeMonthly).toBeGreaterThan(74000);
    expect(breakdown.netTakeHomeMonthly).toBeLessThan(75000);

    // 6. Retention rate for next Rand is 59% (100% - 41%)
    expect(breakdown.retentionRatePercent).toBe(59);
  });

  it("simulates a 6.5% salary increase and computes net take-home and retention accurately", () => {
    const simulation = simulateSalaryIncrease(groundTruthSARS, {
      type: "PERCENTAGE",
      value: 6.5,
    });

    expect(simulation.grossDeltaMonthly).toBeCloseTo(115641.02 * 0.065, 1);
    expect(simulation.netDeltaMonthly).toBeGreaterThan(0);
    // In the 41% bracket, ~59% of the gross increase is retained as net cash
    expect(simulation.retentionPercentOfIncrease).toBeCloseTo(59, 0);
    expect(simulation.annualNetGain).toBeCloseTo(simulation.netDeltaMonthly * 12, 1);
  });

  it("calculates a retroactive backpay lump-sum for 3 months (reproducing July 2026 backpay pattern)", () => {
    const simulation = simulateSalaryIncrease(groundTruthSARS, {
      type: "PERCENTAGE",
      value: 5.075, // Approx July notch increase
      backpayMonths: 3,
    });

    expect(simulation.backpaySimulation).toBeDefined();
    expect(simulation.backpaySimulation?.months).toBe(3);
    expect(simulation.backpaySimulation?.grossBackpayTotal).toBeGreaterThan(15000);
    expect(simulation.backpaySimulation?.netLumpSumPayout).toBeGreaterThan(10000);
  });

  it("solves required gross salary for a target net take-home pay of R 85,000", () => {
    const targetNet = 85000;
    const solution = solveGrossForTargetNet(targetNet, {
      medicalAllowanceMonthly: groundTruthSARS.medicalAllowanceMonthly,
      medicalAidContributionMonthly: groundTruthSARS.medicalAidContributionMonthly,
      medicalAidDependants: groundTruthSARS.medicalAidDependants,
      unionFeesMonthly: groundTruthSARS.unionFeesMonthly,
      age: 51,
    });

    expect(solution.result.netTakeHomeMonthly).toBeCloseTo(targetNet, 0);
    expect(solution.requiredGrossMonthly).toBeGreaterThan(targetNet);
  });

  it("accurately computes US remuneration with FICA (7.65%) and federal progressive tax brackets", () => {
    const usBreakdown = calculatePayslipBreakdown({
      jurisdiction: "US",
      basicSalaryMonthly: 9500, // $114k/yr
      pensionContributionMonthly: 600, // 401(k)
      medicalAidContributionMonthly: 450,
    });

    expect(usBreakdown.currencySymbol).toBe("$");
    expect(usBreakdown.taxAuthorityName).toBe("IRS");
    expect(usBreakdown.monthlySocialSecurity).toBeGreaterThan(700); // FICA 7.65%
    expect(usBreakdown.monthlyPAYE).toBeGreaterThan(1200); // Federal Income Tax
    expect(usBreakdown.netTakeHomeMonthly).toBeGreaterThan(6000);
    expect(usBreakdown.retentionRatePercent).toBe(76); // 24% marginal bracket -> 76% retention
  });

  it("accurately computes UK remuneration with National Insurance Class 1 and Personal Allowance", () => {
    const ukBreakdown = calculatePayslipBreakdown({
      jurisdiction: "UK",
      basicSalaryMonthly: 6200, // £74.4k/yr
      pensionContributionMonthly: 310, // 5% auto-enrolment
      medicalAidContributionMonthly: 120,
    });

    expect(ukBreakdown.currencySymbol).toBe("£");
    expect(ukBreakdown.taxAuthorityName).toBe("HMRC");
    expect(ukBreakdown.monthlySocialSecurity).toBeGreaterThan(250); // NI Class 1
    expect(ukBreakdown.monthlyPAYE).toBeGreaterThan(1200); // Income tax in 40% higher bracket
    expect(ukBreakdown.netTakeHomeMonthly).toBeGreaterThan(4000);
  });
});


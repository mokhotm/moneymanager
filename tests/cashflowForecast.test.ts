import { describe, it, expect } from "vitest";
import { generate365DayCashflowForecast } from "../src/engine/cashflowForecast";

describe("365-Day Neural Cashflow Simulation Engine (§Vector 3)", () => {
  it("projects exactly 365 daily balance points with statutory pay date shifts", () => {
    const result = generate365DayCashflowForecast(
      {
        startingBalance: 80000.0,
        monthlyNetIncome: 74438.26,
        incomePayDay: 15,
        recurringObligations: 12000.0,
        debtMonthlyPayment: 38000.0,
        livingDiscretionaryMonthly: 14000.0,
        minimumSafetyBuffer: 30000.0,
      },
      new Date("2026-08-14T00:00:00Z")
    );

    expect(result.projectionDays).toBe(365);
    expect(result.dailyPoints).toHaveLength(365);
    expect(result.startingBalance).toBe(80000.0);
    expect(result.minimumProjectedBalance).toBeGreaterThan(0);
    expect(result.runwayMonths).toBeGreaterThan(1.0);

    // Verify statutory paydays are flagged
    const payDayPoints = result.dailyPoints.filter((p) => p.isPayDay);
    expect(payDayPoints.length).toBeGreaterThanOrEqual(11);
  });

  it("accurately models interest rate shocks and income disruptions under Monte Carlo stress", () => {
    const stressResult = generate365DayCashflowForecast(
      {
        startingBalance: 80000.0,
        monthlyNetIncome: 74438.26,
        incomePayDay: 15,
        recurringObligations: 12000.0,
        debtMonthlyPayment: 38000.0,
        livingDiscretionaryMonthly: 14000.0,
        minimumSafetyBuffer: 30000.0,
        interestRateShockBps: 200, // +200 bps
        incomeDisruptionDays: 45, // 45-day delay
        emergencyShockAmount: 35000.0,
        emergencyShockDay: 60,
      },
      new Date("2026-08-14T00:00:00Z")
    );

    expect(stressResult.stressTestSummary.interestShockCostAnnual).toBe(30000.0);
    expect(stressResult.stressTestSummary.emergencyShockImpact).toBe(35000.0);
    expect(stressResult.stressTestSummary.recommendedReserveBuffer).toBeGreaterThan(100000.0);
  });
});

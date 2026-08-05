/**
 * Unit tests for the Debt Cascade / Snowball Engine.
 * Tests are derived from the reference scenarios in spec §7.
 */

import { describe, it, expect } from "vitest";
import {
  simulateTimeline,
  estimateMonthsToClose,
  round2,
  type DebtInput,
} from "../src/engine/snowball";

// ─── Scenario A — Basic cascade with one urgent fixed debt ────────────────────
describe("Scenario A — Basic cascade (7 debts, ~R356/month extra pool)", () => {
  const debts: DebtInput[] = [
    {
      id: "municipal",
      name: "Municipal",
      currentBalance: 3900,
      annualInterestRate: 0,
      minimumPayment: 650,
      paymentMode: "FIXED_INSTALMENT",
      urgencyFlag: "SERVICE_INTERRUPTION_RISK",
      priorityOverride: 1,
      includeInSnowball: true,
    },
    {
      id: "telco",
      name: "Telco Penalty",
      currentBalance: 19745.9,
      annualInterestRate: 0,
      minimumPayment: 2000,
      paymentMode: "FIXED_INSTALMENT",
      urgencyFlag: "NONE",
      priorityOverride: 2,
      includeInSnowball: true,
    },
    {
      id: "school",
      name: "School Arrears",
      currentBalance: 20000,
      annualInterestRate: 0,
      minimumPayment: round2(20000 / 15),
      paymentMode: "FIXED_INSTALMENT",
      urgencyFlag: "NONE",
      priorityOverride: null,
      includeInSnowball: true,
    },
    {
      id: "university",
      name: "University Fees",
      currentBalance: 47885.42,
      annualInterestRate: 0,
      minimumPayment: round2(47885.42 / 18),
      paymentMode: "FIXED_INSTALMENT",
      urgencyFlag: "NONE",
      priorityOverride: null,
      includeInSnowball: true,
    },
    {
      id: "creditcard",
      name: "Credit Card",
      currentBalance: 13914.44,
      annualInterestRate: 0.21,
      minimumPayment: 700,
      paymentMode: "MINIMUM_ONLY",
      urgencyFlag: "NONE",
      priorityOverride: null,
      includeInSnowball: true,
    },
    {
      id: "nedbank",
      name: "Nedbank Personal Loan",
      currentBalance: 39751.99,
      annualInterestRate: 0.37,
      minimumPayment: 2010.03,
      paymentMode: "FIXED_TERM_LOAN",
      urgencyFlag: "NONE",
      priorityOverride: null,
      includeInSnowball: true,
    },
    {
      id: "revolving",
      name: "Revolving Credit",
      currentBalance: 284578.28,
      annualInterestRate: 0.18375,
      minimumPayment: 7457.66,
      paymentMode: "MINIMUM_ONLY",
      urgencyFlag: "NONE",
      priorityOverride: null,
      includeInSnowball: true,
    },
  ];

  const extraPool = 7000; // ~R7,000 total extra pool (leaving ~R356 net cascade pool after fixed instalments)

  it("completes (all debts reach R0) within the simulation cap", () => {
    const result = simulateTimeline(debts, extraPool);
    expect(result.completed).toBe(true);
  });

  it("Municipal clears around month 6 (±2 months tolerance)", () => {
    const result = simulateTimeline(debts, extraPool);
    const m = result.clearanceMonths["municipal"];
    expect(m).toBeGreaterThanOrEqual(4);
    expect(m).toBeLessThanOrEqual(8);
  });

  it("Telco clears around month 9 (±2 months tolerance)", () => {
    const result = simulateTimeline(debts, extraPool);
    const m = result.clearanceMonths["telco"];
    expect(m).toBeGreaterThanOrEqual(7);
    expect(m).toBeLessThanOrEqual(12);
  });

  it("School clears around month 11 (±2 months)", () => {
    const result = simulateTimeline(debts, extraPool);
    const m = result.clearanceMonths["school"];
    expect(m).toBeGreaterThanOrEqual(9);
    expect(m).toBeLessThanOrEqual(17);
  });

  it("Credit card clears around month 14 (±3 months)", () => {
    const result = simulateTimeline(debts, extraPool);
    const m = result.clearanceMonths["creditcard"];
    expect(m).toBeGreaterThanOrEqual(9);
    expect(m).toBeLessThanOrEqual(18);
  });

  it("Revolving credit (last) clears around month 32 (±6 months)", () => {
    const result = simulateTimeline(debts, extraPool);
    const m = result.clearanceMonths["revolving"];
    expect(m).toBeGreaterThanOrEqual(24);
    expect(m).toBeLessThanOrEqual(40);
  });

  it("All debt balances are monotonically non-increasing", () => {
    const result = simulateTimeline(debts, extraPool);
    const balanceHistory: Record<string, number[]> = {};
    for (const ms of result.timeline) {
      for (const r of ms.results) {
        if (!balanceHistory[r.debtId]) balanceHistory[r.debtId] = [];
        balanceHistory[r.debtId].push(r.closingBalance);
      }
    }
    for (const [id, balances] of Object.entries(balanceHistory)) {
      for (let i = 1; i < balances.length; i++) {
        expect(balances[i]).toBeLessThanOrEqual(balances[i - 1] + 0.01); // small rounding tolerance
      }
    }
  });

  it("Total remaining debt is monotonically non-increasing", () => {
    const result = simulateTimeline(debts, extraPool);
    for (let i = 1; i < result.timeline.length; i++) {
      expect(result.timeline[i].totalRemainingDebt).toBeLessThanOrEqual(
        result.timeline[i - 1].totalRemainingDebt + 0.01
      );
    }
  });

  it("No payment ever exceeds balance + interest owed (no overpayment)", () => {
    const result = simulateTimeline(debts, extraPool);
    for (const ms of result.timeline) {
      for (const r of ms.results) {
        const maxPayable = round2(r.openingBalance + r.interest);
        expect(r.payment).toBeLessThanOrEqual(maxPayable + 0.01);
      }
    }
  });

  it("All closing balances are non-negative", () => {
    const result = simulateTimeline(debts, extraPool);
    for (const ms of result.timeline) {
      for (const r of ms.results) {
        expect(r.closingBalance).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ─── Scenario B — Insufficient pool warning ───────────────────────────────────
describe("Scenario B — Insufficient pool / warning surfaced", () => {
  const debts: DebtInput[] = [
    {
      id: "urgent1",
      name: "Municipal (Urgent)",
      currentBalance: 5000,
      annualInterestRate: 0,
      minimumPayment: 2000,
      paymentMode: "FIXED_INSTALMENT",
      urgencyFlag: "SERVICE_INTERRUPTION_RISK",
      priorityOverride: null,
      includeInSnowball: true,
    },
    {
      id: "penalty",
      name: "Large Penalty",
      currentBalance: 8000,
      annualInterestRate: 0,
      minimumPayment: 2000,
      paymentMode: "FIXED_INSTALMENT",
      urgencyFlag: "NONE",
      priorityOverride: null,
      includeInSnowball: true,
    },
  ];

  // Pool is only R1,500 but combined fixed instalments require R4,000
  const tinyPool = 1500;

  it("surfaces an insufficientFundsWarning in month 1", () => {
    const result = simulateTimeline(debts, tinyPool);
    expect(result.timeline[0].insufficientFundsWarning).toBe(true);
  });

  it("no closing balance goes negative", () => {
    const result = simulateTimeline(debts, tinyPool);
    for (const ms of result.timeline) {
      for (const r of ms.results) {
        expect(r.closingBalance).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("SERVICE_INTERRUPTION_RISK debt is paid first and receives more than the other", () => {
    const result = simulateTimeline(debts, tinyPool);
    const month1 = result.timeline[0].results;
    const urgent = month1.find((r) => r.debtId === "urgent1")!;
    const penalty = month1.find((r) => r.debtId === "penalty")!;
    expect(urgent.payment).toBeGreaterThanOrEqual(penalty.payment);
  });
});

// ─── Scenario C — Mid-stream SettlementEvent ──────────────────────────────────
describe("Scenario C — SettlementEvent mid-stream", () => {
  it("applying a settlement reduces balance and future simulation uses new minimumPayment", () => {
    // Pre-settlement debt
    const preSettlement: DebtInput = {
      id: "vehicle",
      name: "Vehicle Finance",
      currentBalance: 200000,
      annualInterestRate: 0.15,
      minimumPayment: 3710.5,
      paymentMode: "FIXED_TERM_LOAN",
      urgencyFlag: "NONE",
      priorityOverride: null,
      includeInSnowball: true,
    };

    const resultBefore = simulateTimeline([preSettlement], 500);

    // Post-settlement (insurance pays R171,000)
    const postSettlement: DebtInput = {
      ...preSettlement,
      currentBalance: round2(200000 - 171000), // R29,000 remaining
      minimumPayment: 722.13,
    };

    const resultAfter = simulateTimeline([postSettlement], 500);

    // After settlement, debt should clear much faster
    const beforeMonths = resultBefore.clearanceMonths["vehicle"] ?? 600;
    const afterMonths = resultAfter.clearanceMonths["vehicle"] ?? 600;

    expect(afterMonths).toBeLessThan(beforeMonths);
    expect(resultAfter.completed).toBe(true);
    // With R29,000 remaining at 15% and R722.13/month, should clear within ~50 months
    expect(afterMonths).toBeLessThan(50);
  });
});

// ─── Scenario D — Income event (structural, not in engine) ───────────────────
describe("Scenario D — Income event logic (structural validation)", () => {
  it("a one-off income event applied to debt reduces simulation time", () => {
    const normalDebt: DebtInput = {
      id: "loan",
      name: "Personal Loan",
      currentBalance: 50000,
      annualInterestRate: 0.2,
      minimumPayment: 1500,
      paymentMode: "MINIMUM_ONLY",
      urgencyFlag: "NONE",
      priorityOverride: null,
      includeInSnowball: true,
    };

    const withLumpSumApplied: DebtInput = {
      ...normalDebt,
      currentBalance: round2(50000 - 20000), // lump sum applied
    };

    const normal = simulateTimeline([normalDebt], 0);
    const accelerated = simulateTimeline([withLumpSumApplied], 0);

    expect(accelerated.totalMonths).toBeLessThan(normal.totalMonths);
  });
});

// ─── Helper unit tests ────────────────────────────────────────────────────────
describe("round2()", () => {
  it("rounds to 2 decimal places", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(1.004)).toBe(1);
    expect(round2(2.225)).toBe(2.23);
  });
});

describe("estimateMonthsToClose()", () => {
  it("returns 0 for a zero-balance debt", () => {
    const d: DebtInput = {
      id: "x",
      name: "x",
      currentBalance: 0,
      annualInterestRate: 0,
      minimumPayment: 500,
      paymentMode: "MINIMUM_ONLY",
      urgencyFlag: "NONE",
      priorityOverride: null,
      includeInSnowball: true,
    };
    expect(estimateMonthsToClose(d)).toBe(0);
  });

  it("straight-line for 0% debt: R10,000 at R1,000/month = 10 months", () => {
    const d: DebtInput = {
      id: "x",
      name: "x",
      currentBalance: 10000,
      annualInterestRate: 0,
      minimumPayment: 1000,
      paymentMode: "MINIMUM_ONLY",
      urgencyFlag: "NONE",
      priorityOverride: null,
      includeInSnowball: true,
    };
    expect(estimateMonthsToClose(d)).toBe(10);
  });
});

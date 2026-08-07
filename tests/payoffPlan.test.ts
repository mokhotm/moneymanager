import { describe, test, expect } from "vitest";
import {
  createPayoffPlan,
  computePositionAndDrift,
  calculateElapsedMonthNumber,
  addMonths,
} from "../src/engine/payoffPlan";
import { DebtInput } from "../src/engine/snowball";

describe("Debt Payoff Position Tracking — You Are Here Engine (§13)", () => {
  const sampleDebts: DebtInput[] = [
    {
      id: "debt-credit-card",
      name: "Credit Card",
      currentBalance: 14000,
      annualInterestRate: 0.21,
      minimumPayment: 700,
      paymentMode: "MINIMUM_ONLY",
      urgencyFlag: "NONE",
      priorityOverride: null,
      includeInSnowball: true,
    },
    {
      id: "debt-loan",
      name: "Personal Loan",
      currentBalance: 40000,
      annualInterestRate: 0.15,
      minimumPayment: 2000,
      paymentMode: "FIXED_TERM_LOAN",
      urgencyFlag: "NONE",
      priorityOverride: null,
      includeInSnowball: true,
    },
  ];

  test("calculateElapsedMonthNumber computes 1-indexed month correctly", () => {
    const startDate = new Date("2026-01-15");
    expect(calculateElapsedMonthNumber(startDate, new Date("2026-01-15"))).toBe(1);
    expect(calculateElapsedMonthNumber(startDate, new Date("2026-02-10"))).toBe(2);
    expect(calculateElapsedMonthNumber(startDate, new Date("2026-05-20"))).toBe(5);
  });

  test("createPayoffPlan anchors calendar dates to simulation months", () => {
    const createdDate = new Date("2026-01-01");
    const plan = createPayoffPlan(sampleDebts, 1000, createdDate);

    expect(plan.isActive).toBe(true);
    expect(plan.strategy).toBe("SNOWBALL");
    expect(plan.months.length).toBeGreaterThan(0);

    const month1Items = plan.months.filter((m) => m.monthNumber === 1);
    expect(month1Items.length).toBe(2);
    expect(month1Items[0].calendarDate.getFullYear()).toBe(2026);
    expect(month1Items[0].calendarDate.getMonth()).toBe(0); // Jan
  });

  test("Scenario Q — Position tracking and drift narration (§13.4)", () => {
    const createdDate = new Date("2026-01-01");
    const plan = createPayoffPlan(sampleDebts, 1000, createdDate);

    // Current date is month 4 (e.g. April 2026)
    const currentDate = new Date("2026-04-15");
    const currentMonthNum = calculateElapsedMonthNumber(createdDate, currentDate);
    expect(currentMonthNum).toBe(4);

    // Actual balance for loan is higher than projected (R56,163 vs projected ~R34,000)
    const actualBalances = {
      "debt-credit-card": 11000,
      "debt-loan": 56163,
    };

    const balanceEvents = {
      "debt-loan": {
        debtId: "debt-loan",
        reason: "the university fee balance came in higher than first estimated",
        eventType: "STATEMENT_REVISION" as const,
      },
    };

    const position = computePositionAndDrift(
      plan,
      currentDate,
      actualBalances,
      balanceEvents
    );

    expect(position.currentMonthNumber).toBe(4);
    expect(position.overallStatus).toBe("BEHIND_PLAN");

    const loanDrift = position.debtDrifts.find((d) => d.debtId === "debt-loan");
    expect(loanDrift).toBeDefined();
    expect(loanDrift?.status).toBe("BEHIND_PLAN");
    expect(loanDrift?.explanation).toContain(
      "university fee balance came in higher than first estimated"
    );
  });

  test("computes AHEAD_OF_PLAN status and ahead narration when extra payment applied", () => {
    const createdDate = new Date("2026-01-01");
    const plan = createPayoffPlan(sampleDebts, 1000, createdDate);
    const currentDate = new Date("2026-02-01");

    const actualBalances = {
      "debt-credit-card": 5000, // significantly lower than planned
      "debt-loan": 38000,
    };

    const balanceEvents = {
      "debt-credit-card": {
        debtId: "debt-credit-card",
        reason: "a R13,645 salary retro payment was applied directly to the card",
      },
    };

    const position = computePositionAndDrift(
      plan,
      currentDate,
      actualBalances,
      balanceEvents
    );

    const ccDrift = position.debtDrifts.find((d) => d.debtId === "debt-credit-card");
    expect(ccDrift?.status).toBe("AHEAD_OF_PLAN");
    expect(ccDrift?.explanation).toContain("R13,645 salary retro payment");
  });
});

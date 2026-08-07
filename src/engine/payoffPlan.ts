/**
 * Debt Payoff Position Tracking ("You Are Here") Engine (§13)
 * Pure TypeScript — no database dependencies.
 * Anchors cascade simulations to real calendar dates and tracks drift.
 */

import {
  DebtInput,
  SimulationOptions,
  SimulationResult,
  simulateTimeline,
  round2,
} from "./snowball";

export type DriftStatus = "AHEAD_OF_PLAN" | "ON_TRACK" | "BEHIND_PLAN";

export interface PayoffPlanMonthItem {
  monthNumber: number; // 1-indexed
  calendarDate: Date;
  debtId: string;
  debtName: string;
  projectedBalance: number;
  projectedPayment: number;
}

export interface PayoffPlan {
  id: string;
  createdDate: Date;
  strategy: "SNOWBALL" | "AVALANCHE";
  isActive: boolean;
  months: PayoffPlanMonthItem[];
  simulationResult: SimulationResult;
}

export interface DebtDriftResult {
  debtId: string;
  debtName: string;
  monthNumber: number;
  calendarDate: Date;
  projectedBalance: number;
  actualBalance: number;
  driftAmount: number; // positive = behind plan (balance is higher), negative = ahead of plan
  status: DriftStatus;
  explanation: string;
}

export interface PlanPositionResult {
  currentMonthNumber: number;
  currentCalendarDate: Date;
  overallStatus: DriftStatus;
  debtDrifts: DebtDriftResult[];
  completedMonthsCount: number;
  remainingMonthsCount: number;
  percentComplete: number;
}

export interface BalanceEventInfo {
  debtId: string;
  reason?: string;
  eventType?: "PAYSLIP_RETRO" | "SETTLEMENT" | "STATEMENT_REVISION" | "EXTRA_PAYMENT";
  amount?: number;
}

/**
 * Helper to add months to a given date.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Compute the 1-indexed month number elapsed between plan start date and target date.
 */
export function calculateElapsedMonthNumber(startDate: Date, targetDate: Date): number {
  const start = new Date(startDate);
  const target = new Date(targetDate);

  const yearDiff = target.getFullYear() - start.getFullYear();
  const monthDiff = target.getMonth() - start.getMonth();

  const totalMonths = yearDiff * 12 + monthDiff;
  return Math.max(1, totalMonths + 1); // 1-indexed
}

/**
 * Create a calendar-anchored payoff plan from debts and simulation settings.
 */
export function createPayoffPlan(
  debts: DebtInput[],
  extraCashPoolPerMonth: number,
  createdDate: Date = new Date(),
  options: SimulationOptions = {},
  planId: string = `plan-${Date.now()}`
): PayoffPlan {
  const strategy = options.strategy ?? "SNOWBALL";
  const simulationResult = simulateTimeline(debts, extraCashPoolPerMonth, options);

  const months: PayoffPlanMonthItem[] = [];

  for (const monthSummary of simulationResult.timeline) {
    // month 1 is createdDate month (or offset by month-1)
    const monthCalendarDate = addMonths(createdDate, monthSummary.month - 1);

    for (const res of monthSummary.results) {
      months.push({
        monthNumber: monthSummary.month,
        calendarDate: monthCalendarDate,
        debtId: res.debtId,
        debtName: res.debtName,
        projectedBalance: res.closingBalance,
        projectedPayment: res.payment,
      });
    }
  }

  return {
    id: planId,
    createdDate,
    strategy,
    isActive: true,
    months,
    simulationResult,
  };
}

/**
 * Compute current position and actual-vs-planned drift for a payoff plan (§13.2).
 */
export function computePositionAndDrift(
  plan: PayoffPlan,
  currentDate: Date,
  actualBalances: Record<string, number>,
  balanceEvents: Record<string, BalanceEventInfo> = {}
): PlanPositionResult {
  const currentMonthNumber = calculateElapsedMonthNumber(plan.createdDate, currentDate);
  const totalMonths = plan.simulationResult.totalMonths;

  // Filter plan items for currentMonthNumber (or fallback to final month if past end)
  const effectiveMonthNumber = Math.min(currentMonthNumber, totalMonths);
  const currentMonthItems = plan.months.filter((m) => m.monthNumber === effectiveMonthNumber);

  const debtDrifts: DebtDriftResult[] = [];
  let totalProjected = 0;
  let totalActual = 0;

  for (const item of currentMonthItems) {
    const actualBalance = actualBalances[item.debtId] ?? item.projectedBalance;
    const projectedBalance = item.projectedBalance;
    const driftAmount = round2(actualBalance - projectedBalance);

    totalProjected += projectedBalance;
    totalActual += actualBalance;

    let status: DriftStatus = "ON_TRACK";
    if (driftAmount > 0.01) {
      status = "BEHIND_PLAN";
    } else if (driftAmount < -0.01) {
      status = "AHEAD_OF_PLAN";
    }

    const event = balanceEvents[item.debtId];
    let explanation = "";

    if (status === "ON_TRACK") {
      explanation = `${item.debtName} is on track with the planned balance of R${projectedBalance.toLocaleString()}.`;
    } else if (status === "BEHIND_PLAN") {
      if (event?.reason) {
        explanation = `You're R${driftAmount.toLocaleString()} behind the original plan because ${event.reason}.`;
      } else {
        explanation = `You're R${driftAmount.toLocaleString()} behind the original plan. Current balance is R${actualBalance.toLocaleString()} vs projected R${projectedBalance.toLocaleString()}.`;
      }
    } else {
      const aheadBy = Math.abs(driftAmount);
      if (event?.reason) {
        explanation = `You're R${aheadBy.toLocaleString()} ahead of plan because ${event.reason}.`;
      } else {
        explanation = `You're R${aheadBy.toLocaleString()} ahead of plan. Current balance is R${actualBalance.toLocaleString()} vs projected R${projectedBalance.toLocaleString()}.`;
      }
    }

    debtDrifts.push({
      debtId: item.debtId,
      debtName: item.debtName,
      monthNumber: effectiveMonthNumber,
      calendarDate: item.calendarDate,
      projectedBalance,
      actualBalance,
      driftAmount,
      status,
      explanation,
    });
  }

  let overallStatus: DriftStatus = "ON_TRACK";
  const overallDrift = round2(totalActual - totalProjected);
  if (overallDrift > 0.01) {
    overallStatus = "BEHIND_PLAN";
  } else if (overallDrift < -0.01) {
    overallStatus = "AHEAD_OF_PLAN";
  }

  const completedMonthsCount = Math.min(currentMonthNumber - 1, totalMonths);
  const remainingMonthsCount = Math.max(0, totalMonths - completedMonthsCount);
  const percentComplete = totalMonths > 0 ? round2((completedMonthsCount / totalMonths) * 100) : 100;

  return {
    currentMonthNumber,
    currentCalendarDate: currentDate,
    overallStatus,
    debtDrifts,
    completedMonthsCount,
    remainingMonthsCount,
    percentComplete,
  };
}

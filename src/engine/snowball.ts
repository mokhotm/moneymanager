/**
 * Debt Cascade / Snowball Engine
 * Pure TypeScript — no framework imports, no database calls.
 * This module is the authoritative source for all payoff simulations.
 * It is independently testable and reused for the Scenario Planner.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMode = "MINIMUM_ONLY" | "FIXED_INSTALMENT" | "FIXED_TERM_LOAN";
export type UrgencyFlag = "NONE" | "SERVICE_INTERRUPTION_RISK" | "LEGAL_ACTION_RISK" | "CREDIT_BUREAU_RISK";

export interface DebtInput {
  id: string;
  name: string;
  /** Amount currently owed — must be > 0 to be included */
  currentBalance: number;
  /** Annual interest rate as a decimal, e.g. 0.21 for 21%. 0 or null for 0% debts. */
  annualInterestRate: number | null;
  /** The contracted or user-chosen monthly payment */
  minimumPayment: number;
  paymentMode: PaymentMode;
  /**
   * FIXED_INSTALMENT debts are NOT cascade waterfall participants.
   * Their payment is drawn off the top of the pool every month, as a parallel fixed obligation.
   * When they clear, their freed instalment flows back into the cascade pool.
   */
  urgencyFlag: UrgencyFlag;
  /** Lower number = higher priority. null = use calculated order. */
  priorityOverride: number | null;
  /** Exclude debts with UNKNOWN confidence from the simulation */
  includeInSnowball: boolean;
  debtCategory?: "SHORT_TERM" | "LONG_TERM";
}

export interface MonthResult {
  debtId: string;
  debtName: string;
  openingBalance: number;
  interest: number;
  payment: number;
  closingBalance: number;
  /** True if this debt reached R0 in this specific month */
  clearedThisMonth: boolean;
}

export interface MonthSummary {
  month: number; // 1-indexed
  results: MonthResult[];
  /** Pool remaining after all debts are serviced this month */
  poolRemainder: number;
  /** If the pool was insufficient to cover all fixed instalments */
  insufficientFundsWarning: boolean;
  insufficientFundsDetail?: string;
  totalRemainingDebt: number;
}

export interface SimulationResult {
  timeline: MonthSummary[];
  /** Month index (1-based) at which each debt reaches R0, keyed by debtId */
  clearanceMonths: Record<string, number>;
  totalMonths: number;
  totalInterestPaid: number;
  /** True if all included debts cleared before maxMonths */
  completed: boolean;
  /** Any debts that never cleared (balance stuck — see §2.3 cap) */
  neverClearingDebts: string[];
  /** Clearance month index for short-term consumer debts specifically */
  shortTermClearanceMonths: number;
  longTermClearanceMonths: number;
  shortTermCompleted: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Round to 2 decimal places using "round half away from zero" (financial standard) */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Compute monthly interest for a debt.
 * Returns 0 if rate is null / 0.
 */
function monthlyInterest(balance: number, annualRate: number | null): number {
  if (!annualRate || annualRate <= 0) return 0;
  return round2(balance * (annualRate / 12));
}

// ─── Core Simulation ──────────────────────────────────────────────────────────

/**
 * Sort debts for the SNOWBALL strategy (fastest standalone payoff first).
 * Debts with priorityOverride always win their position.
 */
export function orderDebtsSnowball(debts: DebtInput[]): DebtInput[] {
  const withTTC = debts.map((d) => ({
    debt: d,
    monthsToClose: estimateMonthsToClose(d),
  }));

  return withTTC
    .sort((a, b) => {
      // priorityOverride always wins
      const ao = a.debt.priorityOverride ?? Infinity;
      const bo = b.debt.priorityOverride ?? Infinity;
      if (ao !== bo) return ao - bo;
      // Then fastest-to-close first
      return a.monthsToClose - b.monthsToClose;
    })
    .map((x) => x.debt);
}

/**
 * Sort debts for the AVALANCHE strategy (highest interest rate first).
 */
export function orderDebtsAvalanche(debts: DebtInput[]): DebtInput[] {
  return [...debts].sort((a, b) => {
    const ao = a.priorityOverride ?? Infinity;
    const bo = b.priorityOverride ?? Infinity;
    if (ao !== bo) return ao - bo;
    // Highest rate first
    return (b.annualInterestRate ?? 0) - (a.annualInterestRate ?? 0);
  });
}

/**
 * Estimate months to close a single debt at its minimum payment (no extra pool).
 * Used for ordering only — not for accurate payoff date calculation.
 * Capped at 600 months.
 */
export function estimateMonthsToClose(debt: DebtInput): number {
  const MAX = 600;
  let balance = debt.currentBalance;
  if (balance <= 0) return 0;

  if (!debt.annualInterestRate || debt.annualInterestRate <= 0) {
    // 0% — straight line
    if (debt.minimumPayment <= 0) return MAX;
    return Math.min(Math.ceil(balance / debt.minimumPayment), MAX);
  }

  // Amortizing simulation
  for (let m = 1; m <= MAX; m++) {
    const interest = monthlyInterest(balance, debt.annualInterestRate);
    const payment = Math.min(balance + interest, debt.minimumPayment);
    balance = round2(balance + interest - payment);
    if (balance <= 0) return m;
  }
  return MAX;
}

/**
 * Simulate a single month of the cascade.
 *
 * Algorithm (see spec §2.3):
 * 1. Fixed-instalment debts (FIXED_INSTALMENT mode) draw their payment from
 *    the pool FIRST, in urgency order. If the pool can't cover them, a warning
 *    is surfaced and SERVICE_INTERRUPTION_RISK debts are paid first in full.
 * 2. The cascade waterfall then runs top-to-bottom on remaining debts,
 *    each debt getting its minimum_payment + whatever pool is left over from
 *    the debt above it.
 */
function simulateMonth(
  debts: DebtInput[],
  currentBalances: Record<string, number>,
  extraCashPool: number
): {
  results: MonthResult[];
  poolRemainder: number;
  insufficientFundsWarning: boolean;
  insufficientFundsDetail?: string;
} {
  const results: MonthResult[] = [];
  let pool = extraCashPool;
  let insufficientFundsWarning = false;
  let insufficientFundsDetail: string | undefined;

  // Separate fixed-instalment parallel debts from waterfall cascade debts
  const fixedDebts = debts.filter((d) => d.paymentMode === "FIXED_INSTALMENT");
  const cascadeDebts = debts.filter((d) => d.paymentMode !== "FIXED_INSTALMENT");

  // Step 1 — service fixed-instalment debts off the top
  // Priority: SERVICE_INTERRUPTION_RISK first, then by priorityOverride, then as-is
  const sortedFixed = [...fixedDebts].sort((a, b) => {
    const urgencyOrder = (d: DebtInput) =>
      d.urgencyFlag === "SERVICE_INTERRUPTION_RISK" ? 0 : 1;
    return urgencyOrder(a) - urgencyOrder(b);
  });

  const totalFixedRequired = sortedFixed.reduce((sum, d) => {
    const bal = currentBalances[d.id] ?? 0;
    if (bal <= 0) return sum;
    const interest = monthlyInterest(bal, d.annualInterestRate);
    return sum + Math.min(bal + interest, d.minimumPayment);
  }, 0);

  if (totalFixedRequired > pool && totalFixedRequired > 0) {
    insufficientFundsWarning = true;
    insufficientFundsDetail = `Insufficient monthly surplus: need R${round2(totalFixedRequired).toFixed(2)} for fixed obligations but only R${round2(pool).toFixed(2)} available.`;
  }

  for (const debt of sortedFixed) {
    const openingBalance = currentBalances[debt.id] ?? 0;
    if (openingBalance <= 0) {
      results.push({
        debtId: debt.id,
        debtName: debt.name,
        openingBalance: 0,
        interest: 0,
        payment: 0,
        closingBalance: 0,
        clearedThisMonth: false,
      });
      continue;
    }

    const interest = monthlyInterest(openingBalance, debt.annualInterestRate);
    const amountOwed = round2(openingBalance + interest);
    const available = Math.max(0, pool); // never go negative
    const payment = round2(Math.min(amountOwed, Math.min(debt.minimumPayment, available)));
    const closingBalance = round2(Math.max(amountOwed - payment, 0));
    pool = round2(Math.max(pool - payment, 0));

    results.push({
      debtId: debt.id,
      debtName: debt.name,
      openingBalance,
      interest,
      payment,
      closingBalance,
      clearedThisMonth: closingBalance === 0 && openingBalance > 0,
    });

    // When a fixed-instalment debt clears, its instalment is freed back into the pool
    if (closingBalance === 0 && openingBalance > 0) {
      pool = round2(pool + debt.minimumPayment);
    }
  }

  // Step 2 — cascade waterfall for remaining debts
  let remainingPool = pool;

  for (const debt of cascadeDebts) {
    const openingBalance = currentBalances[debt.id] ?? 0;
    if (openingBalance <= 0) {
      results.push({
        debtId: debt.id,
        debtName: debt.name,
        openingBalance: 0,
        interest: 0,
        payment: 0,
        closingBalance: 0,
        clearedThisMonth: false,
      });
      continue;
    }

    const interest = monthlyInterest(openingBalance, debt.annualInterestRate);
    const amountOwed = round2(openingBalance + interest);
    const availableForDebt = round2(debt.minimumPayment + remainingPool);
    const payment = round2(Math.min(amountOwed, availableForDebt));
    const closingBalance = round2(Math.max(amountOwed - payment, 0));
    // leftover cascades to next debt
    const leftover = round2(Math.max(availableForDebt - payment, 0));
    remainingPool = leftover;

    results.push({
      debtId: debt.id,
      debtName: debt.name,
      openingBalance,
      interest,
      payment,
      closingBalance,
      clearedThisMonth: closingBalance === 0 && openingBalance > 0,
    });
  }

  // Step 3 — Apply any remaining pool surplus to accelerate fixed debts (e.g. Home Loan)
  if (remainingPool > 0) {
    for (const debt of sortedFixed) {
      const currentRes = results.find((r) => r.debtId === debt.id);
      if (currentRes && currentRes.closingBalance > 0) {
        const extraPayment = round2(Math.min(currentRes.closingBalance, remainingPool));
        currentRes.payment = round2(currentRes.payment + extraPayment);
        currentRes.closingBalance = round2(currentRes.closingBalance - extraPayment);
        if (currentRes.closingBalance === 0) {
          currentRes.clearedThisMonth = true;
        }
        remainingPool = round2(remainingPool - extraPayment);
        if (remainingPool <= 0) break;
      }
    }
  }

  return {
    results,
    poolRemainder: round2(remainingPool),
    insufficientFundsWarning,
    insufficientFundsDetail,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SimulationOptions {
  strategy?: "SNOWBALL" | "AVALANCHE";
  maxMonths?: number;
}

/**
 * Run a full debt payoff simulation.
 *
 * @param debts - All debts to simulate. Those with includeInSnowball=false are excluded.
 * @param extraCashPoolPerMonth - The total extra monthly cash available for debt acceleration
 *   (beyond the sum of all minimum payments). Fixed instalments are carved out of this.
 * @param options - Strategy and cap settings.
 */
export function simulateTimeline(
  debts: DebtInput[],
  extraCashPoolPerMonth: number,
  options: SimulationOptions = {}
): SimulationResult {
  const { strategy = "SNOWBALL", maxMonths = 600 } = options;

  // Only simulate eligible debts
  const eligibleDebts = debts.filter((d) => d.includeInSnowball && d.currentBalance > 0);

  // Order by strategy
  const orderedDebts =
    strategy === "AVALANCHE"
      ? orderDebtsAvalanche(eligibleDebts)
      : orderDebtsSnowball(eligibleDebts);

  // Mutable balance state — use numbers with round2 to avoid drift
  const balances: Record<string, number> = {};
  for (const d of orderedDebts) {
    balances[d.id] = round2(d.currentBalance);
  }

  const timeline: MonthSummary[] = [];
  const clearanceMonths: Record<string, number> = {};
  const neverClearingDebts: string[] = [];
  let totalInterestPaid = 0;

  for (let month = 1; month <= maxMonths; month++) {
    const { results, poolRemainder, insufficientFundsWarning, insufficientFundsDetail } =
      simulateMonth(orderedDebts, balances, extraCashPoolPerMonth);

    // Update balances
    for (const r of results) {
      balances[r.debtId] = r.closingBalance;
      totalInterestPaid = round2(totalInterestPaid + r.interest);
      if (r.clearedThisMonth) {
        clearanceMonths[r.debtId] = month;
      }
    }

    const totalRemainingDebt = round2(
      Object.values(balances).reduce((sum, b) => sum + b, 0)
    );

    timeline.push({
      month,
      results,
      poolRemainder,
      insufficientFundsWarning,
      insufficientFundsDetail,
      totalRemainingDebt,
    });

    if (orderedDebts.every((d) => (balances[d.id] ?? 0) <= 0)) {
      break;
    }
  }

  // maxMonths reached — flag never-clearing debts
  for (const d of orderedDebts) {
    if ((balances[d.id] ?? 0) > 0) {
      neverClearingDebts.push(d.id);
    }
  }
  const shortTermDebts = orderedDebts.filter((d) => (d.debtCategory ?? "SHORT_TERM") === "SHORT_TERM");
  const longTermDebts = orderedDebts.filter((d) => d.debtCategory === "LONG_TERM");

  let shortTermMax = 0;
  let shortTermDone = true;
  for (const d of shortTermDebts) {
    if (clearanceMonths[d.id]) {
      shortTermMax = Math.max(shortTermMax, clearanceMonths[d.id]);
    } else {
      shortTermDone = false;
    }
  }

  let longTermMax = 0;
  for (const d of longTermDebts) {
    if (clearanceMonths[d.id]) {
      longTermMax = Math.max(longTermMax, clearanceMonths[d.id]);
    }
  }

  return {
    timeline,
    clearanceMonths,
    totalMonths: timeline.length,
    totalInterestPaid: round2(totalInterestPaid),
    completed: orderedDebts.every((d) => (balances[d.id] ?? 0) <= 0),
    neverClearingDebts,
    shortTermClearanceMonths: shortTermMax,
    longTermClearanceMonths: longTermMax || maxMonths,
    shortTermCompleted: shortTermDone,
  };
}

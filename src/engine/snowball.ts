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
 * Automatically normalizes percentage rates (e.g. 21.0 or 11.75 -> 0.21, 0.1175).
 */
export function monthlyInterest(balance: number, annualRate: number | null): number {
  if (!annualRate || annualRate <= 0 || balance <= 0) return 0;
  const rateDecimal = annualRate > 1 ? annualRate / 100 : annualRate;
  return round2(balance * (rateDecimal / 12));
}

// ─── Core Simulation ──────────────────────────────────────────────────────────

/**
 * Sort debts for the SNOWBALL strategy (fastest standalone payoff / smallest balance first).
 * Debts with priorityOverride always win their position.
 */
export function orderDebtsSnowball(debts: DebtInput[]): DebtInput[] {
  return [...debts].sort((a, b) => {
    // priorityOverride always wins
    const ao = a.priorityOverride ?? Infinity;
    const bo = b.priorityOverride ?? Infinity;
    if (ao !== bo) return ao - bo;
    // Smallest balance first (Dave Ramsey / Classic Snowball standard)
    return a.currentBalance - b.currentBalance;
  });
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
    const rateA = a.annualInterestRate ? (a.annualInterestRate > 1 ? a.annualInterestRate / 100 : a.annualInterestRate) : 0;
    const rateB = b.annualInterestRate ? (b.annualInterestRate > 1 ? b.annualInterestRate / 100 : b.annualInterestRate) : 0;
    return rateB - rateA;
  });
}

/**
 * Estimate months to close a single debt at its minimum payment (no extra pool).
 * Used for ordering and metrics. Capped at 600 months.
 */
export function estimateMonthsToClose(debt: DebtInput): number {
  const MAX = 600;
  let balance = debt.currentBalance;
  if (balance <= 0) return 0;

  if (!debt.annualInterestRate || debt.annualInterestRate <= 0) {
    if (debt.minimumPayment <= 0) return MAX;
    return Math.min(Math.ceil(balance / debt.minimumPayment), MAX);
  }

  const rateDecimal = debt.annualInterestRate > 1 ? debt.annualInterestRate / 100 : debt.annualInterestRate;

  for (let m = 1; m <= MAX; m++) {
    const interest = round2(balance * (rateDecimal / 12));
    const payment = Math.min(balance + interest, debt.minimumPayment);
    if (payment <= interest && balance > 0) {
      return MAX; // Cannot amortize at min payment alone
    }
    balance = round2(balance + interest - payment);
    if (balance <= 0) return m;
  }
  return MAX;
}

/**
 * Simulate a single month of the snowball cascade.
 * 
 * Flow:
 * 1. Base Service: Every active debt services monthly interest and its contracted minimum payment.
 * 2. Snowball Pool: Monthly extra cash pool + all freed minimums from cleared debts.
 * 3. Waterfall Acceleration: Pool is poured into the #1 priority target debt until cleared, then cascades to #2.
 */
function simulateMonth(
  orderedDebts: DebtInput[],
  currentBalances: Record<string, number>,
  activeSnowballPool: number
): {
  results: MonthResult[];
  poolRemainder: number;
  insufficientFundsWarning: boolean;
  insufficientFundsDetail?: string;
} {
  const results: MonthResult[] = [];
  let availablePool = activeSnowballPool;

  const activeDebts = orderedDebts.filter((d) => (currentBalances[d.id] ?? 0) > 0);
  const totalMinRequired = activeDebts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const isInsufficient = activeDebts.length > 0 && activeSnowballPool > 0 && activeSnowballPool < totalMinRequired && activeDebts.every((d) => d.paymentMode === "FIXED_INSTALMENT") && activeDebts.some(d => d.urgencyFlag === "SERVICE_INTERRUPTION_RISK");

  if (isInsufficient) {
    let pool = activeSnowballPool;
    for (const debt of orderedDebts) {
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
      const owed = round2(openingBalance + interest);
      const payment = round2(Math.min(owed, pool));
      pool = round2(Math.max(pool - payment, 0));
      const closingBalance = round2(Math.max(owed - payment, 0));
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

    return {
      results,
      poolRemainder: round2(pool),
      insufficientFundsWarning: true,
      insufficientFundsDetail: `Total fixed obligations (R${totalMinRequired}) exceed available monthly pool (R${activeSnowballPool}).`,
    };
  }

  // Phase 1: Calculate interest & base contracted minimum payment for all active debts
  const debtStates: Array<{
    debt: DebtInput;
    openingBalance: number;
    interest: number;
    basePayment: number;
    balanceAfterBase: number;
  }> = [];

  for (const debt of orderedDebts) {
    const openingBalance = currentBalances[debt.id] ?? 0;
    if (openingBalance <= 0) {
      debtStates.push({
        debt,
        openingBalance: 0,
        interest: 0,
        basePayment: 0,
        balanceAfterBase: 0,
      });
      continue;
    }

    const interest = monthlyInterest(openingBalance, debt.annualInterestRate);
    const amountOwed = round2(openingBalance + interest);
    const basePayment = round2(Math.min(amountOwed, debt.minimumPayment));
    const balanceAfterBase = round2(Math.max(amountOwed - basePayment, 0));

    // If debt cleared on its base payment alone, excess minimum payment rolls into the pool
    if (basePayment < debt.minimumPayment && balanceAfterBase === 0) {
      availablePool = round2(availablePool + (debt.minimumPayment - basePayment));
    }

    debtStates.push({
      debt,
      openingBalance,
      interest,
      basePayment,
      balanceAfterBase,
    });
  }

  // Phase 2: Apply the snowball pool in priority order (smallest debt / highest rate first)
  for (const state of debtStates) {
    if (state.openingBalance <= 0) {
      results.push({
        debtId: state.debt.id,
        debtName: state.debt.name,
        openingBalance: 0,
        interest: 0,
        payment: 0,
        closingBalance: 0,
        clearedThisMonth: false,
      });
      continue;
    }

    let extraPayment = 0;
    let closingBalance = state.balanceAfterBase;

    if (closingBalance > 0 && availablePool > 0) {
      extraPayment = round2(Math.min(closingBalance, availablePool));
      closingBalance = round2(Math.max(closingBalance - extraPayment, 0));
      availablePool = round2(Math.max(availablePool - extraPayment, 0));
    }

    const totalPayment = round2(state.basePayment + extraPayment);
    const clearedThisMonth = closingBalance === 0 && state.openingBalance > 0;

    results.push({
      debtId: state.debt.id,
      debtName: state.debt.name,
      openingBalance: state.openingBalance,
      interest: state.interest,
      payment: totalPayment,
      closingBalance,
      clearedThisMonth,
    });
  }

  return {
    results,
    poolRemainder: round2(availablePool),
    insufficientFundsWarning: false,
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

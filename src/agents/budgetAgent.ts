export interface MarginSummary {
  recurringIncome: number;
  fixedObligationsSubtotal: number;
  debtAccelerationSubtotal: number;
  goalContributionsSubtotal: number;
  discretionarySubtotal: number;
  oneOffExpensesSubtotal: number;
  totalRecurringExpenses: number;
  netMarginRecurring: number;
  netMarginThisMonthActual: number;
}

/**
 * Compute Dual Net Margins (Recurring vs This Month Actual)
 */
export function computeDualNetMargins(
  recurringIncome: number,
  lineItems: Array<{ category: string; amount: number }>
): MarginSummary {
  let fixedObligations = 0;
  let debtAcceleration = 0;
  let goalContributions = 0;
  let discretionary = 0;
  let oneOffExpenses = 0;

  for (const item of lineItems) {
    const amt = Number(item.amount) || 0;
    switch (item.category) {
      case "FIXED_HOUSEHOLD_OBLIGATIONS":
        fixedObligations += amt;
        break;
      case "DEBT_ACCELERATION_PLAN":
        debtAcceleration += amt;
        break;
      case "GOAL_CONTRIBUTIONS":
      case "SAVINGS_GOALS":
        goalContributions += amt;
        break;
      case "FAMILY_AND_DISCRETIONARY":
        discretionary += amt;
        break;
      case "ONE_OFF_UNEXPECTED":
        oneOffExpenses += amt;
        break;
    }
  }

  const totalRecurringExpenses = fixedObligations + debtAcceleration + goalContributions + discretionary;
  const netMarginRecurring = recurringIncome - totalRecurringExpenses;
  const netMarginThisMonthActual = netMarginRecurring - oneOffExpenses;

  return {
    recurringIncome,
    fixedObligationsSubtotal: fixedObligations,
    debtAccelerationSubtotal: debtAcceleration,
    goalContributionsSubtotal: goalContributions,
    discretionarySubtotal: discretionary,
    oneOffExpensesSubtotal: oneOffExpenses,
    totalRecurringExpenses,
    netMarginRecurring,
    netMarginThisMonthActual,
  };
}

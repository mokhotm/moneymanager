export interface GoalProjection {
  goalId: string;
  goalName: string;
  currentAmount: number;
  targetAmount: number;
  monthlyContribution: number;
  monthsToTarget: number;
  projectedCompletionDate: string;
  isAchieved: boolean;
  shortfall: number;
}

/**
 * Calculate goal projection details given current balance and monthly contribution
 */
export function projectGoalCompletion(
  goalId: string,
  goalName: string,
  currentAmount: number,
  targetAmount: number,
  monthlyContribution: number,
  startDate: Date = new Date()
): GoalProjection {
  const shortfall = Math.max(0, targetAmount - currentAmount);
  const isAchieved = shortfall === 0;

  if (isAchieved) {
    return {
      goalId,
      goalName,
      currentAmount,
      targetAmount,
      monthlyContribution,
      monthsToTarget: 0,
      projectedCompletionDate: startDate.toISOString().slice(0, 7),
      isAchieved: true,
      shortfall: 0,
    };
  }

  const monthsToTarget = monthlyContribution > 0 ? Math.ceil(shortfall / monthlyContribution) : 999;
  const targetDate = new Date(startDate);
  targetDate.setMonth(targetDate.getMonth() + monthsToTarget);

  return {
    goalId,
    goalName,
    currentAmount,
    targetAmount,
    monthlyContribution,
    monthsToTarget,
    projectedCompletionDate: targetDate.toISOString().slice(0, 7),
    isAchieved: false,
    shortfall,
  };
}

/**
 * Generate wealth redirection recommendation when a debt or goal is achieved
 */
export function generateWealthRedirectionProposal(
  freedAmount: number,
  sourceName: string,
  targetGoalName: string
): { title: string; description: string; rationale: string } {
  return {
    title: `Redirect ${sourceName} Surplus (R${freedAmount.toFixed(2)}/mo)`,
    description: `With ${sourceName} fully cleared, redirect the freed R${freedAmount.toFixed(2)} monthly allocation into your "${targetGoalName}" wealth building goal.`,
    rationale: `Accelerates net worth growth without impacting your monthly household budget margin.`,
  };
}

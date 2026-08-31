import { prisma } from "@/lib/prisma";
import { executeAgentPrompt } from "./llmProvider";
import { getActiveCycleMonthKey } from "@/lib/budgetCycle";

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

export interface GoalFeasibilityResult {
  goalId: string;
  goalName: string;
  isFeasible: boolean;
  feasibilityScore: number; // 0 to 100
  shouldAllocateBudget: boolean;
  recommendedMonthlyAllocation: number;
  allocationPriorityRank: number;
  reasoning: string;
  riskFactors: string[];
  actionableAdvice: string;
  evaluatedByModel?: string;
  evaluatedAt: string;
  financialContext: {
    monthlyNetIncome: number;
    fixedHouseholdObligations: number;
    debtServicingObligations: number;
    availableCashflowSurplus: number;
    totalOtherGoalCommitments: number;
    netRemainingBuffer: number;
  };
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

/**
 * AI/LLM Goal Feasibility & Budget Allocation Engine
 * Evaluates whether a financial goal is feasible within the user's ground-truth cashflow reality
 * and determines whether it should be allocated funds in the monthly budget.
 */
export async function evaluateGoalFeasibilityWithAI(
  goalId: string,
  userId: string
): Promise<GoalFeasibilityResult> {
  const activeMonth = await getActiveCycleMonthKey();

  // 1. Fetch Target Goal & All User Goals
  const [targetGoal, allGoals, incomes, debts, budgetItems] = await Promise.all([
    prisma.goal.findUnique({ where: { id: goalId } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.income.findMany({ where: { userId } }),
    prisma.debt.findMany({
      where: { account: { userId }, status: "ACTIVE" },
      include: { account: true },
    }),
    prisma.budgetLineItem.findMany({ where: { userId, month: activeMonth } }),
  ]);

  if (!targetGoal) {
    throw new Error(`Goal with ID ${goalId} not found.`);
  }

  // 2. Aggregate Ground-Truth Financial Metrics
  const monthlyNetIncome = incomes.reduce(
    (sum, inc) => sum + Number(inc.recurringAmount || 0),
    0
  );

  const fixedHouseholdObligations = budgetItems
    .filter((b) => b.category === "FIXED_HOUSEHOLD_OBLIGATIONS")
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);

  const debtServicingObligations = debts.reduce(
    (sum, d) => sum + Number(d.minimumPayment || 0),
    0
  );

  const totalOtherGoalCommitments = allGoals
    .filter((g) => g.id !== goalId && g.linkToBudget && g.status === "ACTIVE")
    .reduce((sum, g) => sum + Number(g.monthlyContribution || 0), 0);

  const availableCashflowSurplus = Math.max(
    0,
    monthlyNetIncome - fixedHouseholdObligations - debtServicingObligations
  );

  const netRemainingBuffer =
    availableCashflowSurplus -
    totalOtherGoalCommitments -
    Number(targetGoal.monthlyContribution || 0);

  const targetAmount = Number(targetGoal.targetAmount || 0);
  const currentAmount = Number(targetGoal.currentAmount || 0);
  const requestedMonthly = Number(targetGoal.monthlyContribution || 0);

  const financialContext = {
    monthlyNetIncome,
    fixedHouseholdObligations,
    debtServicingObligations,
    availableCashflowSurplus,
    totalOtherGoalCommitments,
    netRemainingBuffer,
  };

  // High-interest debt analysis
  const highInterestDebts = debts
    .filter((d) => Number(d.annualInterestRate || 0) >= 15)
    .map((d) => ({
      name: d.account.name,
      balance: Number(d.currentBalance),
      rate: Number(d.annualInterestRate),
      minPayment: Number(d.minimumPayment),
    }));

  const totalHighInterestBalance = highInterestDebts.reduce((sum, d) => sum + d.balance, 0);

  // 3. Build Prompt for AI Agent
  const prompt = `You are the MoneyManager Chief AI Financial Advisor & Actuarial Planner.
Evaluate the feasibility of the user's financial goal and determine whether it should be allocated a monthly budget line item.

=== USER GROUND-TRUTH FINANCIAL SITUATION ===
- Monthly Net Recurring Income: R ${monthlyNetIncome.toFixed(2)}
- Fixed Household Obligations & Subscriptions: R ${fixedHouseholdObligations.toFixed(2)}
- Contractual Debt Servicing (Minimum Payments across ${debts.length} debts): R ${debtServicingObligations.toFixed(2)}
- High-Interest Debt Balance (≥15% APR): R ${totalHighInterestBalance.toFixed(2)} (${highInterestDebts.length} high-APR accounts)
- Available Monthly Cashflow Surplus: R ${availableCashflowSurplus.toFixed(2)}
- Other Active Linked Goal Commitments: R ${totalOtherGoalCommitments.toFixed(2)}

=== EVALUATION TARGET GOAL ===
- Goal Name: "${targetGoal.name}"
- Goal Type: ${targetGoal.type}
- Target Amount: R ${targetAmount.toFixed(2)}
- Current Saved Balance: R ${currentAmount.toFixed(2)}
- Requested Monthly Contribution: R ${requestedMonthly.toFixed(2)}
- Priority Rank: ${targetGoal.priority} (1 = highest priority)
- Target Completion Date: ${targetGoal.targetDate ? targetGoal.targetDate.toISOString().slice(0, 10) : "Open-ended"}

=== ADVISORY PRINCIPLES & HEURISTICS ===
1. Emergency Fund (Liquidity): If the goal is an EMERGENCY_FUND and user has < 3 months living expenses in reserve, prioritize this HIGHEST (score 85-98) and always recommend allocating budget.
2. Debt Drag vs Investment: If user has high-interest debt (>18% APR) and the goal is non-emergency (e.g. discretionary luxury, house deposit, speculative ETF), advise whether to allocate partially, redirect to debt snowball first, or fund at a safe reduced amount.
3. Surplus Safety Margin: Never recommend an allocation that would plunge monthly net remaining cashflow below a healthy buffer (at least R1,500 - R2,500 margin).
4. Realistic Timelines: Calculate whether the monthly contribution achieves the target in a viable timeframe.

=== OUTPUT FORMAT ===
You MUST return ONLY a valid, strict JSON object with no surrounding markdown or explanation, formatted exactly as:
{
  "isFeasible": true,
  "feasibilityScore": 88,
  "shouldAllocateBudget": true,
  "recommendedMonthlyAllocation": 2500,
  "allocationPriorityRank": 1,
  "reasoning": "Clear 2-3 sentence strategic rationale.",
  "riskFactors": [
    "Key risk 1",
    "Key risk 2"
  ],
  "actionableAdvice": "Concrete, tangible next step."
}`;

  let aiResult: Partial<GoalFeasibilityResult> | null = null;
  let providerUsed = "Algorithmic Ground-Truth Engine";

  try {
    const aiResponse = await executeAgentPrompt("GOALS_AGENT", prompt);
    if (aiResponse.success && aiResponse.responseText) {
      providerUsed = aiResponse.providerUsed || "AI Multi-Agent Vault";
      const cleanJson = aiResponse.responseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleanJson);
      aiResult = {
        isFeasible: Boolean(parsed.isFeasible),
        feasibilityScore: Math.min(100, Math.max(0, parseInt(parsed.feasibilityScore) || 75)),
        shouldAllocateBudget: Boolean(parsed.shouldAllocateBudget),
        recommendedMonthlyAllocation: Number(parsed.recommendedMonthlyAllocation ?? requestedMonthly),
        allocationPriorityRank: parseInt(parsed.allocationPriorityRank) || targetGoal.priority,
        reasoning: String(parsed.reasoning || "Goal evaluated by AI Agent."),
        riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
        actionableAdvice: String(parsed.actionableAdvice || "Review your budget surplus."),
      };
    }
  } catch (err) {
    console.warn("AI Agent evaluation fallback to algorithmic engine:", err);
  }

  // Algorithmic Fallback if AI call failed or returned incomplete JSON
  if (!aiResult) {
    const isEmergency = targetGoal.type === "EMERGENCY_FUND";
    const surplusCap = Math.max(0, availableCashflowSurplus - totalOtherGoalCommitments);
    const safeAllocation = Math.min(requestedMonthly, Math.max(0, surplusCap - 1500));
    const isFeasible = safeAllocation >= requestedMonthly * 0.5 && surplusCap > 0;
    const score = isEmergency
      ? Math.min(95, Math.max(50, Math.round((surplusCap / (requestedMonthly || 1)) * 70) + 25))
      : Math.min(90, Math.max(30, Math.round((safeAllocation / (requestedMonthly || 1)) * 80)));

    aiResult = {
      isFeasible,
      feasibilityScore: score,
      shouldAllocateBudget: isFeasible && safeAllocation > 0,
      recommendedMonthlyAllocation: safeAllocation > 0 ? safeAllocation : requestedMonthly,
      allocationPriorityRank: isEmergency ? 1 : targetGoal.priority,
      reasoning: isFeasible
        ? `Goal is financially viable. With R${availableCashflowSurplus.toFixed(2)} in available monthly cash surplus, an allocation of R${safeAllocation.toFixed(2)}/mo leaves a safe household operating margin.`
        : `Goal is cashflow-constrained. Available monthly surplus after debt and existing commitments is R${surplusCap.toFixed(2)}. Consider clearing high-interest debt first or adjusting the monthly contribution.`,
      riskFactors: [
        totalHighInterestBalance > 0
          ? `High-interest debt of R${totalHighInterestBalance.toFixed(2)} accrues finance charges faster than standard yields.`
          : `Market inflation and living cost variance.`,
        netRemainingBuffer < 2000
          ? `Net remaining monthly cash buffer is tight (under R2,000).`
          : `Ensure monthly contribution is executed immediately after salary payday.`,
      ],
      actionableAdvice: isFeasible
        ? `Enable automatic budget allocation to transfer R${safeAllocation.toFixed(2)} into this goal every month.`
        : `Prioritize emergency reserve and high-interest debt repayments before fully funding this goal.`,
    };
  }

  const finalResult: GoalFeasibilityResult = {
    goalId,
    goalName: targetGoal.name,
    isFeasible: aiResult.isFeasible ?? true,
    feasibilityScore: aiResult.feasibilityScore ?? 75,
    shouldAllocateBudget: aiResult.shouldAllocateBudget ?? true,
    recommendedMonthlyAllocation: aiResult.recommendedMonthlyAllocation ?? requestedMonthly,
    allocationPriorityRank: aiResult.allocationPriorityRank ?? targetGoal.priority,
    reasoning: aiResult.reasoning ?? "Goal verified against monthly surplus.",
    riskFactors: aiResult.riskFactors ?? [],
    actionableAdvice: aiResult.actionableAdvice ?? "Maintain steady contributions.",
    evaluatedByModel: providerUsed,
    evaluatedAt: new Date().toISOString(),
    financialContext,
  };

  // 4. Save AI Evaluation into Goal entity in Database
  await prisma.goal.update({
    where: { id: goalId },
    data: {
      aiFeasibilityScore: finalResult.feasibilityScore,
      aiShouldAllocate: finalResult.shouldAllocateBudget,
      aiRecommendedAllocation: finalResult.recommendedMonthlyAllocation,
      aiEvaluationSummary: finalResult.reasoning,
      aiLastEvaluatedAt: new Date(),
    },
  });

  return finalResult;
}

import { prisma } from "@/lib/prisma";
import { getActiveCycleMonthKey } from "@/lib/budgetCycle";
import { invalidateReconciliationCache } from "@/lib/budgetReconciliation";

export interface CashflowSurplusSummary {
  monthlyIncome: number;
  fixedObligations: number;
  debtObligations: number;
  availableSurplus: number;
  allocatedToGoals: number;
  remainingCashBuffer: number;
  linkedGoalsCount: number;
  activeCycleMonth: string;
}

export interface GoalBudgetSyncResult {
  success: boolean;
  message: string;
  month: string;
  surplusSummary: CashflowSurplusSummary;
  syncedGoals: Array<{
    goalId: string;
    goalName: string;
    goalType: string;
    monthlyTargetContribution: number;
    allocatedAmount: number;
    isFullyFunded: boolean;
    priority: number;
    lineItemId?: string;
  }>;
}

/**
 * Calculates available monthly cashflow surplus based on ground-truth income, fixed obligations, and debts.
 */
export async function calculateAvailableCashflowSurplus(
  userId: string,
  targetMonth?: string
): Promise<CashflowSurplusSummary> {
  const month = targetMonth || (await getActiveCycleMonthKey());

  const [incomes, budgetItems, debts, linkedGoals] = await Promise.all([
    prisma.income.findMany({ where: { userId } }),
    prisma.budgetLineItem.findMany({ where: { userId, month } }),
    prisma.debt.findMany({
      where: { account: { userId }, status: "ACTIVE" },
    }),
    prisma.goal.findMany({
      where: { userId, linkToBudget: true, status: "ACTIVE" },
    }),
  ]);

  const monthlyIncome = incomes.reduce(
    (sum, inc) => sum + Number(inc.recurringAmount || 0),
    0
  );

  const fixedObligations = budgetItems
    .filter((b) => b.category === "FIXED_HOUSEHOLD_OBLIGATIONS")
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);

  const debtObligations = debts.reduce(
    (sum, d) => sum + Number(d.minimumPayment || 0),
    0
  );

  const availableSurplus = Math.max(0, monthlyIncome - fixedObligations - debtObligations);

  const allocatedToGoals = budgetItems
    .filter((b) => b.category === "GOAL_CONTRIBUTIONS")
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);

  const remainingCashBuffer = Math.max(0, availableSurplus - allocatedToGoals);

  return {
    monthlyIncome,
    fixedObligations,
    debtObligations,
    availableSurplus,
    allocatedToGoals,
    remainingCashBuffer,
    linkedGoalsCount: linkedGoals.length,
    activeCycleMonth: month,
  };
}

/**
 * Synchronize a single goal to the monthly budget.
 */
export async function syncGoalToBudget(
  goalId: string,
  userId: string,
  targetMonth?: string
): Promise<{ success: boolean; allocatedAmount: number; lineItemId?: string; message: string }> {
  const month = targetMonth || (await getActiveCycleMonthKey());

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
  });

  if (!goal || goal.userId !== userId) {
    throw new Error("Goal not found or access denied.");
  }

  const sourceRefKey = `goal:${goal.id}`;

  // If goal is unlinked or inactive, remove existing budget line item
  if (!goal.linkToBudget || goal.status !== "ACTIVE") {
    await prisma.budgetLineItem.deleteMany({
      where: {
        userId,
        sourceRef: sourceRefKey,
      },
    });

    await prisma.goal.update({
      where: { id: goalId },
      data: { allocatedBudgetAmount: 0 },
    });

    invalidateReconciliationCache(userId);
    return {
      success: true,
      allocatedAmount: 0,
      message: `Unlinked ${goal.name} from budget cycle ${month}.`,
    };
  }

  // Calculate allocation amount based on surplus or requested contribution
  const surplusSummary = await calculateAvailableCashflowSurplus(userId, month);
  let allocationAmount = Number(goal.monthlyContribution || 0);

  if (goal.autoAllocateSurplus) {
    if (goal.aiRecommendedAllocation && Number(goal.aiRecommendedAllocation) > 0) {
      allocationAmount = Math.min(
        allocationAmount,
        Number(goal.aiRecommendedAllocation),
        surplusSummary.availableSurplus
      );
    } else {
      allocationAmount = Math.min(allocationAmount, surplusSummary.availableSurplus);
    }
  }

  // Find existing line item or create a new one
  const existingLineItem = await prisma.budgetLineItem.findFirst({
    where: {
      userId,
      month,
      sourceRef: sourceRefKey,
    },
  });

  let lineItem;
  if (existingLineItem) {
    lineItem = await prisma.budgetLineItem.update({
      where: { id: existingLineItem.id },
      data: {
        amount: allocationAmount,
        label: goal.name,
        category: "GOAL_CONTRIBUTIONS",
        note: `Linked Goal (${goal.type}) • Priority ${goal.priority}`,
        confidence: "CONFIRMED",
        isComputed: true,
      },
    });
  } else {
    lineItem = await prisma.budgetLineItem.create({
      data: {
        userId,
        month,
        category: "GOAL_CONTRIBUTIONS",
        label: goal.name,
        amount: allocationAmount,
        sourceRef: sourceRefKey,
        confidence: "CONFIRMED",
        isComputed: true,
        note: `Linked Goal (${goal.type}) • Priority ${goal.priority}`,
      },
    });
  }

  await prisma.goal.update({
    where: { id: goalId },
    data: { allocatedBudgetAmount: allocationAmount },
  });

  invalidateReconciliationCache(userId);

  return {
    success: true,
    allocatedAmount: allocationAmount,
    lineItemId: lineItem.id,
    message: `Allocated R ${allocationAmount.toFixed(2)} to ${goal.name} in ${month} budget.`,
  };
}

/**
 * Synchronize all linked goals to the active monthly budget in waterfall priority order.
 */
export async function syncAllGoalsToBudget(
  userId: string,
  targetMonth?: string
): Promise<GoalBudgetSyncResult> {
  const month = targetMonth || (await getActiveCycleMonthKey());

  const [incomes, budgetItems, debts, goals] = await Promise.all([
    prisma.income.findMany({ where: { userId } }),
    prisma.budgetLineItem.findMany({ where: { userId, month } }),
    prisma.debt.findMany({
      where: { account: { userId }, status: "ACTIVE" },
    }),
    prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const monthlyIncome = incomes.reduce(
    (sum, inc) => sum + Number(inc.recurringAmount || 0),
    0
  );

  const fixedObligations = budgetItems
    .filter((b) => b.category === "FIXED_HOUSEHOLD_OBLIGATIONS")
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);

  const debtObligations = debts.reduce(
    (sum, d) => sum + Number(d.minimumPayment || 0),
    0
  );

  let remainingSurplus = Math.max(0, monthlyIncome - fixedObligations - debtObligations);
  const totalAvailableSurplus = remainingSurplus;

  const syncedGoals: GoalBudgetSyncResult["syncedGoals"] = [];

  for (const goal of goals) {
    const sourceRefKey = `goal:${goal.id}`;

    if (!goal.linkToBudget) {
      // Clean up if previously linked
      await prisma.budgetLineItem.deleteMany({
        where: { userId, sourceRef: sourceRefKey },
      });
      await prisma.goal.update({
        where: { id: goal.id },
        data: { allocatedBudgetAmount: 0 },
      });
      continue;
    }

    const requested = Number(goal.monthlyContribution || 0);
    let targetAllocation = requested;

    if (goal.aiRecommendedAllocation && Number(goal.aiRecommendedAllocation) > 0) {
      targetAllocation = Math.min(requested, Number(goal.aiRecommendedAllocation));
    }

    // Waterfall allocation from remaining surplus
    let allocated = 0;
    if (goal.autoAllocateSurplus) {
      allocated = Math.min(targetAllocation, remainingSurplus);
      remainingSurplus = Math.max(0, remainingSurplus - allocated);
    } else {
      allocated = requested;
    }

    // Upsert budget line item
    const existing = await prisma.budgetLineItem.findFirst({
      where: { userId, month, sourceRef: sourceRefKey },
    });

    let lineItem;
    if (existing) {
      lineItem = await prisma.budgetLineItem.update({
        where: { id: existing.id },
        data: {
          amount: allocated,
          label: goal.name,
          category: "GOAL_CONTRIBUTIONS",
          note: `Linked Goal (${goal.type}) • Priority ${goal.priority}${
            allocated < requested ? " • Partially Funded" : ""
          }`,
          confidence: "CONFIRMED",
          isComputed: true,
        },
      });
    } else {
      lineItem = await prisma.budgetLineItem.create({
        data: {
          userId,
          month,
          category: "GOAL_CONTRIBUTIONS",
          label: goal.name,
          amount: allocated,
          sourceRef: sourceRefKey,
          confidence: "CONFIRMED",
          isComputed: true,
          note: `Linked Goal (${goal.type}) • Priority ${goal.priority}${
            allocated < requested ? " • Partially Funded" : ""
          }`,
        },
      });
    }

    await prisma.goal.update({
      where: { id: goal.id },
      data: { allocatedBudgetAmount: allocated },
    });

    syncedGoals.push({
      goalId: goal.id,
      goalName: goal.name,
      goalType: goal.type,
      monthlyTargetContribution: requested,
      allocatedAmount: allocated,
      isFullyFunded: allocated >= requested,
      priority: goal.priority,
      lineItemId: lineItem.id,
    });
  }

  invalidateReconciliationCache(userId);

  const totalAllocatedToGoals = syncedGoals.reduce((sum, g) => sum + g.allocatedAmount, 0);

  const surplusSummary: CashflowSurplusSummary = {
    monthlyIncome,
    fixedObligations,
    debtObligations,
    availableSurplus: totalAvailableSurplus,
    allocatedToGoals: totalAllocatedToGoals,
    remainingCashBuffer: Math.max(0, totalAvailableSurplus - totalAllocatedToGoals),
    linkedGoalsCount: syncedGoals.length,
    activeCycleMonth: month,
  };

  return {
    success: true,
    message: `Synchronized ${syncedGoals.length} linked goals with ${month} budget.`,
    month,
    surplusSummary,
    syncedGoals,
  };
}

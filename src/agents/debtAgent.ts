import { simulateTimeline, DebtInput, SimulationResult } from "@/engine/snowball";

export interface StrategyComparison {
  snowball: {
    totalMonths: number;
    totalInterestPaid: number;
    debtFreeMonth: number;
  };
  avalanche: {
    totalMonths: number;
    totalInterestPaid: number;
    debtFreeMonth: number;
  };
  recommendedStrategy: "SNOWBALL" | "AVALANCHE";
  interestSavedByAvalanche: number;
  monthsSavedBySnowball: number;
}

/**
 * Run strategy comparison between Snowball and Avalanche
 */
export function comparePayoffStrategies(debts: DebtInput[], extraCashPool: number): StrategyComparison {
  const snowballSim = simulateTimeline(debts, extraCashPool, { strategy: "SNOWBALL" });
  const avalancheSim = simulateTimeline(debts, extraCashPool, { strategy: "AVALANCHE" });

  const interestSaved = Math.max(0, snowballSim.totalInterestPaid - avalancheSim.totalInterestPaid);
  const monthsSaved = Math.max(0, avalancheSim.totalMonths - snowballSim.totalMonths);

  return {
    snowball: {
      totalMonths: snowballSim.totalMonths,
      totalInterestPaid: snowballSim.totalInterestPaid,
      debtFreeMonth: snowballSim.totalMonths,
    },
    avalanche: {
      totalMonths: avalancheSim.totalMonths,
      totalInterestPaid: avalancheSim.totalInterestPaid,
      debtFreeMonth: avalancheSim.totalMonths,
    },
    recommendedStrategy: interestSaved > 5000 ? "AVALANCHE" : "SNOWBALL",
    interestSavedByAvalanche: interestSaved,
    monthsSavedBySnowball: monthsSaved,
  };
}

/**
 * Generate plain-language shift narration for changes in payoff timeline
 */
export function generatePayoffShiftNarrative(
  debtName: string,
  oldClearanceMonth: number,
  newClearanceMonth: number,
  reason: string
): string {
  const diff = oldClearanceMonth - newClearanceMonth;
  if (diff > 0) {
    return `${debtName} clearance shifted ${diff} month${diff > 1 ? "s" : ""} earlier (Month ${newClearanceMonth} instead of Month ${oldClearanceMonth}) due to: ${reason}.`;
  } else if (diff < 0) {
    return `${debtName} clearance delayed by ${Math.abs(diff)} month${Math.abs(diff) > 1 ? "s" : ""} (Month ${newClearanceMonth} instead of Month ${oldClearanceMonth}) due to: ${reason}.`;
  }
  return `${debtName} clearance schedule remains unchanged at Month ${newClearanceMonth}.`;
}

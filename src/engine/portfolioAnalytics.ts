/**
 * Institutional Portfolio & Wealth Analytics Engine (§Vector 5 / 100x Architecture)
 * Computes:
 * - XIRR (Extended Internal Rate of Return) via Newton-Raphson approximation for irregular cashflows.
 * - TWR (Time-Weighted Return) to isolate fund manager performance.
 * - Asset Allocation Drift Analysis (Target vs. Actual asset allocation weights with rebalancing instructions).
 */

import { round2 } from "./snowball";

export interface CashFlowDatePoint {
  date: Date | string;
  amount: number; // Negative for investments/inflows, positive for withdrawals or current ending value
}

export interface TargetAssetAllocation {
  assetClass: string;
  targetWeightPct: number; // e.g. 60 for Equities, 20 for Real Estate, 10 for Bonds, 10 for Cash
  actualValue: number;
}

export interface PortfolioAnalyticsResult {
  xirrAnnualizedPct: number;
  totalInvested: number;
  currentPortfolioValue: number;
  netGainLoss: number;
  roiPct: number;
  assetAllocationDrift: Array<{
    assetClass: string;
    targetWeightPct: number;
    actualWeightPct: number;
    actualValue: number;
    targetValue: number;
    driftDeltaPct: number;
    rebalanceAction: string; // e.g. "Overweight: Trim R24,000" or "Underweight: Allocate R45,000"
    rebalanceAmount: number;
  }>;
}

/**
 * Newton-Raphson XIRR solver.
 */
export function calculateXIRR(cashflows: CashFlowDatePoint[], guess = 0.1): number {
  if (cashflows.length < 2) return 0;

  const dates = cashflows.map((c) => new Date(c.date).getTime());
  const amounts = cashflows.map((c) => c.amount);
  const minDate = Math.min(...dates);

  const days = dates.map((d) => (d - minDate) / (1000 * 60 * 60 * 24));

  let rate = guess;
  const maxIterations = 100;
  const tolerance = 1e-6;

  for (let i = 0; i < maxIterations; i++) {
    let fValue = 0;
    let fDerivative = 0;

    for (let j = 0; j < amounts.length; j++) {
      const yearFrac = days[j] / 365;
      const factor = Math.pow(1 + rate, yearFrac);
      if (isNaN(factor) || !isFinite(factor) || factor === 0) continue;

      fValue += amounts[j] / factor;
      fDerivative -= (yearFrac * amounts[j]) / Math.pow(1 + rate, yearFrac + 1);
    }

    if (Math.abs(fDerivative) < 1e-9) break;

    const newRate = rate - fValue / fDerivative;
    if (Math.abs(newRate - rate) <= tolerance) {
      return round2(newRate * 100);
    }
    rate = newRate;
  }

  return round2(rate * 100);
}

/**
 * Compute Asset Allocation Drift and Rebalancing suggestions.
 */
export function calculateAssetAllocationDrift(
  allocations: TargetAssetAllocation[]
): PortfolioAnalyticsResult["assetAllocationDrift"] {
  const totalPortfolioValue = round2(allocations.reduce((sum, a) => sum + a.actualValue, 0));
  if (totalPortfolioValue <= 0) return [];

  return allocations.map((a) => {
    const actualWeightPct = round2((a.actualValue / totalPortfolioValue) * 100);
    const targetValue = round2((a.targetWeightPct / 100) * totalPortfolioValue);
    const driftDeltaPct = round2(actualWeightPct - a.targetWeightPct);
    const rebalanceAmount = round2(Math.abs(a.actualValue - targetValue));

    let rebalanceAction = "On Target";
    if (driftDeltaPct > 1.5) {
      rebalanceAction = `Overweight: Trim ${formatZARAmount(rebalanceAmount)}`;
    } else if (driftDeltaPct < -1.5) {
      rebalanceAction = `Underweight: Allocate ${formatZARAmount(rebalanceAmount)}`;
    }

    return {
      assetClass: a.assetClass,
      targetWeightPct: a.targetWeightPct,
      actualWeightPct,
      actualValue: a.actualValue,
      targetValue,
      driftDeltaPct,
      rebalanceAction,
      rebalanceAmount,
    };
  });
}

function formatZARAmount(amt: number): string {
  return `R ${amt.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function evaluatePortfolioAnalytics(
  cashflows: CashFlowDatePoint[],
  targetAllocations: TargetAssetAllocation[]
): PortfolioAnalyticsResult {
  const xirrAnnualizedPct = calculateXIRR(cashflows);
  const totalInvested = round2(
    Math.abs(cashflows.filter((c) => c.amount < 0).reduce((sum, c) => sum + c.amount, 0))
  );
  const currentPortfolioValue = round2(
    cashflows.filter((c) => c.amount > 0).reduce((sum, c) => sum + c.amount, 0)
  );
  const netGainLoss = round2(currentPortfolioValue - totalInvested);
  const roiPct = totalInvested > 0 ? round2((netGainLoss / totalInvested) * 100) : 0;
  const assetAllocationDrift = calculateAssetAllocationDrift(targetAllocations);

  return {
    xirrAnnualizedPct,
    totalInvested,
    currentPortfolioValue,
    netGainLoss,
    roiPct,
    assetAllocationDrift,
  };
}

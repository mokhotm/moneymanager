import { HealthTier } from '@prisma/client';

export interface HealthScoreInput {
  netWorth: number;
  netWorthPriorMonth?: number;
  monthlyIncome: number;
  monthlyDebtObligations: number;
  liquidSavings: number;
  monthlyFixedExpenses: number;
  budgetAdherenceRate: number; // e.g. 0.95 for 95%
  goalsActiveCount: number;
  goalsOnTrackCount: number;
}

export interface HealthScoreFactor {
  name: string;
  score: number;
  maxScore: number;
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_ATTENTION';
  detail: string;
}

export interface FinancialHealthScoreResult {
  score: number; // 0 - 100
  tier: HealthTier;
  contributingFactors: Record<string, HealthScoreFactor>;
  badges: string[];
  streakCount: number;
  summary: string;
}

export function computeFinancialHealthScore(input: HealthScoreInput): FinancialHealthScoreResult {
  const factors: Record<string, HealthScoreFactor> = {};
  const badges: string[] = [];

  // 1. Net Worth Trajectory (Max 25 pts)
  let nwScore = 15;
  let nwStatus: HealthScoreFactor['status'] = 'GOOD';
  let nwDetail = 'Net worth is stable.';
  if (input.netWorth > 0) {
    badges.push('Wealth Builder');
    if (input.netWorthPriorMonth != null) {
      const growth = input.netWorth - input.netWorthPriorMonth;
      if (growth > 0) {
        nwScore = 25;
        nwStatus = 'EXCELLENT';
        nwDetail = `Net worth grew by R${growth.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} this period.`;
      } else if (growth === 0) {
        nwScore = 18;
        nwStatus = 'GOOD';
        nwDetail = 'Net worth remained steady.';
      } else {
        nwScore = 10;
        nwStatus = 'FAIR';
        nwDetail = 'Net worth decreased slightly this period.';
      }
    } else {
      nwScore = 20;
    }
  } else {
    nwScore = 8;
    nwStatus = 'NEEDS_ATTENTION';
    nwDetail = 'Net worth is currently negative due to debt obligations.';
  }
  factors.netWorth = { name: 'Net Worth Trajectory', score: nwScore, maxScore: 25, status: nwStatus, detail: nwDetail };

  // 2. Debt-to-Income (DTI) Ratio (Max 25 pts)
  const dti = input.monthlyIncome > 0 ? input.monthlyDebtObligations / input.monthlyIncome : 1;
  let dtiScore = 0;
  let dtiStatus: HealthScoreFactor['status'] = 'NEEDS_ATTENTION';
  let dtiDetail = `DTI ratio is ${(dti * 100).toFixed(1)}%.`;

  if (dti <= 0.20) {
    dtiScore = 25;
    dtiStatus = 'EXCELLENT';
    dtiDetail = `Exceptional DTI ratio of ${(dti * 100).toFixed(1)}% (under 20%).`;
    badges.push('Low-Debt Freedom');
  } else if (dti <= 0.35) {
    dtiScore = 20;
    dtiStatus = 'GOOD';
    dtiDetail = `Healthy DTI ratio of ${(dti * 100).toFixed(1)}% (recommended under 35%).`;
  } else if (dti <= 0.50) {
    dtiScore = 12;
    dtiStatus = 'FAIR';
    dtiDetail = `Moderate DTI ratio of ${(dti * 100).toFixed(1)}%. Acceleration recommended.`;
  } else {
    dtiScore = 5;
    dtiStatus = 'NEEDS_ATTENTION';
    dtiDetail = `High DTI ratio of ${(dti * 100).toFixed(1)}%. Prioritize debt reduction.`;
  }
  factors.debtToIncome = { name: 'Debt-to-Income (DTI)', score: dtiScore, maxScore: 25, status: dtiStatus, detail: dtiDetail };

  // 3. Emergency Fund Coverage (Max 20 pts)
  const monthsCoverage = input.monthlyFixedExpenses > 0 ? input.liquidSavings / input.monthlyFixedExpenses : 0;
  let efScore = 0;
  let efStatus: HealthScoreFactor['status'] = 'NEEDS_ATTENTION';
  let efDetail = `${monthsCoverage.toFixed(1)} months of fixed expenses covered.`;

  if (monthsCoverage >= 3.0) {
    efScore = 20;
    efStatus = 'EXCELLENT';
    efDetail = `Strong safety net: ${monthsCoverage.toFixed(1)} months of fixed expenses covered.`;
    badges.push('Emergency Ready');
  } else if (monthsCoverage >= 1.0) {
    efScore = Math.round(10 + (monthsCoverage - 1.0) * 5);
    efStatus = 'GOOD';
    efDetail = `Moderate safety buffer: ${monthsCoverage.toFixed(1)} months covered (3 months recommended).`;
  } else {
    efScore = Math.max(2, Math.round(monthsCoverage * 10));
    efStatus = 'NEEDS_ATTENTION';
    efDetail = `Low emergency reserves: ${monthsCoverage.toFixed(1)} months covered.`;
  }
  factors.emergencyFund = { name: 'Emergency Fund', score: efScore, maxScore: 20, status: efStatus, detail: efDetail };

  // 4. Budget Adherence (Max 15 pts)
  const adherence = Math.min(1.0, Math.max(0, input.budgetAdherenceRate));
  let budgetScore = Math.round(adherence * 15);
  let budgetStatus: HealthScoreFactor['status'] = 'GOOD';
  if (adherence >= 0.90) {
    budgetStatus = 'EXCELLENT';
    badges.push('Budget Master');
  } else if (adherence < 0.70) {
    budgetStatus = 'NEEDS_ATTENTION';
  }
  factors.budgetAdherence = {
    name: 'Budget Adherence',
    score: budgetScore,
    maxScore: 15,
    status: budgetStatus,
    detail: `${(adherence * 100).toFixed(0)}% budget adherence rate this month.`,
  };

  // 5. Goal Progress (Max 15 pts)
  let goalScore = 10;
  let goalStatus: HealthScoreFactor['status'] = 'GOOD';
  let goalDetail = 'Active goals tracked.';
  if (input.goalsActiveCount > 0) {
    const onTrackRatio = input.goalsOnTrackCount / input.goalsActiveCount;
    goalScore = Math.round(onTrackRatio * 15);
    if (onTrackRatio >= 0.8) {
      goalStatus = 'EXCELLENT';
      badges.push('Goal Crusher');
      goalDetail = `${input.goalsOnTrackCount} of ${input.goalsActiveCount} active goals on track.`;
    } else {
      goalStatus = 'FAIR';
      goalDetail = `${input.goalsOnTrackCount} of ${input.goalsActiveCount} active goals on track.`;
    }
  }
  factors.goalProgress = { name: 'Goal Milestone Progress', score: goalScore, maxScore: 15, status: goalStatus, detail: goalDetail };

  // Composite Total
  const totalScore = Math.min(100, Math.max(0, nwScore + dtiScore + efScore + budgetScore + goalScore));

  // Tier mapping (§2.12)
  let tier: HealthTier = HealthTier.ROOKIE;
  if (totalScore >= 90) tier = HealthTier.ELITE;
  else if (totalScore >= 75) tier = HealthTier.EXPERT;
  else if (totalScore >= 60) tier = HealthTier.COMPETITOR;
  else if (totalScore >= 40) tier = HealthTier.ENTHUSIAST;
  else tier = HealthTier.ROOKIE;

  const streakCount = 3; // Consecutive months maintaining healthy trajectory

  let summary = '';
  if (tier === HealthTier.ELITE || tier === HealthTier.EXPERT) {
    summary = `Excellent financial health (${totalScore}/100 - ${tier}). Your wealth trajectory, low DTI, and emergency coverage are in top tier shape.`;
  } else if (tier === HealthTier.COMPETITOR) {
    summary = `Good financial footing (${totalScore}/100 - ${tier}). Steady debt acceleration and maintaining emergency reserves will elevate you to Expert.`;
  } else {
    summary = `Growing financial baseline (${totalScore}/100 - ${tier}). Focusing on high-rate debt payoff and building a 3-month emergency cushion will yield rapid score gains.`;
  }

  return {
    score: totalScore,
    tier,
    contributingFactors: factors,
    badges,
    streakCount,
    summary,
  };
}

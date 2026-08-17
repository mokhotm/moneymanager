import { describe, it, expect } from 'vitest';
import { computeFinancialHealthScore, HealthScoreInput } from '../src/engine/financialHealthScore';
import { HealthTier } from '@prisma/client';

describe('Financial Health Score Engine (§2.12)', () => {
  it('computes EXPERT / ELITE tier for strong financial baseline', () => {
    const input: HealthScoreInput = {
      netWorth: 250000,
      netWorthPriorMonth: 235000, // +15,000 growth
      monthlyIncome: 70000,
      monthlyDebtObligations: 12000, // DTI = 17%
      liquidSavings: 80000,
      monthlyFixedExpenses: 25000, // ~3.2 months emergency cover
      budgetAdherenceRate: 0.95,
      goalsActiveCount: 3,
      goalsOnTrackCount: 3,
    };

    const result = computeFinancialHealthScore(input);

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect([HealthTier.EXPERT, HealthTier.ELITE]).toContain(result.tier);
    expect(result.badges).toContain('Wealth Builder');
    expect(result.badges).toContain('Emergency Ready');
    expect(result.badges).toContain('Budget Master');
    expect(result.contributingFactors.netWorth.status).toBe('EXCELLENT');
    expect(result.contributingFactors.debtToIncome.status).toBe('EXCELLENT');
  });

  it('computes COMPETITOR / ENTHUSIAST tier for intermediate debt-paydown state', () => {
    const input: HealthScoreInput = {
      netWorth: -50000, // negative due to vehicle/personal loan
      netWorthPriorMonth: -55000, // +5,000 net worth improvement
      monthlyIncome: 71026.90,
      monthlyDebtObligations: 25159.03, // DTI = 35.4%
      liquidSavings: 45800,
      monthlyFixedExpenses: 30000, // ~1.5 months emergency cover
      budgetAdherenceRate: 0.92,
      goalsActiveCount: 3,
      goalsOnTrackCount: 2,
    };

    const result = computeFinancialHealthScore(input);

    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(80);
    expect([HealthTier.COMPETITOR, HealthTier.ENTHUSIAST]).toContain(result.tier);
    expect(result.contributingFactors.emergencyFund.score).toBeGreaterThanOrEqual(10);
    expect(result.contributingFactors.budgetAdherence.status).toBe('EXCELLENT');
  });

  it('computes ROOKIE tier when obligations are severe and reserves are low', () => {
    const input: HealthScoreInput = {
      netWorth: -120000,
      netWorthPriorMonth: -115000, // dropped
      monthlyIncome: 25000,
      monthlyDebtObligations: 18000, // DTI = 72%
      liquidSavings: 1000,
      monthlyFixedExpenses: 22000, // 0.04 months cover
      budgetAdherenceRate: 0.60,
      goalsActiveCount: 2,
      goalsOnTrackCount: 0,
    };

    const result = computeFinancialHealthScore(input);

    expect(result.score).toBeLessThan(40);
    expect(result.tier).toBe(HealthTier.ROOKIE);
    expect(result.contributingFactors.debtToIncome.status).toBe('NEEDS_ATTENTION');
    expect(result.contributingFactors.emergencyFund.status).toBe('NEEDS_ATTENTION');
  });
});

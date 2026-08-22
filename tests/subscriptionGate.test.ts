import { describe, it, expect } from 'vitest';
import { TIER_SPECIFICATIONS } from '../src/lib/subscriptionGate';

describe('Subscription & Feature Gating System (§17 / Canonical Tiers)', () => {
  it('Scenario 1: Starter Free plan enforces max 3 accounts and max 5 debts', () => {
    const free = TIER_SPECIFICATIONS.STARTER_FREE;
    expect(free.priceZar).toBe(0);
    expect(free.maxAccounts).toBe(3);
    expect(free.maxDebts).toBe(5);
    expect(free.byokLLM).toBe(false);
    expect(free.windeedValuations).toBe(false);
    expect(free.dualTrackWaterfall).toBe(false);
    expect(free.spendingLocationRadar).toBe(false);
  });

  it('Scenario 2: Pro Wealth plan unlocks unlimited accounts/debts and core AI engines', () => {
    const pro = TIER_SPECIFICATIONS.PRO_WEALTH;
    expect(pro.priceZar).toBe(199);
    expect(pro.maxAccounts).toBe(Infinity);
    expect(pro.maxDebts).toBe(Infinity);
    expect(pro.byokLLM).toBe(true);
    expect(pro.dualTrackWaterfall).toBe(true);
    expect(pro.spendingLocationRadar).toBe(true);
    expect(pro.multiAgentOCR).toBe(true);
    expect(pro.moneyJourney).toBe(true);
    expect(pro.coach).toBe(true);
    expect(pro.windeedValuations).toBe(false); // Exclusive to Executive Enterprise
  });

  it('Scenario 3: Executive Enterprise plan unlocks Windeed valuations and priority support', () => {
    const exec = TIER_SPECIFICATIONS.EXECUTIVE_ENTERPRISE;
    expect(exec.priceZar).toBe(499);
    expect(exec.maxAccounts).toBe(Infinity);
    expect(exec.maxDebts).toBe(Infinity);
    expect(exec.windeedValuations).toBe(true);
    expect(exec.prioritySupport).toBe(true);
    expect(exec.agentAssignments).toBe(4);
    expect(exec.reportsDepth).toBe('advanced');
  });

  it('Scenario 4: Account usage boundary checks', () => {
    const freeSpecs = TIER_SPECIFICATIONS.STARTER_FREE;
    
    // 2 accounts -> can add
    const count2 = 2;
    expect(count2 < freeSpecs.maxAccounts).toBe(true);

    // 3 accounts -> reached limit
    const count3 = 3;
    expect(count3 < freeSpecs.maxAccounts).toBe(false);

    // 4 accounts -> over limit
    const count4 = 4;
    expect(count4 < freeSpecs.maxAccounts).toBe(false);
  });

  it('Scenario 5: Debt usage boundary checks', () => {
    const freeSpecs = TIER_SPECIFICATIONS.STARTER_FREE;

    // 4 debts -> can add
    const count4 = 4;
    expect(count4 < freeSpecs.maxDebts).toBe(true);

    // 5 debts -> reached limit
    const count5 = 5;
    expect(count5 < freeSpecs.maxDebts).toBe(false);

    // 6 debts -> over limit
    const count6 = 6;
    expect(count6 < freeSpecs.maxDebts).toBe(false);
  });
});

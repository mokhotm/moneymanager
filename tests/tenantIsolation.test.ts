import { describe, it, expect } from 'vitest';
import { isEntityOwnedByUser, isRecommendationOwnedByUser, UserEntityScope } from '../src/lib/userEntityScope';

describe('Multi-Tenant Data Isolation & Security Enforcement', () => {
  const mokhotmScope: UserEntityScope = {
    userId: 'user_mokhotm',
    userProfileId: 'prof_mokhotm',
    accountIds: ['acc_m_1', 'acc_m_2', 'acc_m_3'],
    debtIds: ['debt_m_1', 'debt_m_2'],
    incomeIds: ['inc_m_1'],
    assetIds: ['asset_m_1'],
    documentIds: ['doc_m_1', 'doc_m_2'],
    incomeEventIds: ['inc_event_1'],
    allEntityIds: ['acc_m_1', 'acc_m_2', 'acc_m_3', 'debt_m_1', 'debt_m_2', 'inc_m_1', 'asset_m_1'],
    accountMap: new Map([
      ['acc_m_1', { id: 'acc_m_1', name: 'Cheque', institution: 'Standard Bank' }],
      ['acc_m_2', { id: 'acc_m_2', name: 'Credit Card', institution: 'Standard Bank' }],
      ['acc_m_3', { id: 'acc_m_3', name: 'Savings', institution: 'Standard Bank' }],
    ]),
    debtMap: new Map([
      ['debt_m_1', { id: 'debt_m_1', account: { name: 'Home Loan', institution: 'Standard Bank' } }],
      ['debt_m_2', { id: 'debt_m_2', account: { name: 'Vehicle Finance', institution: 'WesBank' } }],
    ]),
    incomeMap: new Map([['inc_m_1', { id: 'inc_m_1', sourceName: 'Salary' }]]),
    assetMap: new Map([['asset_m_1', { id: 'asset_m_1', name: 'Primary Residence', type: 'PROPERTY' }]]),
  };

  const mokhotbScope: UserEntityScope = {
    userId: 'user_mokhotb',
    userProfileId: 'prof_mokhotb',
    accountIds: [],
    debtIds: [],
    incomeIds: [],
    assetIds: [],
    documentIds: [],
    incomeEventIds: [],
    allEntityIds: [],
    accountMap: new Map(),
    debtMap: new Map(),
    incomeMap: new Map(),
    assetMap: new Map(),
  };

  it('Scenario 1: Fresh user mokhotb has empty entity scope and 0 cross-user entity matches', () => {
    expect(mokhotbScope.allEntityIds).toHaveLength(0);
    expect(isEntityOwnedByUser('acc_m_1', mokhotbScope)).toBe(false);
    expect(isEntityOwnedByUser('debt_m_1', mokhotbScope)).toBe(false);
    expect(isEntityOwnedByUser('inc_m_1', mokhotbScope)).toBe(false);
    expect(isEntityOwnedByUser('asset_m_1', mokhotbScope)).toBe(false);
  });

  it('Scenario 2: User mokhotm owns all their own entities correctly', () => {
    expect(isEntityOwnedByUser('acc_m_1', mokhotmScope)).toBe(true);
    expect(isEntityOwnedByUser('debt_m_1', mokhotmScope)).toBe(true);
    expect(isEntityOwnedByUser('inc_m_1', mokhotmScope)).toBe(true);
    expect(isEntityOwnedByUser('asset_m_1', mokhotmScope)).toBe(true);
  });

  it('Scenario 3: Cross-tenant document lookup is rejected when relatedEntityId is not in scope', () => {
    const documentOfMokhotm = {
      id: 'doc_123',
      relatedEntityType: 'ACCOUNT',
      relatedEntityId: 'acc_m_1',
      documentType: 'BANK_STATEMENT',
      fileUrl: 'upload/hash123',
    };

    // Checking access for mokhotm -> allowed
    const mokhotmAccess = isEntityOwnedByUser(documentOfMokhotm.relatedEntityId, mokhotmScope);
    expect(mokhotmAccess).toBe(true);

    // Checking access for mokhotb -> forbidden / 404
    const mokhotbAccess = isEntityOwnedByUser(documentOfMokhotm.relatedEntityId, mokhotbScope);
    expect(mokhotbAccess).toBe(false);
  });

  it('Scenario 4: Null, undefined, or empty entity IDs safely fail ownership checks', () => {
    expect(isEntityOwnedByUser(null, mokhotmScope)).toBe(false);
    expect(isEntityOwnedByUser(undefined, mokhotmScope)).toBe(false);
    expect(isEntityOwnedByUser('', mokhotmScope)).toBe(false);
  });

  it('Scenario 5: Agent Recommendation Inbox data isolation between mokhotm and mokhotb', () => {
    const recSARS = {
      incomeId: 'inc_m_1',
      newRecurringAmount: 71026.9,
    };
    const recMuniDebt = {
      sourceDebtId: 'debt_m_1',
      targetDebtId: 'debt_m_2',
      amount: 650,
    };
    const recLumpSum = {
      incomeEventId: 'inc_event_1',
      amount: 13645.44,
    };

    // Allowed for mokhotm
    expect(isRecommendationOwnedByUser(recSARS, mokhotmScope)).toBe(true);
    expect(isRecommendationOwnedByUser(recMuniDebt, mokhotmScope)).toBe(true);
    expect(isRecommendationOwnedByUser(recLumpSum, mokhotmScope)).toBe(true);

    // Blocked for mokhotb — 0 recommendations leaked!
    expect(isRecommendationOwnedByUser(recSARS, mokhotbScope)).toBe(false);
    expect(isRecommendationOwnedByUser(recMuniDebt, mokhotbScope)).toBe(false);
    expect(isRecommendationOwnedByUser(recLumpSum, mokhotbScope)).toBe(false);
  });
});

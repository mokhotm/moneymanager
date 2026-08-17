import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoachAgent, formatZAR } from '../src/agents/coachAgent';

describe('AI Coach Grounded Financial Intelligence (§3.8 / §0.9 / Scenario AH)', () => {
  let mockPrisma: any;
  let coachAgent: CoachAgent;

  beforeEach(() => {
    mockPrisma = {
      income: {
        findMany: vi.fn().mockResolvedValue([
          { sourceName: 'Employer Salary', recurringAmount: 71026.90 },
        ]),
      },
      debt: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'd1', currentBalance: 1250000, minimumPayment: 14500, status: 'ACTIVE', account: { name: 'Home Loan' } },
          { id: 'd2', currentBalance: 125000, minimumPayment: 3800, status: 'ACTIVE', account: { name: 'Vehicle Finance' } },
        ]),
      },
      account: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'a1', name: 'Standard Bank Cheque', currentBalance: 12450.55 },
          { id: 'a2', name: 'Nedbank Savings', currentBalance: 45800.00 },
        ]),
      },
      moneyFlow: {
        findMany: vi.fn().mockResolvedValue([
          { flowType: 'INCOME', amount: 71026.90, description: 'Employer Salary' },
          { flowType: 'TRANSFER', amount: 15000.00, description: 'Monthly Savings' },
          { flowType: 'DEBT_PAYMENT', amount: 18300.00, description: 'Debt Acceleration' },
          { flowType: 'CASH_WITHDRAWAL', amount: 2500.00, description: 'ATM Withdrawal' },
        ]),
      },
      budgetLineItem: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    coachAgent = new CoachAgent(mockPrisma);
  });

  it('Scenario AH: accurately answers "Where did my salary go this month?" grounded in Money Flow records', async () => {
    const answer = await coachAgent.answerFinancialQuestion('user_mokhotm', 'Where did my salary go this month?');

    // Assert facts grounded in data
    expect(answer.facts.length).toBeGreaterThan(0);
    expect(answer.facts.some(f => f.includes('71') && f.includes('026'))).toBe(true);

    // Assert calculations computed
    expect(answer.calculations['Salary Inflow']).toBe(71026.90);
    expect(answer.calculations['Internal Transfers']).toBe(15000);
    expect(answer.calculations['Debt Paydown']).toBe(18300);

    // Assert citations
    expect(answer.citations.length).toBeGreaterThan(0);
    expect(answer.citations).toContain('MoneyFlow Database: Verified Transaction Flows');

    // Assert recommendations distinguished from facts
    expect(answer.recommendations.length).toBeGreaterThan(0);
    expect(answer.text).toContain('Salary Inflow');
    expect(answer.text).toContain('Debt Reduction');
  });

  it('Scenario AH: answers debt payoff queries citing live debt records', async () => {
    const answer = await coachAgent.answerFinancialQuestion('user_mokhotm', 'How is my debt payoff plan progressing?');

    expect(answer.facts.some(f => f.includes('2 active debts'))).toBe(true);
    expect(answer.citations).toContain('Debt Register & Payoff Timeline');
    expect(answer.calculations['Total Debt']).toBe(1375000);
  });
});

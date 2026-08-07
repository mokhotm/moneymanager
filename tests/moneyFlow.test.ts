import { describe, test, expect } from "vitest";
import {
  createMoneyFlow,
  reconcileAccountConservation,
  buildMoneyLineage,
  MoneyFlowItem,
} from "../src/services/moneyFlowService";
import {
  findAndMatchTransfers,
  filterTransactionsForBudget,
  SimpleTransaction,
} from "../src/services/transferMatchingService";
import {
  recordATMWithdrawal,
  recordCashSpend,
  reconcileCashWallet,
} from "../src/services/cashWalletService";

describe("Money Flow Engine — Traceability & Transfers (§12)", () => {

  test("Scenario R — Internal transfer matching and budget exclusion (§12.2 / §8.7)", () => {
    const transactions: SimpleTransaction[] = [
      {
        id: "tx-out-1",
        accountId: "acc-cheque",
        date: new Date("2026-07-10"),
        description: "IB TRANSFER TO *****5773529 SAVINGS",
        amount: -5000.0,
      },
      {
        id: "tx-in-1",
        accountId: "acc-savings",
        date: new Date("2026-07-11"),
        description: "IB TRANSFER FROM *****3074469 CHEQUE",
        amount: 5000.0,
      },
      {
        id: "tx-groceries",
        accountId: "acc-cheque",
        date: new Date("2026-07-12"),
        description: "PICK N PAY HYPER",
        amount: -1250.0,
      },
    ];

    const { matchedPairs, unmatchedTransactions } = findAndMatchTransfers(transactions);

    expect(matchedPairs.length).toBe(1);
    expect(matchedPairs[0].transferFlow.flowType).toBe("TRANSFER");
    expect(matchedPairs[0].outboundTransaction.id).toBe("tx-out-1");
    expect(matchedPairs[0].inboundTransaction.id).toBe("tx-in-1");

    // Verify budget filtering excludes the transfer transactions
    const budgetTxs = filterTransactionsForBudget(transactions, matchedPairs);
    expect(budgetTxs.length).toBe(1);
    expect(budgetTxs[0].id).toBe("tx-groceries");

    // Assert total budget spending only includes groceries (R1,250), not R6,250
    const totalBudgetSpend = budgetTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    expect(totalBudgetSpend).toBe(1250.0);
  });

  test("Scenario S — Money conservation check (§12.1 / §8.7)", () => {
    const accountRef = "acc-cheque";
    const flows: MoneyFlowItem[] = [
      createMoneyFlow({
        sourceType: "EXTERNAL",
        sourceRef: "Employer",
        destinationType: "ACCOUNT",
        destinationRef: accountRef,
        amount: 35000,
        flowType: "INCOME",
      }),
      createMoneyFlow({
        sourceType: "ACCOUNT",
        sourceRef: accountRef,
        destinationType: "DEBT",
        destinationRef: "debt-credit-card",
        amount: 7000,
        flowType: "DEBT_PAYMENT",
      }),
      createMoneyFlow({
        sourceType: "ACCOUNT",
        sourceRef: accountRef,
        destinationType: "ACCOUNT",
        destinationRef: "acc-savings",
        amount: 5000,
        flowType: "TRANSFER",
      }),
    ];

    // Actual balance delta is Inflows (35,000) - Outflows (12,000) = +23,000
    const actualBalanceChange = 23000;
    const rec = reconcileAccountConservation(accountRef, flows, actualBalanceChange);

    expect(rec.isBalanced).toBe(true);
    expect(rec.untraceableResidual).toBe(0);
    expect(rec.discrepancy).toBe(0);

    // Test unbalanced scenario (e.g. R500 untracked cash withdrawal)
    const recUnbalanced = reconcileAccountConservation(accountRef, flows, 22500);
    expect(recUnbalanced.isBalanced).toBe(false);
    expect(recUnbalanced.untraceableResidual).toBe(500);
    expect(recUnbalanced.explanation).toContain("Untraceable residual detected");
  });

  test("Scenario T — Cash wallet reconciliation (§12.3 / §8.7)", () => {
    const bankAcc = "acc-cheque";
    const cashAcc = "cash-wallet-1";

    // 1. ATM Withdrawal
    const withdrawal = recordATMWithdrawal(bankAcc, cashAcc, 2000, "tx-atm-1");
    expect(withdrawal.flow.flowType).toBe("CASH_WITHDRAWAL");
    expect(withdrawal.flow.amount).toBe(2000);

    // 2. Cash spend
    const spend = recordCashSpend({
      cashWalletAccountId: cashAcc,
      amount: 450,
      category: "Groceries",
      description: "Local fresh market",
    });
    expect(spend.flow.flowType).toBe("CASH_SPENDING");
    expect(spend.flow.amount).toBe(450);

    // 3. User counts actual physical cash: R1,400 (tracked was 2000 - 450 = 1550)
    const trackedBalance = 1550;
    const countedBalance = 1400;
    const rec = reconcileCashWallet(cashAcc, trackedBalance, countedBalance);

    expect(rec.reconciliationAdjustment).toBe(-150);
    expect(rec.newTrackedBalance).toBe(1400);
    expect(rec.reconciliationFlow.flowType).toBe("OTHER");
    expect(rec.reconciliationFlow.amount).toBe(150);
  });

  test("Money DNA lineage tree traversal (§12.4)", () => {
    const parentFlow = createMoneyFlow({
      id: "flow-parent-salary",
      sourceType: "EXTERNAL",
      destinationType: "ACCOUNT",
      destinationRef: "acc-cheque",
      amount: 30000,
      flowType: "INCOME",
    });

    const childFlow = createMoneyFlow({
      id: "flow-child-savings",
      parentFlowId: "flow-parent-salary",
      sourceType: "ACCOUNT",
      sourceRef: "acc-cheque",
      destinationType: "ACCOUNT",
      destinationRef: "acc-savings",
      amount: 5000,
      flowType: "TRANSFER",
    });

    const flows = [parentFlow, childFlow];
    const lineage = buildMoneyLineage("flow-child-savings", flows);

    expect(lineage).not.toBeNull();
    expect(lineage?.parent?.id).toBe("flow-parent-salary");
    expect(lineage?.narrative).toContain("Originating from parent INCOME");
  });
});

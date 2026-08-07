/**
 * Cash Wallet Service (§12.3)
 * Manages physical cash on hand, ATM withdrawals, cash spending, and cash reconciliation adjustments.
 */

import { MoneyFlowItem, createMoneyFlow } from "./moneyFlowService";
import { round2 } from "../engine/snowball";

export interface CashWalletState {
  accountId: string;
  accountName: string;
  trackedBalance: number;
  lastReconciledAt: Date | null;
}

export interface CashSpendInput {
  cashWalletAccountId: string;
  amount: number;
  category: string;
  description: string;
  spendDate?: Date;
}

export interface CashReconciliationResult {
  cashWalletAccountId: string;
  previousTrackedBalance: number;
  actualCountedBalance: number;
  reconciliationAdjustment: number; // positive = found money, negative = missing cash
  reconciliationFlow: MoneyFlowItem;
  newTrackedBalance: number;
}

/**
 * Handle an ATM cash withdrawal transaction (§12.3).
 * Generates a CASH_WITHDRAWAL MoneyFlow into the CASH_WALLET account.
 */
export function recordATMWithdrawal(
  bankAccountId: string,
  cashWalletAccountId: string,
  withdrawalAmount: number,
  transactionId?: string,
  date?: Date
): {
  flow: MoneyFlowItem;
  amount: number;
} {
  const amount = round2(withdrawalAmount);
  const flow = createMoneyFlow({
    originTransactionId: transactionId ?? null,
    sourceType: "ACCOUNT",
    sourceRef: bankAccountId,
    destinationType: "CASH_WALLET",
    destinationRef: cashWalletAccountId,
    amount,
    flowType: "CASH_WITHDRAWAL",
    confidence: "CONFIRMED",
    createdAt: date ?? new Date(),
  });

  return { flow, amount };
}

/**
 * Log manual cash spending against the Cash Wallet (§12.3).
 */
export function recordCashSpend(input: CashSpendInput): {
  flow: MoneyFlowItem;
  amount: number;
} {
  const amount = round2(input.amount);
  const flow = createMoneyFlow({
    sourceType: "CASH_WALLET",
    sourceRef: input.cashWalletAccountId,
    destinationType: "EXTERNAL",
    destinationRef: input.category,
    amount,
    flowType: "CASH_SPENDING",
    confidence: "CONFIRMED",
    createdAt: input.spendDate ?? new Date(),
  });

  return { flow, amount };
}

/**
 * Reconcile physical cash count with tracked balance (§12.3 & Scenario T).
 */
export function reconcileCashWallet(
  cashWalletAccountId: string,
  currentTrackedBalance: number,
  actualCountedBalance: number
): CashReconciliationResult {
  const prev = round2(currentTrackedBalance);
  const actual = round2(actualCountedBalance);
  const adjustment = round2(actual - prev);

  const flow = createMoneyFlow({
    sourceType: adjustment < 0 ? "CASH_WALLET" : "EXTERNAL",
    sourceRef: adjustment < 0 ? cashWalletAccountId : "RECONCILIATION_ADJUSTMENT",
    destinationType: adjustment < 0 ? "EXTERNAL" : "CASH_WALLET",
    destinationRef: adjustment < 0 ? "RECONCILIATION_ADJUSTMENT" : cashWalletAccountId,
    amount: Math.abs(adjustment),
    flowType: "OTHER",
    confidence: "CONFIRMED",
  });

  return {
    cashWalletAccountId,
    previousTrackedBalance: prev,
    actualCountedBalance: actual,
    reconciliationAdjustment: adjustment,
    reconciliationFlow: flow,
    newTrackedBalance: actual,
  };
}

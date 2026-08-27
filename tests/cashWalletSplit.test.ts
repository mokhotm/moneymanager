import { describe, it, expect } from "vitest";
import { recordATMWithdrawal, splitWithdrawalIntoSpends } from "../src/services/cashWalletService";

describe("Cash Wallet ATM Withdrawal & Split Engine (§Vector 8)", () => {
  it("records an ATM cash withdrawal as a parent flow with matching currentAmount", () => {
    const { flow, amount } = recordATMWithdrawal(
      "acc_cheque_01",
      "acc_cash_wallet_01",
      3000.0,
      "txn_autobank_884",
      new Date("2026-08-14")
    );

    expect(amount).toBe(3000.0);
    expect(flow.amount).toBe(3000.0);
    expect(flow.currentAmount).toBe(3000.0);
    expect(flow.flowType).toBe("CASH_WITHDRAWAL");
    expect(flow.status).toBe("ACTIVE");
    expect(flow.destinationRef).toBe("acc_cash_wallet_01");
  });

  it("splits a R3,000 withdrawal into 5 itemized expenses and tracks remaining cash on hand", () => {
    const { flow: parentWithdrawal } = recordATMWithdrawal(
      "acc_cheque_01",
      "acc_cash_wallet_01",
      3000.0
    );

    const splitItems = [
      { description: "Domestic Worker Wage", category: "Domestic Worker", amount: 950.0 },
      { description: "Garden Maintenance", category: "Garden Services", amount: 700.0 },
      { description: "Fresh Produce Market", category: "Groceries", amount: 850.0 },
      { description: "Taxi & Commute", category: "Transport", amount: 300.0 },
      { description: "Parking Tips & Car Guards", category: "Parking", amount: 100.0 },
    ];

    const result = splitWithdrawalIntoSpends(parentWithdrawal, "acc_cash_wallet_01", splitItems);

    expect(result.allocatedTotal).toBe(2900.0);
    expect(result.remainingCashOnHand).toBe(100.0);
    expect(result.childFlows).toHaveLength(5);
    expect(result.parentFlow.status).toBe("PARTIALLY_CONSUMED");
    expect(result.parentFlow.currentAmount).toBe(100.0);

    // Verify child flows are linked to parentFlowId
    result.childFlows.forEach((child) => {
      expect(child.parentFlowId).toBe(parentWithdrawal.id);
      expect(child.flowType).toBe("CASH_SPENDING");
      expect(child.sourceType).toBe("CASH_WALLET");
    });
  });

  it("transitions parent status to FULLY_CONSUMED when 100% of cash is allocated", () => {
    const { flow: parentWithdrawal } = recordATMWithdrawal(
      "acc_cheque_01",
      "acc_cash_wallet_01",
      2500.0
    );

    const splitItems = [
      { description: "Domestic Worker Wage", category: "Domestic Worker", amount: 1500.0 },
      { description: "Garden Maintenance", category: "Garden Services", amount: 1000.0 },
    ];

    const result = splitWithdrawalIntoSpends(parentWithdrawal, "acc_cash_wallet_01", splitItems);

    expect(result.allocatedTotal).toBe(2500.0);
    expect(result.remainingCashOnHand).toBe(0.0);
    expect(result.parentFlow.status).toBe("FULLY_CONSUMED");
    expect(result.parentFlow.currentAmount).toBe(0.0);
  });

  it("throws error if split items exceed withdrawal amount", () => {
    const { flow: parentWithdrawal } = recordATMWithdrawal(
      "acc_cheque_01",
      "acc_cash_wallet_01",
      1000.0
    );

    const excessiveSplits = [
      { description: "Contractor", category: "Maintenance", amount: 1200.0 },
    ];

    expect(() => {
      splitWithdrawalIntoSpends(parentWithdrawal, "acc_cash_wallet_01", excessiveSplits);
    }).toThrow(/exceeds withdrawal amount/);
  });
});

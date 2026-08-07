import { NextResponse } from "next/server";
import {
  recordATMWithdrawal,
  recordCashSpend,
  reconcileCashWallet,
} from "@/services/cashWalletService";

let currentWallet = {
  cashWalletAccountId: "cash-wallet-primary",
  accountName: "Physical Cash Wallet",
  trackedBalance: 1550,
  lastReconciledAt: new Date("2026-08-01"),
  recentFlows: [
    { id: "cf-1", date: "2026-08-01", type: "CASH_WITHDRAWAL", description: "ATM Autobank Withdrawal", amount: 2000 },
    { id: "cf-2", date: "2026-08-03", type: "CASH_SPENDING", description: "Groceries & Fresh Market", amount: 450 },
  ],
};

export async function GET() {
  return NextResponse.json(currentWallet);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, amount, category, description, actualCountedBalance } = body;

  if (action === "WITHDRAWAL") {
    const { flow } = recordATMWithdrawal("cheque-account", currentWallet.cashWalletAccountId, amount);
    currentWallet.trackedBalance += amount;
    currentWallet.recentFlows.unshift({
      id: flow.id,
      date: new Date().toISOString().split("T")[0],
      type: "CASH_WITHDRAWAL",
      description: description || "ATM Cash Withdrawal",
      amount,
    });
    return NextResponse.json({ success: true, currentWallet });
  }

  if (action === "SPEND") {
    const { flow } = recordCashSpend({
      cashWalletAccountId: currentWallet.cashWalletAccountId,
      amount,
      category: category || "General Cash Spend",
      description: description || "Cash Expense",
    });
    currentWallet.trackedBalance = Math.max(0, currentWallet.trackedBalance - amount);
    currentWallet.recentFlows.unshift({
      id: flow.id,
      date: new Date().toISOString().split("T")[0],
      type: "CASH_SPENDING",
      description: `${category}: ${description}`,
      amount: -amount,
    });
    return NextResponse.json({ success: true, currentWallet });
  }

  if (action === "RECONCILE") {
    const rec = reconcileCashWallet(
      currentWallet.cashWalletAccountId,
      currentWallet.trackedBalance,
      actualCountedBalance
    );
    currentWallet.trackedBalance = rec.newTrackedBalance;
    currentWallet.lastReconciledAt = new Date();
    currentWallet.recentFlows.unshift({
      id: rec.reconciliationFlow.id,
      date: new Date().toISOString().split("T")[0],
      type: "OTHER",
      description: `Reconciliation Adjustment (${rec.reconciliationAdjustment >= 0 ? "+" : ""}${rec.reconciliationAdjustment})`,
      amount: rec.reconciliationAdjustment,
    });
    return NextResponse.json({ success: true, reconciliation: rec, currentWallet });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

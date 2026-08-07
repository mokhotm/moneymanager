/**
 * Transfer Matching Engine (§12.2)
 * Automatically detects when two transactions across user accounts represent one internal transfer.
 * Prevents internal transfers from double-counting as budget spending or net-worth income/expense deltas.
 */

import { MoneyFlowItem, createMoneyFlow } from "./moneyFlowService";
import { round2 } from "../engine/snowball";

export interface SimpleTransaction {
  id: string;
  accountId: string;
  date: Date;
  description: string;
  amount: number; // signed: negative = money out, positive = money in
}

export interface MatchedTransferPair {
  outboundTransaction: SimpleTransaction;
  inboundTransaction: SimpleTransaction;
  matchConfidence: "HIGH" | "MEDIUM" | "LOW";
  matchRule: string;
  transferFlow: MoneyFlowItem;
}

/**
 * Helper to check date difference in days.
 */
function dateDiffDays(d1: Date, d2: Date): number {
  const ms = Math.abs(d1.getTime() - d2.getTime());
  return ms / (1000 * 60 * 60 * 24);
}

/**
 * Match candidate transactions across accounts to find internal transfer pairs (§12.2).
 */
export function findAndMatchTransfers(
  transactions: SimpleTransaction[],
  maxDaysWindow: number = 3
): {
  matchedPairs: MatchedTransferPair[];
  unmatchedTransactions: SimpleTransaction[];
} {
  const outboundTx = transactions.filter((t) => t.amount < 0);
  const inboundTx = transactions.filter((t) => t.amount > 0);

  const matchedPairs: MatchedTransferPair[] = [];
  const matchedTxIds = new Set<string>();

  for (const outTx of outboundTx) {
    if (matchedTxIds.has(outTx.id)) continue;

    const absOutAmount = round2(Math.abs(outTx.amount));

    for (const inTx of inboundTx) {
      if (matchedTxIds.has(inTx.id)) continue;
      if (outTx.accountId === inTx.accountId) continue; // Must be between different accounts

      const absInAmount = round2(Math.abs(inTx.amount));

      // Rule 1: Exact amount match within date window
      const sameAmount = Math.abs(absOutAmount - absInAmount) <= 0.01;
      const daysDiff = dateDiffDays(outTx.date, inTx.date);

      if (sameAmount && daysDiff <= maxDaysWindow) {
        // Description keywords check
        const outDesc = outTx.description.toUpperCase();
        const inDesc = inTx.description.toUpperCase();
        const isTransferKeyword =
          outDesc.includes("TRANSFER") ||
          inDesc.includes("TRANSFER") ||
          outDesc.includes("IB ") ||
          inDesc.includes("IB ") ||
          outDesc.includes("SAVINGS") ||
          inDesc.includes("SAVINGS");

        let confidence: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
        let rule = "Amount + Date window match";

        if (isTransferKeyword && daysDiff <= 1) {
          confidence = "HIGH";
          rule = "High-confidence transfer (Amount + Date + Transfer Description)";
        }

        const transferFlow = createMoneyFlow({
          originTransactionId: outTx.id,
          sourceType: "ACCOUNT",
          sourceRef: outTx.accountId,
          destinationType: "ACCOUNT",
          destinationRef: inTx.accountId,
          amount: absOutAmount,
          flowType: "TRANSFER",
          confidence: confidence === "HIGH" ? "CONFIRMED" : "AGENT_SUGGESTED",
        });

        matchedPairs.push({
          outboundTransaction: outTx,
          inboundTransaction: inTx,
          matchConfidence: confidence,
          matchRule: rule,
          transferFlow,
        });

        matchedTxIds.add(outTx.id);
        matchedTxIds.add(inTx.id);
        break; // matched this outbound tx
      }
    }
  }

  const unmatchedTransactions = transactions.filter((t) => !matchedTxIds.has(t.id));

  return {
    matchedPairs,
    unmatchedTransactions,
  };
}

/**
 * Filter out internal transfer transactions from budget spending calculations (§12.2 business rule).
 */
export function filterTransactionsForBudget(
  transactions: SimpleTransaction[],
  matchedPairs: MatchedTransferPair[]
): SimpleTransaction[] {
  const matchedSet = new Set<string>();
  for (const pair of matchedPairs) {
    matchedSet.add(pair.outboundTransaction.id);
    matchedSet.add(pair.inboundTransaction.id);
  }

  return transactions.filter((t) => !matchedSet.has(t.id));
}

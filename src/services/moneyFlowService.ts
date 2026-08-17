/**
 * Money Flow Engine Backend Service (§12.1, §12.5)
 * Tracks the lifecycle of money across accounts, debts, assets, cash wallet, and external endpoints.
 * Pure TypeScript — deterministic calculations and conservation rules.
 */

import { round2 } from "../engine/snowball";

export type FlowEndpointType = "ACCOUNT" | "ASSET" | "DEBT" | "CASH_WALLET" | "EXTERNAL";

export type FlowType =
  | "INCOME"
  | "TRANSFER"
  | "INVESTMENT"
  | "DEBT_PAYMENT"
  | "CASH_WITHDRAWAL"
  | "CASH_SPENDING"
  | "ASSET_PURCHASE"
  | "ASSET_SALE"
  | "GOAL_CONTRIBUTION"
  | "DIVIDEND"
  | "INTEREST"
  | "REFUND"
  | "TAX"
  | "FEE"
  | "LOAN"
  | "OTHER";

export type FlowStatus = "ACTIVE" | "PARTIALLY_CONSUMED" | "FULLY_CONSUMED";
export type FlowConfidence = "CONFIRMED" | "AGENT_SUGGESTED";

export interface MoneyFlowItem {
  id: string;
  parentFlowId: string | null;
  originTransactionId: string | null;
  sourceType: FlowEndpointType;
  sourceRef: string | null;
  destinationType: FlowEndpointType;
  destinationRef: string | null;
  amount: number;
  currentAmount: number;
  flowType: FlowType;
  status: FlowStatus;
  confidence: FlowConfidence;
  createdAt: Date;
}

export interface MoneyConservationResult {
  accountRef: string;
  inflowTotal: number;
  outflowTotal: number;
  netFlowChange: number;
  actualBalanceChange: number;
  discrepancy: number;
  isBalanced: boolean;
  untraceableResidual: number;
  explanation: string;
}

export interface MoneyLineageNode {
  flow: MoneyFlowItem;
  parent: MoneyFlowItem | null;
  children: MoneyFlowItem[];
  narrative: string;
}

/**
 * Create a new MoneyFlow record.
 */
export function createMoneyFlow(
  input: Omit<MoneyFlowItem, "id" | "currentAmount" | "status" | "createdAt" | "parentFlowId" | "originTransactionId" | "sourceRef" | "destinationRef" | "confidence"> & {
    id?: string;
    parentFlowId?: string | null;
    originTransactionId?: string | null;
    sourceRef?: string | null;
    destinationRef?: string | null;
    confidence?: FlowConfidence;
    currentAmount?: number;
    createdAt?: Date;
  }
): MoneyFlowItem {
  const amount = round2(input.amount);
  const currentAmount = round2(input.currentAmount ?? amount);

  let status: FlowStatus = "ACTIVE";
  if (currentAmount <= 0) {
    status = "FULLY_CONSUMED";
  } else if (currentAmount < amount) {
    status = "PARTIALLY_CONSUMED";
  }

  return {
    id: input.id ?? `flow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    parentFlowId: input.parentFlowId ?? null,
    originTransactionId: input.originTransactionId ?? null,
    sourceType: input.sourceType,
    sourceRef: input.sourceRef ?? null,
    destinationType: input.destinationType,
    destinationRef: input.destinationRef ?? null,
    amount,
    currentAmount,
    flowType: input.flowType,
    status,
    confidence: input.confidence ?? "CONFIRMED",
    createdAt: input.createdAt ?? new Date(),
  };
}

/**
 * Reconcile money conservation for an account or asset over a given set of flows (§12.1).
 * Inflows - Outflows - ActualBalanceChange must reconcile to 0.
 */
export function reconcileAccountConservation(
  accountRef: string,
  flows: MoneyFlowItem[],
  actualBalanceChange: number
): MoneyConservationResult {
  let inflowTotal = 0;
  let outflowTotal = 0;

  for (const flow of flows) {
    const isDestination =
      (flow.destinationRef === accountRef) ||
      (flow.destinationType === "ACCOUNT" && flow.destinationRef === accountRef);

    const isSource =
      (flow.sourceRef === accountRef) ||
      (flow.sourceType === "ACCOUNT" && flow.sourceRef === accountRef);

    if (isDestination) {
      inflowTotal = round2(inflowTotal + flow.amount);
    }
    if (isSource) {
      outflowTotal = round2(outflowTotal + flow.amount);
    }
  }

  const netFlowChange = round2(inflowTotal - outflowTotal);
  const discrepancy = round2(netFlowChange - round2(actualBalanceChange));
  const isBalanced = Math.abs(discrepancy) <= 0.01;
  const untraceableResidual = Math.abs(discrepancy);

  let explanation = "";
  if (isBalanced) {
    explanation = `Money conservation reconciled perfectly for ${accountRef}: Inflows R${inflowTotal.toLocaleString()} - Outflows R${outflowTotal.toLocaleString()} matches balance delta R${actualBalanceChange.toLocaleString()}.`;
  } else {
    explanation = `Untraceable residual detected for ${accountRef}: Net flows R${netFlowChange.toLocaleString()} vs actual balance delta R${actualBalanceChange.toLocaleString()} (discrepancy: R${discrepancy.toLocaleString()}).`;
  }

  return {
    accountRef,
    inflowTotal,
    outflowTotal,
    netFlowChange,
    actualBalanceChange: round2(actualBalanceChange),
    discrepancy,
    isBalanced,
    untraceableResidual,
    explanation,
  };
}

/**
 * Build the lineage tree ("Money DNA") for a specific MoneyFlowItem (§12.4).
 */
export function buildMoneyLineage(
  flowId: string,
  allFlows: MoneyFlowItem[]
): MoneyLineageNode | null {
  const targetFlow = allFlows.find((f) => f.id === flowId);
  if (!targetFlow) return null;

  const parent = targetFlow.parentFlowId
    ? allFlows.find((f) => f.id === targetFlow.parentFlowId) ?? null
    : null;

  const children = allFlows.filter((f) => f.parentFlowId === targetFlow.id);

  let narrative = `${targetFlow.flowType.replace(/_/g, " ")} of R${targetFlow.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })} `;
  narrative += `from ${targetFlow.sourceRef ?? "External"} `;
  narrative += `to ${targetFlow.destinationRef ?? "External"}.`;

  if (parent) {
    narrative = `Originating from parent ${parent.flowType.replace(/_/g, " ")} (R${parent.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}): ` + narrative;
  }

  return {
    flow: targetFlow,
    parent,
    children,
    narrative,
  };
}

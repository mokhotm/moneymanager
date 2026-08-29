/**
 * Universal Open Banking Aggregator Interface (§Vector 1 / 100x Architecture)
 * Supports multi-provider synchronization:
 * - Stitch Money (South Africa - Production & Sandbox)
 * - Mono (Pan-Africa)
 * - Plaid / Finicity (US / Global)
 * - Salt Edge / Tink (UK / EU)
 */

import { syncBankConnection, BankSyncResult } from "./stitchOpenBankingService";
import { prisma } from "../lib/prisma";

export type AggregatorProvider = "STITCH" | "MONO" | "PLAID" | "SALT_EDGE";

export interface AggregatorAccountSyncResult {
  provider: AggregatorProvider;
  institution: string;
  accountNumberMasked: string;
  clearedBalance: number;
  availableBalance: number;
  currency: string;
  transactionsSyncedCount: number;
  status: "CONNECTED" | "SYNCED";
  lastSyncTimestamp: string;
}

export async function syncAggregatorAccount(
  accountId: string,
  preferredProvider: AggregatorProvider = "STITCH"
): Promise<AggregatorAccountSyncResult> {
  // Find active BankConnection for this account
  const connection = await prisma.bankConnection.findFirst({
    where: { accountId },
  });

  if (connection) {
    const res: BankSyncResult = await syncBankConnection(connection.id);
    return {
      provider: preferredProvider,
      institution: res.institution,
      accountNumberMasked: res.accountNumberMasked,
      clearedBalance: res.currentBalance,
      availableBalance: res.availableBalance,
      currency: "ZAR",
      transactionsSyncedCount: res.totalSyncedCount,
      status: "SYNCED",
      lastSyncTimestamp: res.syncTimestamp,
    };
  }

  // Fallback if upstream external sync endpoint is configured
  const syncEndpoint = process.env.OPEN_BANKING_SYNC_URL;
  if (!syncEndpoint) {
    throw new Error(`No active BankConnection found for account ${accountId}. Please link via Bank Hub.`);
  }

  const apiKey = process.env.OPEN_BANKING_SYNC_API_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const res = await fetch(syncEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ accountId, provider: preferredProvider }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`Aggregator sync failed (${res.status})`);
  }

  const payload = await res.json();
  return payload as AggregatorAccountSyncResult;
}

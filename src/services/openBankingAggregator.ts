/**
 * Universal Open Banking Aggregator Interface (§Vector 1 / 100x Architecture)
 * Supports multi-provider synchronization:
 * - Stitch Money (South Africa)
 * - Mono (Pan-Africa)
 * - Plaid / Finicity (US / Global)
 * - Salt Edge / Tink (UK / EU)
 * - Sync via configured upstream aggregator connector.
 */

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
  const syncEndpoint = process.env.OPEN_BANKING_SYNC_URL;
  if (!syncEndpoint) {
    throw new Error("OPEN_BANKING_SYNC_URL is not configured");
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

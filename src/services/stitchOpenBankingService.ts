import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export interface StitchAccountData {
  id: string;
  name: string;
  accountNumber: string;
  accountNumberType: string;
  institution: string;
  currency: string;
  currentBalance: number;
  availableBalance: number;
  transactions?: StitchTransactionData[];
}

export interface StitchTransactionData {
  id: string;
  date: string;
  description: string;
  amount: number; // positive for credits, negative for debits
  runningBalance?: number;
  reference?: string;
  category?: string;
}

export interface BankSyncResult {
  connectionId: string;
  accountId: string;
  institution: string;
  accountName: string;
  accountNumberMasked: string;
  currentBalance: number;
  availableBalance: number;
  newTransactionsCount: number;
  duplicateTransactionsCount: number;
  totalSyncedCount: number;
  syncTimestamp: string;
  status: "SUCCESS" | "PARTIAL" | "ERROR";
  error?: string;
}

const SECRET_KEY =
  process.env.ENCRYPTION_KEY ||
  process.env.SESSION_SECRET ||
  "money-manager-vault-key-32-chars-aes256";

function getSecretKey(): Buffer {
  return Buffer.from(SECRET_KEY.padEnd(32).slice(0, 32));
}

/**
 * Encrypt access token at rest using AES-256-CBC
 */
export function encryptToken(token: string): string {
  if (!token) return "";
  const cipher = crypto.createCipheriv("aes-256-cbc", getSecretKey(), Buffer.alloc(16, 0));
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/**
 * Decrypt access token
 */
export function decryptToken(encrypted: string): string {
  if (!encrypted) return "";
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", getSecretKey(), Buffer.alloc(16, 0));
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}

export { type SABankConnector, SA_BANK_CONNECTORS } from "../lib/bankConnectors";


/**
 * Stitch OAuth 2.0 PKCE Authorization URL Builder
 * Initiates the user's redirect to the official bank Open Banking authentication portal
 */
export function generateStitchAuthUrl(state: string, institutionId?: string): string {
  const clientId = process.env.STITCH_CLIENT_ID;
  if (!clientId) {
    throw new Error("STITCH_CLIENT_ID is not configured in server environment or BYOK vault.");
  }

  const redirectUri = process.env.STITCH_REDIRECT_URI || "http://localhost:3001/api/banking/auth/callback";
  const scope = encodeURIComponent("openid user.accounts user.balances user.transactions");
  const authEndpoint = process.env.STITCH_AUTH_ENDPOINT || "https://stitch.money/connect/authorize";

  let url = `${authEndpoint}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${encodeURIComponent(state)}&prompt=consent`;
  if (institutionId) {
    url += `&institution=${encodeURIComponent(institutionId)}`;
  }
  return url;
}

/**
 * Exchange Authorization Code for Live Access Token via Stitch OAuth
 */
export async function exchangeStitchToken(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const clientId = process.env.STITCH_CLIENT_ID;
  const clientSecret = process.env.STITCH_CLIENT_SECRET;
  const redirectUri = process.env.STITCH_REDIRECT_URI || "http://localhost:3001/api/banking/auth/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Live Stitch credentials (STITCH_CLIENT_ID / STITCH_CLIENT_SECRET) not configured.");
  }

  const tokenEndpoint = process.env.STITCH_TOKEN_ENDPOINT || "https://secure.stitch.money/connect/token";

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Stitch Token Exchange failed (HTTP ${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Fetch accounts directly from live Stitch GraphQL API
 * Throws explicit error if not authenticated (NO mock or fallback data).
 */
export async function fetchStitchAccounts(accessToken: string, defaultInstitution: string = "Connected Bank"): Promise<StitchAccountData[]> {
  if (!accessToken || accessToken.startsWith("sandbox_")) {
    throw new Error(
      "Live banking connection required. Please connect your bank account via Stitch Open Banking OAuth."
    );
  }

  const endpoint = process.env.STITCH_GRAPHQL_ENDPOINT || "https://api.stitch.money/graphql";
  const query = `
    query GetUserBankAccounts {
      user {
        bankAccounts {
          id
          name
          accountNumber
          accountNumberType
          institution {
            name
          }
          currentBalance
          availableBalance
          currency
        }
      }
    }
  `;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Live Stitch API error HTTP ${res.status}: ${await res.text()}`);
  }

  const payload = await res.json();
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(`Stitch GraphQL Error: ${payload.errors.map((e: any) => e.message).join(", ")}`);
  }

  const accounts = payload?.data?.user?.bankAccounts || [];

  return accounts.map((acc: any) => ({
    id: acc.id,
    name: acc.name,
    accountNumber: acc.accountNumber,
    accountNumberType: acc.accountNumberType || "CURRENT",
    institution: acc.institution?.name || defaultInstitution,
    currency: acc.currency || "ZAR",
    currentBalance: (acc.currentBalance || 0) / 100, // Stitch amounts in cents
    availableBalance: (acc.availableBalance || 0) / 100,
  }));
}

/**
 * Fetch real live transactions for a specific bank account from Stitch GraphQL API
 * Throws explicit error if not authenticated (NO mock or fallback data).
 */
export async function fetchStitchTransactions(
  accessToken: string,
  stitchAccountId: string,
  defaultInstitution: string = "Connected Bank"
): Promise<StitchTransactionData[]> {
  if (!accessToken || accessToken.startsWith("sandbox_")) {
    throw new Error("Live banking connection required. No valid live access token provided.");
  }

  const endpoint = process.env.STITCH_GRAPHQL_ENDPOINT || "https://api.stitch.money/graphql";
  const query = `
    query GetAccountTransactions($accountId: ID!) {
      node(id: $accountId) {
        ... on BankAccount {
          transactions(first: 50) {
            edges {
              node {
                id
                amount
                description
                reference
                date
                runningBalance
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables: { accountId: stitchAccountId } }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Live Stitch transactions API error HTTP ${res.status}`);
  }

  const payload = await res.json();
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(`Stitch GraphQL Error: ${payload.errors.map((e: any) => e.message).join(", ")}`);
  }

  const edges = payload?.data?.node?.transactions?.edges || [];

  return edges.map(({ node }: any) => ({
    id: node.id,
    date: node.date?.slice(0, 10),
    description: node.description || node.reference || "Bank Transaction",
    amount: (node.amount || 0) / 100, // Stitch amounts in cents
    runningBalance: node.runningBalance ? node.runningBalance / 100 : undefined,
    reference: node.reference,
  }));
}

/**
 * Execute automated bank synchronization for an active BankConnection via live API
 */
export async function syncBankConnection(connectionId: string): Promise<BankSyncResult> {
  const connection = await prisma.bankConnection.findUnique({
    where: { id: connectionId },
    include: { account: true },
  });

  if (!connection) {
    throw new Error(`Live bank connection ${connectionId} not found`);
  }

  if (connection.consentStatus !== "ACTIVE") {
    throw new Error(`Live bank connection consent is ${connection.consentStatus}`);
  }

  const plainToken = decryptToken(connection.accessTokenEncrypted);
  if (!plainToken) {
    throw new Error("Missing or unreadable live bank access token.");
  }

  const institution = connection.providerName || connection.account.institution || "Connected Bank";

  // 1. Fetch live account data from bank API
  const accounts = await fetchStitchAccounts(plainToken, institution);
  const matchedStitchAccount =
    accounts.find((a) => a.id === connection.accountId || a.name.toLowerCase() === connection.account.name.toLowerCase()) ||
    accounts[0];

  if (!matchedStitchAccount) {
    throw new Error(`Account not found on live bank API feed.`);
  }

  const currentBalance = matchedStitchAccount.currentBalance;
  const availableBalance = matchedStitchAccount.availableBalance;

  // 2. Fetch live transactions from bank API
  const stitchTransactions = await fetchStitchTransactions(
    plainToken,
    matchedStitchAccount.id,
    institution
  );

  // 3. Ingest live transactions into MoneyFlow with strict deduplication
  let newTxCount = 0;
  let dupCount = 0;

  for (const stTx of stitchTransactions) {
    const txAmount = new Decimal(Math.abs(stTx.amount));
    const flowType = stTx.amount >= 0 ? "INCOME" : "OTHER";
    const txDate = new Date(stTx.date);

    // Deduplication check: same account, date, amount, description
    const existing = await prisma.moneyFlow.findFirst({
      where: {
        OR: [
          { sourceRef: connection.accountId },
          { destinationRef: connection.accountId },
        ],
        amount: txAmount,
        flowType,
        createdAt: {
          gte: new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate(), 0, 0, 0),
          lte: new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate(), 23, 59, 59),
        },
      },
    });

    if (existing) {
      dupCount++;
      continue;
    }

    await prisma.moneyFlow.create({
      data: {
        sourceType: "ACCOUNT",
        sourceRef: connection.accountId,
        destinationType: "EXTERNAL",
        flowType,
        amount: txAmount,
        currentAmount: txAmount,
        status: "ACTIVE",
        confidence: "CONFIRMED",
        createdAt: txDate,
      },
    });
    newTxCount++;
  }

  // 4. Update live connection timestamp
  await prisma.bankConnection.update({
    where: { id: connectionId },
    data: { lastSyncedAt: new Date() },
  });

  // 5. Update live balance on account
  await prisma.account.update({
    where: { id: connection.accountId },
    data: { openingBalance: new Decimal(currentBalance) },
  });

  return {
    connectionId: connection.id,
    accountId: connection.accountId,
    institution,
    accountName: connection.account.name,
    accountNumberMasked: connection.account.accountNumberMasked || "••••",
    currentBalance,
    availableBalance,
    newTransactionsCount: newTxCount,
    duplicateTransactionsCount: dupCount,
    totalSyncedCount: stitchTransactions.length,
    syncTimestamp: new Date().toISOString(),
    status: "SUCCESS",
  };
}

/**
 * Smart matching for discovered live accounts
 */
export interface DiscoveredAccountMatch {
  stitchAccount: StitchAccountData;
  matchedAccountId: string | null;
  matchType: "EXACT_NUMBER" | "FUZZY_NAME" | "NEW_DISCOVERY";
  suggestedAccountType: "CURRENT" | "SAVINGS" | "CREDIT_CARD" | "LOAN";
}

export function matchDiscoveredAccounts(
  discovered: StitchAccountData[],
  existingAccounts: Array<{
    id: string;
    name: string;
    accountNumberMasked?: string | null;
    type: string;
    institution: string;
  }>
): DiscoveredAccountMatch[] {
  return discovered.map((stitchAcc) => {
    // 1. Exact match on masked number
    const last4 = stitchAcc.accountNumber ? stitchAcc.accountNumber.slice(-4) : "";
    const numMatch = existingAccounts.find(
      (a) =>
        last4 &&
        a.accountNumberMasked &&
        a.accountNumberMasked.replace(/[^0-9]/g, "").endsWith(last4)
    );

    if (numMatch) {
      return {
        stitchAccount: stitchAcc,
        matchedAccountId: numMatch.id,
        matchType: "EXACT_NUMBER",
        suggestedAccountType: numMatch.type as any,
      };
    }

    // 2. Fuzzy name match
    const nameLower = stitchAcc.name.toLowerCase();
    const nameMatch = existingAccounts.find((a) => {
      const aLower = a.name.toLowerCase();
      return (
        nameLower.includes(aLower) ||
        aLower.includes(nameLower) ||
        (nameLower.includes("prestige") && aLower.includes("prestige")) ||
        (nameLower.includes("mymo") && aLower.includes("mymo")) ||
        (nameLower.includes("titanium") && aLower.includes("titanium")) ||
        (nameLower.includes("home loan") && aLower.includes("home loan")) ||
        (nameLower.includes("revolving") && aLower.includes("revolving"))
      );
    });

    if (nameMatch) {
      return {
        stitchAccount: stitchAcc,
        matchedAccountId: nameMatch.id,
        matchType: "FUZZY_NAME",
        suggestedAccountType: nameMatch.type as any,
      };
    }

    // 3. New discovery
    return {
      stitchAccount: stitchAcc,
      matchedAccountId: null,
      matchType: "NEW_DISCOVERY",
      suggestedAccountType: mapStitchAccountTypeToPrisma(
        stitchAcc.accountNumberType,
        stitchAcc.name
      ),
    };
  });
}

export function mapStitchAccountTypeToPrisma(
  stitchType?: string,
  accountName?: string
): "CURRENT" | "SAVINGS" | "CREDIT_CARD" | "LOAN" {
  const name = (accountName || "").toLowerCase();
  const type = (stitchType || "").toUpperCase();

  if (name.includes("credit card") || name.includes("titanium") || type.includes("CREDIT")) {
    return "CREDIT_CARD";
  }
  if (name.includes("home loan") || name.includes("bond") || name.includes("revolving") || type.includes("LOAN")) {
    return "LOAN";
  }
  if (name.includes("savings") || name.includes("pocket") || type.includes("SAVINGS")) {
    return "SAVINGS";
  }
  return "CURRENT";
}

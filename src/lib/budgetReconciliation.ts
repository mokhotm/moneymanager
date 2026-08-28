import { prisma } from "@/lib/prisma";
import { resolveSalaryCycleRange } from "@/lib/payrollCalendar";
import fs from "fs";
import path from "path";

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC TYPES — Preserving the same contract for downstream consumers
// ═══════════════════════════════════════════════════════════════════════════════

export interface BudgetItemExecution {
  isExecuted: boolean;
  executionStatus: "CLEARED" | "BOUNCED" | "PENDING" | "PARTIAL";
  statusLabel: string;
  executedAmount: number;
  executedDate: string | null;
  executionRef: string | null;
  statementDocName: string | null;
  variance: number; // executedAmount - budgetAmount
  rawMatchedDescription: string | null;
  matchConfidence?: number; // 0..1 scoring confidence
  matchStrategy?: string;  // Which layer produced the match
}

export interface ReconciledBudgetItem {
  id: string;
  category: string;
  label: string;
  amount: number;
  isComputed?: boolean;
  sourceRef?: string | null;
  confidence?: string;
  note?: string | null;
  month: string;
  execution: BudgetItemExecution;
}

export interface BudgetReconciliationSummary {
  totalBudgeted: number;
  totalExecuted: number;
  totalPending: number;
  totalBounced: number;
  executedCount: number;
  pendingCount: number;
  bouncedCount: number;
  totalItemsCount: number;
  executionPercentage: number;
  cycleRangeFormatted: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Parsed Statement Transaction
// ═══════════════════════════════════════════════════════════════════════════════

interface StatementTransaction {
  id: string;
  date: string;           // "14 Aug 2026"
  dateObj: Date;
  amount: number;
  description: string;    // Raw text from statement line
  merchant?: string;      // Normalized merchant/payee name
  isBounced: boolean;
  isDebit: boolean;
  accountId: string;
  accountName: string;    // "Prestige Current Account" | "MyMo Current Account" etc.
  docRef: string;         // Citation: "Standard Bank #XXXX4469 (Pg X)"
  sourceFile: string;     // e.g. "Artifacts/StandardBank/20260819/XXXX4469.pdf"
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1: DATABASE + FILE TRANSACTION EXTRACTION
// Reads actual transactions from uploaded statements across ALL user accounts
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses a South African bank statement PDF raw text and extracts structured transactions.
 * Works with Standard Bank Prestige, MyMo, PlusPlan, Credit Card, and Revolving Credit statements.
 */
function extractTransactionsFromStatementText(
  rawText: string,
  accountName: string,
  accountId: string,
  docRef: string,
  sourceFile: string
): StatementTransaction[] {
  const transactions: StatementTransaction[] = [];
  const lines = rawText.split("\n");

  // Standard Bank statement transaction patterns:
  // Pattern 1: "14 Aug  TELKOM 9C27-5E6E-A295260814 DEBICHECK DEBIT ORDER  5 000.00"
  // Pattern 2: "14 Aug  AUTOBANK CASH WITHDRAWAL AT 0000H514  3 000.00-"
  // Pattern 3: Date then description then amount (positive=debit, negative=credit or trailing -)
  const txPattern = /^\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))\s+(.+?)\s+([\d\s]+[.,]\d{2}[-]?)\s*$/i;
  const txPattern2 = /^\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))\s+(.+?)\s+(-?[\d\s]+[.,]\d{2})\s*$/i;

  // Also match patterns like: "14 Aug 2026  DESCRIPTION  1,234.56"
  const txPatternWithYear = /^\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s+(.+?)\s+([\d\s,]+\.\d{2}[-]?)\s*$/i;

  let txCounter = 0;

  for (const line of lines) {
    let match = txPattern.exec(line) || txPattern2.exec(line) || txPatternWithYear.exec(line);
    if (!match) continue;

    const dateStr = match[1].trim();
    const description = match[2].trim();
    const amountStr = match[3].trim();

    // Skip header/summary lines
    if (!description || description.length < 3) continue;
    if (/^(balance|total|opening|closing|statement|page)/i.test(description)) continue;

    const amount = parseStatementAmount(amountStr);
    if (amount === null || amount === 0) continue;

    const isBounced = /RTD[-\s]*NOT\s*PROVIDED|RETURNED|UNPAID|RD[-\s]*INSUFF/i.test(description);
    const isCredit = amountStr.endsWith("-") || amount < 0;

    // Resolve date with year context
    const yearMatch = dateStr.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
    const dateObj = parseTxDate(dateStr, year);

    txCounter++;
    transactions.push({
      id: `${accountId.slice(0, 8)}_tx_${txCounter}`,
      date: formatTxDate(dateObj),
      dateObj,
      amount: Math.abs(amount),
      description,
      merchant: extractMerchant(description),
      isBounced,
      isDebit: !isCredit,
      accountId,
      accountName,
      docRef,
      sourceFile,
    });
  }

  return transactions;
}

/**
 * Parse SA bank statement amount: "5 000.00", "17,786.45", "331.75-", "R 4 073.83"
 */
function parseStatementAmount(str: string): number | null {
  if (!str) return null;
  const isNegative = str.endsWith("-") || str.startsWith("-");
  const clean = str.replace(/[R\s\-]/g, "").replace(/,/g, "");
  const val = parseFloat(clean);
  if (isNaN(val)) return null;
  return isNegative ? -val : val;
}

function parseTxDate(dateStr: string, fallbackYear: number): Date {
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const parts = dateStr.toLowerCase().split(/\s+/);
  const day = parseInt(parts[0], 10);
  const month = months[parts[1]?.slice(0, 3)] ?? 7; // default Aug
  const year = parts[2] ? parseInt(parts[2], 10) : fallbackYear;
  return new Date(Date.UTC(year, month, day));
}

function formatTxDate(d: Date): string {
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/**
 * Extracts a normalized merchant/payee name from a raw transaction description.
 * e.g. "TELKOM 9C27-5E6E-A295260814 DEBICHECK DEBIT ORDER" → "TELKOM"
 * e.g. "WESBANK_FI85361174582001260815 DEBICHECK DEBIT ORDER" → "WESBANK"
 * e.g. "EKURHULENI SPRINGS RATESTAXES IB PAYMENT TO" → "EKURHULENI SPRINGS"
 */
function extractMerchant(description: string): string {
  const desc = description.toUpperCase();

  // Known merchant normalization
  const merchantPatterns: Array<[RegExp, string]> = [
    [/EKURHULENI|SPRINGS\s*RATES/i, "EKURHULENI MUNICIPALITY"],
    [/TELKOM/i, "TELKOM"],
    [/VODACOM/i, "VODACOM"],
    [/WESBANK/i, "WESBANK"],
    [/NEDBPL|NEDBANK/i, "NEDBANK"],
    [/SBSA\s*RCP|REVOLVING\s*CREDIT/i, "STANDARD BANK RCP"],
    [/SBSA\s*HOMEL|HOME\s*LOAN|534812597/i, "STANDARD BANK HOME LOAN"],
    [/DISCINSURE|DISCOVERY\s*INSURE/i, "DISCOVERY INSURE"],
    [/CARTRACK/i, "CARTRACK"],
    [/TRACKER|G85989/i, "TRACKER"],
    [/SABC\s*TV/i, "SABC TV"],
    [/SBG\s*SEC\s*TRUST|MONEY\s*MARKET/i, "SBG SECURITIES"],
    [/HOERSKOOL|SCHOOL\s*FEES/i, "SCHOOL FEES"],
    [/KABELO/i, "KABELO MOKHOTLA"],
    [/KAMOHELO/i, "KAMOHELO MOKHOTLA"],
    [/BS\s*RAPHUTI|WIFEY|BOITUMELO/i, "BS RAPHUTI"],
    [/UFS\s*BLOEMFONTEIN|UNIVERSITY/i, "UFS UNIVERSITY"],
    [/AUTOBANK|ATM.*WITHDRAWAL|00004472/i, "ATM CASH"],
    [/ELECTRICITY|VAS002/i, "ELECTRICITY PREPAID"],
    [/SEASONS\s*AND\s*SPA/i, "SEASONS AND SPA"],
    [/UCOUNT/i, "UCOUNT REWARDS"],
    [/FIXED\s*MONTHLY\s*FEE/i, "BANK FEES"],
    [/TITANIUM|5773529/i, "TITANIUM CREDIT CARD"],
  ];

  for (const [pat, name] of merchantPatterns) {
    if (pat.test(desc)) return name;
  }

  // Fallback: take the first 2 words
  return desc.split(/\s+/).slice(0, 2).join(" ");
}

/**
 * Fetches all statement transactions for a given user and pay cycle by:
 * 1. Reading MoneyFlow records from the database
 * 2. Reading parsed transactions from Document.parsedData.transactions (if available)
 * 3. Falling back to reading PDF files from disk and extracting transactions via text parsing
 */
async function fetchAllStatementTransactions(
  userId: string,
  cycleStart: Date,
  cycleEnd: Date
): Promise<StatementTransaction[]> {
  const allTransactions: StatementTransaction[] = [];

  // 1. Get all user accounts
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true, name: true, institution: true, accountNumberMasked: true },
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // 2. Fetch MoneyFlow records within the cycle window
  const moneyFlows = await prisma.moneyFlow.findMany({
    where: {
      createdAt: { gte: cycleStart, lte: cycleEnd },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const flow of moneyFlows) {
    const srcAccount = accountMap.get(flow.sourceRef || "");
    const dstAccount = accountMap.get(flow.destinationRef || "");
    const account = srcAccount || dstAccount;

    allTransactions.push({
      id: flow.id,
      date: formatTxDate(flow.createdAt),
      dateObj: flow.createdAt,
      amount: Math.abs(Number(flow.amount)),
      description: `${flow.flowType}: ${flow.sourceRef?.slice(0, 20) || "?"} → ${flow.destinationRef || "?"}`,
      merchant: flow.destinationRef || undefined,
      isBounced: false,
      isDebit: true,
      accountId: account?.id || "",
      accountName: account?.name || "Unknown Account",
      docRef: "Money Lineage Engine",
      sourceFile: "",
    });
  }

  // 3. Fetch all BANK_STATEMENT documents whose period is near the cycle
  // NOTE: Bank statement periods (e.g. Jul 16 - Aug 13) often DON'T align with
  // pay cycle dates (e.g. Aug 14 - Sep 14). A statement ending Aug 13 will contain
  // transactions from Aug 14 (salary day). We use a generous 7-day buffer on both
  // ends and rely on per-transaction date filtering to only match in-cycle items.
  const searchStart = new Date(cycleStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const searchEnd = new Date(cycleEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

  const bankStatementDocs = await prisma.document.findMany({
    where: {
      documentType: "BANK_STATEMENT",
      relatedEntityId: { in: accounts.map((a) => a.id) },
      OR: [
        // Statement period is within or overlaps the buffered window
        {
          periodStart: { lte: searchEnd },
          periodEnd: { gte: searchStart },
        },
        // No period set — include all
        { periodStart: null },
      ],
    },
    select: {
      id: true,
      relatedEntityId: true,
      parsedData: true,
      fileUrl: true,
    },
  });

  for (const doc of bankStatementDocs) {
    const account = accountMap.get(doc.relatedEntityId);
    if (!account) continue;

    const pd = doc.parsedData as any;
    const accountSuffix = account.accountNumberMasked?.replace(/[-\s]/g, "").slice(-4) || "????";
    const docRefBase = `${account.institution} #XXXX${accountSuffix}`;

    // 3a. Check for pre-parsed structured transactions in parsedData
    if (pd?.transactions && Array.isArray(pd.transactions) && pd.transactions.length > 0) {
      for (const tx of pd.transactions) {
        const dateObj = new Date(tx.date);
        if (dateObj >= cycleStart && dateObj <= cycleEnd) {
          allTransactions.push({
            id: tx.id || `${doc.id}_${Math.random().toString(36).slice(2, 8)}`,
            date: formatTxDate(dateObj),
            dateObj,
            amount: Math.abs(Number(tx.amount)),
            description: tx.description || "",
            merchant: tx.merchant || extractMerchant(tx.description || ""),
            isBounced: Boolean(tx.isBounced),
            isDebit: tx.isDebit !== false,
            accountId: account.id,
            accountName: account.name,
            docRef: docRefBase,
            sourceFile: doc.fileUrl || "",
          });
        }
      }
      continue;
    }

    // 3b. Check for rawText in parsedData
    if (pd?.rawText || pd?.fullText) {
      const rawText = pd.rawText || pd.fullText;
      const extracted = extractTransactionsFromStatementText(
        rawText,
        account.name,
        account.id,
        docRefBase,
        doc.fileUrl || ""
      );
      const inRange = extracted.filter((tx) => tx.dateObj >= cycleStart && tx.dateObj <= cycleEnd);
      allTransactions.push(...inRange);
      continue;
    }

    // 3c. Try reading the physical PDF file from disk and extracting raw text
    if (doc.fileUrl) {
      const rawText = await readPdfRawText(doc.fileUrl);
      if (rawText) {
        const extracted = extractTransactionsFromStatementText(
          rawText,
          account.name,
          account.id,
          docRefBase,
          doc.fileUrl
        );
        const inRange = extracted.filter((tx) => tx.dateObj >= cycleStart && tx.dateObj <= cycleEnd);
        allTransactions.push(...inRange);

        // Cache the parsed transactions back into the document for next time
        try {
          await prisma.document.update({
            where: { id: doc.id },
            data: {
              parsedData: {
                ...(pd || {}),
                rawText: rawText.replace(/\0/g, "").replace(/[^\x20-\x7E\n\r\t]/g, " "), // Sanitize null and non-ASCII for DB encoding
                transactions: extracted.map((tx) => ({
                  id: tx.id,
                  date: tx.dateObj.toISOString(),
                  amount: tx.amount,
                  description: tx.description,
                  merchant: tx.merchant,
                  isBounced: tx.isBounced,
                  isDebit: tx.isDebit,
                })),
              } as any,
            },
          });
        } catch {
          // Non-critical: caching failure shouldn't break reconciliation
        }
      }
    }
  }

  return allTransactions;
}

/**
 * Reads raw text from a PDF file on disk.
 * Uses a simple binary-to-text extraction approach (extracts printable ASCII runs).
 * For production, a proper PDF parser (pdf-parse, pdf.js) would be used.
 */
async function readPdfRawText(fileUrl: string): Promise<string | null> {
  try {
    // Resolve the file path relative to project root
    const projectRoot = process.cwd();
    const filePath = path.resolve(projectRoot, fileUrl);

    if (!fs.existsSync(filePath)) return null;

    const buffer = fs.readFileSync(filePath);

    // Extract readable text from PDF binary
    // This is a lightweight extraction — captures text between stream markers
    const text = buffer.toString("latin1");
    const textRuns: string[] = [];

    // Extract BT...ET text blocks from PDF content streams
    const btEtPattern = /BT\s*\n?([\s\S]*?)\s*ET/g;
    let match;
    while ((match = btEtPattern.exec(text)) !== null) {
      // Extract text strings within parentheses: (text here)
      const tjPattern = /\(([^)]*)\)/g;
      let tjMatch;
      while ((tjMatch = tjPattern.exec(match[1])) !== null) {
        const chunk = tjMatch[1].replace(/\\([()\\])/g, "$1");
        if (chunk.trim().length > 0) {
          textRuns.push(chunk);
        }
      }
    }

    if (textRuns.length > 0) {
      return textRuns.join("\n");
    }

    // Fallback: extract printable ASCII runs of 4+ chars
    const asciiRuns: string[] = [];
    let current = "";
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      if (byte >= 32 && byte < 127) {
        current += String.fromCharCode(byte);
      } else {
        if (current.length >= 4) asciiRuns.push(current);
        current = "";
      }
    }
    if (current.length >= 4) asciiRuns.push(current);

    return asciiRuns.join("\n") || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2: FUZZY SEMANTIC MATCHING
// Multi-factor scoring to match budget items against statement transactions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalizes a text string for comparison: lowercase, strip special chars, collapse whitespace.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenizes text into meaningful words (3+ chars, no noise).
 */
function tokenize(text: string): string[] {
  const stopWords = new Set([
    "the", "and", "for", "pty", "ltd", "acc", "account", "payment",
    "debit", "order", "debicheck", "eft", "via", "mymo", "from", "into",
  ]);
  return normalizeText(text)
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));
}

/**
 * Computes token-overlap similarity (Jaccard-like) between two strings.
 * Returns 0..1 where 1 = perfect overlap.
 */
function tokenOverlapSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union;
}

/**
 * Checks if one string contains key tokens from another (directional containment).
 * Returns 0..1 where 1 = all tokens of `needle` found in `haystack`.
 */
function tokenContainment(needle: string, haystack: string): number {
  const needleTokens = tokenize(needle);
  if (needleTokens.length === 0) return 0;

  const haystackTokens = new Set(tokenize(haystack));
  let matches = 0;
  for (const t of needleTokens) {
    if (haystackTokens.has(t)) matches++;
    // Partial match: check if any haystack token starts with or contains needle token
    else {
      for (const h of haystackTokens) {
        if (h.includes(t) || t.includes(h)) { matches += 0.5; break; }
      }
    }
  }
  return matches / needleTokens.length;
}

/**
 * Domain keyword matching: checks if the budget item label and transaction description
 * share domain-specific keywords that indicate they refer to the same obligation.
 */
const DOMAIN_KEYWORD_GROUPS: string[][] = [
  ["ekurhuleni", "municipal", "rates", "water", "refuse", "sewer", "springs", "arrears", "ratestaxes", "3505137295"],
  ["telkom", "510600671", "510625198", "landline", "broadband", "lte", "fibre", "9c27", "5e6e", "a295", "debt", "settlement", "arrangement"],
  ["vodacom", "mobile", "cellular", "i2754234", "fibre"],
  ["wesbank", "vehicle", "finance", "renault", "clio", "85361174582"],
  ["wesbank", "vehicle", "finance", "hyundai", "grand", "i10", "85401320912"],
  ["nedbank", "personal", "loan", "nedbpl", "80056262500", "instalment"],
  ["home", "loan", "bond", "mortgage", "sbsa", "homel", "534812597", "repayment"],
  ["revolving", "credit", "rcp", "sbsa", "22043551"],
  ["discovery", "insure", "discinsure", "insurance", "comprehensive"],
  ["cartrack", "telematics", "cart13"],
  ["tracker", "stolen", "recovery", "g85989"],
  ["electricity", "prepaid", "tokens", "vas002"],
  ["domestic", "worker", "housekeeping", "maid", "cleaning", "wage"],
  ["garden", "gardening", "grounds", "maintenance", "landscaping", "lawn", "yard"],
  ["school", "hoerskool", "jurgen", "arrears"],
  ["university", "tuition", "tertiary", "ufs", "bloemfontein"],
  ["sabc", "tv", "licen"],
  ["kabelo", "mokhotla", "student", "allowance"],
  ["kamohelo", "mokhotla", "allowance"],
  ["wifey", "raphuti", "boitumelo", "household", "support"],
  ["sbg", "securities", "money", "market", "investment"],
  ["ucount", "rewards", "membership"],
  ["fixed monthly fee", "service fee", "bank charges", "overdraft fee", "account management fee", "banking fees", "monthly fee"],
  ["titanium", "prestige", "credit", "card", "3529"],
  ["cash", "withdrawal", "atm", "autobank"],
  ["seasons", "spa", "resort", "leisure", "weekend", "getaway"],
];

function domainKeywordScore(budgetLabel: string, txDescription: string): number {
  const budgetNorm = normalizeText(budgetLabel);
  const txNorm = normalizeText(txDescription);
  const combined = budgetNorm + " " + txNorm;

  let bestGroupScore = 0;

  for (const group of DOMAIN_KEYWORD_GROUPS) {
    let budgetHits = 0;
    let txHits = 0;

    for (const keyword of group) {
      if (budgetNorm.includes(keyword)) budgetHits++;
      if (txNorm.includes(keyword)) txHits++;
    }

    // Both sides must have at least 1 keyword from the same group
    if (budgetHits > 0 && txHits > 0) {
      const score = (budgetHits + txHits) / (group.length * 2);
      bestGroupScore = Math.max(bestGroupScore, Math.min(score * 2, 1.0)); // Scale and cap at 1.0
    }
  }

  return bestGroupScore;
}

interface MatchCandidate {
  transaction: StatementTransaction;
  score: number;
  breakdown: {
    textSimilarity: number;
    domainKeywords: number;
    amountProximity: number;
    merchantMatch: number;
    containment: number;
  };
  strategy: string;
}

/**
 * Scores a budget item against a single transaction using multi-factor analysis.
 * Returns a score from 0..1 with breakdown.
 */
function scoreBudgetItemMatch(
  budgetLabel: string,
  budgetAmount: number,
  budgetSourceRef: string | null,
  tx: StatementTransaction
): MatchCandidate {
  // 1. Text similarity (token overlap between budget label and tx description)
  const textSim = tokenOverlapSimilarity(budgetLabel, tx.description);

  // 2. Domain keyword matching
  const domainScore = domainKeywordScore(budgetLabel, tx.description);

  // 3. Amount proximity (within tolerance band)
  const amountDiff = Math.abs(budgetAmount - tx.amount);
  const amountTolerance = budgetAmount * 0.15; // 15% tolerance
  let amountProximity = 0;
  if (amountDiff < 1) amountProximity = 1.0; // Exact match
  else if (amountDiff <= amountTolerance) amountProximity = 1.0 - (amountDiff / amountTolerance) * 0.5;
  else if (amountDiff <= budgetAmount * 0.5) amountProximity = 0.2; // Within 50% — weak signal
  else amountProximity = 0; // Too far — no amount signal

  // HARD VETO: If the amounts differ by more than 3x, this is almost certainly
  // a false positive. Cap the entire score to prevent domain keyword matches
  // from overriding wildly wrong amounts (e.g. R450 matching R5920).
  const amountRatio = Math.max(budgetAmount, tx.amount) / Math.max(1, Math.min(budgetAmount, tx.amount));
  const amountVeto = amountRatio > 3.0;

  // 4. Merchant name match
  let merchantMatch = 0;
  if (tx.merchant) {
    merchantMatch = tokenContainment(
      normalizeText(budgetLabel),
      normalizeText(tx.merchant)
    );
  }

  // 5. SourceRef match (if budget item has a sourceRef like account number)
  let sourceRefBoost = 0;
  if (budgetSourceRef) {
    const srcNorm = normalizeText(budgetSourceRef);
    if (normalizeText(tx.description).includes(srcNorm)) sourceRefBoost = 0.3;
  }

  // 6. Containment score (directional: budget label tokens found in tx description)
  const containment = tokenContainment(budgetLabel, tx.description);

  // Weighted composite score — amount has highest weight to prevent mismatches
  let score = Math.min(1.0,
    domainScore * 0.30 +      // Domain keywords — strong signal
    amountProximity * 0.30 +   // Amount match — critical, highest weight
    containment * 0.15 +       // Token containment
    textSim * 0.10 +           // Raw text similarity
    merchantMatch * 0.10 +     // Merchant name match
    sourceRefBoost * 0.05      // SourceRef bonus
  );

  // Apply amount veto: hard-cap score if amounts are wildly different
  if (amountVeto) score = Math.min(score, 0.20);

  return {
    transaction: tx,
    score,
    breakdown: {
      textSimilarity: textSim,
      domainKeywords: domainScore,
      amountProximity,
      merchantMatch,
      containment,
    },
    strategy: domainScore > 0.5 ? "DOMAIN_KEYWORD" : textSim > 0.3 ? "TEXT_SIMILARITY" : "MULTI_FACTOR",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2b: COMBINED PAYMENT & BOUNCED-THEN-REPAID DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

interface CombinedPaymentMatch {
  primaryBudgetItemId: string;
  secondaryBudgetItemId: string;
  transaction: StatementTransaction;
  combinedAmount: number;
  primaryAmount: number;
  secondaryAmount: number;
}

/**
 * Detects when a single transaction amount matches the sum of 2+ budget items
 * to the same payee (e.g. Ekurhuleni rates R2500 + arrears R1573.83 = R4073.83).
 */
function detectCombinedPayments(
  budgetItems: Array<{ id: string; label: string; amount: number; category: string; sourceRef?: string | null }>,
  transactions: StatementTransaction[]
): CombinedPaymentMatch[] {
  const matches: CombinedPaymentMatch[] = [];

  // Only check pairs of budget items that share domain keyword groups
  for (let i = 0; i < budgetItems.length; i++) {
    for (let j = i + 1; j < budgetItems.length; j++) {
      const a = budgetItems[i];
      const b = budgetItems[j];

      // Check if they share a domain keyword group (same payee)
      const aNorm = normalizeText(a.label);
      const bNorm = normalizeText(b.label);

      let samePayee = false;
      for (const group of DOMAIN_KEYWORD_GROUPS) {
        const aHits = group.filter((k) => aNorm.includes(k)).length;
        const bHits = group.filter((k) => bNorm.includes(k)).length;
        if (aHits >= 1 && bHits >= 1) {
          samePayee = true;
          break;
        }
      }

      if (!samePayee) continue;

      const combinedAmount = Number(a.amount) + Number(b.amount);

      // Find a transaction that matches the combined amount (±R5 tolerance)
      for (const tx of transactions) {
        if (tx.isBounced) continue;
        if (Math.abs(tx.amount - combinedAmount) <= 5) {
          // Verify the transaction description relates to either budget item
          const scoreA = domainKeywordScore(a.label, tx.description);
          const scoreB = domainKeywordScore(b.label, tx.description);
          if (scoreA > 0.2 || scoreB > 0.2) {
            matches.push({
              primaryBudgetItemId: a.id,
              secondaryBudgetItemId: b.id,
              transaction: tx,
              combinedAmount,
              primaryAmount: Number(a.amount),
              secondaryAmount: Number(b.amount),
            });
          }
        }
      }
    }
  }

  return matches;
}

/**
 * Detects when a debit order bounced on one account but the same obligation was
 * paid via EFT from a different account within 5 days.
 */
function detectBouncedThenRepaid(
  transactions: StatementTransaction[]
): Array<{ bouncedTx: StatementTransaction; repaidTx: StatementTransaction }> {
  const bounced = transactions.filter((tx) => tx.isBounced);
  const cleared = transactions.filter((tx) => !tx.isBounced);
  const pairs: Array<{ bouncedTx: StatementTransaction; repaidTx: StatementTransaction }> = [];

  for (const bTx of bounced) {
    // Find a cleared transaction from a DIFFERENT account, to the same payee, within 5 days
    const bouncedMerchant = bTx.merchant || extractMerchant(bTx.description);
    const bouncedDate = bTx.dateObj.getTime();

    for (const cTx of cleared) {
      if (cTx.accountId === bTx.accountId) continue; // Must be different account

      const dayDiff = Math.abs(cTx.dateObj.getTime() - bouncedDate) / (1000 * 60 * 60 * 24);
      if (dayDiff > 5) continue;

      const clearedMerchant = cTx.merchant || extractMerchant(cTx.description);
      if (clearedMerchant === bouncedMerchant || domainKeywordScore(bTx.description, cTx.description) > 0.3) {
        // Amount should be similar
        if (Math.abs(cTx.amount - bTx.amount) / bTx.amount < 0.15) {
          pairs.push({ bouncedTx: bTx, repaidTx: cTx });
        }
      }
    }
  }

  return pairs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3: LLM ARBITER (Optional — graceful fallback if no LLM configured)
// For ambiguous matches where top candidates score within 15% of each other
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calls the user's configured BUDGET_AGENT LLM to arbitrate ambiguous matches.
 * Returns the LLM's preferred match or null if LLM is unavailable.
 */
async function llmArbitrateMatch(
  budgetLabel: string,
  budgetAmount: number,
  candidates: MatchCandidate[]
): Promise<{ chosenIndex: number; reasoning: string } | null> {
  try {
    // Dynamic import to avoid circular dependency and make LLM optional
    const { executeAgentPrompt } = await import("@/agents/llmProvider");

    const candidateDescriptions = candidates
      .map((c, i) => `  ${i + 1}. "${c.transaction.description}" — R${c.transaction.amount.toFixed(2)} on ${c.transaction.date} from ${c.transaction.accountName} (score: ${c.score.toFixed(3)})`)
      .join("\n");

    const prompt = `You are a South African personal finance reconciliation expert. Match a budget item to the correct bank statement transaction.

BUDGET ITEM: "${budgetLabel}" — R${budgetAmount.toFixed(2)}

CANDIDATE TRANSACTIONS:
${candidateDescriptions}

Which candidate (1-${candidates.length}) is the correct match for this budget item? Consider:
- The description/payee relevance
- The amount match
- Whether it's from the expected account (debit orders from Prestige, EFTs from MyMo)

Respond in JSON only: {"chosenIndex": <number>, "reasoning": "<brief explanation>"}`;

    const result = await executeAgentPrompt("BUDGET_AGENT", prompt);
    if (result.success && result.responseText) {
      // Parse JSON from LLM response
      const jsonMatch = result.responseText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.chosenIndex === "number" && parsed.chosenIndex >= 1 && parsed.chosenIndex <= candidates.length) {
          return { chosenIndex: parsed.chosenIndex - 1, reasoning: parsed.reasoning || "" };
        }
      }
    }
  } catch {
    // LLM unavailable — graceful fallback to deterministic scoring
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RECONCILIATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

const MATCH_THRESHOLD = 0.35; // Minimum score to consider a match
const AMBIGUITY_THRESHOLD = 0.12; // If top 2 candidates within this range, use LLM

/**
 * AI-Powered Budget Reconciliation Engine.
 *
 * Layer 1: Reads actual transactions from database + physical PDF files across all accounts
 * Layer 2: Multi-factor fuzzy semantic scoring (domain keywords, amount, text, merchant)
 * Layer 3: LLM arbitration for ambiguous matches (optional, graceful fallback)
 */
export async function reconcileBudgetItemsForMonth(
  userId: string,
  monthKey: string,
  budgetItems: any[]
): Promise<{
  items: ReconciledBudgetItem[];
  summary: BudgetReconciliationSummary;
}> {
  const cycleBounds = resolveSalaryCycleRange(monthKey);
  const cycleStart = cycleBounds.startDate;
  const cycleEnd = cycleBounds.endDate;

  // ── Layer 1: Fetch all transactions from all sources ──
  const allTransactions = await fetchAllStatementTransactions(userId, cycleStart, cycleEnd);

  // ── Layer 2b: Detect combined payments ──
  const budgetItemsForDetection = budgetItems.map((item) => ({
    id: item.id,
    label: item.label || "",
    amount: Number(item.amount),
    category: item.category,
    sourceRef: item.sourceRef,
  }));

  const combinedPayments = detectCombinedPayments(budgetItemsForDetection, allTransactions);
  const combinedPaymentMap = new Map<string, CombinedPaymentMatch>();
  for (const cp of combinedPayments) {
    combinedPaymentMap.set(cp.primaryBudgetItemId, cp);
    combinedPaymentMap.set(cp.secondaryBudgetItemId, cp);
  }

  // ── Layer 2b: Detect bounced-then-repaid flows ──
  const bouncedRepaidPairs = detectBouncedThenRepaid(allTransactions);

  // Track used transactions to prevent double-matching
  const usedTransactionIds = new Set<string>();

  let totalBudgeted = 0;
  let totalExecuted = 0;
  let totalPending = 0;
  let totalBounced = 0;
  let executedCount = 0;
  let pendingCount = 0;
  let bouncedCount = 0;

  // Track transactions used in combined payments separately — a combined payment
  // transaction should be claimable by BOTH budget items in the pair
  const combinedPaymentTxIds = new Set<string>();

  const reconciledItems: ReconciledBudgetItem[] = [];

  for (const item of budgetItems) {
    const plannedAmount = Number(item.amount);
    totalBudgeted += plannedAmount;

    const itemLabel = item.label || "";
    const sourceRef = item.sourceRef || null;

    // ── Check combined payment first ──
    const combinedMatch = combinedPaymentMap.get(item.id);
    if (combinedMatch) {
      // Combined payments: both budget items share the same transaction
      combinedPaymentTxIds.add(combinedMatch.transaction.id);

      const myShare = item.id === combinedMatch.primaryBudgetItemId
        ? combinedMatch.primaryAmount
        : combinedMatch.secondaryAmount;

      executedCount++;
      totalExecuted += myShare;

      reconciledItems.push({
        id: item.id,
        category: item.category,
        label: item.label,
        amount: plannedAmount,
        isComputed: item.isComputed,
        sourceRef: item.sourceRef,
        confidence: item.confidence,
        note: item.note,
        month: item.month,
        execution: {
          isExecuted: true,
          executionStatus: "CLEARED",
          statusLabel: `✓ Cleared ${combinedMatch.transaction.date} (Combined Payment)`,
          executedAmount: myShare,
          executedDate: combinedMatch.transaction.date,
          executionRef: combinedMatch.transaction.description,
          statementDocName: combinedMatch.transaction.docRef,
          variance: myShare - plannedAmount,
          rawMatchedDescription: combinedMatch.transaction.description,
          matchConfidence: 0.95,
          matchStrategy: "COMBINED_PAYMENT",
        },
      });
      continue;
    }

    // ── Layer 2: Score all transactions against this budget item ──
    const candidates: MatchCandidate[] = [];
    for (const tx of allTransactions) {
      if (usedTransactionIds.has(tx.id) || combinedPaymentTxIds.has(tx.id)) continue;
      if (!tx.isDebit) continue; // Only match debit transactions to budget items

      const candidate = scoreBudgetItemMatch(itemLabel, plannedAmount, sourceRef, tx);
      if (candidate.score >= MATCH_THRESHOLD) {
        candidates.push(candidate);
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    let bestMatch: MatchCandidate | null = null;

    if (candidates.length >= 2) {
      const scoreDiff = candidates[0].score - candidates[1].score;

      if (scoreDiff < AMBIGUITY_THRESHOLD && candidates[0].score > 0.4) {
        // ── Layer 3: LLM arbitration for ambiguous matches ──
        const topCandidates = candidates.slice(0, Math.min(5, candidates.length));
        const llmResult = await llmArbitrateMatch(itemLabel, plannedAmount, topCandidates);

        if (llmResult) {
          bestMatch = topCandidates[llmResult.chosenIndex];
          if (bestMatch) bestMatch.strategy = `LLM_ARBITER: ${llmResult.reasoning}`;
        }
      }

      if (!bestMatch) {
        bestMatch = candidates[0];
      }
    } else if (candidates.length === 1) {
      bestMatch = candidates[0];
    }

    // ── Check for bounced-then-repaid scenario ──
    if (bestMatch && bestMatch.transaction.isBounced) {
      const repaidPair = bouncedRepaidPairs.find(
        (p) =>
          p.bouncedTx.id === bestMatch!.transaction.id ||
          domainKeywordScore(p.bouncedTx.description, bestMatch!.transaction.description) > 0.3
      );

      if (repaidPair) {
        // Override with the repaid transaction
        bestMatch = {
          transaction: repaidPair.repaidTx,
          score: bestMatch.score + 0.1,
          breakdown: bestMatch.breakdown,
          strategy: `BOUNCED_THEN_REPAID: Bounced on ${repaidPair.bouncedTx.accountName}, repaid from ${repaidPair.repaidTx.accountName}`,
        };
      }
    }

    // ── Build execution result ──
    let execution: BudgetItemExecution;

    if (bestMatch && bestMatch.score >= MATCH_THRESHOLD) {
      usedTransactionIds.add(bestMatch.transaction.id);

      const executedAmount = Number(bestMatch.transaction.amount);
      const isBounced = Boolean(bestMatch.transaction.isBounced);
      const isPartial = !isBounced && executedAmount < plannedAmount - 5.0;

      if (isBounced) {
        bouncedCount++;
        totalBounced += plannedAmount;
        execution = {
          isExecuted: false,
          executionStatus: "BOUNCED",
          statusLabel: "⚠️ Unpaid / Bounced on Statement",
          executedAmount: 0,
          executedDate: bestMatch.transaction.date,
          executionRef: bestMatch.transaction.description,
          statementDocName: bestMatch.transaction.docRef,
          variance: -plannedAmount,
          rawMatchedDescription: bestMatch.transaction.description,
          matchConfidence: bestMatch.score,
          matchStrategy: bestMatch.strategy,
        };
      } else if (isPartial) {
        executedCount++;
        totalExecuted += executedAmount;
        totalPending += plannedAmount - executedAmount;
        execution = {
          isExecuted: true,
          executionStatus: "PARTIAL",
          statusLabel: `⚠️ Partial Payment (${bestMatch.transaction.date})`,
          executedAmount,
          executedDate: bestMatch.transaction.date,
          executionRef: bestMatch.transaction.description,
          statementDocName: bestMatch.transaction.docRef,
          variance: executedAmount - plannedAmount,
          rawMatchedDescription: bestMatch.transaction.description,
          matchConfidence: bestMatch.score,
          matchStrategy: bestMatch.strategy,
        };
      } else {
        executedCount++;
        totalExecuted += executedAmount;
        execution = {
          isExecuted: true,
          executionStatus: "CLEARED",
          statusLabel: `✓ Cleared ${bestMatch.transaction.date}`,
          executedAmount,
          executedDate: bestMatch.transaction.date,
          executionRef: bestMatch.transaction.description,
          statementDocName: bestMatch.transaction.docRef,
          variance: executedAmount - plannedAmount,
          rawMatchedDescription: bestMatch.transaction.description,
          matchConfidence: bestMatch.score,
          matchStrategy: bestMatch.strategy,
        };
      }
    } else {
      pendingCount++;
      totalPending += plannedAmount;
      execution = {
        isExecuted: false,
        executionStatus: "PENDING",
        statusLabel: "⏳ Pending Statement Clearance",
        executedAmount: 0,
        executedDate: null,
        executionRef: null,
        statementDocName: null,
        variance: -plannedAmount,
        rawMatchedDescription: null,
      };
    }

    reconciledItems.push({
      id: item.id,
      category: item.category,
      label: item.label,
      amount: plannedAmount,
      isComputed: item.isComputed,
      sourceRef: item.sourceRef,
      confidence: item.confidence,
      note: item.note,
      month: item.month,
      execution,
    });
  }

  const totalItemsCount = budgetItems.length;
  const executionPercentage = totalBudgeted > 0 ? (totalExecuted / totalBudgeted) * 100 : 0;

  return {
    items: reconciledItems,
    summary: {
      totalBudgeted,
      totalExecuted,
      totalPending,
      totalBounced,
      executedCount,
      pendingCount,
      bouncedCount,
      totalItemsCount,
      executionPercentage,
      cycleRangeFormatted: cycleBounds.formattedRange,
    },
  };
}

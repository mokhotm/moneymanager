import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { generateEmbeddingVector } from "@/lib/embeddings";

export interface DocumentScanResult {
  fileHash: string;
  isExactDuplicate: boolean;
  documentType: "BANK_STATEMENT" | "PAYSLIP" | "INVOICE" | "MUNICIPAL_BILL" | "INVESTMENT_STATEMENT" | "OTHER";
  authorityLevel: "PRIMARY_GROUND_TRUTH" | "SUPPORTING_VERIFICATION";
  detectedUrgency: "NONE" | "SERVICE_INTERRUPTION_RISK" | "LEGAL_ACTION_RISK" | "CREDIT_BUREAU_RISK";
  urgencyNote?: string;
  parsedFields?: Record<string, any>;
  embeddingsCreated?: number;
}

const URGENCY_PATTERNS = [
  { pattern: /pre-termination notice/i, flag: "SERVICE_INTERRUPTION_RISK", label: "Pre-termination notice detected" },
  { pattern: /disconnection notice/i, flag: "SERVICE_INTERRUPTION_RISK", label: "Disconnection notice detected" },
  { pattern: /final notice/i, flag: "SERVICE_INTERRUPTION_RISK", label: "Final notice issued" },
  { pattern: /handed over for collection/i, flag: "LEGAL_ACTION_RISK", label: "Collection handed over" },
  { pattern: /legal action/i, flag: "LEGAL_ACTION_RISK", label: "Legal action warning" },
  { pattern: /letter of demand/i, flag: "LEGAL_ACTION_RISK", label: "Letter of demand detected" },
  { pattern: /default judgment/i, flag: "CREDIT_BUREAU_RISK", label: "Credit default risk" },
];

/**
 * Compute SHA-256 file hash for exact duplicate detection
 */
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Scan text extracted from document for pre-termination and urgency phrases
 */
export function scanUrgencyPhrases(text: string): { flag: "NONE" | "SERVICE_INTERRUPTION_RISK" | "LEGAL_ACTION_RISK" | "CREDIT_BUREAU_RISK"; note?: string } {
  for (const item of URGENCY_PATTERNS) {
    if (item.pattern.test(text)) {
      const match = text.match(item.pattern);
      return {
        flag: item.flag as any,
        note: `${item.label}: "${match ? match[0] : ''}" parsed from document.`,
      };
    }
  }
  return { flag: "NONE" };
}

function sanitizeText(str: string): string {
  return str.replace(/[^\x00-\x7F]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Perform Document Agent Ingestion Pipeline with AUTOMATIC Vector Embedding
 */
export async function processAndVectorizeDocument(
  documentId: string,
  fileBuffer: Buffer,
  rawText: string,
  existingHashes: string[]
): Promise<DocumentScanResult> {
  const hash = computeFileHash(fileBuffer);
  const isDuplicate = existingHashes.includes(hash);

  const urgency = scanUrgencyPhrases(rawText);

  let docType: DocumentScanResult["documentType"] = "OTHER";
  const lower = rawText.toLowerCase();
  if (lower.includes("payslip") || lower.includes("sars") || lower.includes("gross pay") || lower.includes("nett pay")) {
    docType = "PAYSLIP";
  } else if (lower.includes("statement") || lower.includes("account balance") || lower.includes("standard bank")) {
    docType = "BANK_STATEMENT";
  } else if (lower.includes("ekurhuleni") || lower.includes("rates & taxes") || lower.includes("water") || lower.includes("electricity")) {
    docType = "MUNICIPAL_BILL";
  } else if (lower.includes("telkom") || lower.includes("invoice")) {
    docType = "INVOICE";
  } else if (lower.includes("portfolio") || lower.includes("investment") || lower.includes("unit trust")) {
    docType = "INVESTMENT_STATEMENT";
  }

  // AUTOMATIC VECTOR EMBEDDING GENERATION
  let embeddingsCount = 0;
  if (!isDuplicate && rawText.trim().length > 0) {
    const lines = rawText.split("\n").map((l) => sanitizeText(l)).filter((l) => l.length > 0);
    for (let c = 0; c < lines.length; c += 8) {
      const chunkText = lines.slice(c, c + 8).join(" | ");
      if (chunkText.length < 10) continue;

      const vector = generateEmbeddingVector(chunkText);
      await prisma.documentEmbedding.create({
        data: {
          documentId,
          contentChunk: chunkText.slice(0, 1000),
          embeddingJson: vector,
          metadataJson: { docType, urgency: urgency.flag },
        },
      });
      embeddingsCount++;
    }
  }

  const authorityLevel = docType === "BANK_STATEMENT" ? "PRIMARY_GROUND_TRUTH" : "SUPPORTING_VERIFICATION";

  return {
    fileHash: hash,
    isExactDuplicate: isDuplicate,
    documentType: docType,
    authorityLevel,
    detectedUrgency: urgency.flag,
    urgencyNote: urgency.note,
    embeddingsCreated: embeddingsCount,
  };
}

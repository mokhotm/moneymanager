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
 * Parse structured numbers from South African / standard financial formats
 * Handles: "115.641,02" -> 115641.02, "115,641.02" -> 115641.02, "115 641.02" -> 115641.02
 */
function parseFinancialAmount(str: string): number | null {
  if (!str) return null;
  const clean = str.trim().replace(/[R\s]/g, "");
  if (/^\d{1,3}(?:\.\d{3})*(?:,\d{2})?$/.test(clean)) {
    // German / SA dot-thousands comma-decimal format: "115.641,02"
    return parseFloat(clean.replace(/\./g, "").replace(",", "."));
  }
  if (/^\d{1,3}(?:,\d{3})*(?:\.\d{2})?$/.test(clean)) {
    // Standard comma-thousands dot-decimal format: "115,641.02"
    return parseFloat(clean.replace(/,/g, ""));
  }
  const numeric = parseFloat(clean.replace(/[^\d.-]/g, ""));
  return isNaN(numeric) ? null : numeric;
}

export function extractStructuredDocumentFields(text: string, docType: string): Record<string, any> {
  const fields: Record<string, any> = {};

  if (docType === "PAYSLIP") {
    // Basic Salary
    const basicMatch = text.match(/Basic\s*Salary\s*(?:[\d,]+)?\s*([0-9.,]+)/i);
    if (basicMatch) fields.basicSalary = parseFinancialAmount(basicMatch[1]);

    // Gross Income
    const grossMatch = text.match(/Gross\s*Income\s*([0-9.,]+)/i);
    if (grossMatch) fields.grossIncome = parseFinancialAmount(grossMatch[1]);

    // Total Deductions
    const dedMatch = text.match(/Total\s*Deductions\s*([0-9.,]+)/i);
    if (dedMatch) fields.totalDeductions = parseFinancialAmount(dedMatch[1]);

    // Nett Pay
    const nettMatch = text.match(/(?:Main\s*Nett\s*Pay|Nett\s*Pay)\s*([0-9.,]+)/i);
    if (nettMatch) fields.nettPay = parseFinancialAmount(nettMatch[1]);

    // PAYE / Tax
    const taxMatch = text.match(/(?:Total\s*Tax|4102\s*PAYE)\s*([0-9.,]+)/i);
    if (taxMatch) fields.payeTax = parseFinancialAmount(taxMatch[1]);

    // Medical Aid
    const medMatch = text.match(/(?:Discovery\s*Medical\s*Aid|Medical\s*Aid\s*Contrib|Medical\s*Aid\s*Cash\s*All)\s*(?:EE\s*\d+\s*)?([0-9.,]+)/i);
    if (medMatch) fields.medicalAid = parseFinancialAmount(medMatch[1]);

    // Tax Number
    const taxNumMatch = text.match(/Tax\s*Reference\s*Number\D*(\d{10})/i) || text.match(/(?:Tax|No)\s*[:#]?\s*(\d{10})/i);
    if (taxNumMatch) fields.taxNumber = taxNumMatch[1];

    // Employee ID
    const empIdMatch = text.match(/(?:Employee\s*ID|Emp\s*No)\D*(\d{6,10})/i) || text.match(/\b(000\d{5,7})\b/);
    if (empIdMatch) fields.employeeId = empIdMatch[1];

    // Job Title
    const jobMatch = text.match(/Job\s*Title\s*[:*]?\s*([^\n\r*]+)/i) || text.match(/Specialist:\s*([A-Za-z0-9\s/()\-]+)/i);
    if (jobMatch) fields.jobTitle = jobMatch[1].trim();

    // Pay Date (Prioritize Main Pay Date over Date Printed)
    const mainPayMatch = text.match(/Main\s*Pay\s*Date\s*[:*]?\s*(\d{2}[./-]\d{2}[./-]\d{4})/i) 
      || text.match(/Main\s*Pay\s*Date[\s\S]{1,60}?(\d{2}[./-]\d{2}[./-]\d{4})/i)
      || text.match(/(?:Main\s*Pay\s*Date|Date\s*Printed)\D*(\d{2}[./-]\d{2}[./-]\d{4})/i);
    if (mainPayMatch) fields.mainPayDate = mainPayMatch[1];

    // Employer
    if (/sars|south african revenue service/i.test(text)) {
      fields.employer = "South African Revenue Service (SARS)";
    }
  }

  return fields;
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

  // 1. BANK STATEMENT (Check bank headers & structure FIRST)
  if (
    lower.includes("standard bank") ||
    lower.includes("the standard bank of south africa") ||
    lower.includes("fnb") ||
    lower.includes("first national bank") ||
    lower.includes("capitec") ||
    lower.includes("absa") ||
    lower.includes("nedbank") ||
    lower.includes("bank statement") ||
    lower.includes("statement of account") ||
    lower.includes("opening balance") ||
    lower.includes("closing balance")
  ) {
    docType = "BANK_STATEMENT";
  } else if (lower.includes("payslip") || lower.includes("sars") || lower.includes("gross pay") || lower.includes("nett pay") || lower.includes("irp5") || lower.includes("basic salary")) {
    docType = "PAYSLIP";
  } else if (lower.includes("ekurhuleni") || lower.includes("rates & taxes") || lower.includes("city of johannesburg") || lower.includes("city of tshwane")) {
    docType = "MUNICIPAL_BILL";
  } else if (lower.includes("telkom") || lower.includes("vodacom") || lower.includes("mtn") || lower.includes("invoice")) {
    docType = "INVOICE";
  } else if (lower.includes("portfolio") || lower.includes("investment") || lower.includes("unit trust")) {
    docType = "INVESTMENT_STATEMENT";
  }

  const parsedFields = extractStructuredDocumentFields(rawText, docType);

  // AUTOMATIC VECTOR EMBEDDING GENERATION
  let embeddingsCount = 0;
  if (!isDuplicate && rawText.trim().length > 0) {
    const lines = rawText.split("\n").map((l) => sanitizeText(l)).filter((l) => l.length > 0);

    // Delete any existing embeddings for this document to avoid duplicates on re-processing
    await prisma.documentEmbedding.deleteMany({ where: { documentId } });

    // Chunking text without truncating:
    // Break into chunks of 6 lines each, ensuring 100% of document content is embedded
    for (let c = 0; c < lines.length; c += 6) {
      const chunkLines = lines.slice(c, c + 6);
      const chunkText = chunkLines.join("\n");
      if (chunkText.trim().length < 3) continue;

      const vector = generateEmbeddingVector(chunkText);
      await prisma.documentEmbedding.create({
        data: {
          documentId,
          contentChunk: chunkText,
          embeddingJson: vector,
          metadataJson: { docType, urgency: urgency.flag, chunkIndex: embeddingsCount + 1 },
        },
      });
      embeddingsCount++;
    }

    // Fallback if few lines but long text
    if (embeddingsCount === 0 && rawText.trim().length > 0) {
      const vector = generateEmbeddingVector(rawText);
      await prisma.documentEmbedding.create({
        data: {
          documentId,
          contentChunk: rawText,
          embeddingJson: vector,
          metadataJson: { docType, urgency: urgency.flag, chunkIndex: 1 },
        },
      });
      embeddingsCount = 1;
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
    parsedFields,
    embeddingsCreated: embeddingsCount,
  };
}

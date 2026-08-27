import { prisma } from "@/lib/prisma";

export interface ExtractedDocumentMetadata {
  sourceDocumentId?: string;
  sourceDocumentName?: string;
  documentType?: string;
  merchantName: string;
  merchantAddress: string;
  city: string;
  amount?: number;
  flowType?: string;
  confidence: "CONFIRMED" | "ESTIMATED";
  extractionNotes?: string;
}

function inferFlowType(documentType?: string): string | undefined {
  if (documentType === "PAYSLIP") return "INCOME";
  if (documentType === "BANK_STATEMENT") return "TRANSFER";
  if (documentType === "MUNICIPAL_BILL" || documentType === "INVOICE" || documentType === "RECEIPT") return "CASH_SPENDING";
  return undefined;
}

/**
 * Extract & pre-populate transaction metadata from uploaded document database
 */
export async function extractMetadataForTransaction(
  query: string,
  amount?: number,
  options?: { documentId?: string }
): Promise<ExtractedDocumentMetadata> {
  const safeQuery = query.trim();

  if (options?.documentId) {
    const doc = await prisma.document.findUnique({
      where: { id: options.documentId },
      select: {
        id: true,
        documentType: true,
        parsedData: true,
        fileUrl: true,
      },
    });

    if (doc) {
      const parsedData = (doc.parsedData as any) || {};
      const parsedFields = parsedData.parsedFields || parsedData;
      const merchantName =
        parsedFields.merchantName ||
        parsedFields.payee ||
        parsedFields.employer ||
        parsedFields.institution ||
        safeQuery;

      return {
        sourceDocumentId: doc.id,
        sourceDocumentName: parsedFields.sourceDocumentName || (typeof doc.fileUrl === "string" ? doc.fileUrl : undefined),
        documentType: doc.documentType,
        merchantName,
        merchantAddress: parsedFields.merchantAddress || parsedFields.address || "",
        city: parsedFields.city || "",
        amount,
        flowType: parsedFields.flowType || inferFlowType(doc.documentType),
        confidence: "ESTIMATED",
        extractionNotes: "Metadata derived from parsed document fields.",
      };
    }
  }

  return {
    merchantName: safeQuery,
    merchantAddress: "",
    city: "",
    amount,
    confidence: "ESTIMATED",
    extractionNotes: "No mapped document metadata found for this query.",
  };
}

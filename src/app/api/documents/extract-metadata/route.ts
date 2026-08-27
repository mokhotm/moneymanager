import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/session";
import { extractMetadataForTransaction } from "@/lib/documentMetadataExtractor";
import { prisma } from "@/lib/prisma";
import { getUserEntityScope, isEntityOwnedByUser } from "@/lib/userEntityScope";

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { query, amount, documentId } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    let scopedDocumentId: string | undefined;
    if (documentId) {
      if (typeof documentId !== "string") {
        return NextResponse.json({ error: "documentId must be a string" }, { status: 400 });
      }

      const scope = await getUserEntityScope(userId);
      const doc = await prisma.document.findUnique({ where: { id: documentId }, select: { id: true, relatedEntityId: true } });
      if (!doc || !isEntityOwnedByUser(doc.relatedEntityId, scope)) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      scopedDocumentId = doc.id;
    }

    const metadata = await extractMetadataForTransaction(query.trim(), amount, { documentId: scopedDocumentId });

    return NextResponse.json({
      success: true,
      metadata,
    });
  } catch (error: any) {
    console.error("POST /api/documents/extract-metadata error:", error);
    return NextResponse.json(
      { error: "Failed to extract metadata from document", message: error?.message },
      { status: 500 }
    );
  }
}

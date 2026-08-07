import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/session";
import { extractMetadataForTransaction } from "@/lib/documentMetadataExtractor";

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { query, amount, documentId } = body;

    const metadata = await extractMetadataForTransaction(query || "Standard Bank", amount);

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

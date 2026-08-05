import { NextRequest, NextResponse } from "next/server";
import { searchDocumentEmbeddings } from "@/lib/embeddings";
import { getEffectiveUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q || q.trim().length === 0) {
      return NextResponse.json([]);
    }

    const userId = await getEffectiveUserId(req) ?? undefined;
    const results = await searchDocumentEmbeddings(q.trim(), 5, userId);
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

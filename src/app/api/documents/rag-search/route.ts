import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/session";
import { queryFinancialMemory } from "@/agents/ragMemoryAgent";

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { queryText, yearFilter, documentTypeFilter } = body;

    if (!queryText) {
      return NextResponse.json({ error: "queryText is required" }, { status: 400 });
    }

    const response = await queryFinancialMemory(
      {
        queryText,
        yearFilter,
        documentTypeFilter,
      },
      userId
    );

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error: any) {
    console.error("RAG search API error:", error);
    return NextResponse.json({ error: error.message || "Failed to query document memory" }, { status: 500 });
  }
}

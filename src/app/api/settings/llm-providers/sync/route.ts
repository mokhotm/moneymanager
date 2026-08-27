import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { syncEnvironmentLLMsToDatabase } from "@/services/llmSyncService";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncEnvironmentLLMsToDatabase();
    return NextResponse.json({
      success: true,
      ...result,
      message: `Successfully synchronized ${result.syncedCount} environment LLM provider(s).`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

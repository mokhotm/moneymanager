import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/session";
import { executeMailboxScanForUser } from "@/services/emailIngestionService";

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await executeMailboxScanForUser(userId);

    return NextResponse.json({
      success: report.success,
      report,
    });
  } catch (error: any) {
    console.error("Scan now execution error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute email statement scan" }, { status: 500 });
  }
}

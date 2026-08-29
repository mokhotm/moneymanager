import { NextRequest, NextResponse } from "next/server";
import { processInboundWebhookPayload } from "@/services/emailStatementParser";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await processInboundWebhookPayload(body);

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (error: any) {
    console.error("Ingestion webhook error:", error);
    return NextResponse.json({ error: error.message || "Failed to process inbound webhook" }, { status: 500 });
  }
}

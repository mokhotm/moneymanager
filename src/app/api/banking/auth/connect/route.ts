import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { generateStitchAuthUrl } from "@/services/stitchOpenBankingService";
import crypto from "crypto";

/**
 * POST /api/banking/auth/connect
 * Generates the official Stitch Open Banking OAuth redirect URL to authenticate with the user's chosen bank
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { institutionId } = body;

    // Generate random state token (includes institution tag if provided)
    const stateTag = institutionId || "OPEN_SELECT";
    const state = `${user.id}:${stateTag}:${crypto.randomBytes(16).toString("hex")}`;

    try {
      const authUrl = generateStitchAuthUrl(state, institutionId);
      return NextResponse.json({
        success: true,
        authUrl,
        state,
        message: "Redirecting to official bank authentication portal...",
      });
    } catch (configError: any) {
      return NextResponse.json(
        {
          success: false,
          error: configError.message || "Live Stitch gateway credentials not configured.",
          isConfigured: false,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Banking Connect Error:", error);
    return NextResponse.json({ error: error.message || "Failed to initiate bank connection" }, { status: 500 });
  }
}

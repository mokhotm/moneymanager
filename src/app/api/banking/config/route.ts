import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import fs from "fs";
import path from "path";

/**
 * GET /api/banking/config
 * Returns whether the live Stitch Open Banking gateway is configured
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.STITCH_CLIENT_ID || "";
    const hasSecret = Boolean(process.env.STITCH_CLIENT_SECRET);
    const redirectUri = process.env.STITCH_REDIRECT_URI || "http://localhost:3001/api/banking/auth/callback";

    if (user.role !== "admin") {
      return NextResponse.json({
        isConfigured: Boolean(clientId && hasSecret),
        provider: "Stitch Open Finance (FSCA Regulated)",
      });
    }

    return NextResponse.json({
      isConfigured: Boolean(clientId && hasSecret),
      clientId: clientId ? `${clientId.slice(0, 8)}...` : "",
      redirectUri,
      provider: "Stitch Open Finance (FSCA Regulated)",
      userRole: user.role,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/banking/config
 * Updates Stitch Open Banking live credentials in .env.local
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only system administrators can configure Open Banking gateway credentials." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { clientId, clientSecret, redirectUri } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Both Client ID and Client Secret are required for live Open Banking." },
        { status: 400 }
      );
    }

    // Update process.env in memory
    process.env.STITCH_CLIENT_ID = clientId.trim();
    process.env.STITCH_CLIENT_SECRET = clientSecret.trim();
    if (redirectUri) {
      process.env.STITCH_REDIRECT_URI = redirectUri.trim();
    }

    // Persist to .env.local
    const envPath = path.join(process.cwd(), ".env.local");
    let currentContent = "";
    if (fs.existsSync(envPath)) {
      currentContent = fs.readFileSync(envPath, "utf8");
    }

    // Remove existing STITCH keys if present
    const filteredLines = currentContent
      .split("\n")
      .filter((line) => !line.startsWith("STITCH_"));

    filteredLines.push(`STITCH_CLIENT_ID="${clientId.trim()}"`);
    filteredLines.push(`STITCH_CLIENT_SECRET="${clientSecret.trim()}"`);
    if (redirectUri) {
      filteredLines.push(`STITCH_REDIRECT_URI="${redirectUri.trim()}"`);
    }

    fs.writeFileSync(envPath, filteredLines.join("\n").trim() + "\n", "utf8");

    return NextResponse.json({
      success: true,
      isConfigured: true,
      message: "Live Stitch Open Banking gateway credentials successfully saved and activated!",
    });
  } catch (error: any) {
    console.error("Failed to save banking config:", error);
    return NextResponse.json({ error: error.message || "Failed to save configuration" }, { status: 500 });
  }
}

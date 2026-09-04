import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  fetchStitchAccounts,
  matchDiscoveredAccounts,
} from "@/services/stitchOpenBankingService";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { institution = "Standard Bank", token } = body;

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Live OAuth access token is required. Please authenticate with Standard Bank via Stitch Open Banking to discover accounts.",
        },
        { status: 400 }
      );
    }

    // 1. Fetch all discovered accounts directly from live Stitch GraphQL API
    const discovered = await fetchStitchAccounts(token, institution);

    // 2. Fetch all existing internal accounts for this user with their connection status
    const existing = await prisma.account.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        institution: true,
        accountNumberMasked: true,
        type: true,
        openingBalance: true,
        bankConnection: {
          select: { id: true, consentStatus: true, providerName: true },
        },
      },
    });

    // 3. Perform smart matching against existing accounts
    const matches = matchDiscoveredAccounts(discovered, existing);

    return NextResponse.json({
      institution,
      discoveredCount: discovered.length,
      matches,
      existingAccounts: existing,
    });
  } catch (error: any) {
    console.error("Banking Discovery API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to discover live bank accounts" },
      { status: 500 }
    );
  }
}

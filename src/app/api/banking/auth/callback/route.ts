import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exchangeStitchToken,
  fetchStitchAccounts,
  encryptToken,
  mapStitchAccountTypeToPrisma,
} from "@/services/stitchOpenBankingService";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * GET /api/banking/auth/callback
 * Handles OAuth 2.0 return from Stitch / Standard Bank
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = req.nextUrl.origin || "http://localhost:3001";

  if (error) {
    console.error("Bank OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=banking&error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=banking&error=${encodeURIComponent("Missing authorization code or state")}`
    );
  }

  try {
    const [userId, institutionId] = state.split(":");
    if (!userId) {
      throw new Error("Invalid state: user ID not found");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User associated with OAuth session not found");
    }

    // 1. Exchange authorization code for live access token
    const tokenResult = await exchangeStitchToken(code);
    const encryptedToken = encryptToken(tokenResult.accessToken);

    // 2. Fetch live accounts directly from Stitch GraphQL API
    const liveAccounts = await fetchStitchAccounts(tokenResult.accessToken, "Standard Bank");

    if (liveAccounts.length === 0) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=banking&warning=${encodeURIComponent("No bank accounts found on live feed.")}`
      );
    }

    // 3. Link or provision genuine live accounts
    for (const liveAcc of liveAccounts) {
      // Find existing or create real live account
      let account = await prisma.account.findFirst({
        where: {
          userId: user.id,
          name: liveAcc.name,
        },
      });

      const resolvedType = (mapStitchAccountTypeToPrisma(
        liveAcc.accountNumberType,
        liveAcc.name
      ) || "CURRENT") as any;

      const isDebt =
        resolvedType === "CREDIT_CARD" || resolvedType === "LOAN" || resolvedType === "MUNICIPAL";

      if (!account) {
        account = await prisma.account.create({
          data: {
            name: liveAcc.name,
            institution: liveAcc.institution || "Standard Bank",
            accountNumberMasked: liveAcc.accountNumber
              ? `••••-${liveAcc.accountNumber.slice(-4)}`
              : "••••",
            type: resolvedType,
            currency: liveAcc.currency || "ZAR",
            openingBalance: new Decimal(liveAcc.currentBalance),
            isDebt,
            userId: user.id,
          },
        });
      } else {
        // Update balance from live feed
        await prisma.account.update({
          where: { id: account.id },
          data: { openingBalance: new Decimal(liveAcc.currentBalance) },
        });
      }

      // Upsert genuine live BankConnection
      await prisma.bankConnection.upsert({
        where: { accountId: account.id },
        update: {
          providerType: "LICENSED_AGGREGATOR",
          providerName: liveAcc.institution || "Standard Bank",
          accessTokenEncrypted: encryptedToken,
          consentStatus: "ACTIVE",
          syncFrequency: "DAILY",
          lastSyncedAt: new Date(),
        },
        create: {
          accountId: account.id,
          providerType: "LICENSED_AGGREGATOR",
          providerName: liveAcc.institution || "Standard Bank",
          accessTokenEncrypted: encryptedToken,
          consentStatus: "ACTIVE",
          consentGrantedAt: new Date(),
          syncFrequency: "DAILY",
        },
      });
    }

    return NextResponse.redirect(
      `${baseUrl}/settings?tab=banking&success=${encodeURIComponent(`Successfully connected ${liveAccounts.length} live Standard Bank account(s)!`)}`
    );
  } catch (err: any) {
    console.error("Stitch Callback Error:", err);
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=banking&error=${encodeURIComponent(err.message || "Failed to finalize live bank connection")}`
    );
  }
}

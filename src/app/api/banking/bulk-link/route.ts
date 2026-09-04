import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Decimal } from "@prisma/client/runtime/library";
import {
  encryptToken,
  syncBankConnection,
  mapStitchAccountTypeToPrisma,
} from "@/services/stitchOpenBankingService";

export interface BulkLinkItem {
  stitchAccountId: string;
  name: string;
  accountNumber: string;
  accountType?: string;
  currentBalance?: number;
  action: "LINK_EXISTING" | "AUTO_CREATE_AND_LINK";
  existingAccountId?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      institution = "Standard Bank",
      token,
      syncFrequency = "DAILY",
      items = [],
    }: {
      institution: string;
      token?: string;
      syncFrequency?: "ON_DEMAND" | "DAILY";
      items: BulkLinkItem[];
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No accounts selected for linking" },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: "Live access token is required for linking bank accounts." },
        { status: 400 }
      );
    }
    const accessToken = token;
    const encryptedToken = encryptToken(accessToken);

    const linkedConnections: Array<{ connectionId: string; accountId: string; accountName: string }> = [];

    for (const item of items) {
      let targetAccountId = item.existingAccountId;
      let targetAccountName = item.name;

      if (item.action === "AUTO_CREATE_AND_LINK" || !targetAccountId) {
        // Determine account type
        const resolvedType = (mapStitchAccountTypeToPrisma(
          item.accountType,
          item.name
        ) || "CURRENT") as any;

        const isDebt = resolvedType === "CREDIT_CARD" || resolvedType === "LOAN" || resolvedType === "MUNICIPAL";
        const maskedNum = item.accountNumber
          ? item.accountNumber.length > 4
            ? `••••-${item.accountNumber.slice(-4)}`
            : item.accountNumber
          : "••••";

        // Auto-provision Account
        const createdAcc = await prisma.account.create({
          data: {
            name: item.name || `${institution} Account`,
            institution,
            accountNumberMasked: maskedNum,
            type: resolvedType,
            currency: "ZAR",
            openingBalance: new Decimal(item.currentBalance ?? 0),
            isDebt,
            userId: user.id,
          },
        });
        targetAccountId = createdAcc.id;
        targetAccountName = createdAcc.name;
      }

      if (targetAccountId) {
        // Upsert BankConnection
        const connection = await prisma.bankConnection.upsert({
          where: { accountId: targetAccountId },
          update: {
            providerType: "LICENSED_AGGREGATOR",
            providerName: institution,
            accessTokenEncrypted: encryptedToken,
            consentStatus: "ACTIVE",
            syncFrequency: syncFrequency === "ON_DEMAND" ? "ON_DEMAND" : "DAILY",
            lastSyncedAt: new Date(),
          },
          create: {
            accountId: targetAccountId,
            providerType: "LICENSED_AGGREGATOR",
            providerName: institution,
            accessTokenEncrypted: encryptedToken,
            consentStatus: "ACTIVE",
            consentGrantedAt: new Date(),
            syncFrequency: syncFrequency === "ON_DEMAND" ? "ON_DEMAND" : "DAILY",
          },
          include: { account: true },
        });

        linkedConnections.push({
          connectionId: connection.id,
          accountId: connection.accountId,
          accountName: (connection as any).account?.name || targetAccountName || "Bank Account",
        });

        // Trigger initial sync for this connection
        try {
          await syncBankConnection(connection.id);
        } catch (syncErr) {
          console.warn(`Initial sync warning for ${connection.id}:`, syncErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      linkedCount: linkedConnections.length,
      linkedConnections,
      message: `Successfully connected and synced ${linkedConnections.length} accounts with ${institution}!`,
    });
  } catch (error: any) {
    console.error("Banking Bulk Link API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to bulk link accounts" },
      { status: 500 }
    );
  }
}

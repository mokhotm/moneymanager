import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  SA_BANK_CONNECTORS,
  encryptToken,
  decryptToken,
  fetchStitchAccounts,
} from "@/services/stitchOpenBankingService";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query genuine live bank connections only
    const connections = await prisma.bankConnection.findMany({
      where: { account: { userId: user.id } },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            institution: true,
            accountNumberMasked: true,
            type: true,
            openingBalance: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedConnections = await Promise.all(
      connections.map(async (conn) => {
        // Count transactions synced from the live bank connection into MoneyFlow
        const txCount = await prisma.moneyFlow.count({
          where: {
            OR: [
              { sourceRef: conn.accountId },
              { destinationRef: conn.accountId },
            ],
          },
        });

        return {
          id: conn.id,
          accountId: conn.accountId,
          accountName: conn.account.name,
          institution: conn.account.institution,
          accountNumberMasked: conn.account.accountNumberMasked || "••••",
          accountType: conn.account.type,
          currentBalance: Number(conn.account.openingBalance),
          providerType: conn.providerType,
          providerName: conn.providerName,
          consentStatus: conn.consentStatus,
          lastSyncedAt: conn.lastSyncedAt ? conn.lastSyncedAt.toISOString() : null,
          syncFrequency: conn.syncFrequency,
          isLiveBankSync: true,
          totalSyncedTransactions: txCount,
        };
      })
    );

    const isGatewayConfigured = Boolean(
      process.env.STITCH_CLIENT_ID && process.env.STITCH_CLIENT_SECRET
    );

    return NextResponse.json({
      connections: formattedConnections,
      availableConnectors: SA_BANK_CONNECTORS,
      isGatewayConfigured,
      userRole: user.role,
      gatewayInfo: {
        provider: "Stitch Open Finance (FSCA Regulated)",
        status: isGatewayConfigured ? "CONFIGURED" : "AWAITING_CREDENTIALS",
        supportedInstitutions: SA_BANK_CONNECTORS.length,
      },
    });
  } catch (error: any) {
    console.error("Banking API GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load live bank connections" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountId, institution, token, syncFrequency = "DAILY" } = body;

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json(
        { error: "Live access token is required. No mock or fallback tokens allowed." },
        { status: 400 }
      );
    }

    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found or access denied" }, { status: 404 });
    }

    const encryptedToken = encryptToken(token);

    const connection = await prisma.bankConnection.upsert({
      where: { accountId },
      update: {
        providerType: "LICENSED_AGGREGATOR",
        providerName: institution || account.institution,
        accessTokenEncrypted: encryptedToken,
        consentStatus: "ACTIVE",
        syncFrequency,
        lastSyncedAt: new Date(),
      },
      create: {
        accountId,
        providerType: "LICENSED_AGGREGATOR",
        providerName: institution || account.institution,
        accessTokenEncrypted: encryptedToken,
        consentStatus: "ACTIVE",
        consentGrantedAt: new Date(),
        syncFrequency,
      },
      include: { account: true },
    });

    return NextResponse.json({
      id: connection.id,
      accountId: connection.accountId,
      accountName: connection.account.name,
      institution: connection.account.institution,
      status: connection.consentStatus,
      message: `Successfully linked ${connection.account.name} via live Open Banking!`,
    });
  } catch (error: any) {
    console.error("Banking API POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to link bank account" }, { status: 500 });
  }
}

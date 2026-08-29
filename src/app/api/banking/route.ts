import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SA_BANK_CONNECTORS, encryptToken, decryptToken, fetchStitchAccounts } from "@/services/stitchOpenBankingService";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Fetch user accounts without connection
    const unlinkedAccounts = await prisma.account.findMany({
      where: {
        userId: user.id,
        bankConnection: null,
      },
      select: {
        id: true,
        name: true,
        institution: true,
        accountNumberMasked: true,
        type: true,
        openingBalance: true,
      },
    });

    // Check virtual synced documents for sync counts
    const syncedDocs = await prisma.document.findMany({
      where: {
        relatedEntityType: "ACCOUNT",
        documentType: "BANK_STATEMENT",
      },
      select: {
        relatedEntityId: true,
        parsedData: true,
        uploadedAt: true,
      },
    });

    const docMap = new Map<string, any>();
    for (const doc of syncedDocs) {
      if (doc.relatedEntityId) {
        docMap.set(doc.relatedEntityId, doc.parsedData);
      }
    }

    const formattedConnections = connections.map((conn) => {
      const parsed = docMap.get(conn.accountId) as any;
      const isLiveBankSync = parsed?.isBankApiSync === true;
      const totalTxs = parsed?.transactions?.length ?? 0;

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
        isLiveBankSync,
        totalSyncedTransactions: totalTxs,
      };
    });

    return NextResponse.json({
      connections: formattedConnections,
      unlinkedAccounts,
      availableConnectors: SA_BANK_CONNECTORS,
      isSandboxMode: !process.env.STITCH_CLIENT_SECRET,
    });
  } catch (error: any) {
    console.error("Banking API GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to load bank connections" }, { status: 500 });
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

    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found or access denied" }, { status: 404 });
    }

    const accessToken = token || `sandbox_${institution.toLowerCase().replace(/\s+/g, "_")}_token`;
    const encryptedToken = encryptToken(accessToken);

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
      message: `Successfully linked ${connection.account.name} via Stitch Open Banking!`,
    });
  } catch (error: any) {
    console.error("Banking API POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to link bank account" }, { status: 500 });
  }
}

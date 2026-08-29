import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { syncBankConnection, BankSyncResult } from "@/services/stitchOpenBankingService";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { connectionId, syncAll } = body;

    // Single connection sync
    if (connectionId) {
      const conn = await prisma.bankConnection.findFirst({
        where: { id: connectionId, account: { userId: user.id } },
      });

      if (!conn) {
        return NextResponse.json({ error: "Bank connection not found or unauthorized" }, { status: 404 });
      }

      const syncResult: BankSyncResult = await syncBankConnection(connectionId);
      return NextResponse.json({
        success: true,
        results: [syncResult],
        totalNewTransactions: syncResult.newTransactionsCount,
        message: `Successfully synchronized ${syncResult.institution} (${syncResult.accountName})!`,
      });
    }

    // Sync all active bank connections for this user
    const userConnections = await prisma.bankConnection.findMany({
      where: {
        account: { userId: user.id },
        consentStatus: "ACTIVE",
      },
    });

    if (userConnections.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        totalNewTransactions: 0,
        message: "No active bank connections to synchronize.",
      });
    }

    const syncResults: BankSyncResult[] = [];
    let totalNew = 0;

    for (const conn of userConnections) {
      try {
        const res = await syncBankConnection(conn.id);
        syncResults.push(res);
        totalNew += res.newTransactionsCount;
      } catch (err: any) {
        syncResults.push({
          connectionId: conn.id,
          accountId: conn.accountId,
          institution: conn.providerName,
          accountName: "Account",
          accountNumberMasked: "••••",
          currentBalance: 0,
          availableBalance: 0,
          newTransactionsCount: 0,
          duplicateTransactionsCount: 0,
          totalSyncedCount: 0,
          syncTimestamp: new Date().toISOString(),
          status: "ERROR",
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: syncResults,
      totalNewTransactions: totalNew,
      message: `Synchronized ${syncResults.length} accounts (${totalNew} new live transactions ingested).`,
    });
  } catch (error: any) {
    console.error("Banking Sync API error:", error);
    return NextResponse.json({ error: error.message || "Bank sync failed" }, { status: 500 });
  }
}

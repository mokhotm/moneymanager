import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Administrator privileges required." }, { status: 403 });
    }

    const [
      totalUsers,
      totalAccounts,
      totalTransactions,
      totalDocuments,
      totalDebts,
      totalAssets,
      gatewayConfigs,
      subscriptions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.moneyFlow.count(),
      prisma.document.count(),
      prisma.debt.count(),
      prisma.asset.count(),
      prisma.paymentGatewayConfig.count(),
      prisma.userSubscription.findMany({
        include: {
          tier: true,
        },
      }),
    ]);

    // Calculate MRR / Subscription stats
    let totalMRR = 0;
    const tierDistribution: Record<string, number> = {};

    subscriptions.forEach((sub) => {
      if (sub.status === "ACTIVE" && sub.tier) {
        totalMRR += Number(sub.tier.priceMonthly || 0);
        const code = sub.tier.code || "UNKNOWN";
        tierDistribution[code] = (tierDistribution[code] || 0) + 1;
      }
    });

    const isEncryptionConfigured = Boolean(process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32);
    const isSessionConfigured = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalAccounts,
        totalTransactions,
        totalDocuments,
        totalDebts,
        totalAssets,
        gatewayConfigs,
        activeSubscriptions: subscriptions.filter((s) => s.status === "ACTIVE").length,
        totalMRR,
        tierDistribution,
        systemHealth: {
          database: "CONNECTED",
          encryptionVault: isEncryptionConfigured ? "SECURED_AES_256" : "DEGRADED",
          sessionSigner: isSessionConfigured ? "SECURED_HMAC" : "DEGRADED",
        },
      },
    });
  } catch (error: any) {
    console.error("Admin overview error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch admin telemetry" }, { status: 500 });
  }
}

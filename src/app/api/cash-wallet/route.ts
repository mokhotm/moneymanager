import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import {
  AccountType,
  FlowType,
  FlowEndpointType,
  FlowConfidence,
  FlowStatus,
} from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let cashAccount = await prisma.account.findFirst({
      where: { userId, type: AccountType.CASH_WALLET },
    });

    if (!cashAccount) {
      return NextResponse.json({
        cashWalletAccountId: "",
        accountName: "Physical Cash Wallet",
        trackedBalance: 0,
        lastReconciledAt: null,
        recentFlows: [],
      });
    }

    // Fetch live money flows for this cash wallet
    const flows = await prisma.moneyFlow.findMany({
      where: {
        OR: [
          { destinationRef: cashAccount.id },
          { sourceRef: cashAccount.id },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute live balance: Sum of inflows - Sum of outflows
    let trackedBalance = 0;
    const recentFlows = flows.map((f) => {
      const isIncoming = f.destinationRef === cashAccount.id;
      const amt = Number(f.amount);
      if (isIncoming) {
        trackedBalance += amt;
      } else {
        trackedBalance -= amt;
      }

      return {
        id: f.id,
        date: f.createdAt.toISOString().split("T")[0],
        type: f.flowType,
        description: f.destinationRef?.startsWith("Domestic") || f.destinationRef?.startsWith("Garden")
          ? f.destinationRef
          : isIncoming
          ? "ATM Cash Withdrawal"
          : f.destinationRef || "Cash Expense",
        amount: isIncoming ? amt : -amt,
      };
    });

    return NextResponse.json({
      cashWalletAccountId: cashAccount.id,
      accountName: cashAccount.name,
      trackedBalance: Math.max(0, trackedBalance),
      lastReconciledAt: cashAccount.updatedAt,
      recentFlows,
    });
  } catch (error: any) {
    console.error("Cash wallet GET error:", error);
    return NextResponse.json({ error: "Failed to load cash wallet" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, amount, category, description, actualCountedBalance } = body;

    let cashAccount = await prisma.account.findFirst({
      where: { userId, type: AccountType.CASH_WALLET },
    });

    if (!cashAccount) {
      cashAccount = await prisma.account.create({
        data: {
          user: { connect: { id: userId } },
          name: "Physical Cash Wallet",
          institution: "Physical Cash",
          accountNumberMasked: "CASH-WALLET-01",
          type: AccountType.CASH_WALLET,
          currency: "ZAR",
          openingBalance: 0,
          isAsset: true,
          isDebt: false,
        },
      });
    }

    const chequeAccount = await prisma.account.findFirst({
      where: { userId, type: AccountType.CURRENT },
    });

    if (action === "WITHDRAWAL") {
      const numAmount = parseFloat(amount);
      await prisma.moneyFlow.create({
        data: {
          sourceType: FlowEndpointType.ACCOUNT,
          sourceRef: chequeAccount?.id || "cheque-account",
          destinationType: FlowEndpointType.CASH_WALLET,
          destinationRef: cashAccount.id,
          amount: numAmount,
          currentAmount: numAmount,
          flowType: FlowType.CASH_WITHDRAWAL,
          confidence: FlowConfidence.CONFIRMED,
        },
      });

      return GET(req);
    }

    if (action === "SPEND") {
      const numAmount = parseFloat(amount);
      const targetLabel = description ? `${category}: ${description}` : category;
      await prisma.moneyFlow.create({
        data: {
          sourceType: FlowEndpointType.CASH_WALLET,
          sourceRef: cashAccount.id,
          destinationType: FlowEndpointType.EXTERNAL,
          destinationRef: targetLabel,
          amount: numAmount,
          currentAmount: numAmount,
          flowType: FlowType.CASH_SPENDING,
          confidence: FlowConfidence.CONFIRMED,
        },
      });

      return GET(req);
    }

    if (action === "RECONCILE") {
      const counted = parseFloat(actualCountedBalance);
      // Fetch current flows to calculate delta
      const flows = await prisma.moneyFlow.findMany({
        where: {
          OR: [
            { destinationRef: cashAccount.id },
            { sourceRef: cashAccount.id },
          ],
        },
      });

      let currentBalance = 0;
      for (const f of flows) {
        if (f.destinationRef === cashAccount.id) currentBalance += Number(f.amount);
        else currentBalance -= Number(f.amount);
      }

      const adjustment = counted - currentBalance;
      if (Math.abs(adjustment) > 0.01) {
        await prisma.moneyFlow.create({
          data: {
            sourceType: adjustment < 0 ? FlowEndpointType.CASH_WALLET : FlowEndpointType.EXTERNAL,
            sourceRef: adjustment < 0 ? cashAccount.id : "RECONCILIATION_ADJUSTMENT",
            destinationType: adjustment < 0 ? FlowEndpointType.EXTERNAL : FlowEndpointType.CASH_WALLET,
            destinationRef: adjustment < 0 ? `Reconciliation Adjustment (${adjustment >= 0 ? "+" : ""}${adjustment})` : cashAccount.id,
            amount: Math.abs(adjustment),
            currentAmount: Math.abs(adjustment),
            flowType: FlowType.OTHER,
            confidence: FlowConfidence.CONFIRMED,
          },
        });
      }

      await prisma.account.update({
        where: { id: cashAccount.id },
        data: { updatedAt: new Date() },
      });

      return GET(req);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Cash wallet POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to process cash wallet action" }, { status: 500 });
  }
}

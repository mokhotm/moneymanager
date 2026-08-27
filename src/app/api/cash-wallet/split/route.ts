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
import { round2 } from "@/engine/snowball";

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { parentFlowId, splits } = body;

    if (!parentFlowId || !Array.isArray(splits) || splits.length === 0) {
      return NextResponse.json(
        { error: "parentFlowId and non-empty splits array are required" },
        { status: 400 }
      );
    }

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

    const parentFlow = await prisma.moneyFlow.findUnique({
      where: { id: parentFlowId },
      include: { childFlows: true },
    });

    if (!parentFlow) {
      return NextResponse.json({ error: "Parent withdrawal flow not found" }, { status: 404 });
    }

    const totalSplitAmount = round2(
      splits.reduce((sum: number, s: any) => sum + (parseFloat(s.amount) || 0), 0)
    );

    const currentAvail = Number(parentFlow.currentAmount);
    if (totalSplitAmount > currentAvail + 0.01) {
      return NextResponse.json(
        {
          error: `Total split amount (R${totalSplitAmount.toFixed(2)}) exceeds available unallocated cash (R${currentAvail.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Create child flows in database
    const createdChildren = [];
    for (const split of splits) {
      const splitAmt = round2(parseFloat(split.amount));
      if (splitAmt <= 0) continue;

      const child = await prisma.moneyFlow.create({
        data: {
          parentFlowId: parentFlow.id,
          sourceType: FlowEndpointType.CASH_WALLET,
          sourceRef: cashAccount.id,
          destinationType: FlowEndpointType.EXTERNAL,
          destinationRef: split.category || split.description || "Cash Expense",
          amount: splitAmt,
          currentAmount: 0,
          flowType: FlowType.CASH_SPENDING,
          status: FlowStatus.FULLY_CONSUMED,
          confidence: FlowConfidence.CONFIRMED,
        },
      });
      createdChildren.push(child);
    }

    const newCurrentAmount = Math.max(0, round2(currentAvail - totalSplitAmount));
    const newStatus =
      newCurrentAmount <= 0.01
        ? FlowStatus.FULLY_CONSUMED
        : FlowStatus.PARTIALLY_CONSUMED;

    await prisma.moneyFlow.update({
      where: { id: parentFlow.id },
      data: {
        currentAmount: newCurrentAmount,
        status: newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully split R${totalSplitAmount.toFixed(2)} into ${createdChildren.length} items.`,
      parentFlowId: parentFlow.id,
      remainingUnallocated: newCurrentAmount,
      parentStatus: newStatus,
      createdChildrenCount: createdChildren.length,
    });
  } catch (error: any) {
    console.error("Cash split POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to split cash withdrawal" }, { status: 500 });
  }
}

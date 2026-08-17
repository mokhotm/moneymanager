import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import {
  reconcileAccountConservation,
  buildMoneyLineage,
  MoneyFlowItem,
} from "@/services/moneyFlowService";

export async function GET(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const flowId = searchParams.get("flowId");
    const accountRef = searchParams.get("accountRef");
    const payPeriod = searchParams.get("payPeriod");
    const periodType = searchParams.get("periodType") || "SALARY";

    // Fetch all DB flows & reference entities (accounts & debts for mokhotm)
    const [dbFlows, accounts, debts] = await Promise.all([
      prisma.moneyFlow.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.account.findMany({ where: { userId } }),
      prisma.debt.findMany({
        where: { account: { userId } },
        include: { account: true },
      }),
    ]);

    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
    const debtMap = new Map(debts.map((d) => [d.id, d.account.name]));

    // Map DB MoneyFlow records to domain MoneyFlowItem with readable labels
    const formattedFlows: MoneyFlowItem[] = dbFlows.map((f) => {
      let sourceLabel = f.sourceRef;
      if (f.sourceType === "ACCOUNT" && f.sourceRef) {
        sourceLabel = accountMap.get(f.sourceRef) ?? f.sourceRef;
      }

      let destLabel = f.destinationRef;
      if (f.destinationType === "ACCOUNT" && f.destinationRef) {
        destLabel = accountMap.get(f.destinationRef) ?? f.destinationRef;
      } else if (f.destinationType === "DEBT" && f.destinationRef) {
        destLabel = debtMap.get(f.destinationRef) ?? f.destinationRef;
      } else if (f.destinationType === "CASH_WALLET") {
        destLabel = "Physical Cash Wallet";
      }

      return {
        id: f.id,
        parentFlowId: f.parentFlowId,
        originTransactionId: f.originTransactionId,
        sourceType: f.sourceType as any,
        sourceRef: sourceLabel,
        destinationType: f.destinationType as any,
        destinationRef: destLabel,
        amount: Number(f.amount),
        currentAmount: Number(f.currentAmount),
        flowType: f.flowType as any,
        status: f.status as any,
        confidence: f.confidence as any,
        createdAt: f.createdAt,
      };
    });

    if (flowId) {
      const lineage = buildMoneyLineage(flowId, formattedFlows);
      return NextResponse.json({ lineage });
    }

    if (accountRef) {
      const targetAccountName = accountMap.get(accountRef) ?? accountRef;
      const conservation = reconcileAccountConservation(targetAccountName, formattedFlows, 12450.55);
      return NextResponse.json({ conservation });
    }

    let filteredFlows = formattedFlows;
    if (payPeriod && payPeriod !== "ALL") {
      const year = parseInt(payPeriod.split("-")[0]);
      const month = parseInt(payPeriod.split("-")[1]);
      
      let startDate: Date;
      let endDate: Date;

      if (periodType === "CALENDAR") {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59);
      } else {
        startDate = new Date(year, month - 1, 15);
        let nextMonth = month;
        let nextYear = year;
        if (nextMonth === 12) {
           nextMonth = 0;
           nextYear++;
        }
        endDate = new Date(nextYear, nextMonth, 14, 23, 59, 59);
      }

      filteredFlows = filteredFlows.filter((t) => {
         const d = new Date(t.createdAt);
         return d >= startDate && d <= endDate;
      });
    }

    // Compute summary metrics from real flows
    const totalIncome = filteredFlows
      .filter((f) => f.flowType === "INCOME")
      .reduce((sum, f) => sum + f.amount, 0);

    const totalTransfers = filteredFlows
      .filter((f) => f.flowType === "TRANSFER")
      .reduce((sum, f) => sum + f.amount, 0);

    const totalInvestments = filteredFlows
      .filter((f) => f.flowType === "INVESTMENT" || f.flowType === "GOAL_CONTRIBUTION")
      .reduce((sum, f) => sum + f.amount, 0);

    const totalDebtPaid = filteredFlows
      .filter((f) => f.flowType === "DEBT_PAYMENT")
      .reduce((sum, f) => sum + f.amount, 0);

    return NextResponse.json({
      flows: filteredFlows,
      summary: {
        totalFlows: filteredFlows.length,
        totalIncome,
        totalTransfers,
        totalInvestments,
        totalDebtPaid,
      },
    });
  } catch (error: any) {
    console.error("GET /api/money-flow error:", error);
    return NextResponse.json(
      { error: "Failed to fetch money flows", message: error?.message },
      { status: 500 }
    );
  }
}

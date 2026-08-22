import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import {
  reconcileAccountConservation,
  buildMoneyLineage,
  MoneyFlowItem,
} from "@/services/moneyFlowService";
import { resolveSalaryCycleRange } from "@/lib/payrollCalendar";

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

    // Fetch reference entities (accounts & debts)
    const [accounts, debts] = await Promise.all([
      prisma.account.findMany({ where: { userId } }),
      prisma.debt.findMany({
        where: { account: { userId } },
        include: { account: true },
      }),
    ]);

    const userEntityIds = [...accounts.map((a) => a.id), ...debts.map((d) => d.id)];

    const dbFlows = userEntityIds.length === 0
      ? []
      : await prisma.moneyFlow.findMany({
          where: {
            OR: [
              { sourceRef: { in: userEntityIds } },
              { destinationRef: { in: userEntityIds } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 350,
        });

    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
    const debtMap = new Map(debts.map((d) => [d.id, d.account.name]));

    const cleanLabel = (ref: string | null, type: string, flowType: string): string => {
      if (!ref) return type === "CASH_WALLET" ? "Physical Cash Wallet" : "Account";
      
      // Known direct mappings
      if (type === "CASH_WALLET" || ref === "cash-wallet-primary" || ref.includes("nsqfa0gcdp7")) {
        return "Physical Cash Wallet";
      }

      if (accountMap.has(ref)) return accountMap.get(ref)!;
      if (debtMap.has(ref)) return debtMap.get(ref)!;

      // Handle legacy or unknown CUID strings
      if (/^c[a-z0-9]{20,}$/i.test(ref) || ref.startsWith("cms")) {
        if (type === "ACCOUNT") return "Primary Account";
        if (type === "CASH_WALLET") return "Physical Cash Wallet";
        if (flowType === "INCOME") return "Net Salary Inflow";
        return "Bank Account";
      }

      return ref;
    };

    // Map DB MoneyFlow records to domain MoneyFlowItem with readable labels
    const formattedFlows: MoneyFlowItem[] = dbFlows.map((f) => {
      const sourceLabel = cleanLabel(f.sourceRef, f.sourceType, f.flowType);
      const destLabel = cleanLabel(f.destinationRef, f.destinationType, f.flowType);

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
      let startDate: Date;
      let endDate: Date;

      if (periodType === "CALENDAR") {
        const [yearStr, monthStr] = payPeriod.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      } else {
        // South African statutory payroll adjustment (Friday 14th if Sat 15th, Mon 16th if Sun 15th, preceding if holiday)
        const cycleBounds = resolveSalaryCycleRange(payPeriod);
        startDate = cycleBounds.startDate;
        endDate = cycleBounds.endDate;
      }

      filteredFlows = formattedFlows.filter((t) => {
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

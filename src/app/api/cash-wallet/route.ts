import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { resolveSalaryCycleRange } from "@/lib/payrollCalendar";
import {
  AccountType,
  FlowType,
  FlowEndpointType,
  FlowConfidence,
  FlowStatus,
} from "@prisma/client";

const KNOWN_MONTH_KEYS = [
  "2026-08",
  "2026-07",
  "2026-06",
  "2026-05",
  "2026-04",
  "2026-03",
  "2026-02",
  "2026-01",
  "2025-12",
  "2025-11",
  "2025-10",
  "2025-09",
  "2025-08",
];

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedMonth = searchParams.get("month") || searchParams.get("cycle") || "ALL";
    const cycleMode = searchParams.get("mode") || "PAY_CYCLE";
    const requestedCategory = searchParams.get("category") || "ALL";
    const requestedStatus = searchParams.get("status") || "ALL";
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    let cashAccount = await prisma.account.findFirst({
      where: { userId, type: AccountType.CASH_WALLET },
    });

    if (!cashAccount) {
      return NextResponse.json({
        cashWalletAccountId: "",
        accountName: "Physical Cash Wallet",
        trackedBalance: 0,
        totalUnallocatedCash: 0,
        lastReconciledAt: null,
        availableCycles: [],
        activeCycle: null,
        periodMetrics: {
          totalInflow: 0,
          totalOutflow: 0,
          domesticSpend: 0,
          gardenSpend: 0,
          netChange: 0,
        },
        unallocatedBatches: [],
        recentFlows: [],
      });
    }

    // Generate list of available salary cycles or calendar months with rich metadata
    const availableCycles = KNOWN_MONTH_KEYS.map((key) => {
      if (cycleMode === "CALENDAR_MONTH") {
        const [yearStr, monthStr] = key.split("-");
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10);
        const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
        const monthName = startDate.toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });
        const startDay = startDate.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", timeZone: "UTC" });
        const endDay = endDate.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
        return {
          key,
          label: `${monthName} (${startDay} – ${endDay})`,
          rangeFormatted: `${startDay} – ${endDay}`,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };
      } else {
        const bounds = resolveSalaryCycleRange(key);
        return {
          key,
          label: bounds.dropdownLabel,
          rangeFormatted: bounds.formattedRange,
          startDate: bounds.startDate.toISOString(),
          endDate: bounds.endDate.toISOString(),
        };
      }
    });

    // Resolve active cycle bounds if not "ALL"
    let cycleBounds: { startDate: Date; endDate: Date; formattedRange: string; dropdownLabel?: string } | null = null;
    if (requestedMonth !== "ALL") {
      if (cycleMode === "CALENDAR_MONTH") {
        const [yearStr, monthStr] = requestedMonth.split("-");
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10);
        const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
        const monthName = startDate.toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });
        const startDay = startDate.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", timeZone: "UTC" });
        const endDay = endDate.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
        cycleBounds = {
          startDate,
          endDate,
          formattedRange: `${startDay} – ${endDay}`,
          dropdownLabel: `${monthName} (${startDay} – ${endDay})`,
        };
      } else {
        cycleBounds = resolveSalaryCycleRange(requestedMonth);
      }
    }

    // Fetch live money flows for this cash wallet
    let allFlows = await prisma.moneyFlow.findMany({
      where: {
        OR: [
          { destinationRef: cashAccount.id },
          { sourceRef: cashAccount.id },
        ],
      },
      include: {
        childFlows: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate all-time cumulative tracked balance
    let allTimeTrackedBalance = 0;
    for (const f of allFlows) {
      const isIncoming = f.destinationRef === cashAccount.id;
      const amt = Number(f.amount);
      if (isIncoming) {
        allTimeTrackedBalance += amt;
      } else {
        allTimeTrackedBalance -= amt;
      }
    }

    // Identify unallocated or partially allocated ATM withdrawal parent batches
    const allUnallocatedBatches = allFlows
      .filter(
        (f) =>
          f.flowType === FlowType.CASH_WITHDRAWAL &&
          f.destinationRef === cashAccount.id &&
          (f.status === FlowStatus.ACTIVE || f.status === FlowStatus.PARTIALLY_CONSUMED || Number(f.currentAmount) > 0)
      )
      .map((f) => ({
        id: f.id,
        date: f.createdAt.toISOString().split("T")[0],
        createdAt: f.createdAt,
        sourceAccountName: "Standard Bank Autobank ATM",
        originalAmount: Number(f.amount),
        unallocatedAmount: Number(f.currentAmount),
        allocatedAmount: Number(f.amount) - Number(f.currentAmount),
        status: f.status,
        childSplits: (f.childFlows || []).map((c) => ({
          id: c.id,
          date: c.createdAt.toISOString().split("T")[0],
          description: c.destinationRef || "Cash Expense",
          amount: Number(c.amount),
        })),
      }));

    // Filter flows for the active cycle / date range
    let scopedFlows = allFlows;
    if (cycleBounds) {
      const start = cycleBounds.startDate;
      const end = cycleBounds.endDate;
      scopedFlows = allFlows.filter((f) => f.createdAt >= start && f.createdAt <= end);
    }

    // Calculate period-scoped metrics
    let periodInflow = 0;
    let periodOutflow = 0;
    let periodDomestic = 0;
    let periodGarden = 0;

    for (const f of scopedFlows) {
      const isIncoming = f.destinationRef === cashAccount.id;
      const amt = Number(f.amount);
      const desc = (f.destinationRef || "").toLowerCase();

      if (isIncoming) {
        periodInflow += amt;
      } else {
        periodOutflow += amt;
        if (desc.includes("domestic")) periodDomestic += amt;
        if (desc.includes("garden")) periodGarden += amt;
      }
    }

    // Format scoped flows for response
    const formattedFlows = scopedFlows.map((f) => {
      const isIncoming = f.destinationRef === cashAccount.id;
      const amt = Number(f.amount);
      const rawDesc = f.destinationRef || "";

      let category = "Discretionary";
      if (rawDesc.includes("Domestic")) category = "Domestic Worker";
      else if (rawDesc.includes("Garden")) category = "Garden Services";
      else if (rawDesc.includes("Grocer") || rawDesc.includes("Food") || rawDesc.includes("Fresh") || rawDesc.includes("Market")) category = "Groceries";
      else if (rawDesc.includes("Transport") || rawDesc.includes("Taxi") || rawDesc.includes("Fuel")) category = "Transport";
      else if (rawDesc.includes("Dining") || rawDesc.includes("Coffee") || rawDesc.includes("Café")) category = "Dining";
      else if (rawDesc.includes("Parking") || rawDesc.includes("Tip")) category = "Parking";
      else if (isIncoming) category = "ATM Withdrawal";

      return {
        id: f.id,
        parentFlowId: f.parentFlowId,
        date: f.createdAt.toISOString().split("T")[0],
        createdAt: f.createdAt,
        type: f.flowType,
        category,
        description: rawDesc.startsWith("Domestic") || rawDesc.startsWith("Garden")
          ? rawDesc
          : isIncoming
          ? "ATM Cash Withdrawal"
          : rawDesc || "Cash Expense",
        amount: isIncoming ? amt : -amt,
        rawAmount: amt,
        isIncoming,
      };
    });

    // Filter unallocated batches by cycle if active
    let unallocatedBatches = allUnallocatedBatches;
    if (cycleBounds) {
      const start = cycleBounds.startDate;
      const end = cycleBounds.endDate;
      unallocatedBatches = allUnallocatedBatches.filter((b) => b.createdAt >= start && b.createdAt <= end);
    }

    const totalUnallocatedCash = unallocatedBatches.reduce(
      (sum, b) => sum + b.unallocatedAmount,
      0
    );

    const allTimeUnallocatedCash = allUnallocatedBatches.reduce(
      (sum, b) => sum + b.unallocatedAmount,
      0
    );

    return NextResponse.json({
      cashWalletAccountId: cashAccount.id,
      accountName: cashAccount.name,
      trackedBalance: Math.max(0, allTimeTrackedBalance),
      totalUnallocatedCash,
      allTimeUnallocatedCash,
      lastReconciledAt: cashAccount.updatedAt,
      availableCycles,
      activeCycle: cycleBounds ? {
        key: requestedMonth,
        mode: cycleMode,
        formattedRange: cycleBounds.formattedRange,
        startDate: cycleBounds.startDate.toISOString(),
        endDate: cycleBounds.endDate.toISOString(),
      } : {
        key: "ALL",
        mode: "ALL_TIME",
        formattedRange: "Cumulative All Time",
      },
      periodMetrics: {
        totalInflow: periodInflow,
        totalOutflow: periodOutflow,
        domesticSpend: periodDomestic,
        gardenSpend: periodGarden,
        netChange: periodInflow - periodOutflow,
      },
      unallocatedBatches,
      recentFlows: formattedFlows,
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
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
      }
      if (!chequeAccount) {
        return NextResponse.json({ error: "A linked current account is required for cash withdrawals" }, { status: 422 });
      }
      await prisma.moneyFlow.create({
        data: {
          sourceType: FlowEndpointType.ACCOUNT,
          sourceRef: chequeAccount.id,
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
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
      }
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

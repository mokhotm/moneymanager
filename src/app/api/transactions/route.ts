import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId, getCurrentUser } from "@/lib/session";
import { getActiveCycleMonthKey } from "@/lib/budgetCycle";
import { resolveSalaryCycleRange } from "@/lib/payrollCalendar";

export interface BankingTransaction {
  id: string;
  date: string;
  merchantName: string;
  merchantAddress?: string;
  accountName: string;
  institution: string;
  accountType: string;
  category: string;
  flowType: string;
  amount: number;
  direction: "INFLOW" | "OUTFLOW";
  status: "SETTLED" | "PENDING";
  referenceNumber: string;
  confidence: string;
  // Budget Integration Fields
  budgetItemId?: string | null;
  budgetItemLabel?: string | null;
  budgetCategory?: string | null;
  budgetAmount?: number | null;
  isBudgeted: boolean;
  budgetStatus: "MATCHED" | "UNBUDGETED" | "INCOME" | "INTERNAL_TRANSFER";
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const budgetFilter = searchParams.get("budgetCategory");
    const query = searchParams.get("query")?.toLowerCase();
    const payPeriod = searchParams.get("payPeriod");
    const periodType = searchParams.get("periodType") || "SALARY";

    const activeMonth = searchParams.get("month") ?? (await getActiveCycleMonthKey());

    // Fetch reference accounts, debts, and active budget line items
    const [accounts, debts, budgetItems] = await Promise.all([
      prisma.account.findMany({ where: { userId } }),
      prisma.debt.findMany({
        where: { account: { userId } },
        include: { account: true },
      }),
      prisma.budgetLineItem.findMany({
        where: { userId },
        orderBy: [{ category: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    const userEntityIds = [...accounts.map((a) => a.id), ...debts.map((d) => d.id)];

    const flows = userEntityIds.length === 0
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

    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const debtMap = new Map(debts.map((d) => [d.id, d]));

    const defaultAccount = accounts.find((a) => a.type === "CURRENT") || accounts[0];

    // Helper to match transaction to a budget item with high precision
    const matchBudgetItem = (
      merchantName: string,
      flowType: string,
      destDebt: any,
      amount: number,
      sourceRef: string | null,
      destinationRef: string | null,
      accountType: string
    ) => {
      const lowerMerchant = merchantName.toLowerCase();
      const lowerDest = (destinationRef || "").toLowerCase();
      const lowerSource = (sourceRef || "").toLowerCase();

      // Priority 1: Exact / Normalized Label Match
      const exactLabelMatch = budgetItems.find((b) => {
        const bLower = b.label.toLowerCase();
        return (
          lowerMerchant === bLower ||
          lowerDest === bLower ||
          (bLower.length > 5 && (lowerMerchant.includes(bLower) || bLower.includes(lowerMerchant)))
        );
      });

      if (exactLabelMatch) {
        return {
          budgetItemId: exactLabelMatch.id,
          budgetItemLabel: exactLabelMatch.label,
          budgetCategory: exactLabelMatch.category,
          budgetAmount: Number(exactLabelMatch.amount),
          isBudgeted: true,
          budgetStatus: "MATCHED" as const,
        };
      }

      // Priority 2: Direct sourceRef / destinationRef on BudgetLineItem
      const directRefMatch = budgetItems.find((b) => {
        if (!b.sourceRef) return false;
        const bRef = b.sourceRef.toLowerCase();
        return (
          (destDebt && bRef.includes(destDebt.id.toLowerCase())) ||
          (destinationRef && bRef.includes(lowerDest)) ||
          (sourceRef && bRef.includes(lowerSource))
        );
      });

      if (directRefMatch) {
        return {
          budgetItemId: directRefMatch.id,
          budgetItemLabel: directRefMatch.label,
          budgetCategory: directRefMatch.category,
          budgetAmount: Number(directRefMatch.amount),
          isBudgeted: true,
          budgetStatus: "MATCHED" as const,
        };
      }

      // Priority 3: Curated Domain Matching Patterns
      const patterns: Array<{
        pattern: RegExp;
        category: string;
        targetLabel: string;
      }> = [
        {
          pattern: /domestic worker|housekeeping|maid|cleaning/i,
          category: "FIXED_HOUSEHOLD_OBLIGATIONS",
          targetLabel: "Domestic Worker Cash Wage (Cleaning & Housekeeping)",
        },
        {
          pattern: /garden services|gardener|lawn maintenance/i,
          category: "FIXED_HOUSEHOLD_OBLIGATIONS",
          targetLabel: "Garden Services & Grounds Maintenance",
        },
        {
          pattern: /ekurhuleni|rates|water.*refuse|sanitation|municipal bill/i,
          category: "FIXED_HOUSEHOLD_OBLIGATIONS",
          targetLabel: "Ekurhuleni Property Rates, Water & Refuse",
        },
        {
          pattern: /vodacom|fibre|cellular|cell.*c|mtn|airtime/i,
          category: "FIXED_HOUSEHOLD_OBLIGATIONS",
          targetLabel: "Vodacom Mobile Fibre & Cellular",
        },
        {
          pattern: /electricity|prepaid.*power|eskom/i,
          category: "FIXED_HOUSEHOLD_OBLIGATIONS",
          targetLabel: "Household Electricity (Prepaid Tokens)",
        },
        {
          pattern: /netflix|showmax|spotify|apple.*sub/i,
          category: "FIXED_HOUSEHOLD_OBLIGATIONS",
          targetLabel: "Netflix ZA Subscription",
        },
        {
          pattern: /google|workspace|antigravity|openai|github/i,
          category: "FIXED_HOUSEHOLD_OBLIGATIONS",
          targetLabel: "Google Workspace & AI Premium (Antigravity)",
        },
        {
          pattern: /cartrack|tracker|netstar|telematics|vehicle recovery/i,
          category: "FIXED_HOUSEHOLD_OBLIGATIONS",
          targetLabel: "Vehicle Tracking & Telematics (Cartrack & Tracker)",
        },
        {
          pattern: /bank.*fee|prestige.*fee|service.*charge|overdraft.*fee|monthly.*fee/i,
          category: "FIXED_HOUSEHOLD_OBLIGATIONS",
          targetLabel: "Banking Account Fees & Overdraft Service Charges",
        },
        {
          pattern: /home loan|bond|sbsa homel|mortgage/i,
          category: "DEBT_ACCELERATION_PLAN",
          targetLabel: "Standard Bank Home Loan (Bond Repayment)",
        },
        {
          pattern: /revolving credit|rcp|sbsa rcp|revolving facility/i,
          category: "DEBT_ACCELERATION_PLAN",
          targetLabel: "Standard Bank Revolving Credit Plan Minimum",
        },
        {
          pattern: /renault|clio|wesbank.*clio/i,
          category: "DEBT_ACCELERATION_PLAN",
          targetLabel: "WesBank Vehicle Finance (Renault Clio V)",
        },
        {
          pattern: /hyundai|grand i10|wesbank.*i10/i,
          category: "DEBT_ACCELERATION_PLAN",
          targetLabel: "WesBank Vehicle Finance (Hyundai Grand i10)",
        },
        {
          pattern: /nedbank.*loan|personal loan|pln 152/i,
          category: "DEBT_ACCELERATION_PLAN",
          targetLabel: "Nedbank Personal Loan Instalment",
        },
        {
          pattern: /telkom.*debt|telkom settlement|telkom arrears/i,
          category: "DEBT_ACCELERATION_PLAN",
          targetLabel: "Telkom Debt Settlement Arrangement",
        },
        {
          pattern: /school fees|school arrears/i,
          category: "DEBT_ACCELERATION_PLAN",
          targetLabel: "School Fees Arrears Payment Plan",
        },
        {
          pattern: /university|tuition|tertiary|wits|uj|unisa/i,
          category: "DEBT_ACCELERATION_PLAN",
          targetLabel: "University Fees Payment Plan",
        },
        {
          pattern: /transmission|sinking fund|overhaul/i,
          category: "GOAL_CONTRIBUTIONS",
          targetLabel: "Car Transmission Repair Sinking Fund",
        },
        {
          pattern: /brakes|disk repair|auto repair|mechanic/i,
          category: "ONE_OFF_UNEXPECTED",
          targetLabel: "Car Brakes and Disk Repairs",
        },
        {
          pattern: /weekend getaway|hotel|resort|leisure trip|holiday/i,
          category: "ONE_OFF_UNEXPECTED",
          targetLabel: "Weekend Getaway",
        },
        {
          pattern: /woolworths|spar|alaswa|pick n pay|checkers|shoprite|food lovers|fruit|butchery|supermarket|grocer/i,
          category: "FAMILY_AND_DISCRETIONARY",
          targetLabel: "Groceries & Household Supplies",
        },
        {
          pattern: /fuel|sasol|shell|engen|caltex|totalenergies|bp garage|petrol/i,
          category: "FAMILY_AND_DISCRETIONARY",
          targetLabel: "Fuel & Transportation",
        },
        {
          pattern: /restaurant|cafe|coffee|kfc|nando|steers|mcdonald|wimpy|dining|takeaway|uber eats|mr d/i,
          category: "FAMILY_AND_DISCRETIONARY",
          targetLabel: "Family Discretionary & Dining",
        },
      ];

      for (const p of patterns) {
        if (p.pattern.test(lowerMerchant) || p.pattern.test(lowerDest)) {
          const matchedBudget = budgetItems.find((b) => b.label.toLowerCase().includes(p.targetLabel.toLowerCase().slice(0, 15)));
          return {
            budgetItemId: matchedBudget ? matchedBudget.id : null,
            budgetItemLabel: matchedBudget ? matchedBudget.label : p.targetLabel,
            budgetCategory: p.category,
            budgetAmount: matchedBudget ? Number(matchedBudget.amount) : null,
            isBudgeted: true,
            budgetStatus: "MATCHED" as const,
          };
        }
      }

      // Priority 4: Flow-type Fallback
      if (flowType === "DEBT_PAYMENT") {
        return {
          budgetItemId: null,
          budgetItemLabel: "Debt Service & Repayment",
          budgetCategory: "DEBT_ACCELERATION_PLAN",
          budgetAmount: amount,
          isBudgeted: true,
          budgetStatus: "MATCHED" as const,
        };
      }

      if (flowType === "CASH_WITHDRAWAL") {
        return {
          budgetItemId: null,
          budgetItemLabel: "ATM Cash Withdrawal (Cash Wallet Top-up)",
          budgetCategory: "FAMILY_AND_DISCRETIONARY",
          budgetAmount: amount,
          isBudgeted: true,
          budgetStatus: "MATCHED" as const,
        };
      }

      if (flowType === "CASH_SPENDING") {
        return {
          budgetItemId: null,
          budgetItemLabel: "Family & Discretionary Outflow",
          budgetCategory: "FAMILY_AND_DISCRETIONARY",
          budgetAmount: null,
          isBudgeted: true,
          budgetStatus: "MATCHED" as const,
        };
      }

      // If credit card or debit card purchase
      if (accountType === "CREDIT_CARD" || lowerMerchant.includes("debit card") || lowerMerchant.includes("authorisation")) {
        return {
          budgetItemId: null,
          budgetItemLabel: "Card Discretionary Purchase",
          budgetCategory: "FAMILY_AND_DISCRETIONARY",
          budgetAmount: null,
          isBudgeted: true,
          budgetStatus: "MATCHED" as const,
        };
      }

      // Unbudgeted Outflow
      return {
        budgetItemId: null,
        budgetItemLabel: "Unbudgeted Expense",
        budgetCategory: "UNBUDGETED",
        budgetAmount: null,
        isBudgeted: false,
        budgetStatus: "UNBUDGETED" as const,
      };
    };

    const transactions: BankingTransaction[] = flows.map((f) => {
      const srcAcc = f.sourceRef ? accountMap.get(f.sourceRef) : null;
      const destAcc = f.destinationRef ? accountMap.get(f.destinationRef) : null;
      const destDebt = f.destinationRef ? debtMap.get(f.destinationRef) : null;

      let merchantName = f.destinationRef || "Banking Transaction";
      let categoryName: string = f.flowType;
      let direction: "INFLOW" | "OUTFLOW" = "OUTFLOW";

      let accountName = "Prestige Current Account";
      let institution = "Standard Bank";
      let accountType = "CURRENT";

      if (f.sourceType === "CASH_WALLET") {
        accountName = "Physical Cash Wallet";
        institution = "Cash Wallet";
        accountType = "CASH_WALLET";
      } else if (srcAcc) {
        accountName = srcAcc.name;
        institution = srcAcc.institution;
        accountType = srcAcc.type;
      } else if (defaultAccount) {
        accountName = defaultAccount.name;
        institution = defaultAccount.institution;
        accountType = defaultAccount.type;
      }

      if (f.flowType === "INCOME") {
        merchantName =
          (srcAcc ? srcAcc.name : null) ||
          (destAcc ? destAcc.name : null) ||
          "SARS Employer Salary";
        direction = "INFLOW";
        categoryName = "Income & Payroll";
        if (destAcc) {
          accountName = destAcc.name;
          institution = destAcc.institution;
          accountType = destAcc.type;
        }
      } else if (f.flowType === "TRANSFER") {
        merchantName = `Transfer to ${destAcc ? destAcc.name : "Savings"}`;
        categoryName = "Internal Transfer";
      } else if (f.flowType === "DEBT_PAYMENT") {
        merchantName = destDebt
          ? destDebt.account.name
          : f.destinationType === "EXTERNAL" && f.destinationRef
          ? f.destinationRef
          : "Debt Paydown";
        categoryName = "Debt Service";
      } else if (f.flowType === "CASH_WITHDRAWAL") {
        merchantName = "ATM Cash Withdrawal";
        categoryName = "Cash Withdrawal";
      } else if (f.flowType === "CASH_SPENDING") {
        merchantName =
          f.destinationType === "EXTERNAL" && f.destinationRef
            ? f.destinationRef
            : "Daily Cash Purchase";
        categoryName = "Cash Spending";
      }

      const amountNum = Number(f.amount);
      const merchantAddress = `${merchantName}, Sandton Central, Johannesburg, South Africa`;

      // Budget Matching
      let budgetInfo: {
        budgetItemId: string | null;
        budgetItemLabel: string | null;
        budgetCategory: string | null;
        budgetAmount: number | null;
        isBudgeted: boolean;
        budgetStatus: "MATCHED" | "UNBUDGETED" | "INCOME" | "INTERNAL_TRANSFER";
      };

      if (f.flowType === "INCOME") {
        budgetInfo = {
          budgetItemId: null,
          budgetItemLabel: "SARS Salary (Nett)",
          budgetCategory: "INCOME",
          budgetAmount: amountNum,
          isBudgeted: true,
          budgetStatus: "INCOME",
        };
      } else if (f.flowType === "TRANSFER") {
        budgetInfo = {
          budgetItemId: null,
          budgetItemLabel: "Internal Transfer",
          budgetCategory: "INTERNAL_TRANSFER",
          budgetAmount: null,
          isBudgeted: false,
          budgetStatus: "INTERNAL_TRANSFER",
        };
      } else {
        budgetInfo = matchBudgetItem(
          merchantName,
          f.flowType,
          destDebt,
          amountNum,
          f.sourceRef,
          f.destinationRef,
          accountType
        );
      }

      return {
        id: f.id,
        date: f.createdAt.toISOString().split("T")[0],
        merchantName,
        merchantAddress,
        accountName,
        institution,
        accountType,
        category: categoryName,
        flowType: f.flowType,
        amount: direction === "INFLOW" ? amountNum : -amountNum,
        direction,
        status: "SETTLED",
        referenceNumber: `TXN-${f.id.slice(-8).toUpperCase()}`,
        confidence: f.confidence,
        budgetItemId: budgetInfo.budgetItemId,
        budgetItemLabel: budgetInfo.budgetItemLabel,
        budgetCategory: budgetInfo.budgetCategory,
        budgetAmount: budgetInfo.budgetAmount,
        isBudgeted: budgetInfo.isBudgeted,
        budgetStatus: budgetInfo.budgetStatus,
      };
    });

    let filtered = transactions;

    // Filter by Flow Category
    if (category && category !== "ALL") {
      filtered = filtered.filter((t) => {
        if (category === "INCOME") return t.direction === "INFLOW";
        if (category === "DEBT") return t.flowType === "DEBT_PAYMENT";
        if (category === "TRANSFER") return t.flowType === "TRANSFER";
        if (category === "CASH") return t.flowType.startsWith("CASH_");
        return true;
      });
    }

    // Filter by Budget Category / Budget Status
    if (budgetFilter && budgetFilter !== "ALL") {
      filtered = filtered.filter((t) => {
        if (budgetFilter === "BUDGETED_ONLY") return t.isBudgeted && t.direction === "OUTFLOW";
        if (budgetFilter === "UNBUDGETED_ONLY") return !t.isBudgeted && t.direction === "OUTFLOW";
        return t.budgetCategory === budgetFilter;
      });
    }

    // Search Query Filter
    if (query) {
      filtered = filtered.filter(
        (t) =>
          t.merchantName.toLowerCase().includes(query) ||
          (t.merchantAddress && t.merchantAddress.toLowerCase().includes(query)) ||
          t.accountName.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          t.referenceNumber.toLowerCase().includes(query) ||
          (t.budgetItemLabel && t.budgetItemLabel.toLowerCase().includes(query)) ||
          (t.budgetCategory && t.budgetCategory.toLowerCase().includes(query))
      );
    }

    // Pay Period Filtering with South African Statutory Payroll & Statement Synchronization
    if (payPeriod && payPeriod !== "ALL") {
      let startDate: Date;
      let endDate: Date;

      if (periodType === "CALENDAR") {
        const [yearStr, monthStr] = payPeriod.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      } else {
        // South African statutory payroll adjustment (Friday 14th if Sat 15th, Mon 16th if Sun 15th, preceding if holiday)
        const cycleBounds = resolveSalaryCycleRange(payPeriod);
        startDate = cycleBounds.startDate;
        endDate = cycleBounds.endDate;
      }

      const startDayStr = startDate.toISOString().split("T")[0];
      const endDayStr = endDate.toISOString().split("T")[0];

      filtered = filtered.filter((t) => {
        const tDayStr = t.date.includes("T") ? t.date.split("T")[0] : t.date;
        const d = new Date(t.date);
        const isTimeInRange = d.getTime() >= startDate.getTime() && d.getTime() <= endDate.getTime();
        const isDayInRange = tDayStr >= startDayStr && tDayStr <= endDayStr;
        return isTimeInRange || isDayInRange;
      });
    }

    const totalInflow = filtered
      .filter((t) => t.direction === "INFLOW")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalOutflow = filtered
      .filter((t) => t.direction === "OUTFLOW")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const budgetedOutflow = filtered
      .filter((t) => t.direction === "OUTFLOW" && t.isBudgeted && t.flowType !== "TRANSFER")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const unbudgetedOutflow = filtered
      .filter((t) => t.direction === "OUTFLOW" && !t.isBudgeted && t.flowType !== "TRANSFER")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const budgetAdherenceRate =
      totalOutflow > 0
        ? Math.min(100, Math.round((budgetedOutflow / totalOutflow) * 1000) / 10)
        : 100;

    // Category breakdown for visual telemetry
    const categoryBreakdown = {
      FIXED_HOUSEHOLD_OBLIGATIONS: filtered
        .filter((t) => t.budgetCategory === "FIXED_HOUSEHOLD_OBLIGATIONS")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      DEBT_ACCELERATION_PLAN: filtered
        .filter((t) => t.budgetCategory === "DEBT_ACCELERATION_PLAN")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      GOAL_CONTRIBUTIONS: filtered
        .filter((t) => t.budgetCategory === "GOAL_CONTRIBUTIONS")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      FAMILY_AND_DISCRETIONARY: filtered
        .filter((t) => t.budgetCategory === "FAMILY_AND_DISCRETIONARY")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      ONE_OFF_UNEXPECTED: filtered
        .filter((t) => t.budgetCategory === "ONE_OFF_UNEXPECTED")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      UNBUDGETED: unbudgetedOutflow,
    };

    return NextResponse.json({
      transactions: filtered,
      budgetItems: budgetItems.map((b) => ({
        id: b.id,
        label: b.label,
        category: b.category,
        amount: Number(b.amount),
        month: b.month,
      })),
      summary: {
        totalCount: filtered.length,
        totalInflow,
        totalOutflow,
        netBalance: totalInflow - totalOutflow,
        budgetedOutflow,
        unbudgetedOutflow,
        budgetAdherenceRate,
        categoryBreakdown,
      },
    });
  } catch (error: any) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions", message: error?.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = await getEffectiveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, merchantName, merchantAddress, flowType, confidence, amount, budgetItemId } = body;

    if (!id) {
      return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });
    }

    const existing = await prisma.moneyFlow.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    let updatedDestinationRef = merchantName || existing.destinationRef;

    // If budget item was selected, we can also link or format the destinationRef or flow
    if (budgetItemId) {
      const linkedBudget = await prisma.budgetLineItem.findUnique({
        where: { id: budgetItemId },
      });
      if (linkedBudget && !merchantName) {
        updatedDestinationRef = linkedBudget.label;
      }
    }

    const updated = await prisma.moneyFlow.update({
      where: { id },
      data: {
        destinationRef: updatedDestinationRef,
        flowType: flowType ? (flowType as any) : existing.flowType,
        confidence: confidence ? (confidence as any) : existing.confidence,
        amount: amount !== undefined ? Math.abs(parseFloat(amount)) : existing.amount,
      },
    });

    // Write Audit Log Entry for user edits
    await prisma.auditLogEntry.create({
      data: {
        entityType: "MONEY_FLOW",
        entityId: id,
        fieldChanged: "merchantName, merchantAddress, flowType & budgetMapping",
        oldValue: existing.destinationRef || existing.flowType,
        newValue: `${updatedDestinationRef} [${merchantAddress || "No Address"}] (${flowType})`,
        reason: "User edited transaction metadata & budget allocation via UI modal",
        actor: "USER",
        changedBy: user?.username || "user",
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    console.error("PUT /api/transactions error:", error);
    return NextResponse.json(
      { error: "Failed to update transaction", message: error?.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { resolveSalaryCycleRange } from "@/lib/payrollCalendar";
import { buildForensicAuditReport } from "@/lib/forensicAudit";
import { buildUserFlowWhere } from "@/lib/moneyFlowRefs";

export async function GET(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "MONTHLY_CYCLE";
    const selectedMonth = searchParams.get("month") || "ALL";
    const cycleBounds = selectedMonth === "ALL" ? null : resolveSalaryCycleRange(selectedMonth);

    // Fetch user, budget line items, incomes, accounts, debts, assets, documents, and money flows
    const [user, budgetItems, incomes, accounts, debts, assets] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
      prisma.budgetLineItem.findMany({
        where: selectedMonth === "ALL" ? { userId } : { userId, month: selectedMonth },
        orderBy: [{ category: "asc" }, { amount: "desc" }],
      }),
      prisma.income.findMany({
        where: { userId },
      }),
      prisma.account.findMany({
        where: { userId },
        include: { debt: true, assets: true },
        orderBy: { name: "asc" },
      }),
      prisma.debt.findMany({
        where: { account: { userId } },
        include: { account: true },
        orderBy: { currentBalance: "desc" },
      }),
      prisma.asset.findMany({
        where: { userId },
      }),
    ]);

    const userEntityIds = [
      ...accounts.map((a) => a.id),
      ...incomes.map((i) => i.id),
      ...assets.map((a) => a.id),
      ...debts.map((d) => d.id),
    ];
    const userFlowWhere = buildUserFlowWhere(accounts, debts);

    const [documents, flows] = await Promise.all([
      userEntityIds.length === 0
        ? Promise.resolve([])
        : prisma.document.findMany({
            where: { relatedEntityId: { in: userEntityIds } },
            orderBy: { uploadedAt: "desc" },
          }),
      userFlowWhere.OR.length === 0
        ? Promise.resolve([])
        : prisma.moneyFlow.findMany({
            where: {
              ...userFlowWhere,
              amount: { lte: 80000 },
            },
            orderBy: { createdAt: "desc" },
          }),
    ]);

    const userRecurringIncome = incomes.reduce((s, i) => s + Number(i.recurringAmount), 0);
    const hasIncome = userRecurringIncome > 0;
    const netSalary = hasIncome ? userRecurringIncome : 0;
    const salarySourceLabel = hasIncome
      ? `${incomes[0]?.sourceName || "Salary"} Confirmed (${selectedMonth === "ALL" ? "All Months" : selectedMonth})`
      : "No confirmed income";

    // 1. Budget Planned Outflows
    const plannedByCategory: Record<string, number> = {
      FIXED_HOUSEHOLD_OBLIGATIONS: 0,
      DEBT_ACCELERATION_PLAN: 0,
      GOAL_CONTRIBUTIONS: 0,
      FAMILY_AND_DISCRETIONARY: 0,
      ONE_OFF_UNEXPECTED: 0,
    };

    if (budgetItems.length > 0) {
      budgetItems.forEach((b) => {
        const amt = Number(b.amount);
        if (amt > 0 && amt < 80000) {
          if (plannedByCategory[b.category] !== undefined) {
            plannedByCategory[b.category] += amt;
          }
        }
      });
    }

    // Direct living and debt outflows (excluding internal goal contributions)
    const debtsPlanned = plannedByCategory.DEBT_ACCELERATION_PLAN;
    const livingPlanned =
      plannedByCategory.FIXED_HOUSEHOLD_OBLIGATIONS +
      plannedByCategory.FAMILY_AND_DISCRETIONARY +
      plannedByCategory.ONE_OFF_UNEXPECTED;
    const totalExpenseOutflows = debtsPlanned + livingPlanned;

    // 2. Filter cycle flows (strict sanity bounds & inclusive start date)
    const cycleFlows = flows.filter((f) => {
      const amt = Number(f.amount);
      if (isNaN(amt) || amt <= 0 || amt > 80000) return false;
      if (selectedMonth === "ALL" || !cycleBounds) return true;
      const d = new Date(f.createdAt);
      const startDayStr = cycleBounds.startDate.toISOString().split("T")[0];
      const endDayStr = cycleBounds.endDate.toISOString().split("T")[0];
      const fDayStr = d.toISOString().split("T")[0];
      const isTimeInRange = d.getTime() >= cycleBounds.startDate.getTime() && d.getTime() <= cycleBounds.endDate.getTime();
      const isDayInRange = fDayStr >= startDayStr && fDayStr <= endDayStr;
      return isTimeInRange || isDayInRange;
    });

    const actualByCategory: Record<string, number> = {
      FIXED_HOUSEHOLD_OBLIGATIONS: 0,
      DEBT_ACCELERATION_PLAN: 0,
      GOAL_CONTRIBUTIONS: 0,
      FAMILY_AND_DISCRETIONARY: 0,
      ONE_OFF_UNEXPECTED: 0,
    };

    const merchantMap: Record<string, { count: number; total: number; category: string }> = {};
    const leakageItems: Array<{
      id: string;
      date: string;
      type: string;
      description: string;
      amount: number;
      account: string;
      actionRecommendation: string;
    }> = [];

    let totalATMWithdrawals = 0;
    let totalCashSpent = 0;

    cycleFlows.forEach((f) => {
      const amt = Number(f.amount);
      if (amt > 80000) return;

      const desc = (f.destinationRef || f.sourceRef || "").toLowerCase();
      const rawDesc = f.destinationRef || f.sourceRef || "General Outflow";

      // Ignore internal account transfers
      if (f.flowType === "TRANSFER" && (desc.includes("3074469") || desc.includes("5936506") || desc.includes("5773529") || desc.includes("3529"))) {
        return;
      }

      if (
        f.flowType === "DEBT_PAYMENT" ||
        desc.includes("homel") ||
        desc.includes("wesbank") ||
        desc.includes("loan") ||
        desc.includes("debit order") ||
        desc.includes("rcp")
      ) {
        actualByCategory.DEBT_ACCELERATION_PLAN += amt;
      } else if (
        desc.includes("ekurhuleni") ||
        desc.includes("vodacom") ||
        desc.includes("netflix") ||
        desc.includes("google") ||
        desc.includes("insure") ||
        desc.includes("fee")
      ) {
        actualByCategory.FIXED_HOUSEHOLD_OBLIGATIONS += amt;
      } else if (
        desc.includes("trust") ||
        desc.includes("sbg sec") ||
        desc.includes("savings") ||
        desc.includes("investment")
      ) {
        actualByCategory.GOAL_CONTRIBUTIONS += amt;
      } else if (
        f.flowType === "CASH_SPENDING" ||
        desc.includes("spar") ||
        desc.includes("pick") ||
        desc.includes("woolworths") ||
        desc.includes("engen") ||
        desc.includes("allowance")
      ) {
        actualByCategory.FAMILY_AND_DISCRETIONARY += amt;
      }

      // Track Merchant Concentration
      if (f.flowType === "CASH_SPENDING" || f.flowType === "DEBT_PAYMENT") {
        let cleanMerchant = rawDesc
          .replace(
            /IB PAYMENT TO|DEBIT CARD PURCHASE FROM|AUTOBANK CASH WITHDRAWAL AT|DEBICHECK DEBIT ORDER|DEBIT TRANSFER|PAYSHAP PAYMENT TO|OUTSTANDING CARD AUTHORISATION/gi,
            ""
          )
          .trim();
        if (cleanMerchant.length > 30) cleanMerchant = cleanMerchant.substring(0, 30) + "…";
        if (cleanMerchant) {
          if (!merchantMap[cleanMerchant]) {
            merchantMap[cleanMerchant] = { count: 0, total: 0, category: f.flowType };
          }
          merchantMap[cleanMerchant].count += 1;
          merchantMap[cleanMerchant].total += amt;
        }
      }

      // Track Cash Wallet & Phantom Cash
      if (f.flowType === "CASH_WITHDRAWAL" || desc.includes("cash withdrawal") || desc.includes("autobank")) {
        totalATMWithdrawals += amt;
      } else if (
        f.flowType === "CASH_SPENDING" &&
        (f.sourceType === "CASH_WALLET" || desc.includes("domestic worker") || desc.includes("garden"))
      ) {
        totalCashSpent += amt;
      }

      // 3. LEAKAGE & FRICTION DETECTOR
      if (
        f.flowType === "FEE" ||
        desc.includes("unpaid item") ||
        desc.includes("e-comm decline") ||
        desc.includes("excess interest") ||
        desc.includes("overdraft service") ||
        desc.includes("disputed debit") ||
        desc.includes("instant money") ||
        desc.includes("fee immediate")
      ) {
        let leakType = "Bank Penalty Fee";
        let recommendation = "Align debit order sequence with payroll deposit to prevent bounces.";

        if (desc.includes("unpaid item")) {
          leakType = "Unpaid Item Penalty (Bounce Fee)";
          recommendation = "Maintain a R1,000 cash buffer on Prestige account to eliminate R130 returned debit fees.";
        } else if (desc.includes("e-comm decline")) {
          leakType = "Card Decline Transaction Fee";
          recommendation = "Ensure Titanium credit card available limit covers active subscriptions before billing dates.";
        } else if (desc.includes("overdraft") || desc.includes("excess interest")) {
          leakType = "Overdraft & Excess Interest";
          recommendation = "Operate within positive balance to avoid monthly R69 overdraft maintenance and excess rates.";
        } else if (desc.includes("instant money") || desc.includes("immediate payment")) {
          leakType = "Convenience & Voucher Clearing Fee";
          recommendation = "Use scheduled standard EFTs or grouped monthly cash withdrawals instead of repeated vouchers.";
        }

        const sourceAccName = accounts.find((a) => a.id === f.sourceRef)?.name || accounts[0]?.name || "Linked Account";

        leakageItems.push({
          id: f.id,
          date: f.createdAt.toISOString().split("T")[0],
          type: leakType,
          description: rawDesc,
          amount: amt,
          account: sourceAccName,
          actionRecommendation: recommendation,
        });
      }
    });

    const totalActualOutflows = Object.values(actualByCategory).reduce((sum, value) => sum + value, 0);
    const netSurplusActual = Math.max(0, netSalary - totalActualOutflows);

    // Compute Leakage Totals
    const totalLeakage = leakageItems.reduce((s, l) => s + l.amount, 0);
    const annualizedLeakage = totalLeakage * 12;
    const phantomCash = Math.max(0, totalATMWithdrawals - totalCashSpent);

    const topMerchants = Object.entries(merchantMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        total: data.total,
        category: data.category,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Budget vs Actual Category Variance Table
    const categoryVariance = Object.keys(plannedByCategory).map((cat) => {
      const planned = plannedByCategory[cat] || 0;
      const actual = actualByCategory[cat] || 0;

      const diff = actual - planned;
      const pct = planned > 0 ? ((diff / planned) * 100).toFixed(1) : "0.0";
      let status: "UNDER_BUDGET" | "ON_TRACK" | "OVER_BUDGET" = "ON_TRACK";
      if (diff > 200) status = "OVER_BUDGET";
      else if (diff < -200) status = "UNDER_BUDGET";

      return {
        category: cat,
        planned,
        actual,
        difference: diff,
        percentageDiff: parseFloat(pct),
        status,
      };
    });

    const trendBuckets = new Map<string, { income: number; expenses: number }>();
    for (const flow of flows) {
      const amount = Number(flow.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 80000) continue;
      const date = flow.createdAt instanceof Date ? flow.createdAt : new Date(flow.createdAt);
      const key = date.toISOString().slice(0, 7);
      const bucket = trendBuckets.get(key) || { income: 0, expenses: 0 };
      if (flow.flowType === "INCOME") {
        bucket.income += amount;
      } else {
        bucket.expenses += amount;
      }
      trendBuckets.set(key, bucket);
    }

    const historicalTrends = [...trendBuckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([monthKey, bucket]) => {
        const [year, month] = monthKey.split("-");
        const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
        const surplus = bucket.income - bucket.expenses;
        return {
          period: date.toLocaleDateString("en-ZA", { month: "short", year: "numeric" }),
          income: bucket.income,
          expenses: bucket.expenses,
          surplus,
          savingsRate: bucket.income > 0 ? parseFloat(((surplus / bucket.income) * 100).toFixed(1)) : 0,
        };
      });

    const weeklyRunway: Array<{ week: string; focus: string; target: number; actual: number; remainingRunway: number }> = [];

    // ─── 4. STATEMENT AUDIT & CROSS-ACCOUNT RECONCILIATION ENGINE ─────────────
    const auditAccounts = accounts.map((acc) => {
      const debt = debts.find((d) => d.accountId === acc.id);
      const statementRef = acc.accountNumberMasked || `${acc.institution} linked account`;
      const confidence = debt ? debt.balanceConfidence : "CONFIRMED";
      const status = confidence === "CONFIRMED"
        ? "CONFIRMED"
        : confidence === "UNKNOWN"
          ? "UNVERIFIED"
          : "NEEDS_REVIEW";
      const reconciledDate = acc.openingBalanceDate || debt?.updatedAt || acc.updatedAt;
      const lastReconciled = new Date(reconciledDate).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
      const notes = acc.notes || (status === "CONFIRMED" ? "Confirmed from linked records" : "Awaiting statement confirmation");

      return {
        id: acc.id,
        name: acc.name,
        institution: acc.institution,
        type: acc.type,
        accountNumberMasked: acc.accountNumberMasked,
        currentBalance: Number(acc.openingBalance),
        isDebt: acc.isDebt,
        debtBalance: debt ? Number(debt.currentBalance) : null,
        minimumPayment: debt ? Number(debt.minimumPayment) : null,
        annualInterestRate: debt ? Number(debt.annualInterestRate) : null,
        debtCategory: debt ? debt.debtCategory : null,
        balanceConfidence: confidence,
        statementRef,
        lastReconciled,
        status,
        notes,
      };
    });

    const confirmedAccounts = auditAccounts.filter((a) => a.status === "CONFIRMED").length;
    const reconciliationScore = auditAccounts.length > 0
      ? Math.round((confirmedAccounts / auditAccounts.length) * 100)
      : 0;

    // Cross-account events derived from actual debt-payment transaction flows
    const homeLoanCrossAccountEvents: Array<{
      month: string;
      prestigeEvent: string;
      mymoRecoveryEvent: string;
      status: string;
      amount: number;
    }> = cycleFlows
      .filter((f) => f.flowType === "DEBT_PAYMENT")
      .slice(0, 12)
      .map((f) => {
        const amount = Number(f.amount || 0);
        const date = f.createdAt instanceof Date ? f.createdAt : new Date(f.createdAt);
        return {
          month: date.toLocaleDateString("en-ZA", { month: "short", year: "numeric" }),
          prestigeEvent: String(f.destinationRef || f.sourceRef || "Debt settlement flow"),
          mymoRecoveryEvent: "Settlement reflected in transaction ledger",
          status: "DETECTED_FROM_STATEMENT_FLOWS",
          amount,
        };
      });

    return NextResponse.json({
      success: true,
      timeframe,
      selectedMonth,
      cycleBounds,
      summary: {
        totalIncome: netSalary,
        salarySourceLabel,
        totalPlannedOutflows: totalExpenseOutflows,
        totalActualOutflows,
        netSurplus: netSurplusActual,
        debtsOutflow: debtsPlanned,
        livingOutflow: livingPlanned,
        savingsRatePercentage: netSalary > 0 ? parseFloat(((netSurplusActual / netSalary) * 100).toFixed(1)) : 0,
        totalLeakageMonthly: totalLeakage,
        annualizedLeakage: annualizedLeakage,
        phantomCashMonthly: phantomCash,
        totalVerifiedAccounts: auditAccounts.length,
        reconciliationScore,
      },
      categoryVariance,
      leakageItems: leakageItems.length > 0 ? leakageItems.slice(0, 15) : [],
      topMerchants,
      historicalTrends,
      weeklyRunway,
      budgetLineItems: budgetItems,
      auditData: {
        auditAccounts,
        homeLoanCrossAccountEvents,
        documents: documents.map((d) => {
          const parsed = (d.parsedData && typeof d.parsedData === "object" && !Array.isArray(d.parsedData) ? (d.parsedData as Record<string, any>) : {}) as Record<string, any>;
          const text = String(parsed.fullText || parsed.rawText || "");
          let friendlyTitle = "Financial Statement";
          let accountInfo = "";

          if (text.includes("02 307 446 9") || text.includes("PRESTIGE CURRENT")) {
            friendlyTitle = "Standard Bank Prestige Current";
            accountInfo = "02 307 446 9";
          } else if (text.includes("02 593 650 6") || text.includes("MYMO")) {
            friendlyTitle = "Standard Bank MyMo Current";
            accountInfo = "02 593 650 6";
          } else if (text.includes("02 596 759 2") || text.includes("PLUSPLAN")) {
            friendlyTitle = "Standard Bank PlusPlan Savings";
            accountInfo = "02 596 759 2";
          } else if (text.includes("22 043 551 0") || text.includes("REVOLVING CREDIT")) {
            friendlyTitle = "Standard Bank Revolving Credit";
            accountInfo = "22 043 551 0";
          } else if (text.includes("5239-xxxx-xxxx-3529") || text.includes("TITANIUM PRESTIGE")) {
            friendlyTitle = "Titanium Prestige Credit Card";
            accountInfo = "5239-xxxx-3529";
          } else if (d.documentType === "PAYSLIP" || text.includes("PAYSLIP") || text.includes("SARS")) {
            friendlyTitle = "Official SARS Payslip";
            accountInfo = "Emp #00011185";
          } else if (text.includes("85361174582") || text.includes("Renault Clio")) {
            friendlyTitle = "WesBank Finance (Renault Clio V)";
            accountInfo = "85361174582";
          } else if (text.includes("85401320912") || text.includes("Hyundai")) {
            friendlyTitle = "WesBank Finance (Hyundai i10)";
            accountInfo = "85401320912";
          }

          const rawHash = d.fileUrl.split("/").pop() || "";
          return {
            id: d.id,
            documentType: d.documentType,
            fileUrl: d.fileUrl,
            rawHash,
            friendlyTitle,
            accountInfo,
            parseStatus: d.parseStatus,
            uploadedAt: d.uploadedAt,
            parsedData: d.parsedData,
          };
        }),
        totalAssetsValue: assets.reduce((sum, a) => sum + Number(a.currentValue), 0),
        totalDebtsValue: debts.reduce((sum, d) => sum + Number(d.currentBalance), 0),
        totalServicingMonthly: debts.reduce((sum, d) => sum + Number(d.minimumPayment || 0), 0),
        liquidReserves: accounts
          .filter((a) => !a.isDebt && (a.type === "CURRENT" || a.type === "SAVINGS" || a.type === "CASH_WALLET"))
          .reduce((sum, a) => sum + Math.max(0, Number(a.openingBalance || 0)), 0),
        liquidAccountsSummary:
          accounts
            .filter((a) => !a.isDebt && (a.type === "CURRENT" || a.type === "SAVINGS" || a.type === "CASH_WALLET") && Number(a.openingBalance) > 0)
            .map((a) => `${a.name} (+R${Math.round(Number(a.openingBalance))})`)
            .join(" & ") || (accounts.length > 0 ? "Accounts linked" : "No cash reserves recorded"),
        netWorth:
          assets.reduce((sum, a) => sum + Number(a.currentValue), 0) -
          debts.reduce((sum, d) => sum + Number(d.currentBalance), 0),
        lastAuditTimestamp: new Date().toISOString(),
      },
      forensicAuditData: buildForensicAuditReport(
        flows,
        selectedMonth === "ALL" ? null : cycleBounds
      ),
      cumulativeForensicAudit: buildForensicAuditReport(flows, null),
    });
  } catch (error) {
    console.error("Error generating reports:", error);
    return NextResponse.json({ error: "Failed to generate financial reports" }, { status: 500 });
  }
}

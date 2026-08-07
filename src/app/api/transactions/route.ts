import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId, getCurrentUser } from "@/lib/session";

export interface BankingTransaction {
  id: string;
  date: string;
  merchantName: string;
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
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const query = searchParams.get("query")?.toLowerCase();

    // Fetch DB flows & reference accounts/debts
    const [flows, accounts, debts] = await Promise.all([
      prisma.moneyFlow.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.account.findMany({ where: { userId } }),
      prisma.debt.findMany({
        where: { account: { userId } },
        include: { account: true },
      }),
    ]);

    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const debtMap = new Map(debts.map((d) => [d.id, d]));

    const defaultAccount = accounts.find((a) => a.type === "CURRENT") || accounts[0];

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
        merchantName = f.sourceRef || f.destinationRef || "SARS Employer Salary";
        direction = "INFLOW";
        categoryName = "Income & Payroll";
        if (destAcc) {
          accountName = destAcc.name;
          institution = destAcc.institution;
          accountType = destAcc.type;
        }
      } else if (f.flowType === "TRANSFER") {
        merchantName = f.destinationRef || `Transfer to ${destAcc ? destAcc.name : "Savings"}`;
        categoryName = "Internal Transfer";
      } else if (f.flowType === "DEBT_PAYMENT") {
        merchantName = f.destinationRef || (destDebt ? destDebt.account.name : "Debt Paydown");
        categoryName = "Debt Service";
      } else if (f.flowType === "CASH_WITHDRAWAL") {
        merchantName = f.destinationRef || "ATM Cash Withdrawal";
        categoryName = "Cash Withdrawal";
      } else if (f.flowType === "CASH_SPENDING") {
        merchantName = f.destinationRef || "Daily Cash Purchase";
        categoryName = "Cash Spending";
      }

      const amountNum = Number(f.amount);

      return {
        id: f.id,
        date: f.createdAt.toISOString().split("T")[0],
        merchantName,
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
      };
    });

    let filtered = transactions;

    if (category && category !== "ALL") {
      filtered = filtered.filter((t) => {
        if (category === "INCOME") return t.direction === "INFLOW";
        if (category === "DEBT") return t.flowType === "DEBT_PAYMENT";
        if (category === "TRANSFER") return t.flowType === "TRANSFER";
        if (category === "CASH") return t.flowType.startsWith("CASH_");
        return true;
      });
    }

    if (query) {
      filtered = filtered.filter(
        (t) =>
          t.merchantName.toLowerCase().includes(query) ||
          t.accountName.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          t.referenceNumber.toLowerCase().includes(query)
      );
    }

    const totalInflow = filtered
      .filter((t) => t.direction === "INFLOW")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalOutflow = filtered
      .filter((t) => t.direction === "OUTFLOW")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return NextResponse.json({
      transactions: filtered,
      summary: {
        totalCount: filtered.length,
        totalInflow,
        totalOutflow,
        netBalance: totalInflow - totalOutflow,
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
    const { id, merchantName, flowType, confidence, amount } = body;

    if (!id) {
      return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });
    }

    const existing = await prisma.moneyFlow.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const updated = await prisma.moneyFlow.update({
      where: { id },
      data: {
        destinationRef: merchantName || existing.destinationRef,
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
        fieldChanged: "merchantName & flowType",
        oldValue: existing.destinationRef || existing.flowType,
        newValue: `${merchantName} (${flowType})`,
        reason: "User edited transaction metadata via UI modal",
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

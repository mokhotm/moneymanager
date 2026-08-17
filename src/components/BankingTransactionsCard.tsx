"use client";

import { useEffect, useState, useMemo } from "react";
import { formatZAR } from "@/lib/formatters";
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Building,
  Landmark,
  Wallet,
  Receipt,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Info,
  X,
  FileText,
  Layers,
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Edit3,
  Save,
  MapPin,
  Calendar,
  Home,
  PiggyBank,
  ShoppingCart,
  Zap,
  AlertCircle,
  Tag,
  Target,
  Check,
} from "lucide-react";

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
  budgetItemId?: string | null;
  budgetItemLabel?: string | null;
  budgetCategory?: string | null;
  budgetAmount?: number | null;
  isBudgeted: boolean;
  budgetStatus: "MATCHED" | "UNBUDGETED" | "INCOME" | "INTERNAL_TRANSFER";
}

interface BudgetItemRef {
  id: string;
  label: string;
  category: string;
  amount: number;
  month?: string;
}

interface BankingTransactionsCardProps {
  limit?: number;
  title?: string;
  showFilters?: boolean;
  onSummaryChange?: (summary: any, payPeriod: string, periodType: string) => void;
}

const BUDGET_CATEGORY_CONFIG: Record<
  string,
  { label: string; shortLabel: string; color: string; bg: string; border: string; icon: any }
> = {
  FIXED_HOUSEHOLD_OBLIGATIONS: {
    label: "Fixed Household Obligations",
    shortLabel: "Fixed Obligations",
    color: "#38bdf8",
    bg: "rgba(56, 189, 248, 0.16)",
    border: "rgba(56, 189, 248, 0.38)",
    icon: Home,
  },
  DEBT_ACCELERATION_PLAN: {
    label: "Debt Acceleration Plan",
    shortLabel: "Debt Service",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.16)",
    border: "rgba(251, 191, 36, 0.38)",
    icon: CreditCard,
  },
  GOAL_CONTRIBUTIONS: {
    label: "Goal Contributions & Sinking Funds",
    shortLabel: "Goal Funds",
    color: "#34d399",
    bg: "rgba(52, 211, 153, 0.16)",
    border: "rgba(52, 211, 153, 0.38)",
    icon: PiggyBank,
  },
  FAMILY_AND_DISCRETIONARY: {
    label: "Family & Discretionary",
    shortLabel: "Discretionary",
    color: "#c084fc",
    bg: "rgba(192, 132, 252, 0.16)",
    border: "rgba(192, 132, 252, 0.38)",
    icon: ShoppingCart,
  },
  ONE_OFF_UNEXPECTED: {
    label: "One-Off / Unexpected",
    shortLabel: "One-Off",
    color: "#f43f5e",
    bg: "rgba(244, 63, 94, 0.16)",
    border: "rgba(244, 63, 94, 0.38)",
    icon: Zap,
  },
  INCOME: {
    label: "Income & Payroll",
    shortLabel: "Income",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.16)",
    border: "rgba(16, 185, 129, 0.38)",
    icon: TrendingUp,
  },
  INTERNAL_TRANSFER: {
    label: "Internal Transfer",
    shortLabel: "Transfer",
    color: "#38bdf8",
    bg: "rgba(56, 189, 248, 0.16)",
    border: "rgba(56, 189, 248, 0.38)",
    icon: RefreshCw,
  },
  UNBUDGETED: {
    label: "Unbudgeted Outflow",
    shortLabel: "Unbudgeted",
    color: "#f43f5e",
    bg: "rgba(244, 63, 94, 0.1)",
    border: "rgba(244, 63, 94, 0.35)",
    icon: AlertCircle,
  },
};

export function BankingTransactionsCard({
  limit,
  title = "Live Banking Transactions",
  showFilters = true,
  onSummaryChange,
}: BankingTransactionsCardProps) {
  const [transactions, setTransactions] = useState<BankingTransaction[]>([]);
  const [budgetItemsList, setBudgetItemsList] = useState<BudgetItemRef[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeBudgetFilter, setActiveBudgetFilter] = useState("ALL");
  const [activeInstitution, setActiveInstitution] = useState("ALL");
  const [activePayPeriod, setActivePayPeriod] = useState("2026-07");
  const [periodType, setPeriodType] = useState<"SALARY" | "CALENDAR">("SALARY");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit & Budget Mapping Modal State
  const [selectedTx, setSelectedTx] = useState<BankingTransaction | null>(null);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    merchantName: "",
    merchantAddress: "",
    flowType: "CASH_SPENDING",
    confidence: "CONFIRMED",
    amount: "",
    city: "Johannesburg",
    budgetItemId: "",
  });

  const fetchTransactions = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory !== "ALL") params.set("category", activeCategory);
    if (activeBudgetFilter !== "ALL") params.set("budgetCategory", activeBudgetFilter);
    if (activePayPeriod !== "ALL") params.set("payPeriod", activePayPeriod);
    params.set("periodType", periodType);

    fetch(`/api/transactions?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setTransactions(data.transactions || []);
        setBudgetItemsList(data.budgetItems || []);
        setSummary(data.summary || null);
        onSummaryChange?.(data.summary || null, activePayPeriod, periodType);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeCategory, activeBudgetFilter, activePayPeriod, periodType]);

  const filteredTransactions = useMemo(() => {
    let list = transactions;

    // Filter by Institution
    if (activeInstitution !== "ALL") {
      list = list.filter((t) =>
        t.institution?.toLowerCase().includes(activeInstitution.toLowerCase())
      );
    }

    // Live search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        const nameMatch = t.merchantName?.toLowerCase().includes(q);
        const addrMatch = t.merchantAddress?.toLowerCase().includes(q);
        const accMatch = t.accountName?.toLowerCase().includes(q);
        const instMatch = t.institution?.toLowerCase().includes(q);
        const catMatch = t.category?.toLowerCase().includes(q);
        const flowMatch = t.flowType?.toLowerCase().includes(q);
        const refMatch = t.referenceNumber?.toLowerCase().includes(q);
        const budgetLabelMatch = t.budgetItemLabel?.toLowerCase().includes(q);
        const budgetCatMatch = t.budgetCategory?.toLowerCase().includes(q);
        const amountMatch = String(Math.abs(t.amount)).includes(q);

        return (
          nameMatch ||
          addrMatch ||
          accMatch ||
          instMatch ||
          catMatch ||
          flowMatch ||
          refMatch ||
          budgetLabelMatch ||
          budgetCatMatch ||
          amountMatch
        );
      });
    }

    return list;
  }, [transactions, activeInstitution, searchQuery]);

  const displayedTransactions = useMemo(() => {
    if (limit && limit > 0) {
      return filteredTransactions.slice(0, limit);
    }
    return filteredTransactions;
  }, [filteredTransactions, limit]);

  const [extracting, setExtracting] = useState(false);
  const [extractedNotice, setExtractedNotice] = useState<string | null>(null);

  const openTxDetailModal = (tx: BankingTransaction) => {
    setSelectedTx(tx);
    setExtractedNotice(null);
    setEditForm({
      merchantName: tx.merchantName,
      merchantAddress:
        tx.merchantAddress ||
        `${tx.merchantName}, Sandton Central, Johannesburg, South Africa`,
      flowType: tx.flowType,
      confidence: tx.confidence,
      amount: String(Math.abs(tx.amount)),
      city: "Johannesburg",
      budgetItemId: tx.budgetItemId || "",
    });
    setIsEditingModalOpen(true);
  };

  const handleExtractFromDocument = async (customQuery?: string) => {
    if (!selectedTx) return;
    setExtracting(true);
    setExtractedNotice(null);

    try {
      const targetQuery = customQuery || selectedTx.merchantName;
      const res = await fetch("/api/documents/extract-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: targetQuery, amount: selectedTx.amount }),
      });
      const data = await res.json();
      if (data.metadata) {
        const meta = data.metadata;
        setEditForm((prev) => ({
          ...prev,
          merchantName: meta.merchantName,
          merchantAddress: meta.merchantAddress,
          city: meta.city || "Johannesburg",
          flowType: meta.flowType || prev.flowType,
          confidence: "CONFIRMED",
        }));
        setExtractedNotice(
          `⚡ Pre-populated from document [${meta.sourceDocumentName}]: ${meta.merchantAddress}`
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    setSaving(true);

    try {
      await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTx.id,
          merchantName: editForm.merchantName,
          merchantAddress: editForm.merchantAddress,
          flowType: editForm.flowType,
          confidence: editForm.confidence,
          amount: parseFloat(editForm.amount) || Math.abs(selectedTx.amount),
          budgetItemId: editForm.budgetItemId || null,
        }),
      });
      setIsEditingModalOpen(false);
      setSelectedTx(null);
      fetchTransactions();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getTxIcon = (tx: BankingTransaction) => {
    if (tx.direction === "INFLOW") {
      return <TrendingUp size={17} style={{ color: "#10b981" }} />;
    }
    if (tx.flowType === "TRANSFER") {
      return <RefreshCw size={17} style={{ color: "#38bdf8" }} />;
    }
    if (tx.budgetCategory && BUDGET_CATEGORY_CONFIG[tx.budgetCategory]) {
      const IconComponent = BUDGET_CATEGORY_CONFIG[tx.budgetCategory].icon;
      return (
        <IconComponent
          size={17}
          style={{ color: BUDGET_CATEGORY_CONFIG[tx.budgetCategory].color }}
        />
      );
    }
    if (tx.flowType === "DEBT_PAYMENT") {
      return <CreditCard size={17} style={{ color: "#fbbf24" }} />;
    }
    if (tx.flowType.startsWith("CASH_")) {
      return <Wallet size={17} style={{ color: "#c084fc" }} />;
    }
    return <ArrowUpRight size={17} style={{ color: "#f43f5e" }} />;
  };

  const getTxAvatarBg = (tx: BankingTransaction) => {
    if (tx.direction === "INFLOW") return "rgba(16, 185, 129, 0.16)";
    if (tx.budgetCategory && BUDGET_CATEGORY_CONFIG[tx.budgetCategory]) {
      return BUDGET_CATEGORY_CONFIG[tx.budgetCategory].bg;
    }
    return "rgba(244, 63, 94, 0.16)";
  };

  const getTxAvatarBorder = (tx: BankingTransaction) => {
    if (tx.direction === "INFLOW") return "rgba(16, 185, 129, 0.4)";
    if (tx.budgetCategory && BUDGET_CATEGORY_CONFIG[tx.budgetCategory]) {
      return BUDGET_CATEGORY_CONFIG[tx.budgetCategory].border;
    }
    return "rgba(244, 63, 94, 0.4)";
  };

  const getPillButtonStyle = (isActive: boolean, activeColor = "#f59e0b") => ({
    padding: "6px 14px",
    borderRadius: "99px",
    fontSize: "11px",
    fontWeight: isActive ? 700 : 600,
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    border: isActive
      ? `1px solid ${activeColor}`
      : "1px solid rgba(255, 255, 255, 0.08)",
    background: isActive
      ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
      : "rgba(255, 255, 255, 0.04)",
    color: isActive ? "#000000" : "#94a3b8",
    boxShadow: isActive ? "0 4px 14px rgba(245, 158, 11, 0.35)" : "none",
    outline: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  });

  const breakdown = summary?.categoryBreakdown;
  const totalOut = summary?.totalOutflow || 1;

  return (
    <>
      <div
        className="card"
        style={{
          background:
            "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(10, 16, 30, 0.98) 100%)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          borderRadius: "24px",
          padding: 0,
          overflow: "hidden",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: "22px 28px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f59e0b",
                boxShadow: "0 0 20px rgba(245, 158, 11, 0.2)",
              }}
            >
              <Receipt size={24} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {title}
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-mono, monospace)",
                    fontWeight: 700,
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    padding: "3px 10px",
                    borderRadius: "99px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 0 10px rgba(16, 185, 129, 0.25)",
                  }}
                >
                  <ShieldCheck size={12} /> Reconciled with Budget Engine
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>
                Every transaction mapped to its budget allocation with intelligent luminous highlighting
              </div>
            </div>
          </div>

          {/* Top Summary Metrics Badges */}
          {summary && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: "rgba(7, 11, 20, 0.8)",
                  padding: "8px 16px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div style={{ fontSize: "12px" }}>
                  <span style={{ color: "#94a3b8", marginRight: "6px" }}>Inflow:</span>
                  <strong
                    style={{
                      color: "#10b981",
                      fontFamily: "var(--font-mono, monospace)",
                      fontWeight: 800,
                    }}
                  >
                    +{formatZAR(summary.totalInflow)}
                  </strong>
                </div>
                <div style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.1)" }} />
                <div style={{ fontSize: "12px" }}>
                  <span style={{ color: "#94a3b8", marginRight: "6px" }}>Outflow:</span>
                  <strong
                    style={{
                      color: "#f8fafc",
                      fontFamily: "var(--font-mono, monospace)",
                      fontWeight: 800,
                    }}
                  >
                    -{formatZAR(summary.totalOutflow)}
                  </strong>
                </div>
              </div>

              {/* Budget Adherence Pill Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background:
                    summary.budgetAdherenceRate >= 90
                      ? "rgba(16, 185, 129, 0.14)"
                      : "rgba(245, 158, 11, 0.14)",
                  padding: "8px 14px",
                  borderRadius: "14px",
                  border:
                    summary.budgetAdherenceRate >= 90
                      ? "1px solid rgba(16, 185, 129, 0.35)"
                      : "1px solid rgba(245, 158, 11, 0.35)",
                  boxShadow:
                    summary.budgetAdherenceRate >= 90
                      ? "0 0 15px rgba(16, 185, 129, 0.2)"
                      : "0 0 15px rgba(245, 158, 11, 0.2)",
                }}
              >
                <Target
                  size={15}
                  style={{
                    color: summary.budgetAdherenceRate >= 90 ? "#10b981" : "#fbbf24",
                  }}
                />
                <span style={{ fontSize: "11.5px", color: "#e2e8f0" }}>
                  Budget Alignment:{" "}
                  <strong
                    style={{
                      color: summary.budgetAdherenceRate >= 90 ? "#10b981" : "#fbbf24",
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: "12.5px",
                    }}
                  >
                    {summary.budgetAdherenceRate}%
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Segmented Budget Coverage & Distribution Visual Bar */}
        {breakdown && summary?.totalOutflow > 0 && (
          <div
            style={{
              padding: "16px 28px",
              background: "rgba(10, 16, 30, 0.45)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
                fontSize: "11.5px",
              }}
            >
              <span style={{ color: "#94a3b8", fontWeight: 700, letterSpacing: "0.03em" }}>
                RECONCILED OUTFLOW BUDGET ALLOCATION &amp; COVERAGE
              </span>
              <span
                style={{
                  color: "#cbd5e1",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "11px",
                }}
              >
                Budgeted: <strong style={{ color: "#10b981" }}>{formatZAR(summary.budgetedOutflow)}</strong>{" "}
                • Unbudgeted: <strong style={{ color: summary.unbudgetedOutflow > 0 ? "#f43f5e" : "#94a3b8" }}>{formatZAR(summary.unbudgetedOutflow)}</strong>
              </span>
            </div>

            {/* Segmented Bar */}
            <div
              style={{
                display: "flex",
                height: "9px",
                borderRadius: "99px",
                overflow: "hidden",
                background: "rgba(255, 255, 255, 0.05)",
                gap: "2px",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)",
              }}
            >
              {breakdown.FIXED_HOUSEHOLD_OBLIGATIONS > 0 && (
                <div
                  style={{
                    flex: breakdown.FIXED_HOUSEHOLD_OBLIGATIONS / totalOut,
                    background: "linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)",
                    borderRadius: "2px",
                    boxShadow: "0 0 8px rgba(56, 189, 248, 0.4)",
                  }}
                  title={`Fixed Obligations: ${formatZAR(breakdown.FIXED_HOUSEHOLD_OBLIGATIONS)}`}
                />
              )}
              {breakdown.DEBT_ACCELERATION_PLAN > 0 && (
                <div
                  style={{
                    flex: breakdown.DEBT_ACCELERATION_PLAN / totalOut,
                    background: "linear-gradient(90deg, #fbbf24 0%, #d97706 100%)",
                    borderRadius: "2px",
                    boxShadow: "0 0 8px rgba(251, 191, 36, 0.4)",
                  }}
                  title={`Debt Plan: ${formatZAR(breakdown.DEBT_ACCELERATION_PLAN)}`}
                />
              )}
              {breakdown.GOAL_CONTRIBUTIONS > 0 && (
                <div
                  style={{
                    flex: breakdown.GOAL_CONTRIBUTIONS / totalOut,
                    background: "linear-gradient(90deg, #34d399 0%, #059669 100%)",
                    borderRadius: "2px",
                    boxShadow: "0 0 8px rgba(52, 211, 153, 0.4)",
                  }}
                  title={`Goal Funds: ${formatZAR(breakdown.GOAL_CONTRIBUTIONS)}`}
                />
              )}
              {breakdown.FAMILY_AND_DISCRETIONARY > 0 && (
                <div
                  style={{
                    flex: breakdown.FAMILY_AND_DISCRETIONARY / totalOut,
                    background: "linear-gradient(90deg, #c084fc 0%, #9333ea 100%)",
                    borderRadius: "2px",
                    boxShadow: "0 0 8px rgba(192, 132, 252, 0.4)",
                  }}
                  title={`Discretionary: ${formatZAR(breakdown.FAMILY_AND_DISCRETIONARY)}`}
                />
              )}
              {breakdown.ONE_OFF_UNEXPECTED > 0 && (
                <div
                  style={{
                    flex: breakdown.ONE_OFF_UNEXPECTED / totalOut,
                    background: "linear-gradient(90deg, #f43f5e 0%, #e11d48 100%)",
                    borderRadius: "2px",
                    boxShadow: "0 0 8px rgba(244, 63, 94, 0.4)",
                  }}
                  title={`One-Off: ${formatZAR(breakdown.ONE_OFF_UNEXPECTED)}`}
                />
              )}
              {breakdown.UNBUDGETED > 0 && (
                <div
                  style={{
                    flex: breakdown.UNBUDGETED / totalOut,
                    background: "linear-gradient(90deg, #64748b 0%, #475569 100%)",
                    borderRadius: "2px",
                  }}
                  title={`Unbudgeted: ${formatZAR(breakdown.UNBUDGETED)}`}
                />
              )}
            </div>

            {/* Micro Category Legend Buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "12px",
                fontSize: "11px",
              }}
            >
              {[
                {
                  key: "FIXED_HOUSEHOLD_OBLIGATIONS",
                  label: "Fixed Obligations",
                  color: "#38bdf8",
                  val: breakdown.FIXED_HOUSEHOLD_OBLIGATIONS,
                },
                {
                  key: "DEBT_ACCELERATION_PLAN",
                  label: "Debt Service",
                  color: "#fbbf24",
                  val: breakdown.DEBT_ACCELERATION_PLAN,
                },
                {
                  key: "GOAL_CONTRIBUTIONS",
                  label: "Goals",
                  color: "#34d399",
                  val: breakdown.GOAL_CONTRIBUTIONS,
                },
                {
                  key: "FAMILY_AND_DISCRETIONARY",
                  label: "Discretionary",
                  color: "#c084fc",
                  val: breakdown.FAMILY_AND_DISCRETIONARY,
                },
                {
                  key: "ONE_OFF_UNEXPECTED",
                  label: "One-Off",
                  color: "#f43f5e",
                  val: breakdown.ONE_OFF_UNEXPECTED,
                },
                {
                  key: "UNBUDGETED",
                  label: "Unbudgeted",
                  color: "#f43f5e",
                  val: breakdown.UNBUDGETED,
                },
              ].map(
                (item) =>
                  item.val > 0 && (
                    <button
                      key={item.key}
                      onClick={() =>
                        setActiveBudgetFilter(
                          activeBudgetFilter === item.key ? "ALL" : item.key
                        )
                      }
                      style={{
                        background:
                          activeBudgetFilter === item.key
                            ? "rgba(255, 255, 255, 0.12)"
                            : "rgba(255, 255, 255, 0.03)",
                        border:
                          activeBudgetFilter === item.key
                            ? `1px solid ${item.color}`
                            : "1px solid rgba(255, 255, 255, 0.06)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: activeBudgetFilter === item.key ? "#ffffff" : "#94a3b8",
                        padding: "3px 8px",
                        borderRadius: "8px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: item.color,
                          boxShadow: `0 0 6px ${item.color}`,
                        }}
                      />
                      <span>{item.label}:</span>
                      <strong
                        style={{
                          color: "#e2e8f0",
                          fontFamily: "var(--font-mono, monospace)",
                        }}
                      >
                        {formatZAR(item.val)}
                      </strong>
                    </button>
                  )
              )}
            </div>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        {showFilters && (
          <div
            style={{
              padding: "16px 28px",
              background: "rgba(7, 11, 20, 0.6)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            {/* Category & Budget Highlight Filter Pills */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => {
                  setActiveCategory("ALL");
                  setActiveBudgetFilter("ALL");
                }}
                style={getPillButtonStyle(
                  activeCategory === "ALL" && activeBudgetFilter === "ALL"
                )}
                id="filter-cat-all"
              >
                All Transactions
              </button>

              <button
                onClick={() => {
                  setActiveBudgetFilter(
                    activeBudgetFilter === "BUDGETED_ONLY" ? "ALL" : "BUDGETED_ONLY"
                  );
                }}
                style={getPillButtonStyle(
                  activeBudgetFilter === "BUDGETED_ONLY",
                  "#10b981"
                )}
                id="filter-budgeted-only"
              >
                <Target size={12} />
                <span>Budgeted Items</span>
              </button>

              <button
                onClick={() => {
                  setActiveBudgetFilter(
                    activeBudgetFilter === "UNBUDGETED_ONLY" ? "ALL" : "UNBUDGETED_ONLY"
                  );
                }}
                style={getPillButtonStyle(
                  activeBudgetFilter === "UNBUDGETED_ONLY",
                  "#f43f5e"
                )}
                id="filter-unbudgeted-only"
              >
                <AlertCircle size={12} />
                <span>Unbudgeted</span>
              </button>

              <button
                onClick={() => {
                  setActiveBudgetFilter(
                    activeBudgetFilter === "FIXED_HOUSEHOLD_OBLIGATIONS"
                      ? "ALL"
                      : "FIXED_HOUSEHOLD_OBLIGATIONS"
                  );
                }}
                style={getPillButtonStyle(
                  activeBudgetFilter === "FIXED_HOUSEHOLD_OBLIGATIONS",
                  "#38bdf8"
                )}
                id="filter-fixed"
              >
                <Home size={12} />
                <span>Fixed Obligations</span>
              </button>

              <button
                onClick={() => {
                  setActiveBudgetFilter(
                    activeBudgetFilter === "DEBT_ACCELERATION_PLAN"
                      ? "ALL"
                      : "DEBT_ACCELERATION_PLAN"
                  );
                }}
                style={getPillButtonStyle(
                  activeBudgetFilter === "DEBT_ACCELERATION_PLAN",
                  "#fbbf24"
                )}
                id="filter-debt"
              >
                <CreditCard size={12} />
                <span>Debt Plan</span>
              </button>

              <button
                onClick={() => {
                  setActiveCategory(activeCategory === "INCOME" ? "ALL" : "INCOME");
                }}
                style={getPillButtonStyle(activeCategory === "INCOME", "#10b981")}
                id="filter-cat-income"
              >
                <TrendingUp size={12} />
                <span>Income</span>
              </button>
            </div>

            {/* Institution Filter & Period & Search Box */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <select
                value={activeInstitution}
                onChange={(e) => setActiveInstitution(e.target.value)}
                className="form-select"
                style={{ width: "auto", fontSize: "12px", padding: "6px 12px" }}
                id="filter-institution-select"
              >
                <option value="ALL">All Linked Banks</option>
                <option value="Standard Bank">Standard Bank</option>
                <option value="FNB">First National Bank (FNB)</option>
                <option value="Capitec">Capitec Bank</option>
                <option value="Absa">Absa Bank</option>
                <option value="Nedbank">Nedbank</option>
                <option value="Cash Wallet">Cash Wallet</option>
              </select>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as any)}
                  className="form-select"
                  style={{
                    width: "auto",
                    fontSize: "12px",
                    padding: "6px 28px 6px 14px",
                    background: "rgba(13, 20, 36, 0.95)",
                    border: "1px solid var(--border)",
                    borderRadius: "99px",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="SALARY">Salary Cycle</option>
                  <option value="CALENDAR">Calendar Month</option>
                </select>

                <select
                  value={activePayPeriod}
                  onChange={(e) => setActivePayPeriod(e.target.value)}
                  className="form-select"
                  style={{
                    width: "auto",
                    fontSize: "12px",
                    padding: "6px 28px 6px 14px",
                    background: "rgba(13, 20, 36, 0.95)",
                    border: "1px solid var(--border)",
                    borderRadius: "99px",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="ALL">All Time</option>
                  <option value="2026-08">
                    August 2026{" "}
                    {periodType === "SALARY"
                      ? "(14 Aug - 14 Sep)"
                      : "(1 Aug - 31 Aug)"}
                  </option>
                  <option value="2026-07">
                    July 2026{" "}
                    {periodType === "SALARY"
                      ? "(15 Jul - 13 Aug)"
                      : "(1 Jul - 31 Jul)"}
                  </option>
                  <option value="2026-06">
                    June 2026{" "}
                    {periodType === "SALARY"
                      ? "(15 Jun - 14 Jul)"
                      : "(1 Jun - 30 Jun)"}
                  </option>
                  <option value="2026-05">
                    May 2026{" "}
                    {periodType === "SALARY"
                      ? "(15 May - 14 Jun)"
                      : "(1 May - 31 May)"}
                  </option>
                  <option value="2026-04">
                    April 2026{" "}
                    {periodType === "SALARY"
                      ? "(15 Apr - 14 May)"
                      : "(1 Apr - 30 Apr)"}
                  </option>
                  <option value="2026-03">
                    March 2026{" "}
                    {periodType === "SALARY"
                      ? "(16 Mar - 14 Apr)"
                      : "(1 Mar - 31 Mar)"}
                  </option>
                  <option value="2026-02">
                    February 2026{" "}
                    {periodType === "SALARY"
                      ? "(16 Feb - 15 Mar)"
                      : "(1 Feb - 28 Feb)"}
                  </option>
                  <option value="2026-01">
                    January 2026{" "}
                    {periodType === "SALARY"
                      ? "(15 Jan - 15 Feb)"
                      : "(1 Jan - 31 Jan)"}
                  </option>
                </select>
              </div>

              <div style={{ position: "relative", width: "220px" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search merchant, budget..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{
                    paddingLeft: "34px",
                    paddingRight: searchQuery ? "28px" : "12px",
                    fontSize: "12px",
                    padding: "6px 28px 6px 34px",
                  }}
                  id="search-transactions-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: "2px 4px",
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transaction Feed Items List with Glowing Highlights */}
        <div style={{ padding: "16px 20px" }}>
          {searchQuery.trim() && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
                fontSize: "12px",
                color: "#94a3b8",
              }}
            >
              <span>
                Found{" "}
                <strong style={{ color: "#f59e0b" }}>
                  {displayedTransactions.length}
                </strong>{" "}
                transaction{displayedTransactions.length !== 1 ? "s" : ""} matching &ldquo;
                <span style={{ color: "#ffffff" }}>{searchQuery}</span>&rdquo;
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#f59e0b",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                Clear filter
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <div
                className="animate-pulse"
                style={{
                  fontSize: "13px",
                  color: "#94a3b8",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                Reconciling line-item banking transactions with budget…
              </div>
            </div>
          ) : displayedTransactions.length === 0 ? (
            <div
              style={{
                padding: "60px 0",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              {searchQuery ? (
                <div>
                  <p>
                    No banking transactions found matching &ldquo;
                    <strong style={{ color: "#ffffff" }}>{searchQuery}</strong>&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="apple-pill-btn mt-3"
                    style={{ fontSize: "11px", padding: "5px 14px" }}
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                "No banking transactions found for active criteria."
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {displayedTransactions.map((tx) => {
                const isBudgeted = tx.isBudgeted;
                const budgetConfig =
                  tx.budgetCategory && BUDGET_CATEGORY_CONFIG[tx.budgetCategory]
                    ? BUDGET_CATEGORY_CONFIG[tx.budgetCategory]
                    : BUDGET_CATEGORY_CONFIG.UNBUDGETED;

                // Luminous Apple-Caliber Row Styling
                const rowStyle: React.CSSProperties = isBudgeted
                  ? {
                      padding: "16px 20px",
                      borderRadius: "16px",
                      background: `linear-gradient(90deg, ${budgetConfig.bg} 0%, rgba(13, 20, 36, 0.85) 30%, rgba(10, 16, 30, 0.7) 100%)`,
                      border: `1px solid ${budgetConfig.border}`,
                      borderLeft: `4.5px solid ${budgetConfig.color}`,
                      boxShadow: `0 4px 20px -6px ${budgetConfig.color}33, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
                      cursor: "pointer",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      position: "relative",
                    }
                  : {
                      padding: "16px 20px",
                      borderRadius: "16px",
                      background:
                        "linear-gradient(90deg, rgba(244, 63, 94, 0.08) 0%, rgba(10, 16, 30, 0.6) 35%, rgba(10, 16, 30, 0.45) 100%)",
                      border: "1px dashed rgba(244, 63, 94, 0.35)",
                      borderLeft: "4.5px solid #f43f5e",
                      boxShadow: "0 4px 15px -6px rgba(244, 63, 94, 0.2)",
                      cursor: "pointer",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      position: "relative",
                    };

                return (
                  <div
                    key={tx.id}
                    onClick={() => openTxDetailModal(tx)}
                    style={rowStyle}
                    onMouseEnter={(e) => {
                      if (isBudgeted) {
                        e.currentTarget.style.background = `linear-gradient(90deg, ${budgetConfig.bg} 0%, rgba(20, 30, 55, 0.95) 40%, rgba(13, 20, 36, 0.9) 100%)`;
                        e.currentTarget.style.borderColor = budgetConfig.color;
                        e.currentTarget.style.boxShadow = `0 10px 30px -5px ${budgetConfig.color}55, 0 0 15px ${budgetConfig.color}30, inset 0 1px 0 rgba(255, 255, 255, 0.15)`;
                      } else {
                        e.currentTarget.style.background =
                          "linear-gradient(90deg, rgba(244, 63, 94, 0.15) 0%, rgba(25, 20, 35, 0.95) 40%, rgba(13, 20, 36, 0.9) 100%)";
                        e.currentTarget.style.borderColor = "rgba(244, 63, 94, 0.7)";
                        e.currentTarget.style.boxShadow =
                          "0 10px 25px -5px rgba(244, 63, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)";
                      }
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      if (isBudgeted) {
                        e.currentTarget.style.background = `linear-gradient(90deg, ${budgetConfig.bg} 0%, rgba(13, 20, 36, 0.85) 30%, rgba(10, 16, 30, 0.7) 100%)`;
                        e.currentTarget.style.borderColor = budgetConfig.border;
                        e.currentTarget.style.boxShadow = `0 4px 20px -6px ${budgetConfig.color}33, inset 0 1px 0 rgba(255, 255, 255, 0.05)`;
                      } else {
                        e.currentTarget.style.background =
                          "linear-gradient(90deg, rgba(244, 63, 94, 0.08) 0%, rgba(10, 16, 30, 0.6) 35%, rgba(10, 16, 30, 0.45) 100%)";
                        e.currentTarget.style.borderColor = "rgba(244, 63, 94, 0.35)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 15px -6px rgba(244, 63, 94, 0.2)";
                      }
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                    id={`tx-row-${tx.id}`}
                  >
                    {/* Left: Category Icon & Details */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "14px",
                          background: getTxAvatarBg(tx),
                          border: `1px solid ${getTxAvatarBorder(tx)}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: `0 4px 14px ${getTxAvatarBg(tx)}`,
                        }}
                      >
                        {getTxIcon(tx)}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: "14.5px",
                            fontWeight: 700,
                            color: "#f8fafc",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                            {tx.merchantName}
                          </span>
                          {isBudgeted && (
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                background: budgetConfig.color,
                                boxShadow: `0 0 10px ${budgetConfig.color}`,
                                flexShrink: 0,
                              }}
                              title="Matched with Budget Item"
                            />
                          )}
                        </div>

                        {tx.merchantAddress && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#f59e0b",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              marginTop: "2px",
                              opacity: 0.9,
                            }}
                          >
                            <MapPin size={11} style={{ flexShrink: 0 }} />
                            <span
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {tx.merchantAddress}
                            </span>
                          </div>
                        )}

                        <div
                          style={{
                            fontSize: "11.5px",
                            color: "#94a3b8",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginTop: "3px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            {tx.institution} • {tx.accountName}
                          </span>
                          <span>•</span>
                          <span style={{ fontFamily: "var(--font-mono, monospace)" }}>
                            {tx.date}
                          </span>
                          <span>•</span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono, monospace)",
                              fontSize: "10.5px",
                              color: "#64748b",
                            }}
                          >
                            {tx.referenceNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Highlighted Luminous Budget Match Badge */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "4px",
                        minWidth: "210px",
                        maxWidth: "280px",
                      }}
                      className="hidden md:flex"
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 12px",
                          borderRadius: "99px",
                          background: budgetConfig.bg,
                          border: `1px solid ${budgetConfig.border}`,
                          fontSize: "11px",
                          fontWeight: 700,
                          color: budgetConfig.color,
                          maxWidth: "100%",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          boxShadow: isBudgeted ? `0 0 12px ${budgetConfig.color}25` : "none",
                        }}
                      >
                        {isBudgeted ? (
                          <Target size={13} style={{ flexShrink: 0 }} />
                        ) : (
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        )}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          {tx.budgetItemLabel || budgetConfig.label}
                        </span>
                      </div>

                      {tx.budgetAmount ? (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#cbd5e1",
                            fontFamily: "var(--font-mono, monospace)",
                            paddingLeft: "6px",
                          }}
                        >
                          Allocated: <strong style={{ color: "#ffffff" }}>{formatZAR(tx.budgetAmount)}</strong>/mo
                        </div>
                      ) : isBudgeted ? (
                        <div
                          style={{
                            fontSize: "10.5px",
                            color: "#10b981",
                            paddingLeft: "6px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Check size={11} /> Reconciled in Budget Plan
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: "10.5px",
                            color: "#f43f5e",
                            paddingLeft: "6px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: 600,
                          }}
                        >
                          ⚡ Unbudgeted Outflow
                        </div>
                      )}
                    </div>

                    {/* Right: Amount & Edit CTA */}
                    <div
                      style={{
                        textAlign: "right",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "16px",
                            fontWeight: 800,
                            fontFamily: "var(--font-mono, monospace)",
                            color:
                              tx.direction === "INFLOW" ? "#10b981" : "#f8fafc",
                            textShadow:
                              tx.direction === "INFLOW"
                                ? "0 0 12px rgba(16, 185, 129, 0.4)"
                                : "none",
                          }}
                        >
                          {tx.direction === "INFLOW" ? "+" : "-"}
                          {formatZAR(Math.abs(tx.amount))}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "6px",
                            marginTop: "4px",
                          }}
                        >
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "99px",
                              fontSize: "10px",
                              fontWeight: 700,
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              color: "#cbd5e1",
                            }}
                          >
                            {tx.category}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "7px 13px",
                          borderRadius: "10px",
                          background: isBudgeted
                            ? "rgba(245, 158, 11, 0.12)"
                            : "rgba(244, 63, 94, 0.12)",
                          border: isBudgeted
                            ? "1px solid rgba(245, 158, 11, 0.35)"
                            : "1px solid rgba(244, 63, 94, 0.35)",
                          color: isBudgeted ? "#fbbf24" : "#f43f5e",
                          fontSize: "11px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <Edit3 size={13} /> Edit
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Detail & Budget Metadata Edit Modal */}
      {isEditingModalOpen && selectedTx && (
        <div
          className="modal-overlay"
          onClick={() => setIsEditingModalOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(7, 11, 20, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 1000,
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "600px",
              background:
                "linear-gradient(135deg, rgba(13, 20, 36, 0.98) 0%, rgba(10, 16, 30, 0.99) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              borderRadius: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
            }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Edit3 size={20} style={{ color: "#f59e0b" }} />
                <div>
                  <h2 className="modal-title">Transaction Details &amp; Budget Mapping</h2>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    Ref: {selectedTx.referenceNumber} • Settled {selectedTx.date}
                  </div>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setIsEditingModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTransaction}>
              <div className="modal-body">
                {/* Linked Budget Line Item Mapping Section */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(13, 20, 36, 0.9) 100%)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    marginBottom: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Target size={16} style={{ color: "#10b981" }} />
                      <span
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 700,
                          color: "#f8fafc",
                        }}
                      >
                        Reconciled Budget Line Item
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontFamily: "var(--font-mono, monospace)",
                        padding: "2px 8px",
                        borderRadius: "99px",
                        background: selectedTx.isBudgeted
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(244, 63, 94, 0.2)",
                        color: selectedTx.isBudgeted ? "#10b981" : "#f43f5e",
                        border: selectedTx.isBudgeted
                          ? "1px solid rgba(16, 185, 129, 0.4)"
                          : "1px solid rgba(244, 63, 94, 0.4)",
                      }}
                    >
                      {selectedTx.isBudgeted ? "✓ Matched in Budget" : "⚡ Unbudgeted Outflow"}
                    </span>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label
                      className="form-label"
                      style={{ fontSize: "11px", color: "#94a3b8" }}
                    >
                      Map / Reassign this transaction to an active Budget Line Item:
                    </label>
                    <select
                      className="form-select"
                      value={editForm.budgetItemId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        const matched = budgetItemsList.find((b) => b.id === newId);
                        setEditForm({
                          ...editForm,
                          budgetItemId: newId,
                          merchantName: matched ? matched.label : editForm.merchantName,
                        });
                      }}
                      id="edit-tx-budget-item-select"
                      style={{
                        fontSize: "12px",
                        background: "rgba(7, 11, 20, 0.8)",
                        borderColor: "rgba(16, 185, 129, 0.35)",
                      }}
                    >
                      <option value="">-- Unassigned / General Spend --</option>
                      {budgetItemsList.map((b) => (
                        <option key={b.id} value={b.id}>
                          [{BUDGET_CATEGORY_CONFIG[b.category]?.shortLabel || b.category}] {b.label} — {formatZAR(b.amount)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Document Metadata Auto-Extraction Card */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(13, 20, 36, 0.9) 100%)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    marginBottom: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Sparkles size={16} style={{ color: "#f59e0b" }} />
                      <span
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 700,
                          color: "#f8fafc",
                        }}
                      >
                        Auto-Extract Metadata from Document Vault
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExtractFromDocument()}
                      disabled={extracting}
                      id="extract-metadata-btn"
                      style={{
                        background:
                          "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        color: "#070b14",
                        border: "none",
                        borderRadius: "8px",
                        padding: "5px 12px",
                        fontSize: "11.5px",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        boxShadow: "0 2px 10px rgba(245, 158, 11, 0.3)",
                      }}
                    >
                      <FileText size={13} />
                      <span>
                        {extracting ? "Extracting PDF…" : "⚡ Extract & Pre-populate"}
                      </span>
                    </button>
                  </div>

                  {extractedNotice && (
                    <div
                      style={{
                        fontSize: "11.5px",
                        color: "#fbbf24",
                        fontFamily: "var(--font-mono, monospace)",
                        background: "rgba(7, 11, 20, 0.7)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        wordBreak: "break-word",
                      }}
                    >
                      {extractedNotice}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flexWrap: "wrap",
                      fontSize: "11px",
                      color: "#94a3b8",
                    }}
                  >
                    <span>Extract sample document PDF:</span>
                    {[
                      { label: "Woolworths Slip", query: "Woolworths" },
                      { label: "Telkom Invoice", query: "Telkom" },
                      { label: "Ekurhuleni Bill", query: "Ekurhuleni" },
                      { label: "SARS Payroll", query: "SARS" },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleExtractFromDocument(preset.query)}
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "6px",
                          padding: "2px 8px",
                          color: "#e2e8f0",
                          fontSize: "10.5px",
                          cursor: "pointer",
                        }}
                      >
                        📄 {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bank Account Info Card Banner */}
                <div
                  style={{
                    background: "rgba(10, 16, 30, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: 700,
                      }}
                    >
                      Bank Account &amp; Institution
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#f8fafc",
                        marginTop: "2px",
                      }}
                    >
                      {selectedTx.institution} — {selectedTx.accountName}
                    </div>
                  </div>
                  <span className="badge active" style={{ fontSize: "10px" }}>
                    ✓ Settled
                  </span>
                </div>

                {/* Editable Merchant / Location Name */}
                <div className="form-group">
                  <label className="form-label required">
                    Merchant / Processed Location Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.merchantName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, merchantName: e.target.value })
                    }
                    placeholder="e.g. Woolworths Sandton City"
                    required
                    id="edit-tx-merchant-input"
                  />
                  <div className="form-hint">
                    Appears on your spending analytics and geotagged map cards.
                  </div>
                </div>

                {/* Editable Merchant / Recipient Physical Address (Geo-Tagging) */}
                <div className="form-group" style={{ marginTop: "12px" }}>
                  <label className="form-label">
                    Merchant / Recipient Physical Address (Geo-Tagging)
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.merchantAddress}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          merchantAddress: e.target.value,
                        })
                      }
                      placeholder="e.g. 83 Rivonia Rd, Sandhurst, Sandton, 2196, South Africa"
                      id="edit-tx-address-input"
                      style={{ paddingLeft: "36px" }}
                    />
                    <MapPin
                      size={16}
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "14px",
                        color: "#f59e0b",
                      }}
                    />
                  </div>
                  <div className="form-hint">
                    Supply the exact street address for GPS geotagging &amp; location map analytics.
                  </div>
                </div>

                <div className="two-col">
                  {/* Editable Flow Category */}
                  <div className="form-group">
                    <label className="form-label required">Flow Category</label>
                    <select
                      className="form-select"
                      value={editForm.flowType}
                      onChange={(e) =>
                        setEditForm({ ...editForm, flowType: e.target.value })
                      }
                      id="edit-tx-category-select"
                    >
                      <option value="CASH_SPENDING">Cash Spending / Everyday</option>
                      <option value="INCOME">Income &amp; Payroll</option>
                      <option value="DEBT_PAYMENT">Debt Service &amp; Repayment</option>
                      <option value="TRANSFER">Internal Transfer</option>
                      <option value="CASH_WITHDRAWAL">ATM Cash Withdrawal</option>
                    </select>
                  </div>

                  {/* Editable Amount (ZAR) */}
                  <div className="form-group">
                    <label className="form-label required">Amount (ZAR)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={editForm.amount}
                      onChange={(e) =>
                        setEditForm({ ...editForm, amount: e.target.value })
                      }
                      required
                      id="edit-tx-amount-input"
                    />
                  </div>
                </div>

                <div className="two-col">
                  {/* AI Confidence Score */}
                  <div className="form-group">
                    <label className="form-label">AI Categorization Confidence</label>
                    <select
                      className="form-select"
                      value={editForm.confidence}
                      onChange={(e) =>
                        setEditForm({ ...editForm, confidence: e.target.value })
                      }
                      id="edit-tx-confidence-select"
                    >
                      <option value="CONFIRMED">CONFIRMED (User Verified)</option>
                      <option value="ESTIMATED">ESTIMATED (AI Categorized)</option>
                    </select>
                  </div>

                  {/* Processed Hub City */}
                  <div className="form-group">
                    <label className="form-label">Processed RSA City / Hub</label>
                    <select
                      className="form-select"
                      value={editForm.city}
                      onChange={(e) =>
                        setEditForm({ ...editForm, city: e.target.value })
                      }
                      id="edit-tx-city-select"
                    >
                      <option value="Johannesburg">
                        Johannesburg (Sandton / Rosebank)
                      </option>
                      <option value="Pretoria">Pretoria (Menlyn / Centurion)</option>
                      <option value="Cape Town">Cape Town (V&amp;A Waterfront)</option>
                      <option value="Durban">Durban (Umhlanga)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditingModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex items-center gap-1.5"
                  disabled={saving}
                  id="save-tx-btn"
                >
                  <Save size={15} />
                  <span>{saving ? "Saving Changes…" : "Save Metadata"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

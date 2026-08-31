"use client";

import { useEffect, useState } from "react";
import { formatZAR, formatZARSigned, currentMonthKey } from "@/lib/formatters";
import {
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Home,
  CreditCard,
  ShoppingCart,
  PiggyBank,
  Zap,
  Plus,
  Edit3,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Lock,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Check,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Filter,
  Activity,
  ArrowUpRight,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  FIXED_HOUSEHOLD_OBLIGATIONS: "Fixed Household Obligations & Subscriptions",
  DEBT_ACCELERATION_PLAN: "Debt Acceleration Plan (Contractual Debts)",
  GOAL_CONTRIBUTIONS: "Goal Contributions & Emergency Reserves",
  FAMILY_AND_DISCRETIONARY: "Family & Discretionary",
  ONE_OFF_UNEXPECTED: "One-Off / Unexpected",
};

const CATEGORY_ICONS: Record<string, any> = {
  FIXED_HOUSEHOLD_OBLIGATIONS: Home,
  DEBT_ACCELERATION_PLAN: CreditCard,
  GOAL_CONTRIBUTIONS: PiggyBank,
  SAVINGS_GOALS: PiggyBank,
  FAMILY_AND_DISCRETIONARY: ShoppingCart,
  ONE_OFF_UNEXPECTED: Zap,
};

const CATEGORY_ACCENTS: Record<string, string> = {
  FIXED_HOUSEHOLD_OBLIGATIONS: "#38bdf8",
  DEBT_ACCELERATION_PLAN: "#f59e0b",
  GOAL_CONTRIBUTIONS: "#10b981",
  SAVINGS_GOALS: "#10b981",
  FAMILY_AND_DISCRETIONARY: "#8b5cf6",
  ONE_OFF_UNEXPECTED: "#f43f5e",
};

const CATEGORIES = [
  "FIXED_HOUSEHOLD_OBLIGATIONS",
  "DEBT_ACCELERATION_PLAN",
  "GOAL_CONTRIBUTIONS",
  "FAMILY_AND_DISCRETIONARY",
  "ONE_OFF_UNEXPECTED",
];

interface BudgetItemExecution {
  isExecuted: boolean;
  executionStatus: "CLEARED" | "BOUNCED" | "PENDING" | "PARTIAL";
  statusLabel: string;
  executedAmount: number;
  executedDate: string | null;
  executionRef: string | null;
  statementDocName: string | null;
  variance: number;
  rawMatchedDescription: string | null;
}

interface BudgetReconciliationSummary {
  totalBudgeted: number;
  totalExecuted: number;
  totalPending: number;
  totalBounced: number;
  executedCount: number;
  pendingCount: number;
  bouncedCount: number;
  totalItemsCount: number;
  executionPercentage: number;
  cycleRangeFormatted: string;
}

interface LineItem {
  id: string;
  category: string;
  label: string;
  amount: string | number;
  confidence: string;
  note: string | null;
  sourceRef: string | null;
  isComputed: boolean;
  execution?: BudgetItemExecution;
  linkedGoal?: {
    id: string;
    name: string;
    type: string;
    currentAmount: number;
    targetAmount: number;
    progressPct: number;
    linkToBudget: boolean;
    autoAllocateSurplus: boolean;
    aiFeasibilityScore: number | null;
    aiShouldAllocate: boolean | null;
  };
}

interface BudgetData {
  month: string;
  items: LineItem[];
  summary?: BudgetReconciliationSummary;
}

interface Income {
  id: string;
  sourceName: string;
  recurringAmount: string | number;
  recurringAmountConfidence: string;
}

interface PayCycleInfo {
  mode: "PAYSLIP_AUTO" | "CALENDAR_MONTH" | "CUSTOM_RANGE";
  startDate: string;
  endDate: string;
  payDate: string;
  actualPayDate: string;
  wasShifted: boolean;
  shiftReason?: string;
  formattedRange: string;
}

export default function BudgetPage() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [income, setIncome] = useState<Income[]>([]);
  const [cycle, setCycle] = useState<PayCycleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonthKey());
  const [executionFilter, setExecutionFilter] = useState<"ALL" | "CLEARED" | "PENDING" | "BOUNCED">("ALL");
  const [monthResolved, setMonthResolved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<LineItem | null>(null);
  const [form, setForm] = useState({
    category: "FIXED_HOUSEHOLD_OBLIGATIONS",
    label: "",
    amount: "",
    confidence: "ESTIMATED",
    note: "",
  });

  const loadData = async (overrideMonth?: string) => {
    const activeMonth = overrideMonth ?? month;

    const [cyc, b, inc] = await Promise.all([
      fetch(`/api/budget/cycle?month=${activeMonth}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/budget?month=${activeMonth}`).then((r) => {
        if (r.status === 401) return { error: "Unauthorized" };
        return r.json();
      }),
      fetch(`/api/income?month=${activeMonth}`).then((r) => r.json()),
    ]);

    if (cyc?.success && cyc.cycle) {
      setCycle(cyc.cycle);
    }

    setData(b);
    setIncome(Array.isArray(inc) ? inc : []);
    setLoading(false);
  };

  useEffect(() => {
    loadData(month);
  }, [month]);

  const handleCycleModeChange = async (newMode: "PAYSLIP_AUTO" | "CALENDAR_MONTH" | "CUSTOM_RANGE") => {
    const res = await fetch("/api/budget/cycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: newMode, month }),
    });
    const result = await res.json();
    if (result.success) {
      setCycle(result.cycle);
    }
  };

  const openAdd = (cat: string) => {
    setEditItem(null);
    setForm({ category: cat, label: "", amount: "", confidence: "ESTIMATED", note: "" });
    setShowModal(true);
  };

  const openEdit = (item: LineItem) => {
    setEditItem(item);
    setForm({
      category: item.category,
      label: item.label,
      amount: String(Number(item.amount)),
      confidence: item.confidence,
      note: item.note ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        id: editItem?.id,
        ...form,
        amount: parseFloat(form.amount) || 0,
        month,
      };
      if (editItem) {
        await fetch(`/api/budget?id=${editItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/budget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      await loadData(month);
    } catch (err) {
      console.error("Failed to save budget item:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this line item?")) return;
    await fetch(`/api/budget?id=${id}`, { method: "DELETE" });
    await loadData(month);
  };

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Loading monthly budget &amp; cash flow model…
        </div>
      </div>
    );
  }

  if (!data || (data as any)?.error) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Monthly Budget &amp; Cashflow Engine</h1>
            <p className="page-subtitle">Payslip-aligned income allocation across 5 expense categories</p>
          </div>
        </div>

        <div className="page-body">
          <div
            style={{
              background: "linear-gradient(135deg, rgba(17, 26, 46, 0.9) 0%, rgba(10, 16, 30, 0.95) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "24px",
              padding: "60px 32px",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px auto",
                color: "#f59e0b",
              }}
            >
              <Lock size={32} />
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
              Authentication Required
            </h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "480px", margin: "0 auto 24px auto" }}>
              Please sign in to your MoneyManager account to view your monthly budget allocations and cash flow.
            </p>
            <a href="/login" className="btn btn-primary btn-lg inline-flex items-center gap-2">
              <LogIn size={18} />
              <span>Sign In to Access Budget</span>
            </a>
          </div>
        </div>
      </>
    );
  }

  const items = data?.items ?? [];
  const totalIncome = income.reduce((s, i) => s + Number(i.recurringAmount), 0);
  const recurringItems = items.filter((i) => i.category !== "ONE_OFF_UNEXPECTED");
  const oneOffItems = items.filter((i) => i.category === "ONE_OFF_UNEXPECTED");
  const totalRecurring = recurringItems.reduce((s, i) => s + Number(i.amount), 0);
  const totalOneOff = oneOffItems.reduce((s, i) => s + Number(i.amount), 0);
  const netMarginRecurring = totalIncome - totalRecurring;
  const netMarginActual = netMarginRecurring - totalOneOff;
  const hasOneOff = oneOffItems.length > 0;

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            Monthly Budget &amp; Cashflow Engine
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 700,
                background: "rgba(245, 158, 11, 0.12)",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "2px 10px",
                borderRadius: "99px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
              Pay Cycle Active
            </span>
          </h1>
          <p className="page-subtitle">Arbitrate recurring obligations, discretionary spend, and surplus allocation</p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "rgba(15, 23, 42, 0.8)",
            padding: "4px 8px",
            borderRadius: "14px",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.3)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              const [yStr, mStr] = month.split("-");
              const y = parseInt(yStr, 10);
              const m = parseInt(mStr, 10) - 1;
              const d = new Date(Date.UTC(y, m - 1, 1));
              const prev = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
              setMonth(prev);
            }}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "6px 8px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>

          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="form-input"
            style={{
              width: "auto",
              fontSize: "13px",
              fontWeight: 800,
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              color: "#f8fafc",
              cursor: "pointer",
            }}
            id="budget-month-picker"
          />

          <button
            type="button"
            onClick={() => {
              const [yStr, mStr] = month.split("-");
              const y = parseInt(yStr, 10);
              const m = parseInt(mStr, 10) - 1;
              const d = new Date(Date.UTC(y, m + 1, 1));
              const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
              setMonth(next);
            }}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "6px 8px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Apple Obsidian Pay-Cycle Control Bar */}
        <div
          className="card mb-6"
          style={{
            padding: "22px 28px",
            background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(10, 16, 30, 0.98) 100%)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 20px 40px -15px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f59e0b",
                  flexShrink: 0,
                }}
              >
                <Calendar size={24} />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "17px", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.01em" }}>
                    Active Pay Cycle: {cycle ? cycle.formattedRange : "Loading..."}
                  </span>
                  {cycle?.mode === "PAYSLIP_AUTO" && (
                    <span className="badge gold">
                      <Sparkles size={11} /> Auto Payslip (15th Deposit)
                    </span>
                  )}
                  {cycle?.mode === "CALENDAR_MONTH" && (
                    <span className="badge blue">
                      Calendar Month (1st-31st)
                    </span>
                  )}
                </div>

                {cycle?.wasShifted ? (
                  <div style={{ fontSize: "12px", color: "#f59e0b", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertCircle size={14} /> {cycle.shiftReason}
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                    Anchored to your confirmed take-home salary deposit
                  </div>
                )}
              </div>
            </div>

            {/* Mode Switcher Pill Control */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "rgba(7, 11, 20, 0.9)",
                padding: "4px",
                borderRadius: "99px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                gap: "4px",
              }}
            >
              <button
                style={{
                  padding: "6px 14px",
                  borderRadius: "99px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none",
                  background: cycle?.mode === "PAYSLIP_AUTO" ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" : "transparent",
                  color: cycle?.mode === "PAYSLIP_AUTO" ? "#000000" : "#94a3b8",
                  transition: "all 0.2s ease",
                }}
                onClick={() => handleCycleModeChange("PAYSLIP_AUTO")}
                id="btn-mode-payslip"
              >
                Payslip Auto
              </button>
              <button
                style={{
                  padding: "6px 14px",
                  borderRadius: "99px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none",
                  background: cycle?.mode === "CALENDAR_MONTH" ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" : "transparent",
                  color: cycle?.mode === "CALENDAR_MONTH" ? "#000000" : "#94a3b8",
                  transition: "all 0.2s ease",
                }}
                onClick={() => handleCycleModeChange("CALENDAR_MONTH")}
                id="btn-mode-calendar"
              >
                Calendar Month
              </button>
            </div>
          </div>
        </div>

        {/* Core Financial Stat Cards Grid */}
        <div className="stat-grid mb-6">
          {/* Stat 1: Take-Home Income */}
          <div className="stat-card success">
            <div className="stat-label flex items-center gap-1.5" style={{ color: "#10b981" }}>
              <TrendingUp size={16} /> Total Take-Home Income
            </div>
            <div className="stat-value green" style={{ fontSize: "26px", margin: "6px 0 4px 0" }}>
              {formatZAR(totalIncome)}
            </div>
            <div className="stat-sub">{income.length} confirmed salary / revenue sources</div>
          </div>

          {/* Stat 2: Recurring Expenses */}
          <div className="stat-card warning">
            <div className="stat-label flex items-center gap-1.5" style={{ color: "#f59e0b" }}>
              <TrendingDown size={16} /> Recurring Obligations
            </div>
            <div className="stat-value gold" style={{ fontSize: "26px", margin: "6px 0 4px 0" }}>
              {formatZAR(totalRecurring)}
            </div>
            <div className="stat-sub">{recurringItems.length} active recurring line items</div>
          </div>

          {/* Stat 3: Recurring Net Surplus */}
          <div className={`stat-card ${netMarginRecurring >= 0 ? "success" : "danger"}`}>
            <div className="stat-label flex items-center gap-1.5">
              <PiggyBank size={16} /> Recurring Net Margin
            </div>
            <div className={`stat-value ${netMarginRecurring >= 0 ? "green" : "red"}`} style={{ fontSize: "26px", margin: "6px 0 4px 0" }}>
              {formatZARSigned(netMarginRecurring)}
            </div>
            <div className="stat-sub">Monthly surplus before unexpected items</div>
          </div>

          {/* Stat 4: Actual Surplus (If One-Offs Exist) */}
          <div className="stat-card">
            <div className="stat-label flex items-center gap-1.5">
              <Zap size={16} style={{ color: hasOneOff ? "#f43f5e" : "#94a3b8" }} /> Actual Margin (This Month)
            </div>
            <div className={`stat-value ${netMarginActual >= 0 ? "green" : "red"}`} style={{ fontSize: "26px", margin: "6px 0 4px 0" }}>
              {formatZARSigned(netMarginActual)}
            </div>
            <div className="stat-sub">
              {hasOneOff ? `After ${formatZAR(totalOneOff)} one-off items` : "No one-off items recorded"}
            </div>
          </div>
        </div>        {/* 🌟 VECTOR: BANK STATEMENT EXECUTION & AUDIT RADAR */}
        {data?.summary && (
          <div
            className="card mb-6"
            style={{
              padding: "20px 24px",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 20, 36, 0.95) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 16px 36px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#10b981",
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc" }}>
                      Bank Statement Execution Tracker
                    </span>
                    <span className="badge confirmed" style={{ fontSize: "11px", fontWeight: 800 }}>
                      <Check size={11} /> {data.summary.executedCount}/{data.summary.totalItemsCount} Reconciled ({data.summary.executionPercentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                    Reconciled against verified bank statements ({data.summary.cycleRangeFormatted}) · Cleared: {formatZAR(data.summary.totalExecuted)} of {formatZAR(data.summary.totalBudgeted)}
                  </div>
                </div>
              </div>

              {/* Execution Filter Pills */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(7, 11, 20, 0.9)",
                  padding: "4px",
                  borderRadius: "99px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  gap: "4px",
                }}
              >
                <button
                  style={{
                    padding: "5px 12px",
                    borderRadius: "99px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: executionFilter === "ALL" ? "rgba(255, 255, 255, 0.15)" : "transparent",
                    color: executionFilter === "ALL" ? "#ffffff" : "#94a3b8",
                  }}
                  onClick={() => setExecutionFilter("ALL")}
                >
                  All Items ({items.length})
                </button>
                <button
                  style={{
                    padding: "5px 12px",
                    borderRadius: "99px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: executionFilter === "CLEARED" ? "rgba(16, 185, 129, 0.25)" : "transparent",
                    color: executionFilter === "CLEARED" ? "#34d399" : "#94a3b8",
                  }}
                  onClick={() => setExecutionFilter("CLEARED")}
                >
                  ✓ Cleared ({data.summary.executedCount})
                </button>
                <button
                  style={{
                    padding: "5px 12px",
                    borderRadius: "99px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: executionFilter === "PENDING" ? "rgba(148, 163, 184, 0.2)" : "transparent",
                    color: executionFilter === "PENDING" ? "#f8fafc" : "#94a3b8",
                  }}
                  onClick={() => setExecutionFilter("PENDING")}
                >
                  ⏳ Pending ({data.summary.pendingCount})
                </button>
                {data.summary.bouncedCount > 0 && (
                  <button
                    style={{
                      padding: "5px 12px",
                      borderRadius: "99px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: "none",
                      background: executionFilter === "BOUNCED" ? "rgba(244, 63, 94, 0.25)" : "transparent",
                      color: executionFilter === "BOUNCED" ? "#f87171" : "#94a3b8",
                    }}
                    onClick={() => setExecutionFilter("BOUNCED")}
                  >
                    ⚠️ Bounced ({data.summary.bouncedCount})
                  </button>
                )}
              </div>
            </div>

            {/* Reconciliation Progress Meter */}
            <div style={{ height: "6px", borderRadius: "99px", background: "rgba(255, 255, 255, 0.08)", overflow: "hidden", position: "relative" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(data.summary.executionPercentage, 100)}%`,
                  background: "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
                  borderRadius: "99px",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Category Budget Breakdown Cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div className="animate-pulse" style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }}>
              Loading budget line items…
            </div>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const rawCatItems = items.filter((i) => i.category === cat || (cat === "GOAL_CONTRIBUTIONS" && i.category === "SAVINGS_GOALS"));
            
            // Apply statement execution filter
            const catItems = rawCatItems.filter((i) => {
              if (executionFilter === "ALL") return true;
              if (executionFilter === "CLEARED") return i.execution?.executionStatus === "CLEARED" || i.execution?.executionStatus === "PARTIAL";
              if (executionFilter === "PENDING") return !i.execution || i.execution?.executionStatus === "PENDING";
              if (executionFilter === "BOUNCED") return i.execution?.executionStatus === "BOUNCED";
              return true;
            });

            const catTotal = rawCatItems.reduce((s, i) => s + Number(i.amount), 0);
            const percentOfIncome = totalIncome > 0 ? ((catTotal / totalIncome) * 100).toFixed(1) : "0.0";
            const accentColor = CATEGORY_ACCENTS[cat] ?? "#f59e0b";
            const IconComp = CATEGORY_ICONS[cat] ?? Home;

            return (
              <div key={cat} className="card mb-6">
                {/* Category Card Header */}
                <div className="card-header" style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        background: `${accentColor}18`,
                        border: `1px solid ${accentColor}44`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: accentColor,
                      }}
                    >
                      <IconComp size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#f8fafc" }}>
                        {CATEGORY_LABELS[cat] ?? cat}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        {percentOfIncome}% of total monthly take-home income ({rawCatItems.length} items)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: accentColor }}>
                      {formatZAR(catTotal)}
                    </span>
                    <button
                      onClick={() => openAdd(cat)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 14px",
                        borderRadius: "99px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: `1px solid ${accentColor}55`,
                        background: `${accentColor}15`,
                        color: accentColor,
                        transition: "all 0.2s ease",
                      }}
                      id={`add-budget-${cat}`}
                    >
                      <Plus size={13} /> Add Item
                    </button>
                  </div>
                </div>

                {/* Progress Bar for Category Share */}
                <div style={{ height: "4px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: "16px" }}>
                  <div style={{ height: "100%", width: `${Math.min(Number(percentOfIncome), 100)}%`, background: accentColor, borderRadius: "99px" }} />
                </div>

                {/* Line Items List */}
                {catItems.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "#64748b", padding: "8px 0" }}>
                    {executionFilter === "ALL" ? "No items recorded for this category yet. Click + Add Item to record line items." : `No items matching '${executionFilter}' status in this category.`}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {catItems.map((item) => {
                      const isCleared = item.execution?.executionStatus === "CLEARED";
                      const isPartial = item.execution?.executionStatus === "PARTIAL";
                      const isBounced = item.execution?.executionStatus === "BOUNCED";

                      let rowBorder = "1px solid rgba(255, 255, 255, 0.08)";
                      let rowBg = "rgba(10, 16, 30, 0.6)";

                      if (isCleared) {
                        rowBorder = "1px solid rgba(16, 185, 129, 0.35)";
                        rowBg = "linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(10, 16, 30, 0.75) 100%)";
                      } else if (isPartial) {
                        rowBorder = "1px solid rgba(251, 191, 36, 0.35)";
                        rowBg = "linear-gradient(135deg, rgba(251, 191, 36, 0.06) 0%, rgba(10, 16, 30, 0.75) 100%)";
                      } else if (isBounced) {
                        rowBorder = "1px solid rgba(244, 63, 94, 0.4)";
                        rowBg = "linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(10, 16, 30, 0.75) 100%)";
                      }

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "14px 18px",
                            borderRadius: "14px",
                            background: rowBg,
                            border: rowBorder,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div style={{ flex: 1, marginRight: "16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, color: "#f8fafc", fontSize: "14px" }}>{item.label}</span>

                              {/* Bank Statement Execution Highlighting Badge */}
                              {isCleared && (
                                <span className="badge confirmed" style={{ fontSize: "11px", fontWeight: 800, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#34d399", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <CheckCircle2 size={12} /> {item.execution?.statusLabel}
                                </span>
                              )}
                              {isPartial && (
                                <span className="badge gold" style={{ fontSize: "11px", fontWeight: 800, background: "rgba(251, 191, 36, 0.15)", border: "1px solid rgba(251, 191, 36, 0.4)", color: "#fbbf24", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <AlertCircle size={12} /> {item.execution?.statusLabel}
                                </span>
                              )}
                              {isBounced && (
                                <span className="badge danger" style={{ fontSize: "11px", fontWeight: 800, background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.4)", color: "#f87171", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <AlertTriangle size={12} /> {item.execution?.statusLabel}
                                </span>
                              )}
                              {!isCleared && !isPartial && !isBounced && (
                                <span style={{ fontSize: "10px", background: "rgba(148, 163, 184, 0.1)", border: "1px solid rgba(148, 163, 184, 0.2)", color: "#94a3b8", padding: "2px 7px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <Clock size={11} /> Pending Statement Clearance
                                </span>
                              )}

                              {item.isComputed && (
                                <span className="badge blue" style={{ fontSize: "10px" }}>
                                  computed
                                </span>
                              )}
                              {item.confidence === "ESTIMATED" && !isCleared && (
                                <span className="badge gold" style={{ fontSize: "10px" }}>
                                  estimate
                                </span>
                              )}
                              {item.sourceRef && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontFamily: "var(--font-mono, monospace)",
                                    color: "#64748b",
                                    background: "rgba(255, 255, 255, 0.03)",
                                    border: "1px solid rgba(255, 255, 255, 0.06)",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {item.sourceRef}
                                </span>
                              )}

                              {item.linkedGoal && (
                                <a
                                  href="/goals"
                                  style={{
                                    fontSize: "10px",
                                    padding: "2px 8px",
                                    borderRadius: "99px",
                                    background: "rgba(16, 185, 129, 0.12)",
                                    border: "1px solid rgba(16, 185, 129, 0.3)",
                                    color: "#34d399",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    textDecoration: "none",
                                    fontWeight: 700,
                                  }}
                                >
                                  <PiggyBank size={11} />
                                  <span>Goal: {item.linkedGoal.progressPct}% Saved</span>
                                </a>
                              )}
                            </div>

                            {/* Statement Audit Citation Trace */}
                            {item.execution?.statementDocName && (
                              <div style={{ fontSize: "11px", color: isBounced ? "#f87171" : "#10b981", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono)" }}>
                                <FileText size={12} /> {item.execution.statementDocName} · {item.execution.executionRef}
                              </div>
                            )}

                            {item.linkedGoal && (
                              <div style={{ margin: "6px 0 2px 0", maxWidth: "260px" }}>
                                <div style={{ height: "4px", borderRadius: "99px", background: "rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${item.linkedGoal.progressPct}%`, background: "#10b981", borderRadius: "99px" }} />
                                </div>
                              </div>
                            )}

                            {item.note && (
                              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>
                                {item.note}
                              </div>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "16px", fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: isCleared ? "#34d399" : "#f8fafc" }}>
                                {formatZAR(Number(item.amount))}
                              </div>
                              {isCleared && (
                                <div style={{ fontSize: "10px", color: "#10b981", fontWeight: 700 }}>
                                  100% Cleared
                                </div>
                              )}
                            </div>

                            {!item.isComputed && (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    color: "#f8fafc",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => openEdit(item)}
                                  id={`edit-budget-${item.id}`}
                                >
                                  Edit
                                </button>
                                <button
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    border: "1px solid rgba(244, 63, 94, 0.3)",
                                    background: "rgba(244, 63, 94, 0.1)",
                                    color: "#f43f5e",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => handleDelete(item.id)}
                                  id={`delete-budget-${item.id}`}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit / Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? "Edit Budget Item" : "Add Budget Item"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Category</label>
                  <select
                    className="form-select"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label required">Item Description / Label</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="e.g. Municipal Electricity / Groceries"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Monthly Amount (ZAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label">Confidence</label>
                    <select
                      className="form-select"
                      value={form.confidence}
                      onChange={(e) => setForm({ ...form, confidence: e.target.value })}
                    >
                      <option value="CONFIRMED">CONFIRMED (from statement)</option>
                      <option value="ESTIMATED">ESTIMATED</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Note (optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.note}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                      placeholder="Context or memo"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editItem ? "Save Changes" : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

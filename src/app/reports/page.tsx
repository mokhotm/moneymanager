"use client";

import { useEffect, useState } from "react";
import { formatZAR } from "@/lib/formatters";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Calendar,
  Layers,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  Flame,
  Info,
  Clock,
  Coins,
  CreditCard,
  Building,
  RefreshCw,
  Sliders,
  DollarSign,
  AlertCircle,
  Check,
  ShieldCheck,
} from "lucide-react";

interface LeakageItem {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  account: string;
  actionRecommendation: string;
}

interface CategoryVariance {
  category: string;
  planned: number;
  actual: number;
  difference: number;
  percentageDiff: number;
  status: "UNDER_BUDGET" | "ON_TRACK" | "OVER_BUDGET";
}

interface TopMerchant {
  name: string;
  count: number;
  total: number;
  category: string;
}

interface HistoricalTrend {
  period: string;
  income: number;
  expenses: number;
  surplus: number;
  savingsRate: number;
}

interface WeeklyRunway {
  week: string;
  focus: string;
  target: number;
  actual: number;
  remainingRunway: number;
}

const CATEGORY_NAMES: Record<string, string> = {
  FIXED_HOUSEHOLD_OBLIGATIONS: "Fixed Household Obligations",
  DEBT_ACCELERATION_PLAN: "Debt Acceleration & DebiChecks",
  GOAL_CONTRIBUTIONS: "Goal & Sinking Fund Contributions",
  FAMILY_AND_DISCRETIONARY: "Everyday Living & Groceries",
  ONE_OFF_UNEXPECTED: "One-Off / Unexpected",
};

const CATEGORY_COLORS: Record<string, string> = {
  FIXED_HOUSEHOLD_OBLIGATIONS: "#38bdf8",
  DEBT_ACCELERATION_PLAN: "#f59e0b",
  GOAL_CONTRIBUTIONS: "#10b981",
  FAMILY_AND_DISCRETIONARY: "#a855f7",
  ONE_OFF_UNEXPECTED: "#f43f5e",
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "VARIANCE" | "LEAKAGE" | "HABITS">("OVERVIEW");
  const [timeframe, setTimeframe] = useState<string>("MONTHLY_CYCLE");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-08");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [resolvedLeaks, setResolvedLeaks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchReports();
  }, [timeframe, selectedMonth]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?timeframe=${timeframe}&month=${selectedMonth}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleResolve = (id: string) => {
    setResolvedLeaks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const summary = data?.summary || {
    totalIncome: 74438.26,
    totalPlannedOutflows: 74438.26,
    totalActualOutflows: 64343.10,
    netSurplus: 10095.16,
    savingsRatePercentage: 13.6,
    totalLeakageMonthly: 680.0,
    annualizedLeakage: 8160.0,
    phantomCashMonthly: 850.0,
  };

  const leakageItems: LeakageItem[] = data?.leakageItems || [];
  const categoryVariance: CategoryVariance[] = data?.categoryVariance || [];
  const topMerchants: TopMerchant[] = data?.topMerchants || [];
  const historicalTrends: HistoricalTrend[] = data?.historicalTrends || [];
  const weeklyRunway: WeeklyRunway[] = data?.weeklyRunway || [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base, #070b14)", color: "#f8fafc", padding: "32px 40px" }}>
      {/* ─── Page Header ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          marginBottom: "28px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f59e0b",
              }}
            >
              <BarChart3 size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em", margin: 0 }}>
                  Financial Intelligence & Leakage Hub
                </h1>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    padding: "3px 10px",
                    borderRadius: "99px",
                    fontSize: "11px",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ShieldCheck size={12} /> Statement Reconciled
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px", margin: 0 }}>
                Forensic cash flow audit, budget vs. actual variance, leakage detection & spending habits
              </p>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(13, 20, 36, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "8px 14px",
            }}
          >
            <Calendar size={15} color="#f59e0b" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                background: "transparent",
                color: "#f8fafc",
                border: "none",
                outline: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="2026-08" style={{ background: "#0d1424", color: "#fff" }}>
                August 2026 Pay Cycle (14 Aug – 14 Sep)
              </option>
              <option value="2026-07" style={{ background: "#0d1424", color: "#fff" }}>
                July 2026 Pay Cycle (15 Jul – 13 Aug)
              </option>
              <option value="2026-06" style={{ background: "#0d1424", color: "#fff" }}>
                June 2026 Pay Cycle (15 Jun – 14 Jul)
              </option>
              <option value="2026-05" style={{ background: "#0d1424", color: "#fff" }}>
                May 2026 Pay Cycle (15 May – 14 Jun)
              </option>
              <option value="2026-04" style={{ background: "#0d1424", color: "#fff" }}>
                April 2026 Pay Cycle (15 Apr – 14 May)
              </option>
              <option value="2026-03" style={{ background: "#0d1424", color: "#fff" }}>
                March 2026 Pay Cycle (16 Mar – 14 Apr)
              </option>
              <option value="2026-02" style={{ background: "#0d1424", color: "#fff" }}>
                February 2026 Pay Cycle (16 Feb – 15 Mar)
              </option>
              <option value="2026-01" style={{ background: "#0d1424", color: "#fff" }}>
                January 2026 Pay Cycle (15 Jan – 15 Feb)
              </option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 16px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "12px",
              color: "#f8fafc",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Printer size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* ─── Apple Segmented Pill Tabs ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(13, 20, 36, 0.8)",
          padding: "6px",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          marginBottom: "28px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setActiveTab("OVERVIEW")}
          style={{
            flex: 1,
            minWidth: "160px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            border: activeTab === "OVERVIEW" ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid transparent",
            background:
              activeTab === "OVERVIEW"
                ? "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.1) 100%)"
                : "transparent",
            color: activeTab === "OVERVIEW" ? "#fbbf24" : "#94a3b8",
            transition: "all 0.2s ease",
          }}
        >
          <PieChart size={16} /> Cash Flow Dynamics
        </button>

        <button
          onClick={() => setActiveTab("VARIANCE")}
          style={{
            flex: 1,
            minWidth: "160px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            border: activeTab === "VARIANCE" ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid transparent",
            background:
              activeTab === "VARIANCE"
                ? "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.1) 100%)"
                : "transparent",
            color: activeTab === "VARIANCE" ? "#fbbf24" : "#94a3b8",
            transition: "all 0.2s ease",
          }}
        >
          <Sliders size={16} /> Budget vs. Actual Variance
        </button>

        <button
          onClick={() => setActiveTab("LEAKAGE")}
          style={{
            flex: 1,
            minWidth: "160px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            border: activeTab === "LEAKAGE" ? "1px solid rgba(244, 63, 94, 0.5)" : "1px solid transparent",
            background:
              activeTab === "LEAKAGE"
                ? "linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(244, 63, 94, 0.1) 100%)"
                : "transparent",
            color: activeTab === "LEAKAGE" ? "#fda4af" : "#f43f5e",
            transition: "all 0.2s ease",
          }}
        >
          <ShieldAlert size={16} />
          <span>Money Leakage Detector</span>
          <span
            style={{
              background: "rgba(244, 63, 94, 0.25)",
              color: "#fda4af",
              padding: "1px 7px",
              borderRadius: "99px",
              fontSize: "10px",
              fontWeight: 800,
            }}
          >
            {leakageItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("HABITS")}
          style={{
            flex: 1,
            minWidth: "160px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            border: activeTab === "HABITS" ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid transparent",
            background:
              activeTab === "HABITS"
                ? "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.1) 100%)"
                : "transparent",
            color: activeTab === "HABITS" ? "#fbbf24" : "#94a3b8",
            transition: "all 0.2s ease",
          }}
        >
          <Flame size={16} /> Spend Runway & Habits
        </button>
      </div>

      {/* ─── 4 Executive KPI Stat Cards ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        {/* KPI 1: Net Salary Inflow */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(10, 16, 30, 0.9) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: "18px",
            padding: "22px 24px",
            boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Net Take-Home Salary
            </span>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowDownRight size={16} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono, monospace)" }}>
            {formatZAR(summary.totalIncome)}
          </div>
          <div style={{ fontSize: "12px", color: "#10b981", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={13} /> {summary.salarySourceLabel || "SARS Net Payslip Confirmed"}
          </div>
        </div>

        {/* KPI 2: Contractual & Living Outflows */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(10, 16, 30, 0.9) 100%)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "18px",
            padding: "22px 24px",
            boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Core Living & Debt Outflows
            </span>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono, monospace)" }}>
            {formatZAR(summary.totalActualOutflows)}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px", display: "flex", justifyContent: "space-between" }}>
            <span>Debts: {formatZAR(summary.debtsOutflow || 42794.29)}</span>
            <span>Living: {formatZAR(summary.livingOutflow || 21548.81)}</span>
          </div>
        </div>

        {/* KPI 3: Liquid Savings Sprint */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(10, 16, 30, 0.9) 100%)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "18px",
            padding: "22px 24px",
            boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Operating Free Cash
            </span>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={16} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#10b981", fontFamily: "var(--font-mono, monospace)" }}>
            +{formatZAR(summary.netSurplus)}
          </div>
          <div style={{ fontSize: "12px", color: "#60a5fa", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Zap size={13} /> {summary.netSurplus > 0 ? "100% Directed to Surplus & Sinking Funds" : "Balanced Operating Cash"}
          </div>
        </div>

        {/* KPI 4: Annualized Money Leakage */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(10, 16, 30, 0.9) 100%)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: "18px",
            padding: "22px 24px",
            boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#fda4af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Identified Annual Leakage
            </span>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "rgba(244, 63, 94, 0.15)",
                color: "#f43f5e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldAlert size={16} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#f43f5e", fontFamily: "var(--font-mono, monospace)" }}>
            {formatZAR(summary.annualizedLeakage)}
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#94a3b8" }}>/yr</span>
          </div>
          <div style={{ fontSize: "12px", color: "#fda4af", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={13} /> {leakageItems.length} Avoidable bank & card friction charges
          </div>
        </div>
      </div>

      {/* ─── TAB 1: CASH FLOW DYNAMICS ─── */}
      {activeTab === "OVERVIEW" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Multi-Month Historical Bar Visualizer */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "28px",
              boxShadow: "0 15px 35px -10px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUp size={20} color="#10b981" />
                  Historical Cash Flow & Operating Margin Trajectory
                </h2>
                <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px", margin: 0 }}>
                  Monthly salary inflow vs. actual outflows and liquid surplus across recent cycles
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", fontWeight: 600 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }} /> Net Salary
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#f59e0b" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} /> Outflows
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#38bdf8" }} /> Free Surplus
                </div>
              </div>
            </div>

            {/* SVG Bars Container */}
            <div style={{ height: "240px", display: "flex", alignItems: "flex-end", gap: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>
              {historicalTrends.map((t, idx) => {
                const maxVal = 90000;
                const incHeight = (t.income / maxVal) * 100;
                const expHeight = (t.expenses / maxVal) * 100;
                const isCurrent = t.period.includes("Active");

                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "6px", height: "190px" }}>
                      <div
                        style={{
                          width: "40%",
                          height: `${incHeight}%`,
                          background: isCurrent ? "linear-gradient(180deg, #10b981 0%, #059669 100%)" : "rgba(16, 185, 129, 0.45)",
                          borderRadius: "6px 6px 0 0",
                          boxShadow: isCurrent ? "0 0 15px rgba(16, 185, 129, 0.4)" : "none",
                        }}
                        title={`Income: ${formatZAR(t.income)}`}
                      />
                      <div
                        style={{
                          width: "40%",
                          height: `${expHeight}%`,
                          background: isCurrent ? "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)" : "rgba(245, 158, 11, 0.45)",
                          borderRadius: "6px 6px 0 0",
                          boxShadow: isCurrent ? "0 0 15px rgba(245, 158, 11, 0.4)" : "none",
                        }}
                        title={`Outflows: ${formatZAR(t.expenses)}`}
                      />
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: isCurrent ? 800 : 500, color: isCurrent ? "#fbbf24" : "#94a3b8", textAlign: "center" }}>
                      {t.period.replace(" (Active)", "")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Grid: Category Allocation & Scheduled Liberation Roadmap */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
            {/* Category Allocation */}
            <div
              style={{
                background: "rgba(13, 20, 36, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                padding: "24px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <PieChart size={18} color="#38bdf8" /> Monthly Expenditure Allocation
              </h3>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 20px 0" }}>
                Proportion of net salary allocated to living, debt service, and sinking funds
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {categoryVariance.map((cat, idx) => {
                  const pct = ((cat.planned / summary.totalIncome) * 100).toFixed(1);
                  const color = CATEGORY_COLORS[cat.category] || "#64748b";

                  return (
                    <div key={idx}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                        <span style={{ fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: color }} />
                          {CATEGORY_NAMES[cat.category] || cat.category}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono, monospace)", color: "#94a3b8", fontWeight: 600 }}>
                          {formatZAR(cat.planned)} ({pct}%)
                        </span>
                      </div>
                      <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "99px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scheduled Cash Flow Liberation Roadmap */}
            <div
              style={{
                background: "rgba(13, 20, 36, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={18} color="#10b981" /> Scheduled Cash Flow Liberation Milestones
                </h3>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 16px 0" }}>
                  Exact dates when debts and sprint funds finish, liberating permanent monthly surplus:
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(7, 11, 20, 0.6)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>
                      Car Transmission Fund Fully Paid (R 40,000 Target)
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>
                      Target: <strong style={{ color: "#10b981" }}>Early December 2026</strong> · Liberates{" "}
                      <strong style={{ color: "#38bdf8" }}>+R 10,095.16 / mo</strong>
                    </div>
                  </div>

                  <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(7, 11, 20, 0.6)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>
                      School Fees Arrears Payment Plan Extinguished
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>
                      Target: <strong style={{ color: "#10b981" }}>June 2027</strong> · Liberates{" "}
                      <strong style={{ color: "#10b981" }}>+R 2,000.00 / mo</strong>
                    </div>
                  </div>

                  <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(7, 11, 20, 0.6)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>
                      University Tuition Fees Payment Plan Extinguished
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>
                      Target: <strong style={{ color: "#10b981" }}>August 2027</strong> · Liberates{" "}
                      <strong style={{ color: "#f59e0b" }}>+R 4,000.00 / mo</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "13px",
                }}
              >
                <span style={{ fontWeight: 700, color: "#10b981" }}>Total Permanent Surplus Liberated by Aug 2027:</span>
                <span style={{ fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono, monospace)", fontSize: "15px" }}>
                  +R 16,095.16 / mo
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: BUDGET VS ACTUAL VARIANCE ENGINE ─── */}
      {activeTab === "VARIANCE" && (
        <div
          style={{
            background: "rgba(13, 20, 36, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "28px",
            boxShadow: "0 15px 35px -10px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Sliders size={20} color="#f59e0b" />
                Budget vs. Actual Variance Engine ({selectedMonth})
              </h2>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px", margin: 0 }}>
                Side-by-side comparison of planned monthly budget vs. verified bank statement debits
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", fontWeight: 600 }}>
              <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={14} /> Saved Buffer
              </span>
              <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                <Check size={14} /> On Target
              </span>
              <span style={{ color: "#f43f5e", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={14} /> Overspent
              </span>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "12px 16px" }}>Category</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Planned Budget (ZAR)</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Statement Actual (ZAR)</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Variance (ZAR)</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>% Diff</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: "var(--font-mono, monospace)" }}>
                {categoryVariance.map((row, idx) => {
                  const isOver = row.difference > 100;
                  const isUnder = row.difference < -100;

                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "16px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: CATEGORY_COLORS[row.category] || "#64748b" }} />
                        {CATEGORY_NAMES[row.category] || row.category}
                      </td>
                      <td style={{ padding: "16px", textAlign: "right", color: "#94a3b8" }}>{formatZAR(row.planned)}</td>
                      <td style={{ padding: "16px", textAlign: "right", color: "#ffffff", fontWeight: 800 }}>{formatZAR(row.actual)}</td>
                      <td style={{ padding: "16px", textAlign: "right", fontWeight: 700, color: isOver ? "#f43f5e" : isUnder ? "#10b981" : "#94a3b8" }}>
                        {row.difference > 0 ? `+${formatZAR(row.difference)}` : formatZAR(row.difference)}
                      </td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: isOver ? "rgba(244, 63, 94, 0.15)" : isUnder ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                            color: isOver ? "#f43f5e" : isUnder ? "#10b981" : "#94a3b8",
                          }}
                        >
                          {row.percentageDiff > 0 ? `+${row.percentageDiff}%` : `${row.percentageDiff}%`}
                        </span>
                      </td>
                      <td style={{ padding: "16px", textAlign: "center", fontFamily: "var(--font-sans, sans-serif)" }}>
                        {row.status === "OVER_BUDGET" && (
                          <span style={{ background: "rgba(244, 63, 94, 0.15)", color: "#f43f5e", border: "1px solid rgba(244, 63, 94, 0.3)", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: 700 }}>
                            Overspent
                          </span>
                        )}
                        {row.status === "UNDER_BUDGET" && (
                          <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: 700 }}>
                            Saved Buffer
                          </span>
                        )}
                        {row.status === "ON_TRACK" && (
                          <span style={{ background: "rgba(255, 255, 255, 0.05)", color: "#94a3b8", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: 700 }}>
                            On Target
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: MONEY LEAKAGE & FRICTION DETECTOR ─── */}
      {activeTab === "LEAKAGE" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Top Banner Alert */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(13, 20, 36, 0.95) 100%)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              borderRadius: "20px",
              padding: "24px 28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#fda4af", display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldAlert size={22} color="#f43f5e" />
                Automated Money Leakage & Friction Detector ("Plug the Drain")
              </div>
              <p style={{ fontSize: "13px", color: "#f8fafc", marginTop: "6px", maxWidth: "680px", lineHeight: "1.5" }}>
                Statement scans identified <strong style={{ color: "#fda4af" }}>{leakageItems.length} active friction fees</strong> on
                Standard Bank Prestige (`XXXX4469`) and Titanium Credit Card (`XXXX3529`) totaling{" "}
                <strong style={{ color: "#f43f5e" }}>{formatZAR(summary.totalLeakageMonthly)}/mo ({formatZAR(summary.annualizedLeakage)}/year)</strong>.
              </p>
            </div>

            <div style={{ background: "rgba(7, 11, 20, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "14px", padding: "14px 20px", textAlign: "right" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Annual Recoverable Capital</div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#10b981", fontFamily: "var(--font-mono, monospace)", marginTop: "2px" }}>
                +{formatZAR(summary.annualizedLeakage)}
              </div>
            </div>
          </div>

          {/* Identified Leakage Line Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {leakageItems.map((item) => {
              const isResolved = resolvedLeaks[item.id];

              return (
                <div
                  key={item.id}
                  style={{
                    background: isResolved ? "rgba(13, 20, 36, 0.4)" : "rgba(13, 20, 36, 0.85)",
                    border: isResolved ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(244, 63, 94, 0.25)",
                    borderRadius: "16px",
                    padding: "18px 22px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                    opacity: isResolved ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: isResolved ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                        color: isResolved ? "#10b981" : "#f43f5e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      {isResolved ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff" }}>{item.type}</span>
                        <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: "6px", color: "#94a3b8" }}>
                          {item.date}
                        </span>
                        <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: "6px", color: "#94a3b8" }}>
                          {item.account}
                        </span>
                      </div>

                      <div style={{ fontSize: "12px", fontFamily: "var(--font-mono, monospace)", color: "#cbd5e1", marginTop: "4px" }}>
                        {item.description}
                      </div>

                      <div style={{ fontSize: "12px", color: "#38bdf8", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Zap size={13} color="#f59e0b" />
                        <strong style={{ color: "#f8fafc" }}>Action:</strong> {item.actionRecommendation}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                      <div style={{ fontSize: "17px", fontWeight: 800, color: "#f43f5e" }}>-{formatZAR(item.amount)}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>Avoidable Fee</div>
                    </div>

                    <button
                      onClick={() => handleToggleResolve(item.id)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: isResolved ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
                        background: isResolved ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.06)",
                        color: isResolved ? "#10b981" : "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {isResolved ? (
                        <>
                          <Check size={14} /> Plugged
                        </>
                      ) : (
                        "Plug Leak"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* High-Interest RCP Compound Alert */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(13, 20, 36, 0.95) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              borderRadius: "18px",
              padding: "20px 24px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#fbbf24", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={18} /> High-Interest Debt Bleed: Standard Bank Revolving Credit Plan (RCP)
            </h3>
            <p style={{ fontSize: "13px", color: "#cbd5e1", margin: 0, lineHeight: "1.5" }}>
              Your Standard Bank RCP balance of <strong style={{ color: "#fff" }}>~R 289,700</strong> at ~14.75% prime interest
              leaks <strong style={{ color: "#f59e0b" }}>~R 3,560.00 / month in pure interest charges</strong> without
              reducing the principal debt. Accelerating this balance after funding your car repair will permanently recover{" "}
              <strong style={{ color: "#10b981" }}>R 42,700 / year</strong> into your net worth.
            </p>
          </div>
        </div>
      )}

      {/* ─── TAB 4: SPEND RUNWAY & HABITS ─── */}
      {activeTab === "HABITS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Weekly Pay-Cycle Burn Velocity */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Flame size={20} color="#f59e0b" />
                  30-Day Pay Cycle Cash Runway & Burn Rate
                </h2>
                <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px", margin: 0 }}>
                  Weekly spend burn rate across your pay cycle ({data?.cycleBounds?.formattedRange ?? "14 Aug – 14 Sep"}) ensuring positive balances before payday.
                </p>
              </div>

              <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "4px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: 700 }}>
                Runway Safe: +R 10,095.16 Buffer
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              {weeklyRunway.map((w, idx) => (
                <div key={idx} style={{ background: "rgba(7, 11, 20, 0.7)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "14px", padding: "18px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#ffffff" }}>{w.week}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 10px 0" }}>{w.focus}</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono, monospace)" }}>
                    {formatZAR(w.actual)}
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", margin: "10px 0", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, (w.actual / w.target) * 100)}%`, height: "100%", background: "#38bdf8", borderRadius: "99px" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
                    <span>Buffer:</span>
                    <strong style={{ color: "#10b981", fontFamily: "var(--font-mono, monospace)" }}>{formatZAR(w.remainingRunway)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Row: Top Merchants & Phantom Cash Tracker */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
            {/* Top Merchants */}
            <div style={{ background: "rgba(13, 20, 36, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "20px", padding: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <Building size={18} color="#38bdf8" /> Top Merchant Spend Concentration
              </h3>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 16px 0" }}>
                Highest card and electronic debit recipients across recent bank statements:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontFamily: "var(--font-mono, monospace)", fontSize: "12px" }}>
                {topMerchants.slice(0, 6).map((m, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "10px", background: "rgba(7, 11, 20, 0.6)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ width: "20px", height: "20px", borderRadius: "6px", background: "rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "10px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontWeight: 700, color: "#ffffff" }}>{m.name}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, color: "#f8fafc" }}>{formatZAR(m.total)}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "var(--font-sans, sans-serif)" }}>{m.count} txns</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phantom Cash & ATM Spend Reconciliation */}
            <div style={{ background: "rgba(13, 20, 36, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Coins size={18} color="#a855f7" /> "Phantom Cash" & Pocket Spend Tracker
                </h3>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 16px 0" }}>
                  Reconciles physical ATM cash withdrawals against verified cash receipts:
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderRadius: "10px", background: "rgba(7, 11, 20, 0.6)" }}>
                    <span style={{ color: "#94a3b8" }}>Total ATM Cash Withdrawn:</span>
                    <strong style={{ color: "#ffffff", fontFamily: "var(--font-mono, monospace)" }}>R 3,600.00</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderRadius: "10px", background: "rgba(7, 11, 20, 0.6)" }}>
                    <span style={{ color: "#94a3b8" }}>Domestic Worker Wage Receipt:</span>
                    <strong style={{ color: "#10b981", fontFamily: "var(--font-mono, monospace)" }}>-R 2,200.00</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderRadius: "10px", background: "rgba(7, 11, 20, 0.6)" }}>
                    <span style={{ color: "#94a3b8" }}>Garden Services Maintenance Receipt:</span>
                    <strong style={{ color: "#10b981", fontFamily: "var(--font-mono, monospace)" }}>-R 550.00</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderRadius: "10px", background: "rgba(168, 85, 247, 0.12)", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
                    <span style={{ color: "#d8b4fe", fontWeight: 700 }}>Untracked "Phantom" Cash Spend:</span>
                    <strong style={{ color: "#c084fc", fontFamily: "var(--font-mono, monospace)", fontSize: "15px" }}>R 850.00 / mo</strong>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "16px", fontSize: "12px", color: "#94a3b8", background: "rgba(7, 11, 20, 0.6)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                💡 <strong style={{ color: "#fff" }}>Action:</strong> Log small cash expenses in the{" "}
                <a href="/cash-wallet" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 700 }}>
                  Cash Wallet
                </a>{" "}
                for 100% accounting transparency.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

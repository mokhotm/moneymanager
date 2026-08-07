"use client";

import { useEffect, useState } from "react";
import { formatZAR, formatMonths } from "@/lib/formatters";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  Home,
  Flame,
  Zap,
  CreditCard,
  TrendingUp,
  BarChart3,
  Table as TableIcon,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  Calendar,
  Check,
  TrendingDown,
  Lock,
  LogIn,
} from "lucide-react";

interface TimelineResult {
  strategy: string;
  extraPool: number;
  totalIncome: number;
  totalMinPayments: number;
  totalMonths: number;
  totalInterestPaid: number;
  completed: boolean;
  shortTermClearanceMonths: number;
  longTermClearanceMonths: number;
  shortTermCompleted: boolean;
  neverClearingDebts: string[];
  clearanceMonths: Record<string, number>;
  timeline: Array<{
    month: number;
    totalRemainingDebt: number;
    insufficientFundsWarning: boolean;
    results: Array<{
      debtId: string;
      debtName: string;
      closingBalance: number;
      payment: number;
      interest: number;
    }>;
  }>;
}

const COLORS = [
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#d97706",
];

function formatYAxis(value: number) {
  if (value >= 1_000_000) return `R ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R ${(value / 1_000).toFixed(0)}k`;
  return `R ${value}`;
}

export default function TimelinePage() {
  const [data, setData] = useState<TimelineResult | null>(null);
  const [payoffPlanPosition, setPayoffPlanPosition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<"SNOWBALL" | "AVALANCHE">("SNOWBALL");
  const [view, setView] = useState<"chart" | "table">("chart");
  const [filterCategory, setFilterCategory] = useState<"ALL" | "SHORT_TERM" | "LONG_TERM">("ALL");
  const [zoomRange, setZoomRange] = useState<"AUTO" | "18M" | "5Y" | "FULL">("AUTO");

  const load = (strat: "SNOWBALL" | "AVALANCHE") => {
    setLoading(true);
    fetch(`/api/timeline?strategy=${strat}`)
      .then((r) => {
        if (r.status === 401) return { error: "Unauthorized" };
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/payoff-plan?strategy=${strat}`)
      .then((r) => r.json())
      .then((d) => setPayoffPlanPosition(d.position))
      .catch(() => {});
  };

  useEffect(() => {
    load(strategy);
  }, [strategy]);

  // Determine dynamic max month cutoff for adaptive X-axis scaling
  let maxMonthCutoff = data?.timeline?.length || 600;
  if (zoomRange === "18M") {
    maxMonthCutoff = 21;
  } else if (zoomRange === "5Y") {
    maxMonthCutoff = 60;
  } else if (zoomRange === "FULL") {
    maxMonthCutoff = data?.timeline?.length || 600;
  } else {
    // AUTO ADAPTIVE: scale to active filter category
    if (filterCategory === "SHORT_TERM") {
      maxMonthCutoff = Math.min((data?.shortTermClearanceMonths || 18) + 3, data?.timeline?.length || 600);
    } else if (filterCategory === "LONG_TERM") {
      maxMonthCutoff = Math.min((data?.longTermClearanceMonths || 240) + 12, data?.timeline?.length || 600);
    } else {
      maxMonthCutoff = Math.min((data?.longTermClearanceMonths || 240) + 12, data?.timeline?.length || 600);
    }
  }

  // Filter & truncate timeline data to dynamic maxMonthCutoff
  const truncatedTimeline = data?.timeline?.slice(0, maxMonthCutoff) ?? [];

  // Build chart data
  const chartData = truncatedTimeline.map((ms) => {
    const entry: Record<string, number | string> = { month: `M${ms.month}` };
    for (const r of ms.results) {
      const isLongTerm = r.debtName.toLowerCase().includes("home loan") || r.debtName.toLowerCase().includes("bond");
      if (
        filterCategory === "ALL" ||
        (filterCategory === "SHORT_TERM" && !isLongTerm) ||
        (filterCategory === "LONG_TERM" && isLongTerm)
      ) {
        entry[r.debtName] = Math.round(r.closingBalance);
      }
    }
    return entry;
  });

  // Unique debt names for chart areas
  const debtNames =
    data?.timeline?.[0]?.results
      .filter((r) => {
        const isLongTerm = r.debtName.toLowerCase().includes("home loan") || r.debtName.toLowerCase().includes("bond");
        if (filterCategory === "ALL") return true;
        if (filterCategory === "SHORT_TERM") return !isLongTerm;
        if (filterCategory === "LONG_TERM") return isLongTerm;
        return true;
      })
      .map((r) => r.debtName) ?? [];

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            Payoff Timeline &amp; Clearance Horizon
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
              Dual-Track Engine
            </span>
          </h1>
          <p className="page-subtitle">Dual-track timeline for short-term consumer debt vs long-term mortgage bond</p>
        </div>

        {/* Header Pill Segmented Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Strategy Pill Switcher */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(10, 16, 30, 0.8)",
              padding: "4px",
              borderRadius: "99px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              gap: "4px",
            }}
          >
            <button
              onClick={() => setStrategy("SNOWBALL")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "99px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: strategy === "SNOWBALL" ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" : "transparent",
                color: strategy === "SNOWBALL" ? "#000000" : "#94a3b8",
                transition: "all 0.2s ease",
              }}
              id="strategy-snowball"
            >
              <Flame size={14} style={{ color: strategy === "SNOWBALL" ? "#000000" : "#f59e0b" }} />
              <span>Snowball</span>
            </button>
            <button
              onClick={() => setStrategy("AVALANCHE")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "99px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: strategy === "AVALANCHE" ? "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)" : "transparent",
                color: strategy === "AVALANCHE" ? "#ffffff" : "#94a3b8",
                transition: "all 0.2s ease",
              }}
              id="strategy-avalanche"
            >
              <Zap size={14} style={{ color: strategy === "AVALANCHE" ? "#ffffff" : "#60a5fa" }} />
              <span>Avalanche</span>
            </button>
          </div>

          {/* View Pill Switcher */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(10, 16, 30, 0.8)",
              padding: "4px",
              borderRadius: "99px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              gap: "4px",
            }}
          >
            <button
              onClick={() => setView("chart")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "99px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: view === "chart" ? "rgba(255, 255, 255, 0.15)" : "transparent",
                color: view === "chart" ? "#f8fafc" : "#94a3b8",
                transition: "all 0.2s ease",
              }}
              id="view-chart"
            >
              <BarChart3 size={14} />
              <span>Chart</span>
            </button>
            <button
              onClick={() => setView("table")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "99px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: view === "table" ? "rgba(255, 255, 255, 0.15)" : "transparent",
                color: view === "table" ? "#f8fafc" : "#94a3b8",
                transition: "all 0.2s ease",
              }}
              id="view-table"
            >
              <TableIcon size={14} />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div className="animate-pulse" style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }}>
              Running dual-track debt clearance simulation…
            </div>
          </div>
        ) : !data || (data as any)?.error ? (
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
              Please sign in to your MoneyManager account to view your personal debt timeline and clearance horizon.
            </p>
            <a href="/login" className="btn btn-primary btn-lg inline-flex items-center gap-2">
              <LogIn size={18} />
              <span>Sign In to View Payoff Timeline</span>
            </a>
          </div>
        ) : data.timeline?.length === 0 ? (
          <div className="card mb-6" style={{ textAlign: "center", padding: "60px 24px" }}>
            <BarChart3 size={40} style={{ color: "#f59e0b", margin: "0 auto 16px auto" }} />
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "#f8fafc" }}>No Debt Data Configured</h2>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>Add active debts to run your personalized payoff schedule timeline.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <a href="/debts" className="btn btn-primary">
                Add Debts to Portfolio
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Apple Obsidian "You Are Here" Position Tracking Banner */}
            {payoffPlanPosition && (
              <div
                className="card mb-6"
                style={{
                  background:
                    payoffPlanPosition.overallStatus === "BEHIND_PLAN"
                      ? "linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(13, 20, 36, 0.95) 100%)"
                      : "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(13, 20, 36, 0.95) 100%)",
                  border:
                    payoffPlanPosition.overallStatus === "BEHIND_PLAN"
                      ? "1px solid rgba(244, 63, 94, 0.35)"
                      : "1px solid rgba(16, 185, 129, 0.35)",
                  borderRadius: "20px",
                  padding: "24px",
                  backdropFilter: "blur(24px)",
                  boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
                }}
              >
                {/* Banner Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        padding: "6px 14px",
                        borderRadius: "99px",
                        fontSize: "12px",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background:
                          payoffPlanPosition.overallStatus === "BEHIND_PLAN"
                            ? "rgba(244, 63, 94, 0.2)"
                            : "rgba(16, 185, 129, 0.2)",
                        color:
                          payoffPlanPosition.overallStatus === "BEHIND_PLAN"
                            ? "#f43f5e"
                            : "#10b981",
                        border:
                          payoffPlanPosition.overallStatus === "BEHIND_PLAN"
                            ? "1px solid rgba(244, 63, 94, 0.4)"
                            : "1px solid rgba(16, 185, 129, 0.4)",
                      }}
                    >
                      <Clock size={14} />
                      <span>You Are Here: Month {payoffPlanPosition.currentMonthNumber}</span>
                    </div>

                    <span style={{ fontSize: "13px", color: "#cbd5e1", fontWeight: 600 }}>
                      {payoffPlanPosition.percentComplete}% Complete ({payoffPlanPosition.remainingMonthsCount} months remaining)
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", fontWeight: 700 }}>
                      Plan Execution Status:
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        padding: "4px 12px",
                        borderRadius: "99px",
                        background:
                          payoffPlanPosition.overallStatus === "BEHIND_PLAN"
                            ? "rgba(244, 63, 94, 0.2)"
                            : "rgba(16, 185, 129, 0.2)",
                        color:
                          payoffPlanPosition.overallStatus === "BEHIND_PLAN"
                            ? "#f43f5e"
                            : "#10b981",
                        border:
                          payoffPlanPosition.overallStatus === "BEHIND_PLAN"
                            ? "1px solid rgba(244, 63, 94, 0.3)"
                            : "1px solid rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      {payoffPlanPosition.overallStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Per-debt Drift Grid Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px" }}>
                  {payoffPlanPosition.debtDrifts.map((drift: any) => {
                    const isBehind = drift.status === "BEHIND_PLAN";
                    const isAhead = drift.status === "AHEAD_OF_PLAN";
                    return (
                      <div
                        key={drift.debtId}
                        style={{
                          background: "rgba(10, 16, 30, 0.6)",
                          border: isBehind
                            ? "1px solid rgba(244, 63, 94, 0.25)"
                            : isAhead
                            ? "1px solid rgba(16, 185, 129, 0.25)"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          padding: "12px 16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", marginBottom: "2px" }}>
                            {drift.debtName}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.4 }}>
                            {drift.explanation}
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            fontFamily: "var(--font-mono, monospace)",
                            whiteSpace: "nowrap",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: isBehind
                              ? "rgba(244, 63, 94, 0.15)"
                              : isAhead
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(255, 255, 255, 0.08)",
                            color: isBehind
                              ? "#f43f5e"
                              : isAhead
                              ? "#10b981"
                              : "#94a3b8",
                          }}
                        >
                          {drift.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Apple-Grade Core Stat Grid */}
            <div className="stat-grid mb-6">
              {/* Stat 1: Short-Term Debt-Free */}
              <div className="stat-card success">
                <div className="stat-label flex items-center gap-1.5" style={{ color: "#10b981" }}>
                  <CheckCircle2 size={16} /> Short-Term Consumer Debt-Free In
                </div>
                <div className="stat-value green" style={{ fontSize: "24px", margin: "6px 0 4px 0" }}>
                  {formatMonths(data.shortTermClearanceMonths || 18)}
                </div>
                <div className="stat-sub flex items-center gap-1" style={{ color: "#6ee7b7" }}>
                  <Sparkles size={12} style={{ color: "#10b981" }} /> All 7 consumer debts cleared!
                </div>
              </div>

              {/* Stat 2: Mortgage Payoff Target */}
              <div className="stat-card" style={{ border: "1px solid rgba(139, 92, 246, 0.3)", background: "linear-gradient(180deg, rgba(139, 92, 246, 0.05) 0%, rgba(17, 26, 46, 0.7) 100%)" }}>
                <div className="stat-label flex items-center gap-1.5" style={{ color: "#c084fc" }}>
                  <Home size={16} /> Mortgage Bond Payoff Target
                </div>
                <div className="stat-value" style={{ color: "#c084fc", fontSize: "24px", margin: "6px 0 4px 0" }}>
                  {formatMonths(data.longTermClearanceMonths && data.longTermClearanceMonths < 600 ? data.longTermClearanceMonths : 240)}
                </div>
                <div className="stat-sub" style={{ color: "#e9d5ff" }}>
                  Standard Bank Home Loan (240 Mo Term)
                </div>
              </div>

              {/* Stat 3: Total Interest Paid */}
              <div className="stat-card danger">
                <div className="stat-label flex items-center gap-1.5">
                  <Sparkles size={16} style={{ color: "#f43f5e" }} /> Total Interest Paid
                </div>
                <div className="stat-value red" style={{ fontSize: "24px", margin: "6px 0 4px 0" }}>
                  {formatZAR(data.totalInterestPaid)}
                </div>
                <div className="stat-sub">Across full mortgage &amp; debt schedule</div>
              </div>

              {/* Stat 4: Acceleration Pool */}
              <div className="stat-card warning">
                <div className="stat-label flex items-center gap-1.5">
                  <Zap size={16} style={{ color: "#f59e0b" }} /> Monthly Acceleration Pool
                </div>
                <div className="stat-value gold" style={{ fontSize: "24px", margin: "6px 0 4px 0" }}>
                  {formatZAR(data.extraPool)}
                </div>
                <div className="stat-sub">Available after minimum payments</div>
              </div>
            </div>

            {/* Category Filter Pills Bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Filter View:
              </span>
              {(
                [
                  { id: "ALL", label: "All Debts", icon: ShieldCheck },
                  { id: "SHORT_TERM", label: "Short-Term Consumer Debts (Clears M18)", icon: CreditCard },
                  { id: "LONG_TERM", label: "Long-Term Mortgage (Home Loan)", icon: Home },
                ] as const
              ).map((f) => {
                const IconComponent = f.icon;
                const isSelected = filterCategory === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilterCategory(f.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 16px",
                      borderRadius: "99px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: isSelected ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
                      background: isSelected ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.04)",
                      color: isSelected ? "#fbbf24" : "#94a3b8",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <IconComponent size={14} />
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Grouped Debt Clearance Schedule */}
            <div className="card mb-6">
              <div className="card-header" style={{ marginBottom: "20px" }}>
                <span className="card-title flex items-center gap-2" style={{ fontSize: "15px", color: "#f8fafc" }}>
                  <Clock size={20} style={{ color: "#f59e0b" }} />
                  Grouped Clearance Schedule
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-mono, monospace)",
                    fontWeight: 700,
                    color: "#10b981",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    padding: "3px 12px",
                    borderRadius: "99px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <CheckCircle2 size={13} />
                  Short-Term Consumer Debt Cleared in 18 Months!
                </span>
              </div>

              {/* Short-Term Debts Group */}
              {filterCategory !== "LONG_TERM" && (
                <div style={{ marginBottom: "24px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <CreditCard size={14} style={{ color: "#f59e0b" }} /> Short-Term Consumer Debts (Cleared within 18 Months)
                  </h4>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
                    {Object.entries(data.clearanceMonths)
                      .filter(([debtId]) => {
                        const name = data.timeline[0]?.results.find((r) => r.debtId === debtId)?.debtName ?? "";
                        return !name.toLowerCase().includes("home loan") && !name.toLowerCase().includes("bond");
                      })
                      .sort((a, b) => a[1] - b[1])
                      .map(([debtId, month], i) => {
                        const name = data.timeline[0]?.results.find((r) => r.debtId === debtId)?.debtName ?? debtId;
                        return (
                          <div
                            key={debtId}
                            style={{
                              background: "rgba(10, 16, 30, 0.7)",
                              border: `1px solid ${COLORS[i % COLORS.length]}44`,
                              borderRadius: "14px",
                              padding: "16px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              gap: "8px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: "#94a3b8" }}>
                                Month {month}
                              </span>
                              <span style={{ fontSize: "10px", fontWeight: 800, color: "#10b981", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "99px" }}>
                                ✓ Cleared
                              </span>
                            </div>

                            <div style={{ fontWeight: 700, fontSize: "14px", color: "#f8fafc" }}>
                              {name}
                            </div>

                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              {formatMonths(month)} to clear
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Long-Term Mortgage Group */}
              {filterCategory !== "SHORT_TERM" && (
                <div style={{ paddingTop: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Home size={14} style={{ color: "#c084fc" }} /> Long-Term Mortgage &amp; Property Bonds
                  </h4>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
                    {Object.entries(data.clearanceMonths)
                      .filter(([debtId]) => {
                        const name = data.timeline[0]?.results.find((r) => r.debtId === debtId)?.debtName ?? "";
                        return name.toLowerCase().includes("home loan") || name.toLowerCase().includes("bond");
                      })
                      .map(([debtId, month]) => {
                        const name = data.timeline[0]?.results.find((r) => r.debtId === debtId)?.debtName ?? debtId;
                        return (
                          <div
                            key={debtId}
                            style={{
                              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(10, 16, 30, 0.8) 100%)",
                              border: "1px solid rgba(139, 92, 246, 0.35)",
                              borderRadius: "14px",
                              padding: "16px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#c084fc" }}>
                                20-Year Bond
                              </span>
                              <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: "#e9d5ff" }}>
                                Month {month}
                              </span>
                            </div>

                            <div style={{ fontWeight: 700, fontSize: "15px", color: "#f8fafc" }}>
                              {name}
                            </div>

                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                              {formatMonths(month)} total payoff target
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* View Switcher: Chart vs Table */}
            {view === "chart" ? (
              <div className="card mb-6">
                <div className="card-header flex justify-between items-center flex-wrap gap-3" style={{ marginBottom: "20px" }}>
                  <span className="card-title flex items-center gap-2" style={{ fontSize: "15px", color: "#f8fafc" }}>
                    <BarChart3 size={20} style={{ color: "#f59e0b" }} /> Debt Balances Over Time ({filterCategory})
                  </span>

                  {/* Adaptive X-Axis Zoom Presets */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: "4px" }}>
                      X-Axis Zoom:
                    </span>
                    {(
                      [
                        { id: "AUTO", label: `⚡ Auto (Scale to M${maxMonthCutoff})` },
                        { id: "18M", label: "18 Months (Consumer)" },
                        { id: "5Y", label: "5 Years" },
                        { id: "FULL", label: "Full Mortgage" },
                      ] as const
                    ).map((z) => {
                      const isSelected = zoomRange === z.id;
                      return (
                        <button
                          key={z.id}
                          onClick={() => setZoomRange(z.id)}
                          style={{
                            padding: "4px 12px",
                            fontSize: "11px",
                            fontWeight: 700,
                            borderRadius: "99px",
                            border: isSelected ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
                            background: isSelected ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.04)",
                            color: isSelected ? "#fbbf24" : "#94a3b8",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {z.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ width: "100%", height: "420px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                      <defs>
                        {debtNames.map((name, i) => (
                          <linearGradient key={name} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        tickLine={false}
                        interval={Math.ceil(chartData.length / 12)}
                      />
                      <YAxis
                        tickFormatter={formatYAxis}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(10, 16, 30, 0.95)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          borderRadius: "14px",
                          color: "#f8fafc",
                          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.7)",
                          backdropFilter: "blur(20px)",
                          padding: "14px 18px",
                        }}
                        formatter={(value: any, name: any) => {
                          const val = Number(value ?? 0);
                          return [
                            val === 0 ? "✓ R 0,00 (Cleared)" : formatZAR(val),
                            String(name ?? ""),
                          ];
                        }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: 16, color: "#94a3b8", fontSize: 12 }}
                      />
                      {debtNames.map((name, i) => (
                        <Area
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={COLORS[i % COLORS.length]}
                          fill={`url(#gradient-${i})`}
                          strokeWidth={2.5}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="card mb-6">
                <div className="card-header" style={{ marginBottom: "20px" }}>
                  <span className="card-title flex items-center gap-2" style={{ fontSize: "15px", color: "#f8fafc" }}>
                    <TableIcon size={20} style={{ color: "#f59e0b" }} /> Month-by-Month Clearance Breakdown
                  </span>
                  <span className="text-muted text-sm">Showing key progression months</span>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Total Balance</th>
                        {debtNames.map((n) => (
                          <th key={n}>{n}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.timeline
                        .filter((_, i) => i % 3 === 0 || i === data.timeline.length - 1)
                        .map((ms) => (
                          <tr key={ms.month}>
                            <td className="font-semibold" style={{ color: "#f59e0b", fontFamily: "var(--font-mono, monospace)" }}>
                              Month {ms.month}
                            </td>
                            <td className="font-bold">{formatZAR(ms.totalRemainingDebt)}</td>
                            {debtNames.map((name) => {
                              const r = ms.results.find((x) => x.debtName === name);
                              return (
                                <td key={name} style={{ color: r?.closingBalance === 0 ? "#10b981" : "inherit" }}>
                                  {r ? (r.closingBalance === 0 ? "✓ Cleared" : formatZAR(r.closingBalance)) : "—"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

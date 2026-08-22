"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Bar,
  Line,
} from "recharts";
import { formatZAR } from "@/lib/formatters";
import {
  PieChart as PieIcon,
  TrendingUp,
  BarChart2,
  Flame,
  Layers,
  Sparkles,
} from "lucide-react";

export interface DashboardChartsProps {
  spendingByCategory?: Array<{
    key: string;
    name: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  netWorthHistory?: Array<{
    month: string;
    netWorth: number;
    totalAssets: number;
    totalDebts: number;
  }>;
  cashFlowHistory?: Array<{
    month: string;
    income: number;
    expenses: number;
    debtService: number;
    netSurplus: number;
  }>;
  spendingHeatmap?: Array<{
    date: string;
    dayName: string;
    amount: number;
    count: number;
    intensity: number;
  }>;
  debtDistribution?: Array<{
    id: string;
    debtName: string;
    institution: string;
    currentBalance: number;
    minimumPayment: number;
    annualInterestRate: number;
    progress: number;
    urgencyFlag: string;
  }>;
}

export function DashboardCharts({
  spendingByCategory = [],
  netWorthHistory = [],
  cashFlowHistory = [],
  spendingHeatmap = [],
  debtDistribution = [],
}: DashboardChartsProps) {
  const [activeTab, setActiveTab] = useState<"SPENDING" | "NET_WORTH" | "CASH_FLOW" | "HEATMAP" | "DEBT">("SPENDING");
  const [hoveredSpendingIndex, setHoveredSpendingIndex] = useState<number | null>(null);

  // Fallback defaults if props are loading or empty
  const categoriesToRender = spendingByCategory && spendingByCategory.length > 0 ? spendingByCategory : [
    { key: "FIXED_HOUSEHOLD_OBLIGATIONS", name: "Fixed Household", amount: 24500, percentage: 45, color: "#3b82f6" },
    { key: "DEBT_ACCELERATION_PLAN", name: "Debt Acceleration", amount: 16800, percentage: 31, color: "#f43f5e" },
    { key: "GOAL_CONTRIBUTIONS", name: "Goal Contributions", amount: 4500, percentage: 8, color: "#10b981" },
    { key: "FAMILY_AND_DISCRETIONARY", name: "Discretionary & Family", amount: 6200, percentage: 12, color: "#f59e0b" },
    { key: "ONE_OFF_UNEXPECTED", name: "One-off Unexpected", amount: 2000, percentage: 4, color: "#8b5cf6" },
  ];

  const activeSpendCategory = hoveredSpendingIndex !== null ? categoriesToRender[hoveredSpendingIndex] : null;
  const totalSpendingAmount = categoriesToRender.reduce((s, c) => s + c.amount, 0);

  const netWorthToRender = netWorthHistory && netWorthHistory.length > 0 ? netWorthHistory : [
    { month: "Mar 2026", netWorth: -470000, totalAssets: 1980000, totalDebts: 2450000 },
    { month: "Apr 2026", netWorth: -390000, totalAssets: 2020000, totalDebts: 2410000 },
    { month: "May 2026", netWorth: -310000, totalAssets: 2050000, totalDebts: 2360000 },
    { month: "Jun 2026", netWorth: -220000, totalAssets: 2080000, totalDebts: 2300000 },
    { month: "Jul 2026", netWorth: -148865, totalAssets: 2101135, totalDebts: 2250000 },
    { month: "Aug 2026", netWorth: -113640, totalAssets: 2101135, totalDebts: 2214776 },
  ];

  const cashFlowToRender = cashFlowHistory && cashFlowHistory.length > 0 ? cashFlowHistory : [
    { month: "Mar", income: 52000, expenses: 31000, debtService: 16500, netSurplus: 4500 },
    { month: "Apr", income: 52000, expenses: 29500, debtService: 16500, netSurplus: 6000 },
    { month: "May", income: 54000, expenses: 30800, debtService: 16800, netSurplus: 6400 },
    { month: "Jun", income: 54000, expenses: 32000, debtService: 16800, netSurplus: 5200 },
    { month: "Jul", income: 54000, expenses: 29800, debtService: 16800, netSurplus: 7400 },
    { month: "Aug", income: 54000, expenses: 30700, debtService: 16800, netSurplus: 6500 },
  ];

  // Custom Glass Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "rgba(10, 16, 30, 0.96)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: "14px",
            padding: "12px 16px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(20px)",
            color: "#f8fafc",
            fontSize: "12px",
            fontFamily: "var(--font-mono, monospace)",
            minWidth: "180px",
          }}
        >
          <p style={{ color: "#94a3b8", fontWeight: 700, marginBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "4px" }}>
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: "16px", margin: "4px 0" }}>
              <span style={{ color: entry.color || entry.fill, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: entry.color || entry.fill }} />
                {entry.name}:
              </span>
              <span style={{ fontWeight: 800, color: "#ffffff" }}>{formatZAR(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Apple Segment Control Tab Styling
  const getTabStyle = (tabKey: string) => {
    const isActive = activeTab === tabKey;
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 16px",
      borderRadius: "99px",
      fontSize: "12px",
      fontWeight: isActive ? 700 : 500,
      cursor: "pointer",
      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      border: "none",
      background: isActive
        ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
        : "transparent",
      color: isActive ? "#000000" : "#94a3b8",
      boxShadow: isActive ? "0 4px 20px rgba(245, 158, 11, 0.4)" : "none",
      outline: "none",
      letterSpacing: "-0.01em",
    };
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(17, 26, 46, 0.8) 0%, rgba(10, 16, 30, 0.9) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "24px",
        padding: "28px",
        backdropFilter: "blur(24px) saturate(180%)",
        boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      {/* Header & Apple Segmented Control */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "28px",
          paddingBottom: "18px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={20} style={{ color: "#f59e0b" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", margin: 0, letterSpacing: "-0.01em" }}>
              Financial Analytics &amp; Visualizations
            </h3>
          </div>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>
            Real-time breakdown of spending, wealth horizon, cash flow &amp; debt payoff
          </p>
        </div>

        {/* Apple Segment Pill Bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            background: "rgba(255, 255, 255, 0.04)",
            padding: "4px",
            borderRadius: "99px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <button onClick={() => setActiveTab("SPENDING")} style={getTabStyle("SPENDING")}>
            <PieIcon size={14} />
            <span>Spending Distribution</span>
          </button>

          <button onClick={() => setActiveTab("NET_WORTH")} style={getTabStyle("NET_WORTH")}>
            <TrendingUp size={14} />
            <span>Net Worth Horizon</span>
          </button>

          <button onClick={() => setActiveTab("CASH_FLOW")} style={getTabStyle("CASH_FLOW")}>
            <BarChart2 size={14} />
            <span>Cash Flow Stream</span>
          </button>

          <button onClick={() => setActiveTab("HEATMAP")} style={getTabStyle("HEATMAP")}>
            <Flame size={14} />
            <span>Activity Heatmap</span>
          </button>

          <button onClick={() => setActiveTab("DEBT")} style={getTabStyle("DEBT")}>
            <Layers size={14} />
            <span>Debt Snowball</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Spending Distribution */}
      {activeTab === "SPENDING" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "36px", alignItems: "center" }}>
          {/* Donut Chart with Dynamic Center Readout */}
          <div style={{ height: "320px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoriesToRender}
                  cx="50%"
                  cy="50%"
                  innerRadius={82}
                  outerRadius={124}
                  paddingAngle={4}
                  dataKey="amount"
                  nameKey="name"
                  onMouseEnter={(_, index) => setHoveredSpendingIndex(index)}
                  onMouseLeave={() => setHoveredSpendingIndex(null)}
                >
                  {categoriesToRender.map((entry, index) => {
                    const isHovered = hoveredSpendingIndex === index;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={isHovered ? "#ffffff" : "rgba(10, 16, 30, 0.9)"}
                        strokeWidth={isHovered ? 3 : 2}
                        style={{
                          filter: isHovered ? `drop-shadow(0 0 12px ${entry.color}cc)` : "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Dynamic Center Intelligence - Completely Crisp & Never Colliding */}
            <div
              style={{
                position: "absolute",
                textAlign: "center",
                pointerEvents: "none",
                maxWidth: "155px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease-out",
              }}
            >
              {activeSpendCategory ? (
                <>
                  <span
                    style={{
                      fontSize: "11px",
                      color: activeSpendCategory.color,
                      textTransform: "uppercase",
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                      lineHeight: "1.2",
                      marginBottom: "2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "150px",
                    }}
                  >
                    {activeSpendCategory.name}
                  </span>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono, monospace)",
                      color: "#f8fafc",
                      lineHeight: "1.1",
                    }}
                  >
                    {formatZAR(activeSpendCategory.amount)}
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono, monospace)",
                      color: activeSpendCategory.color,
                      marginTop: "3px",
                    }}
                  >
                    {activeSpendCategory.percentage}% of total
                  </span>
                </>
              ) : (
                <>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#64748b",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      letterSpacing: "1px",
                    }}
                  >
                    Total Monthly
                  </span>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono, monospace)",
                      color: "#f59e0b",
                      marginTop: "2px",
                      lineHeight: "1.1",
                    }}
                  >
                    {formatZAR(totalSpendingAmount)}
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#10b981",
                      fontWeight: 600,
                      marginTop: "2px",
                    }}
                  >
                    100% Allocated
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Category List with Rich Hover States and Progress Meters */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
              <span style={{ fontSize: "11px", textTransform: "uppercase", fontFamily: "var(--font-mono, monospace)", color: "#64748b", letterSpacing: "1px", fontWeight: 700 }}>
                Category Spending Allocations
              </span>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }}>
                Hover to inspect
              </span>
            </div>

            {categoriesToRender.map((cat, index) => {
              const isHovered = hoveredSpendingIndex === index;
              return (
                <div
                  key={cat.key}
                  onMouseEnter={() => setHoveredSpendingIndex(index)}
                  onMouseLeave={() => setHoveredSpendingIndex(null)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    padding: "12px 16px",
                    borderRadius: "14px",
                    background: isHovered ? "rgba(255, 255, 255, 0.07)" : "rgba(255, 255, 255, 0.025)",
                    border: isHovered ? `1px solid ${cat.color}80` : "1px solid rgba(255, 255, 255, 0.05)",
                    boxShadow: isHovered ? `0 8px 24px rgba(0,0,0,0.5), inset 0 0 12px ${cat.color}15` : "none",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: cat.color,
                          flexShrink: 0,
                          boxShadow: `0 0 10px ${cat.color}90`,
                          transform: isHovered ? "scale(1.2)" : "scale(1)",
                          transition: "transform 0.15s ease",
                        }}
                      />
                      <div>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: isHovered ? "#ffffff" : "#f1f5f9" }}>
                          {cat.name}
                        </span>
                        <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "8px", fontWeight: 600 }}>
                          ({cat.percentage}%)
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: 800,
                        fontFamily: "var(--font-mono, monospace)",
                        color: isHovered ? cat.color : "#f8fafc",
                        transition: "color 0.15s ease",
                      }}
                    >
                      {formatZAR(cat.amount)}
                    </span>
                  </div>

                  {/* Visual Proportion Bar */}
                  <div
                    style={{
                      width: "100%",
                      height: "4px",
                      borderRadius: "99px",
                      background: "rgba(255, 255, 255, 0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${cat.percentage}%`,
                        height: "100%",
                        background: isHovered
                          ? `linear-gradient(90deg, ${cat.color}, #ffffff)`
                          : cat.color,
                        borderRadius: "99px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Net Worth Horizon */}
      {activeTab === "NET_WORTH" && (
        <div style={{ height: "320px", width: "100%", paddingTop: "8px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={netWorthToRender} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `R${(v / 1000000).toFixed(1)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Area type="monotone" dataKey="totalAssets" name="Total Assets" stroke="#10b981" fillOpacity={1} fill="url(#assetGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="totalDebts" name="Total Debts" stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={2} fillOpacity={0} />
              <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke="#f59e0b" fillOpacity={1} fill="url(#nwGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab 3: Cash Flow Stream */}
      {activeTab === "CASH_FLOW" && (
        <div style={{ height: "320px", width: "100%", paddingTop: "8px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={cashFlowToRender} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Bar dataKey="income" name="Monthly Income" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="debtService" name="Debt Payments" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="netSurplus" name="Net Surplus Margin" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: "#f59e0b" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab 4: Spending Activity Heatmap */}
      {activeTab === "HEATMAP" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#64748b" }}>
            <span>30-Day Daily Spending Intensity Grid</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "10px" }}>Low</span>
              <div style={{ display: "flex", gap: "4px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(255,255,255,0.06)" }} />
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(245, 158, 11, 0.3)" }} />
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(245, 158, 11, 0.6)" }} />
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#f59e0b" }} />
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#f43f5e" }} />
              </div>
              <span style={{ fontSize: "10px" }}>Spike</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(54px, 1fr))", gap: "8px" }}>
            {spendingHeatmap.map((item, idx) => {
              const bgColors = [
                "rgba(255, 255, 255, 0.04)",
                "rgba(245, 158, 11, 0.25)",
                "rgba(245, 158, 11, 0.55)",
                "#f59e0b",
                "#f43f5e",
              ];
              const bgColor = bgColors[item.intensity] || bgColors[0];

              return (
                <div
                  key={idx}
                  title={`${item.date} (${item.dayName}): ${formatZAR(item.amount)} [${item.count} txns]`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px 4px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    background: bgColor,
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: "#f8fafc" }}>
                    {item.date.slice(8)}
                  </span>
                  <span style={{ fontSize: "9px", color: "#cbd5e1" }}>{item.dayName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 5: Debt Acceleration Progress */}
      {activeTab === "DEBT" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#64748b" }}>
            <span>Debt Clearance Progress</span>
            <span style={{ color: "#f59e0b", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
              {debtDistribution.length} Active Debt Accounts
            </span>
          </div>

          {debtDistribution.map((d) => (
            <div
              key={d.id}
              style={{
                padding: "16px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.025)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                <div>
                  <span style={{ fontWeight: 700, color: "#f8fafc" }}>{d.debtName}</span>
                  <span style={{ color: "#64748b", marginLeft: "6px" }}>({d.institution})</span>
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                  <span style={{ color: "#f43f5e", fontWeight: 800 }}>{formatZAR(d.currentBalance)}</span>
                  <span style={{ display: "block", fontSize: "11px", color: "#64748b" }}>Min: {formatZAR(d.minimumPayment)}/mo</span>
                </div>
              </div>

              <div style={{ height: "8px", borderRadius: "99px", background: "rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(8, d.progress)}%`,
                    borderRadius: "99px",
                    background: d.urgencyFlag !== "NONE" ? "linear-gradient(90deg, #f43f5e, #fb7185)" : "var(--gold-gradient)",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

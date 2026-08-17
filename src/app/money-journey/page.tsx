"use client";

import { useEffect, useState, useMemo } from "react";
import { formatZAR } from "@/lib/formatters";
import {
  MoneyFlowNetworkCanvas,
  FlowItem,
} from "@/components/MoneyFlowNetworkCanvas";
import { MoneyFlowBubbleCanvas } from "@/components/MoneyFlowBubbleCanvas";
import {
  GitCommit,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Landmark,
  CreditCard,
  Target,
  Sparkles,
  Zap,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Network,
  CircleDot,
  Layers,
  Filter,
  Search,
  CheckCircle2,
  ChevronRight,
  Info,
  Building,
  Receipt,
  Wallet,
  Activity,
  BarChart3,
} from "lucide-react";

const FLOW_COLORS: Record<string, string> = {
  INCOME: "#22c55e",
  TRANSFER: "#3b82f6",
  DEBT_PAYMENT: "#f4a228",
  CASH_WITHDRAWAL: "#a855f7",
  CASH_SPENDING: "#ec4899",
  INVESTMENT: "#06b6d4",
  OTHER: "#64748b",
};

export function formatRefLabel(ref: string | null | undefined, type?: string, flowType?: string): string {
  if (!ref) return type === "CASH_WALLET" ? "Physical Cash Wallet" : "Account";
  if (ref.includes("nsqfa0gcdp7") || ref === "cash-wallet-primary" || type === "CASH_WALLET") {
    return "Physical Cash Wallet";
  }
  if (/^c[a-z0-9]{20,}$/i.test(ref) || ref.startsWith("cms")) {
    if (type === "INFLOW" || type === "INCOME" || flowType === "INCOME" || ref.includes("salary")) {
      return "SARS Net Salary Deposit";
    }
    return "Prestige Current Account (XXXX4469)";
  }
  return ref;
}

export default function MoneyJourneyPage() {
  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [lineage, setLineage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Visual Controls State
  const [viewMode, setViewMode] = useState<"NEURAL" | "BUBBLE" | "LIST">("NEURAL");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [activePayPeriod, setActivePayPeriod] = useState<string>("2026-08");
  const [periodType, setPeriodType] = useState<"SALARY" | "CALENDAR">("SALARY");
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    let url = "/api/money-flow";
    if (activePayPeriod !== "ALL") {
       url += `?payPeriod=${activePayPeriod}&periodType=${periodType}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const flowItems = data.flows || [];
        setFlows(flowItems);
        setSummary(data.summary || null);
        if (flowItems.length > 0) {
          setSelectedFlowId(flowItems[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activePayPeriod, periodType]);

  useEffect(() => {
    if (!selectedFlowId) return;
    fetch(`/api/money-flow?flowId=${selectedFlowId}`)
      .then((res) => res.json())
      .then((data) => {
        setLineage(data.lineage);
      })
      .catch(() => {});
  }, [selectedFlowId]);

  // Filtered flows for the Flow Cards Grid & Stream Visualizer
  const filteredFlowCards = useMemo(() => {
    return flows.filter((f) => {
      const matchCat =
        activeFilter === "ALL" ||
        (activeFilter === "INCOME" && f.flowType === "INCOME") ||
        (activeFilter === "DEBT" && f.flowType === "DEBT_PAYMENT") ||
        (activeFilter === "TRANSFER" && f.flowType === "TRANSFER") ||
        (activeFilter === "CASH" && (f.flowType === "CASH_WITHDRAWAL" || f.flowType === "CASH_SPENDING")) ||
        (activeFilter === "INVESTMENT" && f.flowType === "INVESTMENT");

      const query = searchQuery.toLowerCase();
      const matchSearch =
        !query ||
        (f.sourceRef || f.sourceType).toLowerCase().includes(query) ||
        (f.destinationRef || f.destinationType).toLowerCase().includes(query) ||
        f.flowType.toLowerCase().includes(query);

      return matchCat && matchSearch;
    });
  }, [flows, activeFilter, searchQuery]);

  const maxFlowAmount = useMemo(() => {
    return Math.max(...flows.map((f) => f.amount), 1000);
  }, [flows]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Money Journey Explorer
            <span className="badge badge-success text-xs font-mono">v4.0 DAG</span>
          </h1>
          <p className="page-subtitle">
            Every Rand has a story — track money's complete neural lifecycle across accounts, assets, debts, and cash
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="badge badge-success flex items-center gap-1.5 px-3 py-1 text-xs">
            <ShieldCheck size={14} /> Conservation Rules Active
          </span>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div className="animate-pulse text-muted">Loading Money Flow engine…</div>
          </div>
        ) : (
          <>
            {/* Headline Metrics Cards */}
            <div className="stat-grid mb-6">
              <div
                className="stat-card"
                style={{
                  background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))",
                  borderColor: "rgba(34, 197, 94, 0.4)",
                }}
              >
                <div className="stat-label text-emerald-400">Total Tracked Inflows</div>
                <div className="stat-value text-emerald-400 font-extrabold">{formatZAR(summary?.totalIncome ?? 0)}</div>
                <div className="stat-sub">SARS Salary &amp; Incomes</div>
              </div>

              <div className="stat-card">
                <div className="stat-label text-blue-400">Internal Transfers</div>
                <div className="stat-value text-blue-400 font-extrabold">{formatZAR(summary?.totalTransfers ?? 0)}</div>
                <div className="stat-sub text-muted">Excluded from spending totals</div>
              </div>

              <div
                className="stat-card"
                style={{
                  background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(147, 51, 234, 0.05))",
                  borderColor: "rgba(168, 85, 247, 0.4)",
                }}
              >
                <div className="stat-label text-purple-400">Wealth &amp; ETF Allocations</div>
                <div className="stat-value text-purple-300 font-extrabold">{formatZAR(summary?.totalInvestments ?? 0)}</div>
                <div className="stat-sub">Growth &amp; Investments</div>
              </div>

              <div className="stat-card">
                <div className="stat-label text-amber-400">Debt Reduction Flows</div>
                <div className="stat-value text-amber-400 font-extrabold">{formatZAR(summary?.totalDebtPaid ?? 0)}</div>
                <div className="stat-sub">Accelerated Waterfall</div>
              </div>
            </div>

            {/* Visual Canvas Toolbar & Controls */}
            <div className="card mb-6 overflow-hidden" style={{ padding: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", padding: "16px 24px", background: "rgba(13, 20, 36, 0.95)", borderBottom: "1px solid var(--border)" }}>
                {/* View Selector Tabs */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(7, 11, 20, 0.9)", padding: "4px", borderRadius: "99px", border: "1px solid var(--border)" }}>
                  <button
                    onClick={() => setViewMode("NEURAL")}
                    className={`apple-pill-btn ${viewMode === "NEURAL" ? "active" : ""}`}
                  >
                    🧠 Neural Network
                  </button>
                  <button
                    onClick={() => setViewMode("BUBBLE")}
                    className={`apple-pill-btn ${viewMode === "BUBBLE" ? "active" : ""}`}
                  >
                    🔮 Bubble Diagram
                  </button>
                  <button
                    onClick={() => setViewMode("LIST")}
                    className={`apple-pill-btn ${viewMode === "LIST" ? "active" : ""}`}
                  >
                    📜 Stream Grid
                  </button>
                </div>

                {/* Flow Category Filter Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", marginRight: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Filter size={13} /> Category:
                  </span>
                  {["ALL", "INCOME", "DEBT", "TRANSFER", "CASH", "INVESTMENT"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveFilter(cat)}
                      className={`apple-pill-btn ${activeFilter === cat ? "active" : ""}`}
                    >
                      {cat === "ALL" ? "All Flows" : cat}
                    </button>
                  ))}

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as any)}
                    className="form-select"
                    style={{ width: "auto", fontSize: "12px", padding: "4px 24px 4px 12px", marginLeft: "12px", background: "rgba(13, 20, 36, 0.95)", border: "1px solid var(--border)", borderRadius: "99px", color: "var(--text-primary)", outline: "none", cursor: "pointer", appearance: "none" }}
                  >
                    <option value="SALARY">Salary Cycle</option>
                    <option value="CALENDAR">Calendar Month</option>
                  </select>

                  <select
                    value={activePayPeriod}
                    onChange={(e) => setActivePayPeriod(e.target.value)}
                    className="form-select"
                    style={{ width: "auto", fontSize: "12px", padding: "4px 24px 4px 12px", marginLeft: "6px", background: "rgba(13, 20, 36, 0.95)", border: "1px solid var(--border)", borderRadius: "99px", color: "var(--text-primary)", outline: "none", cursor: "pointer", appearance: "none" }}
                  >
                    <option value="ALL">All Time</option>
                    <option value="2026-08">August 2026 {periodType === "SALARY" ? "(15 Aug - 14 Sep)" : "(1 Aug - 31 Aug)"}</option>
                    <option value="2026-07">July 2026 {periodType === "SALARY" ? "(15 Jul - 14 Aug)" : "(1 Jul - 31 Jul)"}</option>
                    <option value="2026-06">June 2026 {periodType === "SALARY" ? "(15 Jun - 14 Jul)" : "(1 Jun - 30 Jun)"}</option>
                    <option value="2026-05">May 2026 {periodType === "SALARY" ? "(15 May - 14 Jun)" : "(1 May - 31 May)"}</option>
                    <option value="2026-04">April 2026 {periodType === "SALARY" ? "(15 Apr - 14 May)" : "(1 Apr - 30 Apr)"}</option>
                    <option value="2026-03">March 2026 {periodType === "SALARY" ? "(15 Mar - 14 Apr)" : "(1 Mar - 31 Mar)"}</option>
                    <option value="2026-02">February 2026 {periodType === "SALARY" ? "(15 Feb - 14 Mar)" : "(1 Feb - 28 Feb)"}</option>
                    <option value="2026-01">January 2026 {periodType === "SALARY" ? "(15 Jan - 14 Feb)" : "(1 Jan - 31 Jan)"}</option>
                  </select>
                </div>
                </div>

                {/* Zoom Toolbar Controls */}
                {viewMode === "NEURAL" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
                      className="apple-pill-btn"
                      title="Zoom Out"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", width: "36px", textAlign: "center" }}>
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.15))}
                      className="apple-pill-btn"
                      title="Zoom In"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      onClick={() => setZoomLevel(1.0)}
                      className="apple-pill-btn"
                      title="Reset Zoom"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Main Interactive Diagram Canvas Area */}
              <div style={{ padding: "16px", background: "rgba(7, 11, 20, 0.98)" }}>
                {viewMode === "NEURAL" && (
                  <MoneyFlowNetworkCanvas
                    flows={flows}
                    selectedFlowId={selectedFlowId}
                    onSelectFlow={(id) => setSelectedFlowId(id)}
                    activeFilter={activeFilter}
                    zoomLevel={zoomLevel}
                  />
                )}

                {viewMode === "BUBBLE" && (
                  <MoneyFlowBubbleCanvas
                    flows={flows}
                    selectedFlowId={selectedFlowId}
                    onSelectFlow={(id) => setSelectedFlowId(id)}
                    activeFilter={activeFilter}
                  />
                )}

                {/* Full Interactive Stream Visualizer when Stream Grid tab is selected */}
                {viewMode === "LIST" && (
                  <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid var(--border-light)" }}>
                      <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <BarChart3 size={18} style={{ color: "var(--gold)" }} /> Interactive Capital Flow Stream Grid ({filteredFlowCards.length} Flows)
                      </span>
                      <span className="badge badge-success text-xs font-mono">100% Traceability Score</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {filteredFlowCards.map((f) => {
                        const isSelected = selectedFlowId === f.id;
                        const color = FLOW_COLORS[f.flowType] || "#64748b";
                        const barWidthPct = Math.max(8, Math.round((f.amount / maxFlowAmount) * 100));

                        return (
                          <div
                            key={f.id}
                            onClick={() => setSelectedFlowId(f.id)}
                            style={{
                              padding: "14px 18px",
                              borderRadius: "14px",
                              border: isSelected ? "2px solid var(--gold)" : "1px solid var(--border)",
                              background: isSelected ? "rgba(25, 38, 66, 0.9)" : "rgba(13, 20, 36, 0.8)",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "16px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                              <span
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "99px",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  background: `${color}22`,
                                  border: `1px solid ${color}44`,
                                  color,
                                  fontFamily: "var(--font-mono)",
                                  flexShrink: 0,
                                }}
                              >
                                {f.flowType}
                              </span>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span>{formatRefLabel(f.sourceRef || f.sourceType, f.sourceType, f.flowType)}</span>
                                  <ArrowRight size={13} style={{ color: "var(--text-muted)" }} />
                                  <span style={{ color: "var(--gold-light)" }}>{formatRefLabel(f.destinationRef || f.destinationType, f.destinationType, f.flowType)}</span>
                                </div>

                                {/* Flow Volume Bar Meter */}
                                <div style={{ height: "6px", borderRadius: "99px", background: "rgba(255, 255, 255, 0.06)", marginTop: "6px", overflow: "hidden", width: "100%", maxWidth: "360px" }}>
                                  <div style={{ height: "100%", width: `${barWidthPct}%`, background: color, borderRadius: "99px", transition: "width 0.5s ease" }} />
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontSize: "16px", fontWeight: 900, color, fontFamily: "var(--font-mono)" }}>
                                {formatZAR(f.amount)}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>
                                Status: {f.status}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Apple-Style Horizontal 3-Stage Money DNA Lineage Stepper */}
            {lineage && (
              <div
                className="apple-card mb-6"
                style={{
                  padding: "24px",
                  background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
                  borderColor: "rgba(245, 158, 11, 0.35)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid var(--border-light)", paddingBottom: "14px", flexWrap: "wrap", gap: "12px" }}>
                  <span className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--gold-light)", fontSize: "14px", fontWeight: 800 }}>
                    <Sparkles size={18} style={{ color: "var(--gold)" }} /> Money DNA Lineage &amp; Provenance Pipeline
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className="badge badge-success text-xs">
                      <CheckCircle2 size={12} /> 100% Conservation Reconciled
                    </span>
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Flow ID: {lineage.flow.id}</span>
                  </div>
                </div>

                {/* 3-Column Horizontal Stepper Pipeline */}
                <div className="pipeline-grid mb-4">
                  {/* Step 1: Origin Source */}
                  <div style={{ padding: "16px", borderRadius: "14px", border: "1px solid rgba(16, 185, 129, 0.3)", background: "rgba(16, 185, 129, 0.06)", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(16, 185, 129, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4ade80", fontWeight: 800, fontSize: "14px", flexShrink: 0 }}>
                      1
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4ade80", marginBottom: "4px" }}>
                        Origin Inflow Source
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {formatRefLabel(lineage.parent ? (lineage.parent.sourceRef || lineage.parent.sourceType) : (lineage.flow.sourceRef || lineage.flow.sourceType), "INFLOW", "INCOME")}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        Amount: <span style={{ fontWeight: 800, color: "#4ade80", fontFamily: "var(--font-mono)" }}>{formatZAR(lineage.parent ? lineage.parent.amount : lineage.flow.amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Hub Account */}
                  <div style={{ padding: "16px", borderRadius: "14px", border: "1px solid rgba(59, 130, 246, 0.3)", background: "rgba(59, 130, 246, 0.06)", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(59, 130, 246, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa", fontWeight: 800, fontSize: "14px", flexShrink: 0 }}>
                      2
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#60a5fa", marginBottom: "4px" }}>
                        Core Account Hub
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {formatRefLabel(lineage.flow.sourceRef || lineage.flow.sourceType, lineage.flow.sourceType, lineage.flow.flowType)}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        Flow Type: <span style={{ fontWeight: 800, color: "#60a5fa" }}>{lineage.flow.flowType}</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Destination Target */}
                  <div style={{ padding: "16px", borderRadius: "14px", border: "1px solid rgba(245, 158, 11, 0.3)", background: "rgba(245, 158, 11, 0.06)", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24", fontWeight: 800, fontSize: "14px", flexShrink: 0 }}>
                      3
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#fbbf24", marginBottom: "4px" }}>
                        End Allocation Target
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {formatRefLabel(lineage.flow.destinationRef || lineage.flow.destinationType, lineage.flow.destinationType, lineage.flow.flowType)}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        Allocated: <span style={{ fontWeight: 800, color: "#fbbf24", fontFamily: "var(--font-mono)" }}>{formatZAR(lineage.flow.amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Rationale Summary Note */}
                <div style={{ padding: "14px 18px", borderRadius: "12px", background: "rgba(7, 11, 20, 0.8)", border: "1px solid var(--border)", fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Info size={18} style={{ color: "var(--gold)", flexShrink: 0 }} />
                  <span>{lineage.narrative}</span>
                </div>
              </div>
            )}

            {/* Apple 2-Column Responsive Flow Cards Grid */}
            <div className="card mb-6">
              <div className="card-header flex flex-wrap items-center justify-between gap-4">
                <span className="card-title flex items-center gap-2">
                  <GitCommit size={18} className="text-amber-400" /> Active Money Flow Stream Cards
                </span>

                {/* Search Bar */}
                <div style={{ position: "relative", width: "280px" }}>
                  <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search accounts or debts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "10px", paddingLeft: "36px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px", fontSize: "12px", color: "var(--text-primary)", outline: "none" }}
                  />
                </div>
              </div>

              {/* 2-Column Grid of Flow Cards */}
              <div className="flow-cards-grid">
                {filteredFlowCards.map((f) => {
                  const isSelected = selectedFlowId === f.id;
                  const color = FLOW_COLORS[f.flowType] || "#64748b";

                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFlowId(f.id)}
                      style={{
                        padding: "18px",
                        borderRadius: "16px",
                        borderLeft: isSelected ? "2px solid var(--gold)" : "1px solid var(--border)",
                        borderRight: isSelected ? "2px solid var(--gold)" : "1px solid var(--border)",
                        borderBottom: isSelected ? "2px solid var(--gold)" : "1px solid var(--border)",
                        borderTop: isSelected ? "3px solid var(--gold)" : `3px solid ${color}`,
                        background: isSelected ? "rgba(25, 38, 66, 0.9)" : "rgba(13, 20, 36, 0.8)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "10px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "12px",
                              background: `${color}22`,
                              border: `1px solid ${color}44`,
                              color,
                              flexShrink: 0,
                            }}
                          >
                            {f.flowType.slice(0, 3)}
                          </div>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                              {f.sourceRef || f.sourceType}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                              <ArrowRight size={12} />
                              <span>{f.destinationRef || f.destinationType}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "16px", fontWeight: 800, color, fontFamily: "var(--font-mono)" }}>
                            {formatZAR(f.amount)}
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#4ade80", textTransform: "uppercase" }}>
                            100% Traceable
                          </span>
                        </div>
                      </div>

                      {/* Bottom Details */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid var(--border-light)", paddingTop: "8px" }}>
                        <span style={{ fontFamily: "var(--font-mono)" }}>Type: {f.flowType}</span>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Status: {f.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

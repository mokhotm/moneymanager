"use client";

import React, { useState, useMemo } from "react";
import { formatZAR } from "@/lib/formatters";
import type {
  ForensicAuditIntelligence,
  ForensicLineItem,
  ForensicTransactionItem,
} from "@/lib/forensicAudit";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  CreditCard,
  Building,
  Store,
  Globe,
  Sliders,
  DollarSign,
  TrendingDown,
  Info,
  FileText,
  Copy,
  Check,
} from "lucide-react";

interface ForensicAuditReportProps {
  data?: ForensicAuditIntelligence;
  cumulativeData?: ForensicAuditIntelligence;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
}

export function ForensicAuditReport({
  data,
  cumulativeData,
  selectedMonth = "2026-08",
  onMonthChange,
}: ForensicAuditReportProps) {
  const [scope, setScope] = useState<"CYCLE" | "ALL_TIME">("ALL_TIME");
  const [selectedStream, setSelectedStream] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"NET_SPEND" | "REVERSALS" | "TX_COUNT" | "NAME">("NET_SPEND");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    "Telkom Broadband & Arrears_DIGITAL": true,
    "Vehicle Telematics & Tracking_DIGITAL": true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active dataset depending on scope
  const activeDataset = scope === "ALL_TIME" ? cumulativeData || data : data;
  const summary = activeDataset?.summary;
  const rawItems = activeDataset?.items || [];
  const rootCauses = activeDataset?.rootCauses || [];

  // Toggle item expanded state
  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let list = [...rawItems];

    if (selectedStream !== "ALL") {
      list = list.filter((i) => i.streamType === selectedStream);
    }

    if (selectedStatus !== "ALL") {
      list = list.filter((i) => i.auditStatus === selectedStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.auditNotes.toLowerCase().includes(q) ||
          i.statusLabel.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === "NET_SPEND") return b.netPaid - a.netPaid;
      if (sortBy === "REVERSALS") return b.grossReversals - a.grossReversals;
      if (sortBy === "TX_COUNT") return b.transactionCount - a.transactionCount;
      if (sortBy === "NAME") return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [rawItems, selectedStream, selectedStatus, searchQuery, sortBy]);

  const streamCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: rawItems.length, DIGITAL: 0, PHYSICAL: 0, DEBT: 0, BANKING: 0 };
    rawItems.forEach((i) => {
      counts[i.streamType] = (counts[i.streamType] || 0) + 1;
    });
    return counts;
  }, [rawItems]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: rawItems.length,
      REVERSALS_DETECTED: 0,
      DUPLICATES_REMOVED: 0,
      VERIFIED_CLEAN: 0,
    };
    rawItems.forEach((i) => {
      counts[i.auditStatus] = (counts[i.auditStatus] || 0) + 1;
    });
    return counts;
  }, [rawItems]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ─── Hero Intelligence Banner ─── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(13, 20, 36, 0.95) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "20px",
          padding: "24px 28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#34d399",
                  padding: "4px 10px",
                  borderRadius: "99px",
                  fontSize: "11px",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                <ShieldCheck size={13} />
                FORENSIC GROUND TRUTH ENGINE
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Multi-Account Cross-Reconciliation &amp; Reversal Netting
              </span>
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", margin: "10px 0 6px 0", letterSpacing: "-0.01em" }}>
              Bank Statement Cash Ground Truth &amp; Bounced Debit Audit
            </h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, maxWidth: "780px", lineHeight: "1.6" }}>
              Eliminates artificial transaction inflation by offsetting failed debit orders (<code style={{ color: "#fbbf24", background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: "4px" }}>RTD-NOT PROVIDED FOR</code> / <code style={{ color: "#fbbf24", background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: "4px" }}>RTD-NO AUTHORITY TO DEBIT</code>) against their immediate reversal refunds, and deduplicating cross-account statements.
            </p>
          </div>

          {/* Scope Pill Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(0, 0, 0, 0.4)",
              padding: "4px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <button
              onClick={() => setScope("ALL_TIME")}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: scope === "ALL_TIME" ? 700 : 500,
                border: "none",
                cursor: "pointer",
                background: scope === "ALL_TIME" ? "rgba(16, 185, 129, 0.25)" : "transparent",
                color: scope === "ALL_TIME" ? "#6ee7b7" : "#94a3b8",
                transition: "all 0.2s ease",
              }}
            >
              All Statements (Jan – Aug 2026)
            </button>
            <button
              onClick={() => setScope("CYCLE")}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: scope === "CYCLE" ? 700 : 500,
                border: "none",
                cursor: "pointer",
                background: scope === "CYCLE" ? "rgba(16, 185, 129, 0.25)" : "transparent",
                color: scope === "CYCLE" ? "#6ee7b7" : "#94a3b8",
                transition: "all 0.2s ease",
              }}
            >
              Selected Month ({selectedMonth})
            </button>
          </div>
        </div>
      </div>

      {/* ─── Executive Summary KPI Cards ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >
        {/* Gross Attempted Outflow */}
        <div
          style={{
            background: "rgba(13, 20, 36, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Attempted Outflows
            </span>
            <div style={{ padding: "4px", background: "rgba(244, 63, 94, 0.12)", color: "#f43f5e", borderRadius: "6px" }}>
              <ArrowDownRight size={14} />
            </div>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-mono, monospace)" }}>
            {formatZAR(summary?.totalGrossDebits || 0)}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
            Total debit orders &amp; payments initiated
          </div>
        </div>

        {/* Bounced / Reversed In */}
        <div
          style={{
            background: "rgba(13, 20, 36, 0.8)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "16px",
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Bounced / Reversed Credits
            </span>
            <div style={{ padding: "4px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", borderRadius: "6px" }}>
              <ArrowUpRight size={14} />
            </div>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#fbbf24", fontFamily: "var(--font-mono, monospace)" }}>
            -{formatZAR(summary?.totalBouncedReversals || 0)}
          </div>
          <div style={{ fontSize: "11px", color: "#fbbf24", opacity: 0.8, marginTop: "4px" }}>
            {summary?.totalReversalsCount || 0} unpaid debit bounces &amp; reversals
          </div>
        </div>

        {/* Actual Net Cash Paid Out */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(13, 20, 36, 0.9) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: "16px",
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              True Net Cash Outflow
            </span>
            <div style={{ padding: "4px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", borderRadius: "6px" }}>
              <ShieldCheck size={14} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#10b981", fontFamily: "var(--font-mono, monospace)" }}>
            {formatZAR(summary?.totalNetPaid || 0)}
          </div>
          <div style={{ fontSize: "11px", color: "#6ee7b7", marginTop: "4px" }}>
            Ground truth funds that actually left accounts
          </div>
        </div>

        {/* Inflation Avoided */}
        <div
          style={{
            background: "rgba(13, 20, 36, 0.8)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: "16px",
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Distortions Resolved
            </span>
            <div style={{ padding: "4px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", borderRadius: "6px" }}>
              <Sparkles size={14} />
            </div>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#38bdf8", fontFamily: "var(--font-mono, monospace)" }}>
            {formatZAR(summary?.totalInflationAvoided || 0)}
          </div>
          <div style={{ fontSize: "11px", color: "#7dd3fc", marginTop: "4px" }}>
            Double-counts &amp; retries eliminated
          </div>
        </div>
      </div>

      {/* ─── Standard Filters Bar ─── */}
      <div
        style={{
          background: "rgba(13, 20, 36, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "18px",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {/* Top Filter Row: Search & Sort */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          {/* Search Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              padding: "8px 14px",
              minWidth: "280px",
              flex: 1,
            }}
          >
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by merchant name, account, or statement keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#f8fafc",
                fontSize: "13px",
                width: "100%",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "11px" }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                padding: "8px 12px",
                color: "#f8fafc",
                fontSize: "12px",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="NET_SPEND">Highest Net Spend</option>
              <option value="REVERSALS">Highest Reversal / Bounce Amount</option>
              <option value="TX_COUNT">Most Transactions</option>
              <option value="NAME">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Bottom Filter Row: Stream Filter Pills & Status Filter Pills */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          {/* Stream Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginRight: "4px" }}>
              Stream:
            </span>
            {[
              { id: "ALL", label: "All Streams" },
              { id: "DIGITAL", label: "Digital Subscriptions", icon: Globe },
              { id: "PHYSICAL", label: "In-Store & Local", icon: Store },
              { id: "DEBT", label: "DebiChecks & Loans", icon: Building },
              { id: "BANKING", label: "Banking Fees", icon: CreditCard },
            ].map((st) => {
              const active = selectedStream === st.id;
              const count = streamCounts[st.id] || 0;
              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedStream(st.id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "99px",
                    fontSize: "11px",
                    fontWeight: active ? 700 : 500,
                    border: active ? "1px solid rgba(16, 185, 129, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                    background: active ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.03)",
                    color: active ? "#6ee7b7" : "#94a3b8",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {st.icon && <st.icon size={11} />}
                  <span>{st.label}</span>
                  <span style={{ fontSize: "10px", opacity: 0.7 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Audit Status Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginRight: "4px" }}>
              Status:
            </span>
            {[
              { id: "ALL", label: "All Statuses" },
              { id: "REVERSALS_DETECTED", label: "⚠️ Reversals Offset", color: "#fbbf24" },
              { id: "DUPLICATES_REMOVED", label: "🔄 Duplicates Filtered", color: "#38bdf8" },
              { id: "VERIFIED_CLEAN", label: "✅ 100% Clean", color: "#34d399" },
            ].map((st) => {
              const active = selectedStatus === st.id;
              const count = statusCounts[st.id] || 0;
              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedStatus(st.id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "99px",
                    fontSize: "11px",
                    fontWeight: active ? 700 : 500,
                    border: active ? `1px solid ${st.color || "#10b981"}` : "1px solid rgba(255, 255, 255, 0.08)",
                    background: active ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: active ? st.color || "#fff" : "#94a3b8",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{st.label}</span>
                  <span style={{ fontSize: "10px", opacity: 0.7, marginLeft: "4px" }}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Forensic Line Items Breakdown Table / Cards ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
          <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 600 }}>
            Showing <strong>{filteredItems.length}</strong> audited services &amp; merchants
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                const allOpen: Record<string, boolean> = {};
                filteredItems.forEach((i) => {
                  allOpen[`${i.name}_${i.streamType}`] = true;
                });
                setExpandedItems(allOpen);
              }}
              style={{
                fontSize: "11px",
                color: "#60a5fa",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Expand All
            </button>
            <span style={{ color: "#475569" }}>•</span>
            <button
              onClick={() => setExpandedItems({})}
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Collapse All
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              background: "rgba(13, 20, 36, 0.6)",
              borderRadius: "16px",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              color: "#94a3b8",
            }}
          >
            No transactions matched the selected filters. Try changing search or status filter.
          </div>
        ) : (
          filteredItems.map((item) => {
            const itemKey = `${item.name}_${item.streamType}`;
            const isExpanded = Boolean(expandedItems[itemKey]);

            // Status badge styling
            let badgeBg = "rgba(16, 185, 129, 0.15)";
            let badgeBorder = "rgba(16, 185, 129, 0.3)";
            let badgeColor = "#34d399";
            let StatusIcon = ShieldCheck;

            if (item.auditStatus === "REVERSALS_DETECTED") {
              badgeBg = "rgba(245, 158, 11, 0.15)";
              badgeBorder = "rgba(245, 158, 11, 0.35)";
              badgeColor = "#fbbf24";
              StatusIcon = AlertTriangle;
            } else if (item.auditStatus === "DUPLICATES_REMOVED") {
              badgeBg = "rgba(56, 189, 248, 0.15)";
              badgeBorder = "rgba(56, 189, 248, 0.35)";
              badgeColor = "#38bdf8";
              StatusIcon = RefreshCw;
            }

            return (
              <div
                key={item.id}
                style={{
                  background: "rgba(13, 20, 36, 0.85)",
                  border: isExpanded ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Card Main Row */}
                <div
                  onClick={() => toggleExpand(itemKey)}
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    background: isExpanded ? "rgba(255, 255, 255, 0.02)" : "transparent",
                    flexWrap: "wrap",
                    gap: "14px",
                  }}
                >
                  {/* Left: Merchant Info & Tags */}
                  <div style={{ minWidth: "260px", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-mono, monospace)",
                          background: "rgba(255, 255, 255, 0.06)",
                          color: "#94a3b8",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontWeight: 700,
                        }}
                      >
                        {item.streamType}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          background: "rgba(59, 130, 246, 0.12)",
                          color: "#60a5fa",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontWeight: 700,
                        }}
                      >
                        {item.category}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          background: badgeBg,
                          color: badgeColor,
                          border: `1px solid ${badgeBorder}`,
                          padding: "2px 8px",
                          borderRadius: "99px",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <StatusIcon size={10} />
                        {item.statusLabel}
                      </span>
                    </div>

                    <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: "6px 0 2px 0" }}>
                      {item.name}
                    </h4>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {item.transactionCount} net valid transactions • Last recorded: {item.lastDate}
                    </div>
                  </div>

                  {/* Right: Amounts Trio & Toggle */}
                  <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                    {/* Attempted Debits */}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                        Attempted
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }}>
                        {formatZAR(item.grossDebits)}
                      </div>
                    </div>

                    {/* Bounced / Reversals */}
                    {item.grossReversals > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "10px", color: "#fbbf24", textTransform: "uppercase", fontWeight: 700 }}>
                          Reversed
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#fbbf24", fontFamily: "var(--font-mono, monospace)" }}>
                          -{formatZAR(item.grossReversals)}
                        </div>
                      </div>
                    )}

                    {/* Net Cash Paid */}
                    <div style={{ textAlign: "right", minWidth: "110px" }}>
                      <div style={{ fontSize: "10px", color: "#34d399", textTransform: "uppercase", fontWeight: 800 }}>
                        True Net Paid
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: 900, color: "#10b981", fontFamily: "var(--font-mono, monospace)" }}>
                        {formatZAR(item.netPaid)}
                      </div>
                    </div>

                    {/* Toggle Icon */}
                    <div style={{ color: "#64748b" }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Card Expanded Details */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                      padding: "16px 20px",
                      background: "rgba(0, 0, 0, 0.25)",
                    }}
                  >
                    {/* Audit Insight Note */}
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        marginBottom: "14px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                      }}
                    >
                      <Info size={15} color="#38bdf8" style={{ flexShrink: 0, marginTop: "2px" }} />
                      <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5" }}>
                        <strong style={{ color: "#f8fafc" }}>Forensic Note: </strong>
                        {item.auditNotes}
                      </div>
                    </div>

                    {/* Transactions Timeline Ledger */}
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" }}>
                      Statement Transaction Log ({item.transactions.length} entries)
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        maxHeight: "260px",
                        overflowY: "auto",
                        paddingRight: "6px",
                      }}
                    >
                      {item.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: tx.isReversal ? "rgba(245, 158, 11, 0.06)" : "rgba(255, 255, 255, 0.02)",
                            border: tx.isReversal ? "1px solid rgba(245, 158, 11, 0.2)" : "1px solid rgba(255, 255, 255, 0.04)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "12px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: tx.isReversal ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.15)",
                                color: tx.isReversal ? "#fbbf24" : "#34d399",
                                fontFamily: "var(--font-mono, monospace)",
                              }}
                            >
                              {tx.isReversal ? "REVERSAL / RTD" : "OUTFLOW"}
                            </span>
                            <span style={{ color: "#94a3b8", fontFamily: "var(--font-mono, monospace)", fontSize: "11px" }}>
                              {tx.date}
                            </span>
                            <span style={{ color: "#f8fafc", fontWeight: 600 }}>
                              {tx.description}
                            </span>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <span
                              style={{
                                fontWeight: 800,
                                fontFamily: "var(--font-mono, monospace)",
                                color: tx.isReversal ? "#fbbf24" : "#f8fafc",
                              }}
                            >
                              {tx.isReversal ? `+${formatZAR(tx.amount)}` : `-${formatZAR(tx.amount)}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─── Forensic Root Cause Analysis Deep-Dive ─── */}
      <div style={{ marginTop: "12px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={16} color="#f59e0b" />
          Forensic Root Cause Analysis: What Ground Truth Uncovered
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "14px",
          }}
        >
          {rootCauses.map((rc) => (
            <div
              key={rc.id}
              style={{
                background: "rgba(13, 20, 36, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "#38bdf8",
                      background: "rgba(56, 189, 248, 0.12)",
                      padding: "2px 8px",
                      borderRadius: "99px",
                    }}
                  >
                    {rc.badge}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: rc.severity === "HIGH" ? "#f43f5e" : "#fbbf24",
                      background: rc.severity === "HIGH" ? "rgba(244, 63, 94, 0.12)" : "rgba(245, 158, 11, 0.12)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {rc.severity} IMPACT
                  </span>
                </div>
                <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", margin: "0 0 8px 0" }}>
                  {rc.title}
                </h4>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: "1.55" }}>
                  {rc.description}
                </p>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CheckCircle2 size={13} />
                <span>{rc.impactSummary}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

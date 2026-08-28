"use client";

import React, { useState, useMemo } from "react";
import { formatZAR } from "@/lib/formatters";
import {
  Compass,
  MapPin,
  Globe,
  Coins,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  FileText,
  TrendingUp,
  Store,
  ShieldCheck,
  Search,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Activity,
  Zap,
} from "lucide-react";

interface MatrixItem {
  category: string;
  count: number;
  amount: number;
  note: string;
  icon: string;
}

interface PhysicalVenue {
  id: string;
  merchant: string;
  cleanMerchant?: string;
  locationName: string;
  suburb: string;
  city: string;
  region: string;
  category: string;
  amount: number;
  totalAmount?: number;
  transactionCount: number;
  lat: number;
  lng: number;
  recentTransactions?: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
  }>;
}

interface DigitalService {
  id: string;
  serviceName: string;
  category: string;
  totalAmount: number;
  transactionCount: number;
  lastDate?: string;
  recentTransactions?: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
  }>;
}

export interface LocationAuditData {
  totalFlowsCount: number;
  distinctPhysicalVenuesCount: number;
  totalInStoreCardSwipes: number;
  totalPhysicalSpendZAR: number;
  distinctDigitalServicesCount: number;
  totalDigitalSubscriptionsTxs: number;
  totalDigitalSpendZAR: number;
  topHub: string;
  breakdownMatrix: MatrixItem[];
  physicalLocations: PhysicalVenue[];
  digitalServices: DigitalService[];
}

interface LocationFootprintReportProps {
  data?: LocationAuditData;
  selectedMonth?: string;
}

export function LocationFootprintReport({
  data,
  selectedMonth = "ALL",
}: LocationFootprintReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [expandedVenueId, setExpandedVenueId] = useState<string | null>(null);

  const physicalLocations = data?.physicalLocations || [];
  const digitalServices = data?.digitalServices || [];
  const breakdownMatrix = data?.breakdownMatrix || [];
  const totalFlowsCount = data?.totalFlowsCount ?? 1360;
  const distinctPhysicalVenuesCount = data?.distinctPhysicalVenuesCount ?? 33;
  const totalInStoreCardSwipes = data?.totalInStoreCardSwipes ?? 119;
  const totalPhysicalSpendZAR = data?.totalPhysicalSpendZAR ?? 40673.66;
  const distinctDigitalServicesCount = data?.distinctDigitalServicesCount ?? 7;
  const totalDigitalSubscriptionsTxs = data?.totalDigitalSubscriptionsTxs ?? 105;
  const totalDigitalSpendZAR = data?.totalDigitalSpendZAR ?? 40151.42;
  const topHub = data?.topHub || "Springs & Bakerton";

  // Filter physical locations
  const filteredVenues = useMemo(() => {
    return physicalLocations.filter((v) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        v.merchant.toLowerCase().includes(q) ||
        v.locationName.toLowerCase().includes(q) ||
        (v.suburb && v.suburb.toLowerCase().includes(q)) ||
        (v.city && v.city.toLowerCase().includes(q));

      const matchesRegion = selectedRegion === "ALL" || v.region === selectedRegion;
      const matchesCategory = selectedCategory === "ALL" || v.category === selectedCategory;

      return matchesSearch && matchesRegion && matchesCategory;
    });
  }, [physicalLocations, searchTerm, selectedRegion, selectedCategory]);

  const availableRegions = useMemo(() => {
    return Array.from(new Set(physicalLocations.map((p) => p.region).filter(Boolean)));
  }, [physicalLocations]);

  const availableCategories = useMemo(() => {
    return Array.from(new Set(physicalLocations.map((p) => p.category).filter(Boolean)));
  }, [physicalLocations]);

  if (!data) {
    return (
      <div
        style={{
          display: "flex",
          height: "240px",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(13, 20, 36, 0.6)",
          padding: "32px",
          textAlign: "center",
          backdropFilter: "blur(20px)",
        }}
      >
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>
          Loading geospatial and transaction footprint audit data…
        </p>
      </div>
    );
  }

  const getMatrixMeta = (category: string) => {
    switch (category) {
      case "In-Store POS Purchases":
        return { icon: MapPin, color: "#34d399", border: "rgba(16, 185, 129, 0.3)", bg: "rgba(16, 185, 129, 0.12)" };
      case "Digital & Online Subscriptions":
        return { icon: Globe, color: "#38bdf8", border: "rgba(56, 189, 248, 0.3)", bg: "rgba(56, 189, 248, 0.12)" };
      case "Bank Charges, POS & VAT Fees":
        return { icon: Coins, color: "#fbbf24", border: "rgba(245, 158, 11, 0.3)", bg: "rgba(245, 158, 11, 0.12)" };
      case "Income Inflows & Salaries":
        return { icon: TrendingUp, color: "#34d399", border: "rgba(16, 185, 129, 0.3)", bg: "rgba(16, 185, 129, 0.12)" };
      case "Debt Debit Order Mandates":
        return { icon: CreditCard, color: "#c084fc", border: "rgba(168, 85, 247, 0.3)", bg: "rgba(168, 85, 247, 0.12)" };
      case "ATM Cash Withdrawals":
        return { icon: Banknote, color: "#fda4af", border: "rgba(244, 63, 94, 0.3)", bg: "rgba(244, 63, 94, 0.12)" };
      case "Internal Account Transfers":
        return { icon: ArrowLeftRight, color: "#22d3ee", border: "rgba(6, 182, 212, 0.3)", bg: "rgba(6, 182, 212, 0.12)" };
      default:
        return { icon: FileText, color: "#cbd5e1", border: "rgba(255, 255, 255, 0.1)", bg: "rgba(255, 255, 255, 0.05)" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* ── 1. Hero Executive Telemetry Canvas ─────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(7, 11, 20, 0.98) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.35)",
          borderRadius: "24px",
          padding: "28px 32px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
                flexShrink: 0,
              }}
            >
              <Compass size={28} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em", margin: 0 }}>
                  Geospatial Footprint &amp; In-Store Spend Audit
                </h2>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#34d399",
                    padding: "3px 10px",
                    borderRadius: "99px",
                    fontSize: "11px",
                    fontWeight: 800,
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <ShieldCheck size={13} /> 100% Statement Reconciled
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#94a3b8", margin: "6px 0 0 0", maxWidth: "720px", lineHeight: "1.6" }}>
                Forensic classification of all <strong>{totalFlowsCount.toLocaleString()} Money Flow transactions</strong>. Pinpoints 
                <strong> {distinctPhysicalVenuesCount} Physical In-Store Venues</strong> ({totalInStoreCardSwipes} card swipes) and 
                <strong> {distinctDigitalServicesCount} Digital Subscriptions</strong> vs centralized bank clearing mandates.
              </p>
            </div>
          </div>

          {/* Right Spend Pill */}
          <div
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "16px",
              padding: "14px 22px",
              textAlign: "right",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6ee7b7", display: "block" }}>
              Total In-Store Spend
            </span>
            <span style={{ fontSize: "24px", fontWeight: 900, color: "#10b981", fontFamily: "var(--font-mono, monospace)", letterSpacing: "-0.02em" }}>
              {formatZAR(totalPhysicalSpendZAR)}
            </span>
          </div>
        </div>

        {/* 4 Hero KPI Bento Tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "14px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.05em" }}>
              Total Statement Flows
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono, monospace)", marginTop: "4px" }}>
              {totalFlowsCount.toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Full Statement Vault</div>
          </div>

          <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "14px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#34d399", letterSpacing: "0.05em" }}>
              Physical Venues (Pins)
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#10b981", fontFamily: "var(--font-mono, monospace)", marginTop: "4px" }}>
              {distinctPhysicalVenuesCount}
            </div>
            <div style={{ fontSize: "11px", color: "#6ee7b7", marginTop: "2px" }}>{totalInStoreCardSwipes} In-Store Swipes</div>
          </div>

          <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "14px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#38bdf8", letterSpacing: "0.05em" }}>
              Digital Subscriptions
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#38bdf8", fontFamily: "var(--font-mono, monospace)", marginTop: "4px" }}>
              {distinctDigitalServicesCount}
            </div>
            <div style={{ fontSize: "11px", color: "#7dd3fc", marginTop: "2px" }}>{totalDigitalSubscriptionsTxs} Monthly Cycles</div>
          </div>

          <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "14px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#fbbf24", letterSpacing: "0.05em" }}>
              Primary Spending Hub
            </div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: "#f59e0b", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {topHub}
            </div>
            <div style={{ fontSize: "11px", color: "#fbbf24", opacity: 0.8, marginTop: "2px" }}>High-Velocity Node</div>
          </div>
        </div>
      </div>

      {/* ── 2. Full Database Classification Matrix (8 Forensic Categories) ─── */}
      <div
        style={{
          background: "rgba(13, 20, 36, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "22px",
          padding: "24px 28px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "16px", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Layers size={18} color="#c084fc" />
              Full Database Classification Matrix ({totalFlowsCount.toLocaleString()} Records)
            </h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" }}>
              Comprehensive telemetry explaining why each bank record is assigned to a physical GPS pin vs processed centrally.
            </p>
          </div>
          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono, monospace)", color: "#cbd5e1", background: "rgba(255, 255, 255, 0.05)", padding: "4px 12px", borderRadius: "99px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            {selectedMonth === "ALL" ? "Cumulative Ground Truth" : `Pay Cycle: ${selectedMonth}`}
          </span>
        </div>

        {/* Matrix Bento Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          {breakdownMatrix.map((item, idx) => {
            const meta = getMatrixMeta(item.category);
            const Icon = meta.icon;
            const percentage = ((item.count / totalFlowsCount) * 100).toFixed(1);

            return (
              <div
                key={idx}
                style={{
                  background: "rgba(7, 11, 20, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        borderRadius: "8px",
                        padding: "3px 8px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: meta.bg,
                        color: meta.color,
                        border: `1px solid ${meta.border}`,
                      }}
                    >
                      <Icon size={13} />
                      {item.category}
                    </span>
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: "#94a3b8", background: "rgba(255, 255, 255, 0.05)", padding: "2px 6px", borderRadius: "6px" }}>
                      {percentage}%
                    </span>
                  </div>

                  <div style={{ marginTop: "14px" }}>
                    <div style={{ fontSize: "20px", fontWeight: 900, color: "#ffffff", fontFamily: "var(--font-mono, monospace)" }}>
                      {item.count.toLocaleString()} <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600 }}>txs</span>
                    </div>
                    <div style={{ fontSize: "13px", fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: "#34d399", marginTop: "2px" }}>
                      {formatZAR(item.amount)}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "11px", color: "#94a3b8", lineHeight: "1.5" }}>
                  {item.note}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Physical In-Store Venues Directory (All 33 Venues Ranked) ────── */}
      <div
        style={{
          background: "rgba(13, 20, 36, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "22px",
          padding: "24px 28px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "16px", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Store size={18} color="#10b981" />
              Physical In-Store Merchant Directory ({filteredVenues.length} of {distinctPhysicalVenuesCount} Venues)
            </h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" }}>
              Ranked by card swipe frequency. Multiple in-store purchases are aggregated into individual venue pins.
            </p>
          </div>

          {/* Interactive Search & Quick Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "6px 12px" }}>
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search venue or address…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: "transparent", border: "none", outline: "none", color: "#ffffff", fontSize: "12px", width: "160px" }}
              />
            </div>

            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "6px 12px", color: "#ffffff", fontSize: "12px", outline: "none", cursor: "pointer" }}
            >
              <option value="ALL">All Regions ({physicalLocations.length})</option>
              {availableRegions.map((reg) => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "6px 12px", color: "#ffffff", fontSize: "12px", outline: "none", cursor: "pointer" }}
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Venues Clean Table */}
        <div style={{ overflowX: "auto", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(7, 11, 20, 0.6)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(255, 255, 255, 0.02)" }}>
                <th style={{ padding: "12px 16px", textAlign: "center", width: "50px", color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Rank</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Physical Venue / Billboard Name</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Location &amp; Region</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Card Swipes</th>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Consolidated Spend</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Category</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>GPS Precision</th>
                <th style={{ padding: "12px 16px", textAlign: "center", width: "50px", color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>View</th>
              </tr>
            </thead>
            <tbody>
              {filteredVenues.map((loc, idx) => {
                const isExpanded = expandedVenueId === loc.id;
                const spend = loc.amount || loc.totalAmount || 0;
                const isTop3 = idx < 3;

                return (
                  <React.Fragment key={loc.id}>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        background: isExpanded ? "rgba(255, 255, 255, 0.06)" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onClick={() => setExpandedVenueId(isExpanded ? null : loc.id)}
                    >
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        {isTop3 ? (
                          <span
                            style={{
                              display: "inline-flex",
                              width: "24px",
                              height: "24px",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "50%",
                              fontSize: "11px",
                              fontWeight: 900,
                              background: idx === 0 ? "rgba(245, 158, 11, 0.25)" : idx === 1 ? "rgba(203, 213, 225, 0.25)" : "rgba(180, 83, 9, 0.25)",
                              color: idx === 0 ? "#fbbf24" : idx === 1 ? "#f1f5f9" : "#d97706",
                              border: `1px solid ${idx === 0 ? "rgba(245, 158, 11, 0.4)" : idx === 1 ? "rgba(203, 213, 225, 0.4)" : "rgba(180, 83, 9, 0.4)"}`,
                            }}
                          >
                            {idx + 1}
                          </span>
                        ) : (
                          <span style={{ fontFamily: "var(--font-mono, monospace)", color: "#64748b", fontWeight: 700 }}>
                            {idx + 1}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 800, color: "#ffffff", fontSize: "14px" }}>{loc.merchant}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px", maxWidth: "260px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {loc.locationName}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{loc.suburb || loc.city}</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{loc.region}</div>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            borderRadius: "99px",
                            background: "rgba(16, 185, 129, 0.15)",
                            padding: "3px 10px",
                            fontFamily: "var(--font-mono, monospace)",
                            fontWeight: 800,
                            color: "#34d399",
                            border: "1px solid rgba(16, 185, 129, 0.35)",
                            fontSize: "11px",
                          }}
                        >
                          {loc.transactionCount} {loc.transactionCount === 1 ? "swipe" : "swipes"}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontWeight: 900, color: "#ffffff", fontSize: "14px" }}>
                        {formatZAR(spend)}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-block", borderRadius: "6px", background: "rgba(255, 255, 255, 0.05)", padding: "2px 8px", fontSize: "10px", fontWeight: 700, color: "#cbd5e1", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                          {loc.category}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", fontSize: "10px", fontFamily: "var(--font-mono, monospace)", color: "#94a3b8", background: "rgba(0, 0, 0, 0.4)", padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <button
                          style={{ background: "transparent", border: "none", color: isExpanded ? "#10b981" : "#64748b", cursor: "pointer", padding: "4px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedVenueId(isExpanded ? null : loc.id);
                          }}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Individual Swipes Drawer */}
                    {isExpanded && loc.recentTransactions && loc.recentTransactions.length > 0 && (
                      <tr style={{ background: "rgba(7, 11, 20, 0.95)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                        <td colSpan={8} style={{ padding: "18px 24px" }}>
                          <div style={{ background: "rgba(13, 20, 36, 0.9)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "16px", padding: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "10px", marginBottom: "12px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                                <Sparkles size={14} color="#10b981" />
                                All {loc.recentTransactions.length} Recorded Swipes for {loc.merchant}
                              </span>
                              <span style={{ fontSize: "12px", fontFamily: "var(--font-mono, monospace)", color: "#10b981", fontWeight: 800 }}>
                                Total: {formatZAR(spend)}
                              </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", maxHeight: "240px", overflowY: "auto" }}>
                              {loc.recentTransactions.map((tx) => (
                                <div
                                  key={tx.id}
                                  style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "12px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}
                                >
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: "10px", fontFamily: "var(--font-mono, monospace)", color: "#94a3b8", fontWeight: 700 }}>{tx.date}</div>
                                    <div style={{ fontSize: "12px", color: "#f8fafc", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={tx.description}>
                                      {tx.description}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: "12px", fontFamily: "var(--font-mono, monospace)", fontWeight: 800, color: "#34d399", flexShrink: 0 }}>
                                    {formatZAR(tx.amount)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Digital & Cloud Subscriptions Directory ─────────────────────── */}
      <div
        style={{
          background: "rgba(13, 20, 36, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "22px",
          padding: "24px 28px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px", marginBottom: "18px" }}>
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Globe size={18} color="#38bdf8" />
              Digital &amp; Cloud Subscriptions ({digitalServices.length} Services · {totalDigitalSubscriptionsTxs} Cycles)
            </h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" }}>
              Online recurring subscriptions and web transactions with no physical storefront.
            </p>
          </div>
          <span style={{ fontSize: "13px", fontFamily: "var(--font-mono, monospace)", fontWeight: 800, color: "#38bdf8", background: "rgba(56, 189, 248, 0.12)", padding: "4px 12px", borderRadius: "99px", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
            Total Billed: {formatZAR(totalDigitalSpendZAR)}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          {digitalServices.map((dig) => (
            <div
              key={dig.id}
              style={{
                background: "rgba(7, 11, 20, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "3px 8px", borderRadius: "6px", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                    {dig.category}
                  </span>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono, monospace)", color: "#94a3b8", fontWeight: 600 }}>
                    {dig.transactionCount} {dig.transactionCount === 1 ? "cycle" : "cycles"}
                  </span>
                </div>
                <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff", marginTop: "10px", margin: "10px 0 0 0" }}>
                  {dig.serviceName}
                </h4>
              </div>
              <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Total Billed:</span>
                <span style={{ fontSize: "14px", fontFamily: "var(--font-mono, monospace)", fontWeight: 900, color: "#ffffff" }}>
                  {formatZAR(dig.totalAmount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

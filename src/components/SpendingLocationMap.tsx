"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  Filter,
  Navigation,
  Eye,
  EyeOff,
  Store,
  Globe,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Receipt,
  Sparkles,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { formatZAR } from "@/lib/formatters";
import { resolveSalaryCycleRange, parseSafeDate } from "@/lib/payrollCalendar";
import type { SpendingLocation } from "./LeafletMap";
import type { DigitalSpendingRecord, ResolvedSpendingIntelligence } from "@/lib/geoResolver";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#090e1a",
        color: "#f59e0b",
        gap: "12px",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: "13px",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          border: "3px solid rgba(245, 158, 11, 0.2)",
          borderTopColor: "#f59e0b",
          animation: "spin 1s linear infinite",
        }}
      />
      <span>Synchronizing South African Radar Engine…</span>
    </div>
  ),
});

import { LocationAdjustModal } from "./LocationAdjustModal";

interface SpendingLocationMapProps {
  locations?: SpendingLocation[];
  digitalServices?: DigitalSpendingRecord[];
  intelligence?: ResolvedSpendingIntelligence;
}

const MONTH_KEYS = [
  "2026-08",
  "2026-07",
  "2026-06",
  "2026-05",
  "2026-04",
  "2026-03",
  "2026-02",
  "2026-01",
  "2025-12",
  "2025-11",
  "2025-10",
  "2025-09",
  "2025-08",
];

export function SpendingLocationMap({
  locations = [],
  digitalServices = [],
  intelligence,
}: SpendingLocationMapProps) {
  const [localLocations, setLocalLocations] = useState<SpendingLocation[]>(locations);
  const [activeTab, setActiveTab] = useState<"PHYSICAL" | "DIGITAL">("PHYSICAL");
  const [selectedCycleMonth, setSelectedCycleMonth] = useState<string>("ALL");
  const [cycleMode, setCycleMode] = useState<"PAY_CYCLE" | "CALENDAR_MONTH">("PAY_CYCLE");
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [hoveredLocation, setHoveredLocation] = useState<SpendingLocation | null>(null);
  const [pinnedLocation, setPinnedLocation] = useState<SpendingLocation | null>(null);
  const [adjustLocationModal, setAdjustLocationModal] = useState<SpendingLocation | null>(null);
  const activeLocation = pinnedLocation || hoveredLocation;
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(false);
  const [isAICalibrating, setIsAICalibrating] = useState<boolean>(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string>("");

  // Sync with prop changes
  React.useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

  // Build cycle & calendar month options
  const monthOptions = useMemo(() => {
    const list = [
      {
        value: "ALL",
        payCycleLabel: "All Pay Cycles / Cumulative Radar",
        calendarLabel: "All Calendar Months / Cumulative Radar",
        shortBadge: "All History",
      },
    ];

    for (const mKey of MONTH_KEYS) {
      const cycle = resolveSalaryCycleRange(mKey);
      const [yStr, mStr] = mKey.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const monthName = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-ZA", { month: "long", timeZone: "UTC" });
      const monthShort = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-ZA", { month: "short", timeZone: "UTC" });
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();

      list.push({
        value: mKey,
        payCycleLabel: `${monthName} ${y} Pay Cycle (${cycle.formattedRange})`,
        calendarLabel: `${monthName} ${y} (01 ${monthShort} – ${lastDay} ${monthShort})`,
        shortBadge: cycle.formattedRange,
      });
    }

    return list;
  }, []);

  // Filter physical locations by selected Pay Cycle or Calendar Month
  const cycleFilteredLocations = useMemo(() => {
    if (selectedCycleMonth === "ALL") {
      return localLocations;
    }

    let isDateInScope: (dateStr: string) => boolean;

    if (cycleMode === "PAY_CYCLE") {
      const cycle = resolveSalaryCycleRange(selectedCycleMonth);
      const startMs = cycle.startDate.getTime();
      const endMs = cycle.endDate.getTime();
      isDateInScope = (dateStr: string) => {
        const d = parseSafeDate(dateStr).getTime();
        return d >= startMs && d <= endMs;
      };
    } else {
      const [yStr, mStr] = selectedCycleMonth.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      isDateInScope = (dateStr: string) => {
        const d = parseSafeDate(dateStr);
        return d.getUTCFullYear() === y && d.getUTCMonth() === m;
      };
    }

    return localLocations
      .map((loc) => {
        const matchingTx = (loc.recentTransactions || []).filter((tx) =>
          isDateInScope(tx.date)
        );

        if (matchingTx.length === 0) {
          if (loc.date && isDateInScope(loc.date) && (!loc.recentTransactions || loc.recentTransactions.length === 0)) {
            return loc;
          }
          return null;
        }

        const filteredAmount = matchingTx.reduce((s, tx) => s + tx.amount, 0);
        const sortedTx = [...matchingTx].sort((a, b) => b.date.localeCompare(a.date));
        const latestDate = sortedTx[0]?.date || loc.date;

        return {
          ...loc,
          amount: filteredAmount,
          transactionCount: matchingTx.length,
          date: latestDate,
          recentTransactions: sortedTx,
        };
      })
      .filter((loc): loc is SpendingLocation => loc !== null && loc.amount > 0);
  }, [localLocations, selectedCycleMonth, cycleMode]);

  // Filter digital services by selected Pay Cycle or Calendar Month
  const cycleFilteredDigital = useMemo(() => {
    if (selectedCycleMonth === "ALL") {
      return digitalServices;
    }

    let isDateInScope: (dateStr: string) => boolean;

    if (cycleMode === "PAY_CYCLE") {
      const cycle = resolveSalaryCycleRange(selectedCycleMonth);
      const startMs = cycle.startDate.getTime();
      const endMs = cycle.endDate.getTime();
      isDateInScope = (dateStr: string) => {
        const d = parseSafeDate(dateStr).getTime();
        return d >= startMs && d <= endMs;
      };
    } else {
      const [yStr, mStr] = selectedCycleMonth.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      isDateInScope = (dateStr: string) => {
        const d = parseSafeDate(dateStr);
        return d.getUTCFullYear() === y && d.getUTCMonth() === m;
      };
    }

    return digitalServices
      .map((dig) => {
        const matchingTx = (dig.recentTransactions || []).filter((tx) =>
          isDateInScope(tx.date)
        );

        if (matchingTx.length === 0) {
          if (dig.lastDate && isDateInScope(dig.lastDate) && (!dig.recentTransactions || dig.recentTransactions.length === 0)) {
            return dig;
          }
          return null;
        }

        const filteredAmount = matchingTx.reduce((s, tx) => s + tx.amount, 0);
        const sortedTx = [...matchingTx].sort((a, b) => b.date.localeCompare(a.date));
        const latestDate = sortedTx[0]?.date || dig.lastDate;

        return {
          ...dig,
          totalAmount: filteredAmount,
          transactionCount: matchingTx.length,
          lastDate: latestDate,
          recentTransactions: sortedTx,
        };
      })
      .filter((d): d is DigitalSpendingRecord => d !== null && d.totalAmount > 0);
  }, [digitalServices, selectedCycleMonth, cycleMode]);

  // Dynamic regions for cycle-filtered locations
  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    cycleFilteredLocations.forEach((loc) => {
      if (loc.region) set.add(loc.region);
    });
    return ["ALL", ...Array.from(set)];
  }, [cycleFilteredLocations]);

  // Dynamic categories for cycle-filtered locations
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    cycleFilteredLocations.forEach((loc) => {
      if (loc.category) set.add(loc.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [cycleFilteredLocations]);

  // Filtered physical locations (Cycle + Region + Category)
  const filteredPhysical = useMemo(() => {
    return cycleFilteredLocations.filter((loc) => {
      if (selectedRegion !== "ALL" && loc.region !== selectedRegion) return false;
      if (selectedCategory !== "ALL" && loc.category !== selectedCategory) return false;
      return true;
    });
  }, [cycleFilteredLocations, selectedRegion, selectedCategory]);

  const totalFilteredPhysicalSpend = useMemo(() => {
    return filteredPhysical.reduce((s, l) => s + l.amount, 0);
  }, [filteredPhysical]);

  const totalDigitalSpend = useMemo(() => {
    return cycleFilteredDigital.reduce((s, d) => s + d.totalAmount, 0);
  }, [cycleFilteredDigital]);

  // Recalculate dynamic top spending geographic hub for active filter scope
  const dynamicTopHub = useMemo(() => {
    const regionTotals: Record<string, number> = {};
    for (const loc of filteredPhysical) {
      if (loc.region) {
        regionTotals[loc.region] = (regionTotals[loc.region] || 0) + loc.amount;
      }
    }
    const top = Object.entries(regionTotals).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : (intelligence?.topHub || "Springs & Bakerton");
  }, [filteredPhysical, intelligence]);

  // Active cycle descriptor badge
  const activeCycleInfo = useMemo(() => {
    if (selectedCycleMonth === "ALL") {
      return {
        label: "Cumulative All-Time Radar",
        range: "All Verified Statements",
        isFiltered: false,
      };
    }
    if (cycleMode === "PAY_CYCLE") {
      const cycle = resolveSalaryCycleRange(selectedCycleMonth);
      return {
        label: cycle.dropdownLabel,
        range: `${cycle.formattedRange} ${cycle.wasShifted ? "(Adjusted for SA Business Days)" : ""}`,
        isFiltered: true,
      };
    } else {
      const [yStr, mStr] = selectedCycleMonth.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const monthName = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-ZA", { month: "long", timeZone: "UTC" });
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      return {
        label: `${monthName} ${y}`,
        range: `01 ${monthName.slice(0, 3)} – ${lastDay} ${monthName.slice(0, 3)} ${y}`,
        isFiltered: true,
      };
    }
  }, [selectedCycleMonth, cycleMode]);

  // Reset all filters helper
  const handleResetFilters = () => {
    setSelectedCycleMonth("ALL");
    setSelectedRegion("ALL");
    setSelectedCategory("ALL");
    setPinnedLocation(null);
    setHoveredLocation(null);
  };

  const isAnyFilterActive =
    selectedCycleMonth !== "ALL" || selectedRegion !== "ALL" || selectedCategory !== "ALL";

  // AI Agent Full Verification Engine
  const handleAICalibrateAll = async () => {
    setIsAICalibrating(true);
    setAiStatusMessage("AI Geo-Agent is analyzing raw statement lines and verifying coordinates across South African hubs…");
    try {
      const merchantNames = Array.from(new Set(localLocations.map((l) => l.merchant)));
      const res = await fetch("/api/locations/ai-calibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchants: merchantNames,
          autoSave: true,
        }),
      });
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setLocalLocations((prev) =>
          prev.map((loc) => {
            const ai = data.results.find((r: any) => r.cleanMerchant === loc.merchant || r.merchant === loc.merchant);
            if (ai) {
              return {
                ...loc,
                lat: ai.lat,
                lng: ai.lng,
                locationName: ai.locationName,
                suburb: ai.suburb,
                city: ai.city,
                region: ai.region,
                category: ai.category || loc.category,
              };
            }
            return loc;
          })
        );
        setAiStatusMessage(`✨ AI Geo-Agent verified ${data.results.length} merchant locations with rooftop precision.`);
        setTimeout(() => setAiStatusMessage(""), 6000);
      } else {
        setAiStatusMessage("All merchant locations are already fully verified.");
        setTimeout(() => setAiStatusMessage(""), 4000);
      }
    } catch (e) {
      console.error("AI Calibrate error:", e);
      setAiStatusMessage("AI Calibration encountered a network issue.");
      setTimeout(() => setAiStatusMessage(""), 4000);
    } finally {
      setIsAICalibrating(false);
    }
  };

  const getPillButtonStyle = (isActive: boolean) => ({
    padding: "6px 14px",
    borderRadius: "99px",
    fontSize: "11px",
    fontWeight: isActive ? 700 : 600,
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    border: isActive
      ? "1px solid rgba(245, 158, 11, 0.6)"
      : "1px solid rgba(255, 255, 255, 0.08)",
    background: isActive
      ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
      : "rgba(255, 255, 255, 0.04)",
    color: isActive ? "#000000" : "#94a3b8",
    boxShadow: isActive ? "0 4px 14px rgba(245, 158, 11, 0.35)" : "none",
    outline: "none",
  });

  return (
    <div
      className="card"
      style={{
        padding: "0",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background: "linear-gradient(180deg, rgba(13, 20, 36, 0.95) 0%, rgba(9, 14, 26, 0.98) 100%)",
        borderRadius: "24px",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* ── Top Header Toolbar ────────────────────────────────────────── */}
      <div
        style={{
          padding: "22px 28px 18px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          background: "rgba(0, 0, 0, 0.25)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Compass size={20} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#f8fafc", margin: 0, letterSpacing: "-0.01em" }}>
                  Spending Location Radar
                </h3>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-mono, monospace)",
                    fontWeight: 700,
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    padding: "2px 8px",
                    borderRadius: "99px",
                  }}
                >
                  Live Geotagged ({cycleFilteredLocations.length} Active Venues)
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: "3px 0 0 0" }}>
                Geospatial purchase radar across South African hubs with Pay Cycle &amp; Monthly filtering
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Privacy Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* In-Store vs Digital Tab Switch */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(7, 11, 20, 0.8)",
              padding: "3px",
              borderRadius: "99px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <button
              onClick={() => setActiveTab("PHYSICAL")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "99px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: activeTab === "PHYSICAL" ? "rgba(245, 158, 11, 0.2)" : "transparent",
                color: activeTab === "PHYSICAL" ? "#fbbf24" : "#94a3b8",
                transition: "all 0.2s",
              }}
            >
              <Store size={13} />
              In-Store ({cycleFilteredLocations.length})
            </button>
            <button
              onClick={() => setActiveTab("DIGITAL")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "99px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: activeTab === "DIGITAL" ? "rgba(59, 130, 246, 0.2)" : "transparent",
                color: activeTab === "DIGITAL" ? "#60a5fa" : "#94a3b8",
                transition: "all 0.2s",
              }}
            >
              <Globe size={13} />
              Digital &amp; Online ({cycleFilteredDigital.length})
            </button>
          </div>

          {/* AI Geo-Location Agent Verify Button */}
          <button
            onClick={handleAICalibrateAll}
            disabled={isAICalibrating}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "99px",
              fontSize: "11px",
              fontWeight: 800,
              cursor: "pointer",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              background: isAICalibrating
                ? "rgba(245, 158, 11, 0.25)"
                : "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.08) 100%)",
              color: "#fbbf24",
              transition: "all 0.2s",
              boxShadow: "0 2px 10px rgba(245, 158, 11, 0.15)",
            }}
          >
            {isAICalibrating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>{isAICalibrating ? "AI Agent Verifying…" : "AI Verify Locations"}</span>
          </button>

          {/* Privacy Toggle Button */}
          <button
            onClick={() => setIsPrivacyMode(!isPrivacyMode)}
            title={isPrivacyMode ? "Disable Privacy Mask (Reveal Exact Venue Details)" : "Enable Privacy Mode (Mask Exact Coordinates & Amounts)"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "99px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              border: isPrivacyMode ? "1px solid rgba(244, 63, 94, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
              background: isPrivacyMode ? "rgba(244, 63, 94, 0.15)" : "rgba(255, 255, 255, 0.04)",
              color: isPrivacyMode ? "#fb7185" : "#94a3b8",
              transition: "all 0.2s",
            }}
          >
            {isPrivacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
            {isPrivacyMode ? "Privacy: ON" : "Privacy: OFF"}
          </button>
        </div>
      </div>

      {/* ── Integrated Pay Cycle & Calendar Month Filter Bar ──────────── */}
      <div
        style={{
          padding: "14px 28px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          background: "rgba(0, 0, 0, 0.22)",
        }}
      >
        {/* Left: Cycle Mode Switcher + Month Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Mode Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(10, 16, 30, 0.8)",
              padding: "3px",
              borderRadius: "99px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setCycleMode("PAY_CYCLE");
                setPinnedLocation(null);
                setHoveredLocation(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "99px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: cycleMode === "PAY_CYCLE" ? "rgba(245, 158, 11, 0.2)" : "transparent",
                color: cycleMode === "PAY_CYCLE" ? "#fbbf24" : "#94a3b8",
                transition: "all 0.2s",
              }}
            >
              <Calendar size={12} />
              Pay Cycle (15th–15th)
            </button>
            <button
              type="button"
              onClick={() => {
                setCycleMode("CALENDAR_MONTH");
                setPinnedLocation(null);
                setHoveredLocation(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "99px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: cycleMode === "CALENDAR_MONTH" ? "rgba(59, 130, 246, 0.2)" : "transparent",
                color: cycleMode === "CALENDAR_MONTH" ? "#60a5fa" : "#94a3b8",
                transition: "all 0.2s",
              }}
            >
              <Calendar size={12} />
              Calendar Month
            </button>
          </div>

          {/* Pay Cycle / Month Dropdown */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(10, 16, 30, 0.9)",
              border: selectedCycleMonth !== "ALL"
                ? "1px solid rgba(245, 158, 11, 0.5)"
                : "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "12px",
              padding: "6px 12px",
              boxShadow: selectedCycleMonth !== "ALL" ? "0 0 12px rgba(245, 158, 11, 0.15)" : "none",
              transition: "all 0.2s",
            }}
          >
            <Calendar size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
            <select
              value={selectedCycleMonth}
              onChange={(e) => {
                setSelectedCycleMonth(e.target.value);
                setPinnedLocation(null);
                setHoveredLocation(null);
              }}
              id="spending-radar-cycle-select"
              style={{
                background: "transparent",
                color: selectedCycleMonth !== "ALL" ? "#fbbf24" : "#f8fafc",
                border: "none",
                outline: "none",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ background: "#0d1424", color: "#fff" }}>
                  {cycleMode === "PAY_CYCLE" ? opt.payCycleLabel : opt.calendarLabel}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Active Date Range Chip + Quick Reset Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Active Cycle Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "5px 12px",
              borderRadius: "99px",
              background: activeCycleInfo.isFiltered ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.1)",
              border: activeCycleInfo.isFiltered
                ? "1px solid rgba(245, 158, 11, 0.3)"
                : "1px solid rgba(16, 185, 129, 0.25)",
              fontSize: "11px",
              fontWeight: 700,
              color: activeCycleInfo.isFiltered ? "#fbbf24" : "#34d399",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: activeCycleInfo.isFiltered ? "#f59e0b" : "#10b981",
                boxShadow: activeCycleInfo.isFiltered ? "0 0 8px #f59e0b" : "0 0 8px #10b981",
              }}
            />
            <span>{activeCycleInfo.range}</span>
          </div>

          {/* Reset Filters Pill */}
          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              title="Reset Cycle, Region &amp; Category Filters to All Time"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "99px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                fontSize: "11px",
                fontWeight: 600,
                color: "#94a3b8",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f8fafc";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
              }}
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Status Banner */}
      {aiStatusMessage && (
        <div
          style={{
            padding: "10px 24px",
            background: "linear-gradient(90deg, rgba(245, 158, 11, 0.18) 0%, rgba(251, 191, 36, 0.08) 100%)",
            borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: "#fbbf24",
            fontWeight: 600,
            fontFamily: "var(--font-mono, monospace)",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <Sparkles size={14} style={{ flexShrink: 0 }} />
          <span>{aiStatusMessage}</span>
        </div>
      )}

      {activeTab === "PHYSICAL" ? (
        <>
          {/* ── Filter Toolbars (Regions & Categories) ────────────────── */}
          <div
            style={{
              padding: "14px 28px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              background: "rgba(0, 0, 0, 0.12)",
            }}
          >
            {/* Region Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  color: "#94a3b8",
                  fontWeight: 600,
                  fontSize: "11px",
                  marginRight: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <MapPin size={13} style={{ color: "#f59e0b" }} /> Region:
              </span>
              {availableRegions.map((region) => {
                const count = region === "ALL"
                  ? cycleFilteredLocations.length
                  : cycleFilteredLocations.filter((l) => l.region === region).length;
                return (
                  <button
                    key={region}
                    onClick={() => {
                      setSelectedRegion(region);
                      setPinnedLocation(null);
                      setHoveredLocation(null);
                    }}
                    style={getPillButtonStyle(selectedRegion === region)}
                    id={`map-region-${region.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
                  >
                    {region === "ALL" ? `All RSA Regions (${count})` : `${region} (${count})`}
                  </button>
                );
              })}
            </div>

            {/* Category Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  color: "#94a3b8",
                  fontWeight: 600,
                  fontSize: "11px",
                  marginRight: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Filter size={13} style={{ color: "#f59e0b" }} /> Category:
              </span>
              {availableCategories.map((cat) => {
                const count = cat === "ALL"
                  ? cycleFilteredLocations.length
                  : cycleFilteredLocations.filter((l) => l.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setPinnedLocation(null);
                      setHoveredLocation(null);
                    }}
                    style={getPillButtonStyle(selectedCategory === cat)}
                    id={`map-cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
                  >
                    {cat === "ALL" ? `All Categories (${count})` : `${cat} (${count})`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Map Canvas & Popover Container ────────────────────────── */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "520px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              background: "#090e1a",
            }}
          >
            <LeafletMap
              locations={filteredPhysical}
              activeLocation={activeLocation}
              onLocationClick={(loc) => {
                setPinnedLocation((prev) => (prev?.id === loc?.id ? null : loc));
              }}
              onLocationHover={(loc) => {
                setHoveredLocation(loc);
              }}
              onEditLocation={(loc) => {
                setAdjustLocationModal(loc);
              }}
              selectedRegion={selectedRegion}
              isPrivacyMode={isPrivacyMode}
            />

            {/* Privacy Shield Banner (if privacy mode is ON) */}
            {isPrivacyMode && (
              <div
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  background: "rgba(10, 16, 30, 0.88)",
                  border: "1px solid rgba(244, 63, 94, 0.4)",
                  borderRadius: "12px",
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "11px",
                  color: "#fb7185",
                  fontFamily: "var(--font-mono, monospace)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  backdropFilter: "blur(12px)",
                  zIndex: 900,
                }}
              >
                <EyeOff size={13} />
                <span>Privacy Mode Active — Exact Addresses Masked</span>
              </div>
            )}
          </div>

          {/* ── Map Summary Footer ────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              padding: "18px 28px",
              background: "rgba(0,0,0,0.2)",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
              <div>
                Active Geotagged Venues:{" "}
                <strong style={{ color: "#f8fafc", fontFamily: "var(--font-mono, monospace)" }}>
                  {filteredPhysical.length} of {localLocations.length}
                </strong>
              </div>
              <div>
                Filtered In-Store Spend:{" "}
                <strong style={{ color: "#f59e0b", fontFamily: "var(--font-mono, monospace)" }}>
                  {isPrivacyMode ? "R ••••••" : formatZAR(totalFilteredPhysicalSpend)}
                </strong>
              </div>
              <div>
                Top Spending Hub:{" "}
                <strong style={{ color: "#38bdf8" }}>
                  {dynamicTopHub}
                </strong>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
              <span>Real DB MoneyFlow Projection</span>
            </div>
          </div>
        </>
      ) : (
        /* ── Digital & Online Services View ──────────────────────────── */
        <div style={{ padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: "0 0 4px 0" }}>
                Digital, Online Subscriptions &amp; Utility Tokens
              </h4>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                Non-geographic transactions for {activeCycleInfo.label} ({cycleFilteredDigital.length} services active)
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                Total Digital Spend
              </span>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#60a5fa", fontFamily: "var(--font-mono, monospace)" }}>
                {isPrivacyMode ? "R ••••••" : formatZAR(totalDigitalSpend)}
              </div>
            </div>
          </div>

          {cycleFilteredDigital.length === 0 ? (
            <div
              style={{
                padding: "36px",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: "14px",
                border: "1px dashed rgba(255, 255, 255, 0.1)",
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              No digital subscriptions or online services recorded during this pay cycle / month.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "14px",
              }}
            >
              {cycleFilteredDigital.map((dig) => (
                <div
                  key={dig.id}
                  style={{
                    padding: "16px 18px",
                    borderRadius: "14px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-mono, monospace)",
                        background: "rgba(59, 130, 246, 0.12)",
                        color: "#60a5fa",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: 700,
                      }}
                    >
                      {dig.category}
                    </span>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc", marginTop: "6px" }}>
                      {dig.serviceName}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      {dig.transactionCount} transaction{dig.transactionCount === 1 ? "" : "s"} • Last {dig.lastDate}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#38bdf8", fontFamily: "var(--font-mono, monospace)" }}>
                      {isPrivacyMode ? "R •••••" : formatZAR(dig.totalAmount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Location Calibration / Pin Adjustment Modal */}
      <LocationAdjustModal
        location={adjustLocationModal}
        isOpen={Boolean(adjustLocationModal)}
        onClose={() => setAdjustLocationModal(null)}
        onSaved={(updated) => {
          setLocalLocations((prev) =>
            prev.map((loc) => (loc.merchant === updated.merchant ? { ...loc, ...updated } : loc))
          );
          setPinnedLocation(updated);
        }}
      />
    </div>
  );
}

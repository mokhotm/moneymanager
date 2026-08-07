"use client";

import React from "react";
import { ShieldCheck, Award, CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";

interface HealthFactor {
  name: string;
  status: "EXCELLENT" | "STRONG" | "MODERATE" | "ATTENTION";
  detail: string;
}

interface FinancialHealthProps {
  score: number;
  tierLabel: string;
  factors: HealthFactor[];
}

export function FinancialHealthGauge({
  score = 785,
  tierLabel = "Expert Wealth Strategist",
  factors = [],
}: FinancialHealthProps) {
  // Apple Watch Arc Calculation: 240 degree arc from 150deg to 390deg
  const minScore = 300;
  const maxScore = 950;
  const normalized = Math.min(1, Math.max(0, (score - minScore) / (maxScore - minScore)));

  const radius = 75;
  const strokeWidth = 12;
  const center = 100;
  const circumference = 2 * Math.PI * radius * (240 / 360); // 240 degree arc length
  const dashOffset = circumference * (1 - normalized);

  const getScoreColor = (val: number) => {
    if (val >= 800) return "#10b981"; // Emerald Green
    if (val >= 720) return "#f59e0b"; // Warm Amber Gold
    if (val >= 620) return "#3b82f6"; // Sapphire Blue
    return "#f43f5e"; // Rose Red
  };

  const scoreColor = getScoreColor(score);

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(17, 26, 46, 0.8) 0%, rgba(10, 16, 30, 0.9) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "20px",
        padding: "24px",
        backdropFilter: "blur(24px) saturate(180%)",
        boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Background Ambient Glow */}
      <div
        style={{
          position: "absolute",
          top: "-40px",
          right: "-40px",
          width: "160px",
          height: "160px",
          borderRadius: "50%",
          background: scoreColor,
          filter: "blur(70px)",
          opacity: 0.12,
          pointerEvents: "none",
        }}
      />

      <div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Award size={18} style={{ color: "#f59e0b" }} />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.01em" }}>
              Financial Health Index
            </span>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 700,
              color: "#fbbf24",
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              padding: "3px 10px",
              borderRadius: "99px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <ShieldCheck size={11} />
            {tierLabel}
          </span>
        </div>

        {/* Ring Gauge Center */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", margin: "10px 0" }}>
          <svg width="200" height="150" viewBox="0 0 200 160" style={{ overflow: "visible" }}>
            {/* Background Track Arc */}
            <path
              d="M 35 135 A 75 75 0 1 1 165 135"
              fill="none"
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Active Color Progress Arc */}
            <path
              d="M 35 135 A 75 75 0 1 1 165 135"
              fill="none"
              stroke={scoreColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                filter: `drop-shadow(0 0 10px ${scoreColor}80)`,
              }}
            />
          </svg>

          {/* Central Score Text */}
          <div style={{ position: "absolute", top: "45px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "38px", fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: scoreColor, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginTop: "6px" }}>
              out of 950 points
            </span>
          </div>
        </div>

        {/* Contributing Metrics Checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
          {factors.map((factor, idx) => {
            const isGood = factor.status === "EXCELLENT" || factor.status === "STRONG";
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.025)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                  fontSize: "11px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isGood ? (
                    <CheckCircle2 size={13} style={{ color: "#10b981", flexShrink: 0 }} />
                  ) : (
                    <AlertCircle size={13} style={{ color: "#f59e0b", flexShrink: 0 }} />
                  )}
                  <span style={{ color: "#e2e8f0", fontWeight: 500 }}>{factor.name}</span>
                </div>
                <span style={{ color: "#94a3b8", fontFamily: "var(--font-mono, monospace)", fontSize: "10px" }}>
                  {factor.detail}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

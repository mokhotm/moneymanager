"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatZAR } from "@/lib/formatters";
import {
  Upload,
  Inbox,
  AlertTriangle,
  Bot,
  Target,
  ArrowRight,
  ShieldCheck,
  Lock,
  LogIn,
} from "lucide-react";
import { DashboardCharts } from "@/components/DashboardCharts";
import { FinancialHealthGauge } from "@/components/FinancialHealthGauge";
import { SpendingLocationMap } from "@/components/SpendingLocationMap";

interface DashboardData {
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
  activeDebtsCount?: number;
  debtCount?: number;
  recurringNetMargin?: number;
  actualNetMargin?: number;
  netMarginRecurring?: number;
  netMarginActual?: number;
  pendingRecsCount?: number;
  goalsCount?: number;
  topGoalName?: string;
  topGoalProgress?: number;
  urgentDebts: Array<{
    id: string;
    accountName: string;
    institution: string;
    currentBalance: number;
    urgencyFlag: string;
    urgencyNote: string | null;
  }>;
  spendingByCategory?: any[];
  netWorthHistory?: any[];
  cashFlowHistory?: any[];
  spendingHeatmap?: any[];
  spendingLocations?: any[];
  digitalServices?: any[];
  spendingIntelligence?: any;
  debtDistribution?: any[];
  financialHealth?: {
    score: number;
    tier: string;
    tierLabel: string;
    factors: Array<{ name: string; status: any; detail: string }>;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        console.log("[Dashboard] API status:", r.status);
        return r.json();
      })
      .then((d) => {
        if (d.error) console.warn("[Dashboard] API returned error:", d.error, d.detail || "");
        setData(d);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Initializing executive financial dashboard…
        </div>
      </div>
    );
  }

  if (!data || (data as any)?.error) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Executive Financial Dashboard</h1>
            <p className="page-subtitle">Real-time wealth tracking, debt payoff, &amp; cash flow analytics</p>
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
              Please sign in to your MoneyManager account to securely view your personal financial dashboard, geotagged spending radar, and AI insights.
            </p>
            <Link href="/login" className="btn btn-primary btn-lg inline-flex items-center gap-2">
              <LogIn size={18} />
              <span>Sign In to Access Dashboard</span>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const hasUrgency = data.urgentDebts && data.urgentDebts.length > 0;
  const recurringSurplus = data.recurringNetMargin ?? data.netMarginRecurring ?? 0;
  const actualSurplus = data.actualNetMargin ?? data.netMarginActual ?? 0;
  const activeDebtsCount = data.activeDebtsCount ?? data.debtCount ?? 0;
  const pendingRecsCount = data.pendingRecsCount ?? 0;
  const goalsCount = data.goalsCount ?? 0;
  const topGoalName = data.topGoalName ?? "No active goals created yet";
  const topGoalProgress = data.topGoalProgress ?? 0;

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ position: "relative", overflow: "hidden" }}>
        {/* Subtle background glow for header */}
        <div style={{ position: "absolute", top: "-50%", left: "-10%", width: "40%", height: "200%", background: "radial-gradient(ellipse at center, rgba(245, 158, 11, 0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        
        <div style={{ position: "relative", zIndex: 10 }}>
          <h1 
            className="page-title flex items-center gap-2.5" 
            style={{ 
              background: "linear-gradient(to right, #f8fafc, #94a3b8)", 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent",
              textShadow: "0 4px 20px rgba(255, 255, 255, 0.1)"
            }}
          >
            Wealth &amp; Financial Dashboard
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
              Real-Time Engine
            </span>
          </h1>
          <p className="page-subtitle">Overview of your Net Worth, Financial Goals, Spending Analytics &amp; Agent Insights</p>
        </div>

        <div className="flex gap-3" style={{ position: "relative", zIndex: 10, background: "rgba(10, 16, 30, 0.4)", padding: "8px", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.05)", backdropFilter: "blur(12px)" }}>
          <Link href="/documents" className="btn btn-secondary" style={{ borderRadius: "14px" }}>
            <Upload size={16} />
            <span>Upload Statement</span>
          </Link>
          <Link href="/recommendations" className="btn btn-primary" style={{ borderRadius: "14px", boxShadow: "0 8px 20px rgba(245, 158, 11, 0.3)" }}>
            <Inbox size={16} />
            <span>Agent Inbox {pendingRecsCount > 0 ? `(${pendingRecsCount})` : "(0)"}</span>
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* Urgency Risk Banners */}
        {hasUrgency &&
          data.urgentDebts.map((d) => (
            <div key={d.id} className="urgency-banner mb-6">
              <div className="urgency-banner-icon">
                <AlertTriangle size={24} className="text-red" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="urgency-banner-title">
                  PRE-TERMINATION RISK: {d.institution} — {d.accountName}
                </div>
                <div className="urgency-banner-text">
                  Balance: <strong>{formatZAR(d.currentBalance)}</strong>. {d.urgencyNote}
                </div>
              </div>
              <Link href="/debts" className="btn btn-danger btn-sm">
                View Risk Plan
              </Link>
            </div>
          ))}

        {/* Standard Core Stat Grid with 24px Gap & Margin Bottom */}
        <div className="stat-grid mb-6">
          <div className="stat-card warning">
            <div className="stat-label">Total Net Worth</div>
            <div className="stat-value gold">{formatZAR(data.netWorth ?? 0)}</div>
            <div className="stat-sub">Assets ({formatZAR(data.totalAssets ?? 0)}) − Debts ({formatZAR(data.totalDebt ?? 0)})</div>
            {/* Sparkline Decorative SVG */}
            <svg style={{ position: "absolute", bottom: 0, right: 0, width: "120px", height: "40px", opacity: 0.2, pointerEvents: "none" }}>
              <path d="M 0 30 Q 30 10 60 25 T 120 5" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="stat-card danger">
            <div className="stat-label">Total Active Debt</div>
            <div className="stat-value red">{formatZAR(data.totalDebt ?? 0)}</div>
            <div className="stat-sub">{activeDebtsCount} active debt accounts</div>
            <svg style={{ position: "absolute", bottom: 0, right: 0, width: "120px", height: "40px", opacity: 0.2, pointerEvents: "none" }}>
              <path d="M 0 10 Q 40 35 80 15 T 120 30" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="stat-card success">
            <div className="stat-label">Net Margin (Recurring)</div>
            <div className="stat-value green">{formatZAR(recurringSurplus)}</div>
            <div className="stat-sub">Monthly surplus after obligations</div>
            <svg style={{ position: "absolute", bottom: 0, right: 0, width: "120px", height: "40px", opacity: 0.2, pointerEvents: "none" }}>
              <path d="M 0 35 Q 40 20 80 5 T 120 25" fill="none" stroke="#10b981" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="stat-card">
            <div className="stat-label">Net Margin (This Month)</div>
            <div className="stat-value">{formatZAR(actualSurplus)}</div>
            <div className="stat-sub">Actual after unexpected items</div>
          </div>
        </div>

        {/* 3-Column Grid Row with Standard 24px Gaps & Margin Bottom */}
        <div className="three-col mb-6">
          {/* AI Agents Active */}
          <div className="card flex flex-col justify-between" style={{ position: "relative", overflow: "hidden" }}>
            {/* Ambient Animated Glow */}
            <div style={{ position: "absolute", top: "-20%", right: "-20%", width: "150px", height: "150px", background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)", borderRadius: "50%", animation: "pulse 4s infinite", pointerEvents: "none" }} />
            
            <div style={{ position: "relative", zIndex: 10 }}>
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <div style={{ padding: "8px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "12px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                    <Bot size={18} className="text-gold" />
                  </div>
                  <span className="card-title" style={{ color: "#f8fafc" }}>4 AI Agents Active</span>
                </div>
                <span className="badge active" style={{ boxShadow: "0 0 12px rgba(16, 185, 129, 0.25)" }}>Operational</span>
              </div>
              <p className="text-muted text-sm mb-4 leading-relaxed">
                Document Agent, Debt Agent, Goals Agent, and Budget Agent are cooperating to analyze your statements and recommend optimal surplus allocations.
              </p>
            </div>
            <Link href="/recommendations" className="btn btn-primary w-full" style={{ borderRadius: "14px", position: "relative", zIndex: 10 }}>
              <span>{pendingRecsCount > 0 ? `Review ${pendingRecsCount} Agent Proposal${pendingRecsCount > 1 ? "s" : ""}` : "Inbox is Clear (0 Proposals)"}</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Financial Goals Progress */}
          <div className="card flex flex-col justify-between" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", bottom: "-20%", left: "-10%", width: "120px", height: "120px", background: "radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 10 }}>
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <div style={{ padding: "8px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "12px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                    <Target size={18} className="text-gold" />
                  </div>
                  <span className="card-title" style={{ color: "#f8fafc" }}>Goals Progress</span>
                </div>
                <span className="badge gold" style={{ boxShadow: "0 0 12px rgba(245, 158, 11, 0.2)" }}>{goalsCount} Active Goal{goalsCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold mb-3">
                <span style={{ color: "#e2e8f0" }}>{topGoalName}</span>
                <span className="text-green" style={{ textShadow: "0 0 10px rgba(16, 185, 129, 0.4)" }}>{topGoalProgress}% Funded</span>
              </div>
              <div style={{ height: "10px", borderRadius: "99px", background: "rgba(0,0,0,0.4)", overflow: "hidden", marginBottom: "16px", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)" }}>
                <div style={{ height: "100%", width: `${topGoalProgress}%`, background: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)", borderRadius: "99px", boxShadow: "0 0 10px rgba(245, 158, 11, 0.5)", transition: "width 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }} />
              </div>
            </div>
            <Link href="/goals" className="btn btn-secondary w-full" style={{ borderRadius: "14px", position: "relative", zIndex: 10, background: "rgba(255,255,255,0.03)" }}>
              <span>View All Goals</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Financial Health Score Gauge */}
          <FinancialHealthGauge
            score={data.financialHealth?.score ?? 0}
            tierLabel={data.financialHealth?.tierLabel ?? "New Account (Unranked)"}
            factors={data.financialHealth?.factors ?? []}
          />
        </div>

        {/* Tabbed Visualizations Hub with Margin Bottom */}
        <div className="mb-6">
          <DashboardCharts
            spendingByCategory={data.spendingByCategory}
            netWorthHistory={data.netWorthHistory}
            cashFlowHistory={data.cashFlowHistory}
            spendingHeatmap={data.spendingHeatmap}
            debtDistribution={data.debtDistribution}
          />
        </div>

        {/* Geotagged Spending Location Radar Map */}
        <div className="mb-6">
          <SpendingLocationMap
            locations={data.spendingLocations}
            digitalServices={data.digitalServices}
            intelligence={data.spendingIntelligence}
          />
        </div>
      </div>
    </>
  );
}

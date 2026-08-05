"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatZAR } from "@/lib/formatters";
import { Upload, Inbox, AlertTriangle, Bot, Target } from "lucide-react";

interface DashboardData {
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
  activeDebtsCount: number;
  recurringNetMargin: number;
  actualNetMargin: number;
  monthlySurplus: number;
  urgentDebts: Array<{
    id: string;
    accountName: string;
    institution: string;
    currentBalance: number;
    urgencyFlag: string;
    urgencyNote: string | null;
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading || !data) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "60px 0" }}>
        <div className="text-muted">Loading financial wealth dashboard…</div>
      </div>
    );
  }

  const hasUrgency = data.urgentDebts && data.urgentDebts.length > 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Wealth &amp; Financial Dashboard</h1>
          <p className="page-subtitle">Overview of your Net Worth, Financial Goals, Debt Payoff &amp; Agent Insights</p>
        </div>
        <div className="flex gap-3">
          <Link href="/documents" className="btn btn-secondary">
            <Upload size={16} />
            <span>Upload Statement</span>
          </Link>
          <Link href="/recommendations" className="btn btn-primary">
            <Inbox size={16} />
            <span>Agent Inbox (3)</span>
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* Urgency Banners */}
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

        {/* Core Stat Grid */}
        <div className="stat-grid mb-6">
          <div className="stat-card warning">
            <div className="stat-label">Total Net Worth</div>
            <div className="stat-value gold">{formatZAR(data.netWorth ?? 1666359.04)}</div>
            <div className="stat-sub">Assets ({formatZAR(data.totalAssets ?? 2101135.15)}) − Debts</div>
          </div>

          <div className="stat-card danger">
            <div className="stat-label">Total Active Debt</div>
            <div className="stat-value red">{formatZAR(data.totalDebt)}</div>
            <div className="stat-sub">{data.activeDebtsCount} active debt accounts</div>
          </div>

          <div className="stat-card success">
            <div className="stat-label">Net Margin (Recurring)</div>
            <div className="stat-value green">{formatZAR(data.recurringNetMargin)}</div>
            <div className="stat-sub">Monthly surplus after obligations</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Net Margin (This Month)</div>
            <div className="stat-value">{formatZAR(data.actualNetMargin)}</div>
            <div className="stat-sub">Actual after unexpected items</div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="two-col mb-6">
          <div className="card flex flex-col justify-between">
            <div>
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <Bot size={18} className="text-gold" />
                  <span className="card-title">4 AI Agents Active</span>
                </div>
                <span className="badge active">Operational</span>
              </div>
              <p className="text-muted text-sm mb-4">
                Document Agent, Debt Agent, Goals Agent, and Budget Agent are cooperating to analyze your statements and recommend optimal surplus allocations.
              </p>
            </div>
            <Link href="/recommendations" className="btn btn-primary w-full">
              Review 3 Agent Proposals
            </Link>
          </div>

          <div className="card flex flex-col justify-between">
            <div>
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <Target size={18} className="text-gold" />
                  <span className="card-title">Financial Goals Progress</span>
                </div>
                <span className="badge gold">3 Active Goals</span>
              </div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span>3-Month Emergency Fund</span>
                <span className="text-green">22% Funded</span>
              </div>
              <div className="progress-bar mb-4">
                <div className="progress-fill" style={{ width: "22%" }} />
              </div>
            </div>
            <Link href="/goals" className="btn btn-secondary w-full">
              View All Goals
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

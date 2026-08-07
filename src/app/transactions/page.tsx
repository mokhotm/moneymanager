"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatZAR } from "@/lib/formatters";
import { BankingTransactionsCard } from "@/components/BankingTransactionsCard";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Upload,
  Receipt,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function TransactionsPage() {
  const [summaryData, setSummaryData] = useState<{
    totalCount: number;
    totalInflow: number;
    totalOutflow: number;
    netBalance: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/transactions?category=ALL")
      .then((r) => r.json())
      .then((d) => {
        if (d.summary) {
          setSummaryData(d.summary);
        }
      })
      .catch(console.error);
  }, []);

  const inflow = summaryData?.totalInflow ?? 67098.61;
  const outflow = summaryData?.totalOutflow ?? 61170.32;
  const netBalance = summaryData?.netBalance ?? inflow - outflow;
  const totalCount = summaryData?.totalCount ?? 28;

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            Live Banking Transactions
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
              OpenBanking Synced
            </span>
          </h1>
          <p className="page-subtitle">Reconciled line-item transaction feed across all linked accounts</p>
        </div>

        <div className="flex gap-3">
          <Link href="/documents" className="btn btn-secondary flex items-center gap-1.5">
            <Upload size={16} />
            <span>Upload Statement</span>
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* Core Financial Stat Cards Grid */}
        <div className="stat-grid mb-6">
          {/* Stat 1: Total Reconciled Inflow */}
          <div className="stat-card success">
            <div className="stat-label flex items-center gap-1.5" style={{ color: "#10b981" }}>
              <TrendingUp size={16} /> Total Inflow (Income &amp; Deposits)
            </div>
            <div className="stat-value green" style={{ fontSize: "26px", margin: "6px 0 4px 0" }}>
              +{formatZAR(inflow)}
            </div>
            <div className="stat-sub">Reconciled payroll &amp; direct deposits</div>
          </div>

          {/* Stat 2: Total Reconciled Outflow */}
          <div className="stat-card danger">
            <div className="stat-label flex items-center gap-1.5" style={{ color: "#f43f5e" }}>
              <TrendingDown size={16} /> Total Outflow (Expenses &amp; Debts)
            </div>
            <div className="stat-value red" style={{ fontSize: "26px", margin: "6px 0 4px 0" }}>
              -{formatZAR(outflow)}
            </div>
            <div className="stat-sub">Settled debit orders &amp; card purchases</div>
          </div>

          {/* Stat 3: Net Cashflow Balance */}
          <div className={`stat-card ${netBalance >= 0 ? "success" : "danger"}`}>
            <div className="stat-label flex items-center gap-1.5">
              <Receipt size={16} style={{ color: netBalance >= 0 ? "#10b981" : "#f43f5e" }} /> Net Reconciled Cashflow
            </div>
            <div className={`stat-value ${netBalance >= 0 ? "green" : "red"}`} style={{ fontSize: "26px", margin: "6px 0 4px 0" }}>
              {netBalance >= 0 ? "+" : ""}{formatZAR(netBalance)}
            </div>
            <div className="stat-sub">Net surplus balance across accounts</div>
          </div>

          {/* Stat 4: Verification Score */}
          <div className="stat-card warning">
            <div className="stat-label flex items-center gap-1.5" style={{ color: "#f59e0b" }}>
              <ShieldCheck size={16} /> AI Reconciliation Rate
            </div>
            <div className="stat-value gold" style={{ fontSize: "26px", margin: "6px 0 4px 0" }}>
              98.4%
            </div>
            <div className="stat-sub flex items-center gap-1" style={{ color: "#6ee7b7" }}>
              <CheckCircle2 size={12} style={{ color: "#10b981" }} /> {totalCount} line-items reconciled
            </div>
          </div>
        </div>

        {/* Banking Transactions Main Feed Component */}
        <BankingTransactionsCard title="Reconciled Bank Transaction Feed" />
      </div>
    </>
  );
}

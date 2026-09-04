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
  PieChart,
  Target,
  ArrowRight,
} from "lucide-react";

export default function TransactionsPage() {
  const [summaryData, setSummaryData] = useState<{
    totalCount: number;
    totalInflow: number;
    totalOutflow: number;
    netBalance: number;
    budgetedOutflow?: number;
    unbudgetedOutflow?: number;
    budgetAdherenceRate?: number;
    suspiciousDuplicateCount?: number;
    suspiciousDuplicateTotal?: number;
  } | null>(null);
  const [activePeriod, setActivePeriod] = useState<string>("2026-08");
  const [activePeriodType, setActivePeriodType] = useState<string>("SALARY");

  const inflow = summaryData?.totalInflow ?? 0;
  const outflow = summaryData?.totalOutflow ?? 0;
  const netBalance = summaryData ? summaryData.totalInflow - summaryData.totalOutflow : 0;
  const totalCount = summaryData?.totalCount ?? 0;
  const budgetedOutflow = summaryData?.budgetedOutflow ?? 0;
  const unbudgetedOutflow = summaryData?.unbudgetedOutflow ?? 0;
  const adherence = summaryData?.budgetAdherenceRate !== undefined ? summaryData.budgetAdherenceRate : 0;
  const suspiciousCount = summaryData?.suspiciousDuplicateCount ?? 0;
  const suspiciousTotal = summaryData?.suspiciousDuplicateTotal ?? 0;

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
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "2px 10px",
                borderRadius: "99px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                }}
              />
              Budget Engine Reconciled
            </span>
            {suspiciousCount > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 700,
                  background: "rgba(245, 158, 11, 0.14)",
                  color: "#fbbf24",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  padding: "2px 10px",
                  borderRadius: "99px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  boxShadow: "0 0 12px rgba(245, 158, 11, 0.2)",
                }}
              >
                ⚠️ {suspiciousCount} Potential Duplicate{suspiciousCount > 1 ? "s" : ""} Flagged
              </span>
            )}
          </h1>
          <p className="page-subtitle">
            Reconciled line-item transaction feed across all linked accounts with real-time budget highlighting and AI duplicate fraud detection
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/budget"
            className="btn btn-secondary flex items-center gap-1.5"
            style={{ fontSize: "12px" }}
          >
            <PieChart size={15} />
            <span>Budget Plan</span>
          </Link>
          <Link
            href="/documents"
            className="btn btn-primary flex items-center gap-1.5"
            style={{ fontSize: "12px" }}
          >
            <Upload size={15} />
            <span>Upload Statement</span>
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* Suspicious Duplicate Notice Banner */}
        {suspiciousCount > 0 && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px 20px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(20, 25, 45, 0.85) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              boxShadow: "0 4px 20px -5px rgba(245, 158, 11, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                  background: "rgba(245, 158, 11, 0.2)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fbbf24",
                  flexShrink: 0,
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#fbbf24" }}>
                  AI Forensic Anomaly Detection: {suspiciousCount} Potential Duplicate Debits Flagged ({formatZAR(suspiciousTotal)})
                </div>
                <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "2px" }}>
                  Identical amounts detected within short time windows on your statement. Review the flagged items below to confirm validity or dispute duplicate charges.
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Core Financial Stat Cards Grid */}
        <div className="stat-grid mb-6">
          {/* Stat 1: Total Reconciled Inflow */}
          <div className="stat-card success">
            <div
              className="stat-label flex items-center gap-1.5"
              style={{ color: "#10b981" }}
            >
              <TrendingUp size={16} /> Total Inflow (Income &amp; Deposits)
            </div>
            <div
              className="stat-value green"
              style={{ fontSize: "26px", margin: "6px 0 4px 0" }}
            >
              +{formatZAR(inflow)}
            </div>
            <div className="stat-sub">Reconciled payroll &amp; direct deposits</div>
          </div>

          {/* Stat 2: Total Reconciled Outflow */}
          <div className="stat-card danger">
            <div
              className="stat-label flex items-center gap-1.5"
              style={{ color: "#f43f5e" }}
            >
              <TrendingDown size={16} /> Total Outflow (Expenses &amp; Debts)
            </div>
            <div
              className="stat-value red"
              style={{ fontSize: "26px", margin: "6px 0 4px 0" }}
            >
              -{formatZAR(outflow)}
            </div>
            <div className="stat-sub">
              Budgeted: {formatZAR(budgetedOutflow)} • Unbudgeted: {formatZAR(unbudgetedOutflow)}
            </div>
          </div>

          {/* Stat 3: Net Cashflow Balance */}
          <div className={`stat-card ${netBalance >= 0 ? "success" : "danger"}`}>
            <div className="stat-label flex items-center gap-1.5">
              <Receipt
                size={16}
                style={{ color: netBalance >= 0 ? "#10b981" : "#f43f5e" }}
              />{" "}
              Net Reconciled Cashflow
            </div>
            <div
              className={`stat-value ${netBalance >= 0 ? "green" : "red"}`}
              style={{ fontSize: "26px", margin: "6px 0 4px 0" }}
            >
              {netBalance >= 0 ? "+" : ""}
              {formatZAR(netBalance)}
            </div>
            <div className="stat-sub">Net surplus balance across accounts</div>
          </div>

          {/* Stat 4: Budget Adherence & Match Rate */}
          <div className="stat-card warning">
            <div
              className="stat-label flex items-center gap-1.5"
              style={{ color: "#fbbf24" }}
            >
              <Target size={16} /> Budget Plan Match Rate
            </div>
            <div
              className="stat-value gold"
              style={{ fontSize: "26px", margin: "6px 0 4px 0" }}
            >
              {adherence}%
            </div>
            <div
              className="stat-sub flex items-center gap-1"
              style={{ color: "#6ee7b7" }}
            >
              <CheckCircle2 size={12} style={{ color: "#10b981" }} />
              <span>{totalCount} transactions mapped to budget</span>
            </div>
          </div>
        </div>

        {/* Banking Transactions Main Feed Component */}
        <BankingTransactionsCard
          title="Reconciled Bank Transaction Feed"
          onSummaryChange={(summary, period, pType) => {
            setSummaryData(summary);
            setActivePeriod(period);
            setActivePeriodType(pType);
          }}
        />
      </div>
    </>
  );
}

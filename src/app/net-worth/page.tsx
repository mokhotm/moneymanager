"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { formatZAR } from "@/lib/formatters";
import {
  Gem,
  TrendingUp,
  Wallet,
  Home,
  Car,
  PieChart,
  ShieldCheck,
  Search,
  TrendingUp as ValuationIcon,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
  LogIn,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Percent,
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  type: string;
  currentValue: string;
  valueConfidence: string;
  valueSource: string | null;
}

interface Debt {
  id: string;
  currentBalance: string;
  account: { name: string; institution: string };
}

const ASSET_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PROPERTY: { label: "Real Estate Property", color: "#f59e0b" },
  VEHICLE: { label: "Vehicle / Auto", color: "#3b82f6" },
  INVESTMENT_PORTFOLIO: { label: "Investment Portfolio", color: "#10b981" },
  RETIREMENT_FUND: { label: "Pension & Retirement", color: "#a855f7" },
  CASH: { label: "Cash & Bank Savings", color: "#06b6d4" },
  OTHER: { label: "Other Asset", color: "#64748b" },
};

export default function NetWorthPage() {
  const [data, setData] = useState<{
    totalAssets: number;
    totalDebts: number;
    netWorth: number;
    assetTotal: number;
    bankAssetsTotal: number;
    assets: Asset[];
    debts: Debt[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  // Deeds search state
  const [deedsModal, setDeedsModal] = useState<{ assetId: string; assetName: string } | null>(null);
  const [deedsQuery, setDeedsQuery] = useState("");
  const [deedsType, setDeedsType] = useState("ADDRESS");
  const [deedsResults, setDeedsResults] = useState<any>(null);
  const [deedsLoading, setDeedsLoading] = useState(false);
  const [deedsError, setDeedsError] = useState<string | null>(null);

  // Lightstone valuation state
  const [valuationLoading, setValuationLoading] = useState<string | null>(null);
  const [valuationMsg, setValuationMsg] = useState<{ assetId: string; ok: boolean; text: string } | null>(null);

  const loadNetWorth = async () => {
    try {
      const res = await fetch("/api/net-worth");
      if (res.status === 401) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      const d = await res.json();
      if (d?.error === "Unauthorized" || d?.error?.includes("Unauthorized")) {
        setUnauthorized(true);
      } else {
        setData(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetWorth();
  }, []);

  const runDeedsSearch = async () => {
    if (!deedsQuery.trim()) return;
    setDeedsLoading(true);
    setDeedsError(null);
    setDeedsResults(null);
    const res = await fetch("/api/property/deeds-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: deedsQuery, searchType: deedsType }),
    });
    const data = await res.json();
    setDeedsLoading(false);
    if (!res.ok) {
      setDeedsError(data.error ?? "Search failed");
      return;
    }
    setDeedsResults(data.results);
  };

  const runValuation = async (assetId: string, assetName: string) => {
    setValuationLoading(assetId);
    setValuationMsg(null);
    const res = await fetch("/api/property/valuation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: assetName, assetId }),
    });
    const result = await res.json();
    setValuationLoading(null);
    if (!res.ok) {
      setValuationMsg({ assetId, ok: false, text: result.error ?? "Valuation failed" });
    } else {
      setValuationMsg({
        assetId,
        ok: true,
        text: `AVM: ${formatZAR(result.estimatedValue)}${result.appliedToAsset ? " — applied to asset" : ""}`,
      });
      if (result.appliedToAsset) {
        loadNetWorth();
      }
    }
  };

  const solvencyRatio = useMemo(() => {
    if (!data || data.totalDebts === 0) return 100;
    return Math.round((data.totalAssets / data.totalDebts) * 100);
  }, [data]);

  const assetPercentage = useMemo(() => {
    if (!data || data.totalAssets + data.totalDebts === 0) return 50;
    return Math.round((data.totalAssets / (data.totalAssets + data.totalDebts)) * 100);
  }, [data]);

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Calculating Net Worth portfolio &amp; asset allocations…
        </div>
      </div>
    );
  }

  if (unauthorized || !data) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Net Worth &amp; Wealth Portfolio</h1>
            <p className="page-subtitle">Complete breakdown of everything you own (Assets) vs owe (Debts)</p>
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
              Please sign in to view your complete Net Worth balance sheet, property title deeds &amp; debt liabilities.
            </p>
            <a href="/login" className="btn btn-primary btn-lg inline-flex items-center gap-2">
              <LogIn size={18} />
              <span>Sign In to Access Net Worth</span>
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Net Worth &amp; Wealth Portfolio
            <span className="badge badge-gold text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            Complete real-time breakdown of everything you own (Assets) vs owe (Debts)
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <span className="badge badge-gold flex items-center gap-1.5 px-3 py-1 text-xs font-mono">
            <Gem size={14} /> Currency: ZAR (R)
          </span>
        </div>
      </div>

      <div className="page-body">
        {/* Headline Net Worth Summary Stat Cards */}
        <div className="stat-grid mb-6">
          <div
            className="stat-card"
            style={{
              gridColumn: "span 2",
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.06))",
              borderColor: "rgba(245, 158, 11, 0.5)",
            }}
          >
            <div className="stat-label text-amber-400 flex items-center gap-1.5">
              <Gem size={16} /> Total Net Worth Position
            </div>
            <div className="stat-value gold font-black" style={{ fontSize: "36px" }}>
              {formatZAR(data.netWorth)}
            </div>
            <div className="stat-sub font-mono">
              Total Assets ({formatZAR(data.totalAssets)}) − Total Debt ({formatZAR(data.totalDebts)})
            </div>
          </div>

          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))",
              borderColor: "rgba(34, 197, 94, 0.4)",
            }}
          >
            <div className="stat-label text-emerald-400 flex items-center gap-1.5">
              <ArrowUpRight size={16} /> Total Assets Owned
            </div>
            <div className="stat-value text-emerald-400 font-extrabold" style={{ fontSize: "24px" }}>
              {formatZAR(data.totalAssets)}
            </div>
            <div className="stat-sub text-emerald-400 font-bold">Properties, Cash &amp; Investments</div>
          </div>

          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(225, 29, 72, 0.05))",
              borderColor: "rgba(239, 68, 68, 0.4)",
            }}
          >
            <div className="stat-label text-red-400 flex items-center gap-1.5">
              <ArrowDownRight size={16} /> Solvency Ratio
            </div>
            <div className="stat-value text-slate-100 font-extrabold" style={{ fontSize: "24px" }}>
              {solvencyRatio}% Solvency
            </div>
            <div className="stat-sub text-red-400 font-bold">Total Debt: {formatZAR(data.totalDebts)}</div>
          </div>
        </div>

        {/* Visual Asset vs Liability Balance Bar */}
        <div
          className="card mb-6"
          style={{
            background: "rgba(13, 20, 36, 0.9)",
            backdropFilter: "blur(24px)",
            border: "1px solid var(--border)",
            padding: "20px 24px",
          }}
        >
          <div className="flex justify-between items-center mb-2 font-mono text-xs">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Gem size={14} /> Total Assets: {formatZAR(data.totalAssets)} ({assetPercentage}%)
            </span>
            <span className="text-red-400 font-bold flex items-center gap-1">
              <ShieldAlert size={14} /> Total Liabilities: {formatZAR(data.totalDebts)} ({100 - assetPercentage}%)
            </span>
          </div>
          <div style={{ width: "100%", height: "12px", background: "rgba(239, 68, 68, 0.3)", borderRadius: "6px", overflow: "hidden", display: "flex" }}>
            <div
              style={{
                width: `${assetPercentage}%`,
                height: "100%",
                background: "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        {/* Assets & Debts Breakdown Tables */}
        <div className="two-col mb-6" style={{ gap: "24px" }}>
          {/* Assets Section */}
          <div
            className="card"
            style={{
              borderLeft: "1px solid var(--border)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              borderTop: "3px solid #10b981",
              background: "rgba(13, 20, 36, 0.9)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="card-header">
              <span className="card-title flex items-center gap-2" style={{ fontSize: "16px", fontWeight: 800 }}>
                <Gem size={18} className="text-emerald-400" /> Assets &amp; Holdings ({data.assets.length + (data.bankAssetsTotal > 0 ? 1 : 0)})
              </span>
              <span className="text-emerald-400 font-extrabold font-mono">{formatZAR(data.totalAssets)}</span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Asset Name</th>
                    <th>Category</th>
                    <th className="text-right">Current Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bankAssetsTotal > 0 && (
                    <tr>
                      <td>
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          <Wallet size={14} className="text-cyan-400" /> Liquid Bank Accounts
                        </div>
                        <div className="text-muted text-xs font-mono">Aggregated Cheque &amp; Savings Balances</div>
                      </td>
                      <td>
                        <span className="badge badge-blue text-xs font-mono">Liquid Cash</span>
                      </td>
                      <td className="td-mono font-bold text-emerald-400 text-right">{formatZAR(data.bankAssetsTotal)}</td>
                    </tr>
                  )}

                  {data.assets.map((asset) => {
                    const typeMeta = ASSET_TYPE_LABELS[asset.type] ?? { label: asset.type, color: "#64748b" };

                    return (
                      <tr key={asset.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{asset.name}</div>
                          {asset.valueSource && <div className="text-muted text-xs">{asset.valueSource}</div>}
                          {asset.type === "PROPERTY" && (
                            <div className="flex gap-2 mt-2" style={{ flexWrap: "wrap" }}>
                              <button
                                className="apple-pill-btn"
                                style={{ fontSize: "11px", padding: "3px 10px" }}
                                onClick={() => {
                                  setDeedsModal({ assetId: asset.id, assetName: asset.name });
                                  setDeedsQuery(asset.name);
                                  setDeedsResults(null);
                                  setDeedsError(null);
                                }}
                                id={`deeds-search-${asset.id}`}
                              >
                                <Search size={11} /> Verify Deeds
                              </button>
                              <button
                                className="apple-pill-btn"
                                style={{ fontSize: "11px", padding: "3px 10px" }}
                                disabled={valuationLoading === asset.id}
                                onClick={() => runValuation(asset.id, asset.name)}
                                id={`valuation-${asset.id}`}
                              >
                                {valuationLoading === asset.id ? (
                                  <>
                                    <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Fetching AVM…
                                  </>
                                ) : (
                                  <>
                                    <ValuationIcon size={11} /> Get Valuation
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          {valuationMsg?.assetId === asset.id && (
                            <div className={`flex items-center gap-1 text-xs mt-1 font-mono ${valuationMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                              {valuationMsg.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />} {valuationMsg.text}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className="badge text-xs font-mono"
                            style={{
                              background: `${typeMeta.color}20`,
                              color: typeMeta.color,
                              border: `1px solid ${typeMeta.color}50`,
                            }}
                          >
                            {typeMeta.label}
                          </span>
                        </td>
                        <td className="td-mono font-bold text-emerald-400 text-right">
                          {formatZAR(Number(asset.currentValue))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Debts Section */}
          <div
            className="card"
            style={{
              borderLeft: "1px solid var(--border)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              borderTop: "3px solid #ef4444",
              background: "rgba(13, 20, 36, 0.9)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="card-header">
              <span className="card-title flex items-center gap-2" style={{ fontSize: "16px", fontWeight: 800 }}>
                <ShieldCheck size={18} className="text-rose-400" /> Liabilities &amp; Debts ({data.debts.length})
              </span>
              <span className="text-red-400 font-extrabold font-mono">{formatZAR(data.totalDebts)}</span>
            </div>

            {data.debts.length === 0 ? (
              <div className="text-muted text-sm" style={{ padding: "48px 0", textAlign: "center" }}>
                Zero active debt liabilities detected! 🎉
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Debt Account</th>
                      <th>Institution</th>
                      <th className="text-right">Owed Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.debts.map((debt) => (
                      <tr key={debt.id}>
                        <td className="font-bold text-slate-100">{debt.account.name}</td>
                        <td className="text-muted text-sm">{debt.account.institution}</td>
                        <td className="td-mono font-bold text-red-400 text-right">
                          {formatZAR(Number(debt.currentBalance))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Windeed Deeds search modal */}
      {deedsModal && (
        <div className="modal-overlay" onClick={() => setDeedsModal(null)}>
          <div className="modal" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2">
                <Search size={18} className="text-amber-400" /> Windeed — Deeds Office Search
              </h2>
              <button className="modal-close" onClick={() => setDeedsModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm mb-4" style={{ lineHeight: 1.6 }}>
                Search the Deeds Office for ownership, bonds, and transfer history for: <strong className="text-slate-100">{deedsModal.assetName}</strong>
              </p>

              <div className="two-col mb-4" style={{ gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label">Search Method</label>
                  <select
                    className="form-select"
                    value={deedsType}
                    onChange={(e) => setDeedsType(e.target.value)}
                    id="deeds-search-type"
                  >
                    <option value="ADDRESS">Street Address</option>
                    <option value="ERF_NUMBER">Erf / Stand Number</option>
                    <option value="ID_NUMBER">Owner SA ID Number</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Search Query</label>
                  <input
                    className="form-input"
                    value={deedsQuery}
                    onChange={(e) => setDeedsQuery(e.target.value)}
                    placeholder={
                      deedsType === "ADDRESS"
                        ? "e.g. 12 Blossom Rd, Bakerton"
                        : deedsType === "ERF_NUMBER"
                        ? "e.g. ERF 1234 SPRINGS"
                        : "e.g. 8001015009087"
                    }
                    id="deeds-query-input"
                  />
                </div>
              </div>

              {deedsError && (
                <div
                  className="flex items-center gap-2 mb-3 font-mono text-xs rounded-lg"
                  style={{
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    padding: "10px 14px",
                    color: "#f87171",
                  }}
                >
                  <AlertCircle size={14} /> <span>{deedsError}</span>
                </div>
              )}

              {deedsResults && (
                <div
                  style={{
                    background: "rgba(7, 11, 20, 0.9)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    fontSize: "13px",
                    whiteSpace: "pre-wrap",
                    maxHeight: "300px",
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                  }}
                >
                  <pre style={{ margin: 0, fontFamily: "var(--font-mono, monospace)", fontSize: "12px", color: "#34d399" }}>
                    {JSON.stringify(deedsResults, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeedsModal(null)}>
                Close
              </button>
              <button
                className="btn btn-primary flex items-center gap-1.5"
                onClick={runDeedsSearch}
                disabled={!deedsQuery.trim() || deedsLoading}
                id="deeds-search-run"
              >
                {deedsLoading ? (
                  <>
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Searching…
                  </>
                ) : (
                  <>
                    <Search size={14} /> Search Deeds Office
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

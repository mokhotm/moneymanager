"use client";

import { useEffect, useState } from "react";
import { formatZAR } from "@/lib/formatters";
import { Gem, TrendingUp, Wallet, Home, Car, PieChart, ShieldCheck, Search, TrendingUp as ValuationIcon, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";

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

const ASSET_TYPE_LABELS: Record<string, string> = {
  PROPERTY: "Real Estate Property",
  VEHICLE: "Vehicle / Auto",
  INVESTMENT_PORTFOLIO: "Investment Portfolio",
  RETIREMENT_FUND: "Pension & Retirement",
  CASH: "Cash & Bank Savings",
  OTHER: "Other Asset",
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

  useEffect(() => {
    fetch("/api/net-worth")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(console.error);
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
    if (!res.ok) { setDeedsError(data.error ?? "Search failed"); return; }
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
      setValuationMsg({ assetId, ok: true, text: `AVM: ${formatZAR(result.estimatedValue)}${result.appliedToAsset ? " — applied to asset" : ""}` });
      // Refresh net worth data after valuation update
      if (result.appliedToAsset) {
        fetch("/api/net-worth").then((r) => r.json()).then(setData).catch(console.error);
      }
    }
  };

  if (loading || !data) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "60px 0" }}>
        <div className="text-muted">Calculating Net Worth portfolio…</div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Net Worth &amp; Wealth Portfolio</h1>
          <p className="page-subtitle">Complete breakdown of everything you own (Assets) vs owe (Debts)</p>
        </div>
        <div className="flex gap-3 items-center">
          <span className="badge gold">Currency: ZAR (R)</span>
        </div>
      </div>

      <div className="page-body">
        {/* Headline Net Worth Summary Cards */}
        <div className="stat-grid mb-6">
          <div className="stat-card warning" style={{ gridColumn: "span 2" }}>
            <div className="stat-label">Total Net Worth</div>
            <div className="stat-value gold" style={{ fontSize: "40px" }}>{formatZAR(data.netWorth)}</div>
            <div className="stat-sub">Total Assets ({formatZAR(data.totalAssets)}) − Total Liabilities ({formatZAR(data.totalDebts)})</div>
          </div>

          <div className="stat-card success">
            <div className="stat-label">Total Assets Owned</div>
            <div className="stat-value green">{formatZAR(data.totalAssets)}</div>
            <div className="stat-sub">Physical, Retirement &amp; Cash</div>
          </div>

          <div className="stat-card danger">
            <div className="stat-label">Total Outstanding Debt</div>
            <div className="stat-value red">{formatZAR(data.totalDebts)}</div>
            <div className="stat-sub">Across {data.debts.length} active debt accounts</div>
          </div>
        </div>

        {/* Assets & Debts Breakdown Tables */}
        <div className="two-col mb-6">
          {/* Assets Section */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Assets &amp; Holdings ({data.assets.length + 1})</span>
              <span className="text-green font-bold">{formatZAR(data.totalAssets)}</span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Asset Name</th>
                    <th>Category</th>
                    <th>Current Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets.map((asset) => (
                    <tr key={asset.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{asset.name}</div>
                        {asset.valueSource && <div className="text-muted text-xs">{asset.valueSource}</div>}
                        {asset.type === "PROPERTY" && (
                          <div className="flex gap-2 mt-1" style={{ flexWrap: "wrap" }}>
                            <button
                              className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: "2px 8px" }}
                              onClick={() => { setDeedsModal({ assetId: asset.id, assetName: asset.name }); setDeedsQuery(asset.name); setDeedsResults(null); setDeedsError(null); }}
                              id={`deeds-search-${asset.id}`}
                            >
                              <Search size={10} /> Verify Deeds
                            </button>
                            <button
                              className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: "2px 8px" }}
                              disabled={valuationLoading === asset.id}
                              onClick={() => runValuation(asset.id, asset.name)}
                              id={`valuation-${asset.id}`}
                            >
                              {valuationLoading === asset.id
                                ? <><Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> Fetching AVM…</>
                                : <><ValuationIcon size={10} /> Get Valuation</>}
                            </button>
                          </div>
                        )}
                        {valuationMsg?.assetId === asset.id && (
                          <div className={`flex items-center gap-1 text-xs mt-1 ${valuationMsg.ok ? "text-green" : "text-red"}`}>
                            {valuationMsg.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />} {valuationMsg.text}
                          </div>
                        )}
                      </td>
                      <td><span className="badge gold">{ASSET_TYPE_LABELS[asset.type] ?? asset.type}</span></td>
                      <td className="td-mono font-bold text-green">{formatZAR(Number(asset.currentValue))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Debts Section */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Liabilities &amp; Debts ({data.debts.length})</span>
              <span className="text-red font-bold">{formatZAR(data.totalDebts)}</span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Debt Account</th>
                    <th>Institution</th>
                    <th>Owed Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.debts.map((debt) => (
                    <tr key={debt.id}>
                      <td className="font-semibold">{debt.account.name}</td>
                      <td>{debt.account.institution}</td>
                      <td className="td-mono font-bold text-red">{formatZAR(Number(debt.currentBalance))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Deeds search modal */}
      {deedsModal && (
        <div className="modal-overlay" onClick={() => setDeedsModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Windeed — Deeds Search</h2>
              <button className="modal-close" onClick={() => setDeedsModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm mb-4">Search the Deeds Office for ownership, bonds, and transfer history for: <strong>{deedsModal.assetName}</strong></p>
              <div className="two-col mb-3" style={{ gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Search By</label>
                  <select className="form-select" value={deedsType} onChange={(e) => setDeedsType(e.target.value)} id="deeds-search-type">
                    <option value="ADDRESS">Street Address</option>
                    <option value="ERF_NUMBER">Erf / Stand Number</option>
                    <option value="ID_NUMBER">Owner SA ID Number</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Search Query</label>
                  <input className="form-input" value={deedsQuery} onChange={(e) => setDeedsQuery(e.target.value)}
                    placeholder={deedsType === "ADDRESS" ? "e.g. 12 Blossom Rd, Bakerton" : deedsType === "ERF_NUMBER" ? "e.g. ERF 1234 SPRINGS" : "e.g. 8001015009087"}
                    id="deeds-query-input" />
                </div>
              </div>

              {deedsError && (
                <div className="flex items-center gap-2 mb-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "var(--red)" }}>
                  <AlertCircle size={14} /> <span className="text-sm">{deedsError}</span>
                </div>
              )}

              {deedsResults && (
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "14px 16px", fontSize: 13, whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>
                  <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 12 }}>{JSON.stringify(deedsResults, null, 2)}</pre>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeedsModal(null)}>Close</button>
              <button className="btn btn-primary" onClick={runDeedsSearch} disabled={!deedsQuery.trim() || deedsLoading} id="deeds-search-run">
                {deedsLoading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Searching…</> : <><Search size={14} /> Search Deeds</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

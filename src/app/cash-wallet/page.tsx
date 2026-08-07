"use client";

import { useEffect, useState } from "react";
import { formatZAR } from "@/lib/formatters";
import {
  Wallet,
  ArrowDownRight,
  RefreshCw,
  PlusCircle,
  Coins,
  CheckCircle2,
  ShoppingCart,
  Car,
  Coffee,
  Home,
  ParkingSquare,
  Sparkles,
  Zap,
} from "lucide-react";

interface CashWalletData {
  cashWalletAccountId: string;
  accountName: string;
  trackedBalance: number;
  lastReconciledAt: string | null;
  recentFlows: Array<{
    id: string;
    date: string;
    type: string;
    description: string;
    amount: number;
  }>;
}

const CATEGORIES = [
  { id: "Groceries", label: "Groceries & Food", icon: ShoppingCart },
  { id: "Transport", label: "Taxi & Transport", icon: Car },
  { id: "Dining", label: "Coffee & Dining", icon: Coffee },
  { id: "Domestic", label: "Domestic Worker", icon: Home },
  { id: "Parking", label: "Parking & Tips", icon: ParkingSquare },
  { id: "Discretionary", label: "Discretionary", icon: Sparkles },
];

const PRESET_AMOUNTS = [50, 100, 150, 200, 500];

export default function CashWalletPage() {
  const [wallet, setWallet] = useState<CashWalletData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [spendCategory, setSpendCategory] = useState("Groceries");
  const [spendDesc, setSpendDesc] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const loadWallet = () => {
    fetch("/api/cash-wallet")
      .then((r) => r.json())
      .then((data) => {
        setWallet(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount) return;

    const res = await fetch("/api/cash-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "WITHDRAWAL",
        amount: parseFloat(withdrawAmount),
        description: "ATM Cash Withdrawal",
      }),
    });

    const data = await res.json();
    if (data.success) {
      setWallet(data.currentWallet);
      setWithdrawAmount("");
      setMessage("ATM withdrawal recorded successfully!");
    }
  };

  const handleSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spendAmount) return;

    const res = await fetch("/api/cash-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SPEND",
        amount: parseFloat(spendAmount),
        category: spendCategory,
        description: spendDesc || "Cash expense",
      }),
    });

    const data = await res.json();
    if (data.success) {
      setWallet(data.currentWallet);
      setSpendAmount("");
      setSpendDesc("");
      setMessage("Cash spend logged successfully!");
    }
  };

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countedCash) return;

    const res = await fetch("/api/cash-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "RECONCILE",
        actualCountedBalance: parseFloat(countedCash),
      }),
    });

    const data = await res.json();
    if (data.success) {
      setWallet(data.currentWallet);
      setCountedCash("");
      setMessage(
        `Physical cash reconciled! Adjustment: ${
          data.reconciliation.reconciliationAdjustment >= 0 ? "+" : ""
        }${formatZAR(data.reconciliation.reconciliationAdjustment)}`
      );
    }
  };

  const countedVal = parseFloat(countedCash) || 0;
  const variance = wallet ? countedVal - wallet.trackedBalance : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Cash Wallet
            <span className="badge badge-warning text-xs font-mono">Physical Cash</span>
          </h1>
          <p className="page-subtitle">
            Track physical cash on hand, ATM withdrawals, cash spending, and periodic cash reconciliation
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="badge badge-warning flex items-center gap-1.5 px-3 py-1 text-xs">
            <Wallet size={14} /> Virtual Cash Account
          </span>
        </div>
      </div>

      <div className="page-body">
        {loading || !wallet ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div className="animate-pulse text-muted">Loading Cash Wallet…</div>
          </div>
        ) : (
          <>
            {message && (
              <div
                style={{
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                  color: "#4ade80",
                  padding: "14px 18px",
                  borderRadius: "14px",
                  marginBottom: "20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <CheckCircle2 size={18} />
                {message}
              </div>
            )}

            {/* Master 2-Column Cash Wallet Grid */}
            <div className="cash-wallet-layout mb-6">
              {/* Left Column (380px Fixed Width): 3D Card & ATM Pass */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* 3D Metallic Wallet Card */}
                <div
                  style={{
                    borderRadius: "20px",
                    padding: "24px",
                    position: "relative",
                    overflow: "hidden",
                    background:
                      "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 60%, rgba(88, 28, 135, 0.4) 100%)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    boxShadow: "0 20px 45px rgba(0, 0, 0, 0.6)",
                  }}
                >
                  <div style={{ position: "absolute", right: "20px", top: "20px", opacity: 0.08, pointerEvents: "none" }}>
                    <Wallet size={140} style={{ color: "var(--gold)" }} />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "38px", height: "26px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: "#fbbf24", fontFamily: "var(--font-mono)" }}>
                        CHIP
                      </div>
                      <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                        CASH WALLET • **** 5829
                      </span>
                    </div>
                    <span className="badge badge-gold text-xs">Active</span>
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Coins size={16} style={{ color: "var(--gold)" }} /> Physical Cash Balance
                    </div>
                    <div style={{ fontSize: "36px", fontWeight: 900, color: "var(--gold-light)", fontFamily: "var(--font-sans)", letterSpacing: "-0.8px" }}>
                      {formatZAR(wallet.trackedBalance)}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
                    <div>
                      Reconciled:{" "}
                      <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                        {wallet.lastReconciledAt
                          ? new Date(wallet.lastReconciledAt).toLocaleDateString("en-ZA", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Never"}
                      </span>
                    </div>
                    <div style={{ color: "#4ade80", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={13} /> Traceable
                    </div>
                  </div>
                </div>

                {/* Quick ATM Withdrawal Card */}
                <div className="apple-card" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#60a5fa", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ArrowDownRight size={16} /> Record ATM Top-Up
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "14px" }}>
                    Withdrew cash from an ATM? Record it here to update your physical wallet balance.
                  </p>

                  <form onSubmit={handleWithdrawal} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                        Withdrawal Amount (R)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="form-input"
                        style={{ fontSize: "14px", fontWeight: 700 }}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                      + Record ATM Withdrawal
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column (Flex 1): Expense Logger & Reconciliation Audit */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Quick Cash Expense Logger */}
                <div className="apple-card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px", marginBottom: "18px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4ade80", display: "flex", alignItems: "center", gap: "8px" }}>
                      <PlusCircle size={18} /> Quick Cash Expense Logger
                    </span>
                  </div>

                  <form onSubmit={handleSpend} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Category Selector Grid */}
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
                        Category
                      </label>
                      <div className="category-btn-grid">
                        {CATEGORIES.map((cat) => {
                          const Icon = cat.icon;
                          const isSelected = spendCategory === cat.id;

                          return (
                            <button
                              type="button"
                              key={cat.id}
                              onClick={() => setSpendCategory(cat.id)}
                              style={{
                                padding: "10px",
                                borderRadius: "12px",
                                border: isSelected ? "2px solid #10b981" : "1px solid var(--border)",
                                background: isSelected ? "rgba(16, 185, 129, 0.15)" : "rgba(7, 11, 20, 0.8)",
                                color: isSelected ? "#34d399" : "var(--text-secondary)",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: 700,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "4px",
                                transition: "all 0.2s ease",
                              }}
                            >
                              <Icon size={16} />
                              <span style={{ textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Amount Input & Preset Chips */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)" }}>
                          Amount Spent (R)
                        </label>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>ZAR Currency</span>
                      </div>

                      <input
                        type="number"
                        placeholder="e.g. 150"
                        value={spendAmount}
                        onChange={(e) => setSpendAmount(e.target.value)}
                        className="form-input"
                        style={{ fontSize: "18px", fontWeight: 800, color: "#34d399", marginBottom: "8px" }}
                        required
                      />

                      {/* Preset Chips */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginRight: "4px" }}>Quick Add:</span>
                        {PRESET_AMOUNTS.map((amt) => (
                          <button
                            type="button"
                            key={amt}
                            onClick={() => setSpendAmount(amt.toString())}
                            className="apple-pill-btn"
                            style={{ fontSize: "11px", padding: "3px 10px", background: "rgba(255,255,255,0.03)" }}
                          >
                            +R{amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                        Merchant / Note (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Fresh produce market"
                        value={spendDesc}
                        onChange={(e) => setSpendDesc(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                      <PlusCircle size={16} /> Log Cash Expense
                    </button>
                  </form>
                </div>

                {/* Physical Cash Reconciliation Audit */}
                <div className="apple-card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px", marginBottom: "18px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gold-light)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <RefreshCw size={18} style={{ color: "var(--gold)" }} /> Physical Cash Reconciliation Audit
                    </span>
                  </div>

                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
                    Count your actual physical notes and enter the total amount. The system will automatically compute any variance and log a balancing adjustment flow.
                  </p>

                  <form onSubmit={handleReconcile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                        Actual Counted Physical Cash (R)
                      </label>
                      <input
                        type="number"
                        placeholder={`e.g. ${wallet.trackedBalance}`}
                        value={countedCash}
                        onChange={(e) => setCountedCash(e.target.value)}
                        className="form-input"
                        style={{ fontSize: "16px", fontWeight: 800, color: "var(--gold-light)" }}
                        required
                      />
                    </div>

                    {/* Live Variance Calculation Badge */}
                    {countedCash && (
                      <div
                        style={{
                          padding: "14px 18px",
                          borderRadius: "14px",
                          border: Math.abs(variance) <= 0.01 ? "1px solid rgba(34, 197, 94, 0.4)" : variance < 0 ? "1px solid rgba(244, 63, 94, 0.4)" : "1px solid rgba(59, 130, 246, 0.4)",
                          background: Math.abs(variance) <= 0.01 ? "rgba(34, 197, 94, 0.08)" : variance < 0 ? "rgba(244, 63, 94, 0.08)" : "rgba(59, 130, 246, 0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                            Calculated Variance
                          </div>
                          <div style={{ fontSize: "15px", fontWeight: 800, fontFamily: "var(--font-mono)", color: Math.abs(variance) <= 0.01 ? "#4ade80" : variance < 0 ? "#f87171" : "#60a5fa" }}>
                            {variance > 0 ? "+" : ""}{formatZAR(variance)}
                          </div>
                        </div>

                        <span className={`badge ${Math.abs(variance) <= 0.01 ? "confirmed" : variance < 0 ? "danger" : "blue"}`}>
                          {Math.abs(variance) <= 0.01 ? "Balanced" : variance < 0 ? "Shortage / Missing Cash" : "Surplus Found Cash"}
                        </span>
                      </div>
                    )}

                    <button type="submit" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
                      <RefreshCw size={15} /> Reconcile Physical Cash
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Bottom Stream: Flow History Table */}
            <div className="card">
              <div className="card-header border-b border-slate-800/80 pb-3 mb-4">
                <span className="card-title flex items-center gap-2">
                  <Coins size={18} className="text-amber-400" /> Cash Wallet Flow Stream
                </span>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Flow Type</th>
                      <th>Description</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallet.recentFlows.map((f) => (
                      <tr key={f.id}>
                        <td className="td-mono text-muted text-xs">{f.date}</td>
                        <td>
                          <span
                            className={`badge ${f.amount > 0 ? "confirmed" : "danger"}`}
                          >
                            {f.type}
                          </span>
                        </td>
                        <td className="font-semibold text-slate-200">{f.description}</td>
                        <td
                          className={`text-right font-extrabold td-mono ${
                            f.amount > 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {f.amount > 0 ? "+" : ""}
                          {formatZAR(f.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

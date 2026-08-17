"use client";

import { useEffect, useState, useMemo } from "react";
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
  Flower2,
  UserCheck,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Scale,
  Calendar,
  AlertCircle,
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
  { id: "Domestic Worker", label: "Domestic Worker", icon: Home, color: "#38bdf8", defaultDesc: "Fortnightly Cleaning & Housekeeping" },
  { id: "Garden Services", label: "Garden Services", icon: Flower2, color: "#34d399", defaultDesc: "Garden Maintenance & Lawn Care" },
  { id: "Groceries", label: "Groceries & Food", icon: ShoppingCart, color: "#fbbf24", defaultDesc: "Fresh Produce & Local Market" },
  { id: "Transport", label: "Taxi & Transport", icon: Car, color: "#a78bfa", defaultDesc: "Local Transport / Fuel Cash" },
  { id: "Dining", label: "Coffee & Dining", icon: Coffee, color: "#f472b6", defaultDesc: "Café & Daily Meals" },
  { id: "Parking", label: "Parking & Tips", icon: ParkingSquare, color: "#94a3b8", defaultDesc: "Car Guard & Parking Fee" },
  { id: "Discretionary", label: "Discretionary", icon: Sparkles, color: "#c084fc", defaultDesc: "Misc Cash Expense" },
];

const PRESET_AMOUNTS = [100, 200, 500, 700, 950, 1000];

export default function CashWalletPage() {
  const [wallet, setWallet] = useState<CashWalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"ALL" | "INFLOW" | "DOMESTIC_GARDEN" | "SPEND">("ALL");

  // Form states
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [spendCategory, setSpendCategory] = useState("Domestic Worker");
  const [spendDesc, setSpendDesc] = useState("Domestic Worker Wage");
  const [countedCash, setCountedCash] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadWallet = () => {
    setLoading(true);
    fetch("/api/cash-wallet")
      .then((r) => r.json())
      .then((data) => {
        setWallet(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading cash wallet:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const handleCategorySelect = (catId: string) => {
    setSpendCategory(catId);
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (cat) {
      setSpendDesc(cat.defaultDesc);
      if (catId === "Domestic Worker") setSpendAmount("950");
      else if (catId === "Garden Services") setSpendAmount("700");
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/cash-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "WITHDRAWAL",
          amount: parseFloat(withdrawAmount),
          description: "ATM Cash Withdrawal (Autobank Sandton)",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setWallet(data);
        setWithdrawAmount("");
        setMessage({ text: `ATM withdrawal of R${parseFloat(withdrawAmount).toFixed(2)} recorded to Cash Wallet!`, type: "success" });
      } else {
        throw new Error(data.error || "Failed to record withdrawal");
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to record withdrawal", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spendAmount) return;

    setSubmitting(true);
    setMessage(null);

    try {
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
      if (res.ok) {
        setWallet(data);
        setSpendAmount("");
        setMessage({ text: `Cash expense for ${spendCategory} logged successfully!`, type: "success" });
      } else {
        throw new Error(data.error || "Failed to log cash expense");
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to log cash expense", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countedCash) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/cash-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECONCILE",
          actualCountedBalance: parseFloat(countedCash),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setWallet(data);
        setCountedCash("");
        setMessage({ text: `Physical cash reconciled! Tracked balance updated to ${formatZAR(parseFloat(countedCash))}.`, type: "success" });
      } else {
        throw new Error(data.error || "Failed to reconcile");
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to reconcile cash", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    if (!wallet || !wallet.recentFlows) {
      return { totalInflow: 0, totalOutflow: 0, domesticGardenTotal: 0, count: 0 };
    }

    let totalInflow = 0;
    let totalOutflow = 0;
    let domesticGardenTotal = 0;

    wallet.recentFlows.forEach((f) => {
      if (f.amount > 0) {
        totalInflow += f.amount;
      } else {
        const absAmt = Math.abs(f.amount);
        totalOutflow += absAmt;
        if (f.description.includes("Domestic") || f.description.includes("Garden")) {
          domesticGardenTotal += absAmt;
        }
      }
    });

    return { totalInflow, totalOutflow, domesticGardenTotal, count: wallet.recentFlows.length };
  }, [wallet]);

  // Filtered flows list
  const filteredFlows = useMemo(() => {
    if (!wallet || !wallet.recentFlows) return [];
    return wallet.recentFlows.filter((f) => {
      if (filterType === "INFLOW") return f.amount > 0;
      if (filterType === "SPEND") return f.amount < 0;
      if (filterType === "DOMESTIC_GARDEN") {
        return f.description.includes("Domestic") || f.description.includes("Garden");
      }
      return true;
    });
  }, [wallet, filterType]);

  const countedVal = parseFloat(countedCash) || 0;
  const variance = wallet ? countedVal - wallet.trackedBalance : 0;

  return (
    <div className="page-container" style={{ padding: "32px 40px", maxWidth: "1320px", margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fbbf24",
              }}
            >
              <Wallet size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", margin: 0, letterSpacing: "-0.5px" }}>
                Physical Cash Wallet
              </h1>
              <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0, marginTop: "2px" }}>
                Track physical cash on hand, ATM withdrawals, domestic worker wages, garden services, and periodic physical count reconciliations.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={loadWallet}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#94a3b8",
              padding: "10px 16px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: "600",
              backdropFilter: "blur(12px)",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh Wallet
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {message && (
        <div
          style={{
            padding: "14px 20px",
            borderRadius: "12px",
            marginBottom: "28px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: message.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
            color: message.type === "success" ? "#34d399" : "#f87171",
            fontSize: "14px",
            fontWeight: "600",
            backdropFilter: "blur(12px)",
          }}
        >
          {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {loading && !wallet ? (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <div className="animate-pulse" style={{ color: "var(--gold-light)", fontSize: "16px", fontWeight: "700" }}>
            Loading Physical Cash Wallet &amp; Domestic Ledger…
          </div>
        </div>
      ) : wallet ? (
        <>
          {/* Top 4 Core Stat Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "32px" }}>
            {/* Card 1: Tracked Cash Balance */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "18px",
                padding: "22px 24px",
                position: "relative",
                backdropFilter: "blur(20px)",
                boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Physical Cash in Hand
                </span>
                <span style={{ padding: "3px 10px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", fontSize: "11px", fontWeight: "800" }}>
                  Active
                </span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: "900", color: "#fbbf24", fontFamily: "var(--font-sans)", letterSpacing: "-0.5px" }}>
                {formatZAR(wallet.trackedBalance)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
                <ShieldCheck size={14} style={{ color: "#34d399" }} /> Reconciled with physical count
              </div>
            </div>

            {/* Card 2: Total ATM Cash Inflows */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "18px",
                padding: "22px 24px",
                backdropFilter: "blur(16px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Total ATM Inflows
                </span>
                <span style={{ padding: "3px 8px", borderRadius: "8px", background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
                  <TrendingUp size={14} />
                </span>
              </div>
              <div style={{ fontSize: "30px", fontWeight: "900", color: "#60a5fa", fontFamily: "var(--font-sans)" }}>
                +{formatZAR(metrics.totalInflow)}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
                From Standard Bank Cheque Autobank
              </div>
            </div>

            {/* Card 3: Domestic & Garden Services */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "18px",
                padding: "22px 24px",
                backdropFilter: "blur(16px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Domestic &amp; Garden Care
                </span>
                <span style={{ padding: "3px 8px", borderRadius: "8px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                  <UserCheck size={14} />
                </span>
              </div>
              <div style={{ fontSize: "30px", fontWeight: "900", color: "#38bdf8", fontFamily: "var(--font-sans)" }}>
                -{formatZAR(metrics.domesticGardenTotal)}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
                R950 Domestic Wage + R700 Garden Care
              </div>
            </div>

            {/* Card 4: Total Allocated Cash Spend */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "18px",
                padding: "22px 24px",
                backdropFilter: "blur(16px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Total Cash Allocated
                </span>
                <span style={{ padding: "3px 8px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.15)", color: "#f87171" }}>
                  <TrendingDown size={14} />
                </span>
              </div>
              <div style={{ fontSize: "30px", fontWeight: "900", color: "#f87171", fontFamily: "var(--font-sans)" }}>
                -{formatZAR(metrics.totalOutflow)}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
                100% accounted into budget categories
              </div>
            </div>
          </div>

          {/* Main 2-Column Section */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: "28px", marginBottom: "36px" }}>
            {/* Left Column: 3D Physical Card & ATM Inflow Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Apple-styled Metallic Cash Card */}
              <div
                style={{
                  borderRadius: "22px",
                  padding: "28px",
                  position: "relative",
                  overflow: "hidden",
                  background: "linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #312e81 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
                }}
              >
                <div style={{ position: "absolute", right: "20px", bottom: "-10px", opacity: 0.06, pointerEvents: "none" }}>
                  <Wallet size={160} style={{ color: "#fbbf24" }} />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "28px",
                        borderRadius: "6px",
                        background: "linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.1))",
                        border: "1px solid rgba(245, 158, 11, 0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: "900",
                        color: "#fbbf24",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      EMV
                    </div>
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#cbd5e1", letterSpacing: "1px", fontWeight: "700" }}>
                      PHYSICAL CASH VAULT
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      background: "rgba(16, 185, 129, 0.2)",
                      color: "#34d399",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                    }}
                  >
                    Audited
                  </span>
                </div>

                <div style={{ marginBottom: "28px" }}>
                  <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                    Available Cash on Hand
                  </div>
                  <div style={{ fontSize: "40px", fontWeight: "900", color: "#fbbf24", fontFamily: "var(--font-sans)", letterSpacing: "-1px" }}>
                    {formatZAR(wallet.trackedBalance)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "16px" }}>
                  <div>
                    Account ID: <span style={{ color: "#f8fafc", fontFamily: "var(--font-mono)", fontWeight: "600" }}>CASH-WALLET-01</span>
                  </div>
                  <div style={{ color: "#34d399", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={14} /> Full Lineage Grounded
                  </div>
                </div>
              </div>

              {/* ATM Cash Withdrawal Top-Up */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "24px",
                  backdropFilter: "blur(16px)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ color: "#60a5fa" }}>
                    <ArrowDownRight size={20} />
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                    Record ATM Cash Withdrawal
                  </h3>
                </div>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 18px 0" }}>
                  Withdrew cash from an ATM? Record it here to link the bank withdrawal to your physical cash wallet.
                </p>

                <form onSubmit={handleWithdrawal} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                      Withdrawal Amount (ZAR)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 2500"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        background: "rgba(7, 11, 20, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "10px",
                        color: "#60a5fa",
                        fontSize: "16px",
                        fontWeight: "800",
                        outline: "none",
                      }}
                      required
                    />
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {[1000, 2000, 2500, 3000].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setWithdrawAmount(preset.toString())}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          color: "#94a3b8",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        +R{preset}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "800",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      marginTop: "6px",
                      boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    <PlusCircle size={16} /> Record ATM Withdrawal
                  </button>
                </form>
              </div>

              {/* Physical Cash Reconciliation Audit */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  borderRadius: "20px",
                  padding: "24px",
                  backdropFilter: "blur(16px)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ color: "#fbbf24" }}>
                    <Scale size={20} />
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                    Physical Cash Reconciliation Audit
                  </h3>
                </div>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 16px 0" }}>
                  Count your actual physical notes and enter the total. The system will audit any variance and balance your ledger.
                </p>

                <form onSubmit={handleReconcile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                      Counted Physical Cash in Hand (ZAR)
                    </label>
                    <input
                      type="number"
                      placeholder={`e.g. ${wallet.trackedBalance}`}
                      value={countedCash}
                      onChange={(e) => setCountedCash(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        background: "rgba(7, 11, 20, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "10px",
                        color: "#fbbf24",
                        fontSize: "16px",
                        fontWeight: "800",
                        outline: "none",
                      }}
                      required
                    />
                  </div>

                  {countedCash && (
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: "10px",
                        background: Math.abs(variance) <= 0.01 ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                        border: `1px solid ${Math.abs(variance) <= 0.01 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>
                          Audit Variance
                        </div>
                        <div style={{ fontSize: "15px", fontWeight: "800", color: Math.abs(variance) <= 0.01 ? "#34d399" : "#f87171" }}>
                          {variance > 0 ? "+" : ""}{formatZAR(variance)}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          background: Math.abs(variance) <= 0.01 ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          color: Math.abs(variance) <= 0.01 ? "#34d399" : "#f87171",
                        }}
                      >
                        {Math.abs(variance) <= 0.01 ? "Perfect Match" : variance < 0 ? "Shortage" : "Surplus"}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#fbbf24",
                      fontSize: "14px",
                      fontWeight: "800",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <RefreshCw size={15} /> Reconcile Physical Cash
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Quick Cash Expense Logger (Domestic, Garden, Living) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "22px",
                  padding: "28px",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "16px", marginBottom: "22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ color: "#34d399" }}>
                      <PlusCircle size={22} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                        Log Cash Expense
                      </h2>
                      <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, marginTop: "2px" }}>
                        Select a category to record domestic wages, garden care, or daily spending.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSpend} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Category Selection Grid */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "10px" }}>
                      Expense Category
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = spendCategory === cat.id;

                        return (
                          <button
                            type="button"
                            key={cat.id}
                            onClick={() => handleCategorySelect(cat.id)}
                            style={{
                              padding: "14px 10px",
                              borderRadius: "14px",
                              border: isSelected ? `2px solid ${cat.color}` : "1px solid rgba(255, 255, 255, 0.08)",
                              background: isSelected ? "rgba(255, 255, 255, 0.08)" : "rgba(7, 11, 20, 0.6)",
                              color: isSelected ? cat.color : "#94a3b8",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "700",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "8px",
                              transition: "all 0.2s",
                              boxShadow: isSelected ? `0 0 16px ${cat.color}25` : "none",
                            }}
                          >
                            <Icon size={20} />
                            <span style={{ textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                              {cat.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Amount Input & Preset Chips */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1" }}>
                        Amount Spent (ZAR)
                      </label>
                      <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "var(--font-mono)" }}>
                        Current Wallet: {formatZAR(wallet.trackedBalance)}
                      </span>
                    </div>

                    <input
                      type="number"
                      placeholder="e.g. 950"
                      value={spendAmount}
                      onChange={(e) => setSpendAmount(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "14px 18px",
                        background: "rgba(7, 11, 20, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "12px",
                        color: "#34d399",
                        fontSize: "22px",
                        fontWeight: "900",
                        outline: "none",
                        marginBottom: "10px",
                      }}
                      required
                    />

                    {/* Presets */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Presets:</span>
                      {PRESET_AMOUNTS.map((amt) => (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => setSpendAmount(amt.toString())}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "8px",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            color: "#cbd5e1",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                        >
                          R{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description / Note */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                      Description &amp; Recipient Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Domestic worker wage or Garden service"
                      value={spendDesc}
                      onChange={(e) => setSpendDesc(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        background: "rgba(7, 11, 20, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "10px",
                        color: "#f8fafc",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: "14px",
                      borderRadius: "12px",
                      border: "none",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#ffffff",
                      fontSize: "15px",
                      fontWeight: "800",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)",
                      marginTop: "6px",
                    }}
                  >
                    <PlusCircle size={18} /> Log {spendCategory} Expense
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Bottom Stream: Flow History Table */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "22px",
              padding: "28px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ color: "#fbbf24" }}>
                  <Coins size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                    Cash Flow Stream &amp; Domestic Ledger
                  </h3>
                  <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                    Complete audit trail of physical cash inflows, domestic worker wages, and garden services.
                  </p>
                </div>
              </div>

              {/* Segmented Filter Pills */}
              <div
                style={{
                  background: "rgba(7, 11, 20, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "4px",
                  display: "flex",
                  gap: "4px",
                }}
              >
                {[
                  { id: "ALL", label: "All Flows" },
                  { id: "DOMESTIC_GARDEN", label: "Domestic & Garden" },
                  { id: "INFLOW", label: "ATM Inflows" },
                  { id: "SPEND", label: "Cash Spends" },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setFilterType(pill.id as any)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: "none",
                      background: filterType === pill.id ? "rgba(245, 158, 11, 0.2)" : "transparent",
                      color: filterType === pill.id ? "#fbbf24" : "#94a3b8",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <th style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>Date</th>
                    <th style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>Type</th>
                    <th style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>Description &amp; Recipient</th>
                    <th style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", textAlign: "right" }}>Amount (ZAR)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFlows.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                        No cash flows match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredFlows.map((f) => {
                      const isDomestic = f.description.includes("Domestic");
                      const isGarden = f.description.includes("Garden");
                      const isAtm = f.amount > 0;

                      return (
                        <tr
                          key={f.id}
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                            transition: "background 0.2s",
                          }}
                        >
                          <td style={{ padding: "16px", color: "#94a3b8", fontSize: "13px", fontFamily: "var(--font-mono)" }}>
                            {f.date}
                          </td>
                          <td style={{ padding: "16px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "800",
                                padding: "4px 10px",
                                borderRadius: "8px",
                                background: isAtm
                                  ? "rgba(59, 130, 246, 0.15)"
                                  : isDomestic
                                  ? "rgba(56, 189, 248, 0.15)"
                                  : isGarden
                                  ? "rgba(52, 211, 153, 0.15)"
                                  : "rgba(239, 68, 68, 0.15)",
                                color: isAtm
                                  ? "#60a5fa"
                                  : isDomestic
                                  ? "#38bdf8"
                                  : isGarden
                                  ? "#34d399"
                                  : "#f87171",
                                border: `1px solid ${
                                  isAtm
                                    ? "rgba(59, 130, 246, 0.3)"
                                    : isDomestic
                                    ? "rgba(56, 189, 248, 0.3)"
                                    : isGarden
                                    ? "rgba(52, 211, 153, 0.3)"
                                    : "rgba(239, 68, 68, 0.3)"
                                }`,
                              }}
                            >
                              {f.type}
                            </span>
                          </td>
                          <td style={{ padding: "16px", color: "#f8fafc", fontSize: "14px", fontWeight: "600" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {isDomestic && <Home size={15} style={{ color: "#38bdf8" }} />}
                              {isGarden && <Flower2 size={15} style={{ color: "#34d399" }} />}
                              {isAtm && <ArrowDownRight size={15} style={{ color: "#60a5fa" }} />}
                              {f.description}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "16px",
                              textAlign: "right",
                              fontFamily: "var(--font-mono)",
                              fontSize: "15px",
                              fontWeight: "900",
                              color: f.amount > 0 ? "#60a5fa" : "#f87171",
                            }}
                          >
                            {f.amount > 0 ? "+" : ""}
                            {formatZAR(f.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

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
  Layers,
  Split,
  Trash2,
  X,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

interface UnallocatedBatch {
  id: string;
  date: string;
  sourceAccountName: string;
  originalAmount: number;
  unallocatedAmount: number;
  allocatedAmount: number;
  status: string;
  childSplits: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
  }>;
}

interface CashWalletData {
  cashWalletAccountId: string;
  accountName: string;
  trackedBalance: number;
  totalUnallocatedCash?: number;
  unallocatedBatches?: UnallocatedBatch[];
  lastReconciledAt: string | null;
  recentFlows: Array<{
    id: string;
    parentFlowId?: string | null;
    date: string;
    type: string;
    description: string;
    amount: number;
  }>;
}

interface SplitItemForm {
  id: string;
  description: string;
  category: string;
  amount: string;
  budgetCategory: string;
}

const CATEGORIES = [
  { id: "Domestic Worker", label: "Domestic Worker", icon: Home, color: "#38bdf8", defaultDesc: "Fortnightly Cleaning & Housekeeping", budgetCategory: "FIXED_HOUSEHOLD_OBLIGATIONS" },
  { id: "Garden Services", label: "Garden Services", icon: Flower2, color: "#34d399", defaultDesc: "Garden Maintenance & Lawn Care", budgetCategory: "FIXED_HOUSEHOLD_OBLIGATIONS" },
  { id: "Groceries", label: "Groceries & Food", icon: ShoppingCart, color: "#fbbf24", defaultDesc: "Fresh Produce & Local Market", budgetCategory: "FAMILY_AND_DISCRETIONARY" },
  { id: "Transport", label: "Taxi & Transport", icon: Car, color: "#a78bfa", defaultDesc: "Local Transport / Fuel Cash", budgetCategory: "FAMILY_AND_DISCRETIONARY" },
  { id: "Dining", label: "Coffee & Dining", icon: Coffee, color: "#f472b6", defaultDesc: "Café & Daily Meals", budgetCategory: "FAMILY_AND_DISCRETIONARY" },
  { id: "Parking", label: "Parking & Tips", icon: ParkingSquare, color: "#94a3b8", defaultDesc: "Car Guard & Parking Fee", budgetCategory: "FAMILY_AND_DISCRETIONARY" },
  { id: "Discretionary", label: "Discretionary", icon: Sparkles, color: "#c084fc", defaultDesc: "Misc Cash Expense", budgetCategory: "FAMILY_AND_DISCRETIONARY" },
];

const PRESET_SPLIT_CHIPS = [
  { label: "Domestic Worker", category: "Domestic Worker", amount: 950, desc: "Domestic Worker Fortnightly Wage", budgetCategory: "FIXED_HOUSEHOLD_OBLIGATIONS" },
  { label: "Garden Services", category: "Garden Services", amount: 700, desc: "Garden Maintenance & Lawn Care", budgetCategory: "FIXED_HOUSEHOLD_OBLIGATIONS" },
  { label: "Market Groceries", category: "Groceries", amount: 850, desc: "Fresh Produce & Local Market", budgetCategory: "FAMILY_AND_DISCRETIONARY" },
  { label: "Taxi / Commute", category: "Transport", amount: 300, desc: "Local Transport & Taxi Cash", budgetCategory: "FAMILY_AND_DISCRETIONARY" },
  { label: "Parking & Tips", category: "Parking", amount: 200, desc: "Car Guard Tips & Parking", budgetCategory: "FAMILY_AND_DISCRETIONARY" },
];

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

  // Multi-item ATM Split Modal state
  const [selectedBatchForSplit, setSelectedBatchForSplit] = useState<UnallocatedBatch | null>(null);
  const [splitRows, setSplitRows] = useState<SplitItemForm[]>([]);
  const [splitSubmitting, setSplitSubmitting] = useState(false);

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

  const openSplitModal = (batch: UnallocatedBatch) => {
    setSelectedBatchForSplit(batch);
    if (batch.childSplits && batch.childSplits.length > 0) {
      setSplitRows(
        batch.childSplits.map((c) => ({
          id: c.id,
          description: c.description,
          category: c.description.includes("Domestic") ? "Domestic Worker" : c.description.includes("Garden") ? "Garden Services" : "Groceries",
          amount: c.amount.toString(),
          budgetCategory: "FIXED_HOUSEHOLD_OBLIGATIONS",
        }))
      );
    } else {
      // Default initial split suggestions
      setSplitRows([
        { id: "1", description: "Domestic Worker Wage", category: "Domestic Worker", amount: "950", budgetCategory: "FIXED_HOUSEHOLD_OBLIGATIONS" },
        { id: "2", description: "Garden Maintenance", category: "Garden Services", amount: "700", budgetCategory: "FIXED_HOUSEHOLD_OBLIGATIONS" },
        { id: "3", description: "Fresh Produce & Groceries", category: "Groceries", amount: "850", budgetCategory: "FAMILY_AND_DISCRETIONARY" },
        { id: "4", description: "Taxi & Local Transport", category: "Transport", amount: "300", budgetCategory: "FAMILY_AND_DISCRETIONARY" },
        { id: "5", description: "Parking & Tips", category: "Parking", amount: "200", budgetCategory: "FAMILY_AND_DISCRETIONARY" },
      ]);
    }
  };

  const handleAddSplitRow = () => {
    setSplitRows([
      ...splitRows,
      {
        id: Date.now().toString(),
        description: "Misc Cash Expense",
        category: "Discretionary",
        amount: "100",
        budgetCategory: "FAMILY_AND_DISCRETIONARY",
      },
    ]);
  };

  const handleRemoveSplitRow = (idx: number) => {
    setSplitRows(splitRows.filter((_, i) => i !== idx));
  };

  const handleUpdateSplitRow = (idx: number, field: keyof SplitItemForm, value: string) => {
    const updated = [...splitRows];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "category") {
      const found = CATEGORIES.find((c) => c.id === value);
      if (found) {
        updated[idx].budgetCategory = found.budgetCategory;
      }
    }
    setSplitRows(updated);
  };

  const handleAddPresetChip = (chip: typeof PRESET_SPLIT_CHIPS[0]) => {
    setSplitRows([
      ...splitRows,
      {
        id: Date.now().toString(),
        description: chip.desc,
        category: chip.category,
        amount: chip.amount.toString(),
        budgetCategory: chip.budgetCategory,
      },
    ]);
  };

  const totalSplitSum = useMemo(() => {
    return splitRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  }, [splitRows]);

  const remainingCashOnHand = useMemo(() => {
    if (!selectedBatchForSplit) return 0;
    return Math.max(0, selectedBatchForSplit.originalAmount - totalSplitSum);
  }, [selectedBatchForSplit, totalSplitSum]);

  const handleSaveSplit = async () => {
    if (!selectedBatchForSplit) return;
    setSplitSubmitting(true);
    try {
      const res = await fetch("/api/cash-wallet/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentFlowId: selectedBatchForSplit.id,
          splits: splitRows.map((r) => ({
            description: r.description,
            category: r.category,
            amount: parseFloat(r.amount) || 0,
            budgetCategory: r.budgetCategory,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          text: `ATM withdrawal of R${selectedBatchForSplit.originalAmount.toFixed(2)} successfully split into ${splitRows.length} items! Remaining R${remainingCashOnHand.toFixed(2)} tracked in physical wallet.`,
          type: "success",
        });
        setSelectedBatchForSplit(null);
        loadWallet();
      } else {
        throw new Error(data.error || "Failed to save split");
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to split withdrawal", type: "error" });
    } finally {
      setSplitSubmitting(false);
    }
  };

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
        setMessage({ text: `Physical count reconciled. Tracked balance updated to R${parseFloat(countedCash).toFixed(2)}.`, type: "success" });
      } else {
        throw new Error(data.error || "Failed to reconcile balance");
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to reconcile balance", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Compute metrics
  const metrics = useMemo(() => {
    if (!wallet) return { totalInflow: 0, totalOutflow: 0, domesticSpend: 0, gardenSpend: 0 };
    let totalInflow = 0;
    let totalOutflow = 0;
    let domesticSpend = 0;
    let gardenSpend = 0;

    for (const f of wallet.recentFlows) {
      if (f.amount > 0) {
        totalInflow += f.amount;
      } else {
        const abs = Math.abs(f.amount);
        totalOutflow += abs;
        if (f.description.includes("Domestic")) domesticSpend += abs;
        if (f.description.includes("Garden")) gardenSpend += abs;
      }
    }

    return { totalInflow, totalOutflow, domesticSpend, gardenSpend };
  }, [wallet]);

  // Filtered flows
  const filteredFlows = useMemo(() => {
    if (!wallet) return [];
    return wallet.recentFlows.filter((f) => {
      if (filterType === "INFLOW") return f.amount > 0;
      if (filterType === "DOMESTIC_GARDEN") return f.description.includes("Domestic") || f.description.includes("Garden");
      if (filterType === "SPEND") return f.amount < 0;
      return true;
    });
  }, [wallet, filterType]);

  return (
    <>
      {/* Apple-Caliber Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1 className="page-title">Physical Cash Wallet &amp; ATM Split</h1>
            <span className="badge gold">
              <Sparkles size={11} /> 100x Split Engine
            </span>
          </div>
          <p className="page-subtitle">
            Extract ATM withdrawals from bank statements, split cash batches into multi-item expenses, and maintain 100% audited cash reconciliation.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={loadWallet}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh Wallet
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Notification Banner */}
        {message && (
          <div
            style={{
              padding: "14px 20px",
              borderRadius: "12px",
              marginBottom: "24px",
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
            <div className="stat-grid mb-6">
              {/* Card 1: Tracked Cash Balance */}
              <div className="stat-card" style={{ borderColor: "rgba(245, 158, 11, 0.4)", boxShadow: "0 10px 30px -10px rgba(245, 158, 11, 0.25)" }}>
                <div className="stat-label flex items-center justify-between" style={{ color: "#fbbf24" }}>
                  <span>Physical Cash on Hand</span>
                  <span className="badge gold">Active</span>
                </div>
                <div className="stat-value gold" style={{ fontSize: "28px", margin: "8px 0 4px 0" }}>
                  {formatZAR(wallet.trackedBalance)}
                </div>
                <div className="stat-sub flex items-center gap-1.5">
                  <ShieldCheck size={14} style={{ color: "#34d399" }} /> Reconciled with physical count
                </div>
              </div>

              {/* Card 2: Total ATM Cash Inflows */}
              <div className="stat-card info">
                <div className="stat-label flex items-center justify-between" style={{ color: "#60a5fa" }}>
                  <span>Total ATM Inflows</span>
                  <TrendingUp size={16} />
                </div>
                <div className="stat-value blue" style={{ fontSize: "28px", margin: "8px 0 4px 0" }}>
                  +{formatZAR(metrics.totalInflow)}
                </div>
                <div className="stat-sub">From Standard Bank Cheque Autobank</div>
              </div>

              {/* Card 3: Domestic & Garden Services */}
              <div className="stat-card">
                <div className="stat-label flex items-center justify-between" style={{ color: "#38bdf8" }}>
                  <span>Domestic &amp; Garden Care</span>
                  <UserCheck size={16} />
                </div>
                <div className="stat-value cyan" style={{ fontSize: "28px", margin: "8px 0 4px 0" }}>
                  {formatZAR(metrics.domesticSpend + metrics.gardenSpend)}
                </div>
                <div className="stat-sub">R950 Domestic Wage + R700 Garden Care</div>
              </div>

              {/* Card 4: Total Allocated Cash Spend */}
              <div className="stat-card warning">
                <div className="stat-label flex items-center justify-between" style={{ color: "#f87171" }}>
                  <span>Total Cash Allocated</span>
                  <TrendingDown size={16} />
                </div>
                <div className="stat-value red" style={{ fontSize: "28px", margin: "8px 0 4px 0" }}>
                  -{formatZAR(metrics.totalOutflow)}
                </div>
                <div className="stat-sub">100% accounted into budget categories</div>
              </div>
            </div>

          {/* 🌟 VECTOR 8: UNALLOCATED ATM WITHDRAWALS ACTION CENTER */}
          {wallet.unallocatedBatches && wallet.unallocatedBatches.length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)",
                border: "1px solid rgba(96, 165, 250, 0.35)",
                borderRadius: "20px",
                padding: "24px",
                marginBottom: "32px",
                backdropFilter: "blur(20px)",
                boxShadow: "0 14px 34px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "rgba(96, 165, 250, 0.2)",
                      border: "1px solid rgba(96, 165, 250, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#60a5fa",
                    }}
                  >
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                      Extracted Bank Statement ATM Withdrawals
                    </h3>
                    <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, marginTop: "2px" }}>
                      Bank statements detected {wallet.unallocatedBatches.length} cash withdrawal batch(es). Split into itemized expenses to eliminate phantom leakage.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "600" }}>
                    Unallocated Inflow:
                  </span>
                  <span style={{ fontSize: "18px", fontWeight: "900", color: "#60a5fa", fontFamily: "var(--font-mono)" }}>
                    {formatZAR(wallet.totalUnallocatedCash || 0)}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                {wallet.unallocatedBatches.map((batch) => (
                  <div
                    key={batch.id}
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "16px",
                      padding: "18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "var(--font-mono)", fontWeight: "600" }}>
                          📅 {batch.date}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: batch.unallocatedAmount === 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: batch.unallocatedAmount === 0 ? "#34d399" : "#fbbf24",
                            border: `1px solid ${batch.unallocatedAmount === 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                          }}
                        >
                          {batch.unallocatedAmount === 0 ? "100% Reconciled" : "Pending Split"}
                        </span>
                      </div>

                      <div style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc", marginBottom: "4px" }}>
                        {batch.sourceAccountName}
                      </div>

                      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                        <span style={{ fontSize: "24px", fontWeight: "900", color: "#60a5fa", fontFamily: "var(--font-mono)" }}>
                          {formatZAR(batch.originalAmount)}
                        </span>
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                          (R{batch.unallocatedAmount.toFixed(2)} unallocated)
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => openSplitModal(batch)}
                      style={{
                        padding: "10px 16px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "13px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                      }}
                    >
                      <Split size={14} /> ⚡ Split &amp; Assign to Cash Expenses
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fbbf24",
                        fontSize: "12px",
                        fontWeight: "900",
                      }}
                    >
                      ZAR
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc", letterSpacing: "0.5px" }}>
                      PHYSICAL VAULT
                    </span>
                  </div>
                  <Coins size={22} style={{ color: "#fbbf24" }} />
                </div>

                <div style={{ marginBottom: "28px" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#94a3b8", letterSpacing: "1px", fontWeight: "700", marginBottom: "6px" }}>
                    Tracked Liquid Balance
                  </div>
                  <div style={{ fontSize: "36px", fontWeight: "900", color: "#f8fafc", letterSpacing: "-1px", fontFamily: "var(--font-sans)" }}>
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
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 18px 0" }}>
                  Count the physical banknotes in your wallet. If there is a discrepancy, the system generates an audit reconciliation flow.
                </p>

                <form onSubmit={handleReconcile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                      Counted Physical Cash (ZAR)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1350"
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

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "800",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)",
                    }}
                  >
                    <CheckCircle2 size={16} /> Reconcile Counted Cash
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Direct Cash Expense Logger */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                padding: "28px",
                backdropFilter: "blur(16px)",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <div style={{ color: "#38bdf8" }}>
                    <ShoppingCart size={22} />
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                    Log Single Cash Outflow
                  </h3>
                </div>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
                  Spent physical cash without an ATM batch? Select a preset category or enter custom spend details.
                </p>
              </div>

              {/* Category Pills */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "10px" }}>
                  Select Category
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
                          padding: "12px 10px",
                          borderRadius: "12px",
                          background: isSelected ? `${cat.color}22` : "rgba(255, 255, 255, 0.03)",
                          border: `1px solid ${isSelected ? cat.color : "rgba(255, 255, 255, 0.08)"}`,
                          color: isSelected ? "#f8fafc" : "#94a3b8",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Icon size={18} style={{ color: cat.color }} />
                        <span style={{ fontSize: "11px", fontWeight: "700", textAlign: "center" }}>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Spend Form */}
              <form onSubmit={handleSpend} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                    Description &amp; Recipient
                  </label>
                  <input
                    type="text"
                    value={spendDesc}
                    onChange={(e) => setSpendDesc(e.target.value)}
                    placeholder="e.g. Fortnightly Domestic Wage"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "rgba(7, 11, 20, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      color: "#f8fafc",
                      fontSize: "14px",
                      fontWeight: "600",
                      outline: "none",
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                    Amount (ZAR)
                  </label>
                  <input
                    type="number"
                    value={spendAmount}
                    onChange={(e) => setSpendAmount(e.target.value)}
                    placeholder="e.g. 950"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "rgba(7, 11, 20, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      color: "#f87171",
                      fontSize: "18px",
                      fontWeight: "800",
                      outline: "none",
                    }}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {PRESET_SPLIT_CHIPS.map((preset) => (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => {
                        setSpendCategory(preset.category);
                        setSpendDesc(preset.desc);
                        setSpendAmount(preset.amount.toString());
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        color: "#cbd5e1",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      {preset.label} (R{preset.amount})
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    border: "none",
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(239, 68, 68, 0.3)",
                    marginTop: "6px",
                  }}
                >
                  <TrendingDown size={18} /> Log Cash Expense to Ledger
                </button>
              </form>
            </div>
          </div>

          {/* Cash Flow Ledger Table */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "28px",
              backdropFilter: "blur(16px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ color: "#fbbf24" }}>
                  <Coins size={20} />
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                  Complete Physical Cash Ledger &amp; Flows
                </h3>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: "flex", gap: "6px", background: "rgba(7, 11, 20, 0.6)", padding: "4px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                {[
                  { id: "ALL", label: "All Flows" },
                  { id: "INFLOW", label: "ATM Inflows" },
                  { id: "DOMESTIC_GARDEN", label: "Domestic & Garden" },
                  { id: "SPEND", label: "All Outflows" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id as any)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "7px",
                      border: "none",
                      background: filterType === tab.id ? "rgba(255, 255, 255, 0.12)" : "transparent",
                      color: filterType === tab.id ? "#f8fafc" : "#94a3b8",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
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

      {/* 🌟 VECTOR 8: INTERACTIVE MULTI-ITEM CASH SPLIT MODAL */}
      {selectedBatchForSplit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.82)",
            backdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid rgba(96, 165, 250, 0.4)",
              borderRadius: "24px",
              padding: "32px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "rgba(96, 165, 250, 0.2)",
                    border: "1px solid rgba(96, 165, 250, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#60a5fa",
                  }}
                >
                  <Split size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                    Split ATM Cash Withdrawal
                  </h2>
                  <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, marginTop: "2px" }}>
                    {selectedBatchForSplit.sourceAccountName} · 📅 {selectedBatchForSplit.date}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBatchForSplit(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "none",
                  borderRadius: "10px",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Total Balance Card */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "16px",
                padding: "18px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>
                  Total ATM Inflow
                </div>
                <div style={{ fontSize: "28px", fontWeight: "900", color: "#60a5fa", fontFamily: "var(--font-mono)" }}>
                  {formatZAR(selectedBatchForSplit.originalAmount)}
                </div>
              </div>

              <div style={{ display: "flex", gap: "20px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>
                    Allocated to Items
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#f87171", fontFamily: "var(--font-mono)" }}>
                    -{formatZAR(totalSplitSum)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>
                    Remaining in Physical Wallet
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: remainingCashOnHand === 0 ? "#34d399" : "#fbbf24", fontFamily: "var(--font-mono)" }}>
                    {formatZAR(remainingCashOnHand)}
                  </div>
                </div>
              </div>
            </div>

            {/* Preset Quick-Add Chips */}
            <div>
              <div style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: "700", marginBottom: "8px" }}>
                1-Click Quick Add Cash Presets
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PRESET_SPLIT_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleAddPresetChip(chip)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#cbd5e1",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <PlusCircle size={13} style={{ color: "#38bdf8" }} />
                    {chip.label} (+R{chip.amount})
                  </button>
                ))}
              </div>
            </div>

            {/* Split Rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", fontWeight: "800", color: "#f8fafc" }}>
                  Itemized Expenses ({splitRows.length} Items)
                </span>
                <button
                  type="button"
                  onClick={handleAddSplitRow}
                  style={{
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    color: "#60a5fa",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <PlusCircle size={13} /> Add Expense Row
                </button>
              </div>

              {splitRows.map((row, idx) => (
                <div
                  key={row.id || idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1fr 120px 40px",
                    gap: "10px",
                    alignItems: "center",
                    background: "rgba(15, 23, 42, 0.5)",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => handleUpdateSplitRow(idx, "description", e.target.value)}
                    placeholder="Description / Payee"
                    style={{
                      background: "rgba(7, 11, 20, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      color: "#f8fafc",
                      fontSize: "13px",
                      fontWeight: "600",
                      outline: "none",
                    }}
                  />

                  <select
                    value={row.category}
                    onChange={(e) => handleUpdateSplitRow(idx, "category", e.target.value)}
                    style={{
                      background: "rgba(7, 11, 20, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      color: "#cbd5e1",
                      fontSize: "12px",
                      fontWeight: "600",
                      outline: "none",
                    }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      value={row.amount}
                      onChange={(e) => handleUpdateSplitRow(idx, "amount", e.target.value)}
                      placeholder="Amount"
                      style={{
                        width: "100%",
                        background: "rgba(7, 11, 20, 0.6)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        color: "#f87171",
                        fontSize: "14px",
                        fontWeight: "800",
                        outline: "none",
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSplitRow(idx)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px",
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
              <button
                type="button"
                onClick={() => setSelectedBatchForSplit(null)}
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#94a3b8",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveSplit}
                disabled={splitSubmitting || totalSplitSum > selectedBatchForSplit.originalAmount}
                style={{
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "none",
                  background: totalSplitSum > selectedBatchForSplit.originalAmount
                    ? "rgba(239, 68, 68, 0.4)"
                    : "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "800",
                  cursor: totalSplitSum > selectedBatchForSplit.originalAmount ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)",
                }}
              >
                <CheckCircle2 size={16} /> Save &amp; Split Cash Inflow
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

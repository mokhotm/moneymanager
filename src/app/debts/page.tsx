"use client";

import { useEffect, useState, useMemo } from "react";
import { formatZAR, formatPercent } from "@/lib/formatters";
import {
  AlertTriangle,
  Scale,
  TrendingDown,
  Building2,
  Plus,
  CreditCard,
  Home,
  Flame,
  Edit3,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Lock,
  LogIn,
  DollarSign,
  Zap,
  Filter,
  CheckSquare,
} from "lucide-react";

interface Debt {
  id: string;
  accountId: string;
  currentBalance: string | number;
  balanceConfidence: "CONFIRMED" | "ESTIMATED" | "UNKNOWN";
  balanceSource: string | null;
  annualInterestRate: string | number | null;
  interestRateConfidence: "CONFIRMED" | "ESTIMATED" | "UNKNOWN";
  minimumPayment: string | number;
  paymentMode: string;
  urgencyFlag: string;
  urgencyNote: string | null;
  includeInSnowball: boolean;
  priorityOverride: number | null;
  status: string;
  account: { name: string; institution: string; type: string };
}

interface Account {
  id: string;
  name: string;
  institution: string;
  type: string;
  isDebt: boolean;
}

const CONFIDENCE_LABEL: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: "Confirmed", color: "#10b981" },
  ESTIMATED: { label: "Estimated", color: "#f59e0b" },
  UNKNOWN: { label: "Unknown", color: "#ef4444" },
};

const PAYMENT_MODE_LABEL: Record<string, string> = {
  MINIMUM_ONLY: "Min Only (Revolving)",
  FIXED_INSTALMENT: "Fixed Instalment",
  FIXED_TERM_LOAN: "Fixed Amortizing Loan",
};

const URGENCY_LABEL: Record<string, { label: string; color: string }> = {
  NONE: { label: "", color: "" },
  SERVICE_INTERRUPTION_RISK: { label: "Service Interruption Risk", color: "#f59e0b" },
  LEGAL_ACTION_RISK: { label: "Legal Action Risk", color: "#ef4444" },
  CREDIT_BUREAU_RISK: { label: "Credit Bureau Risk", color: "#a855f7" },
};

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [viewMode, setViewMode] = useState<"CATEGORY" | "PRIORITY" | "BANK">("CATEGORY");
  const [showModal, setShowModal] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);

  // Settlement Modal state
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [targetSettleDebt, setTargetSettleDebt] = useState<Debt | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("10000");
  const [settleDescription, setSettleDescription] = useState<string>("Lump sum debt paydown");

  // Form state
  const [form, setForm] = useState({
    accountId: "",
    currentBalance: "",
    balanceConfidence: "ESTIMATED",
    balanceSource: "",
    annualInterestRate: "",
    interestRateConfidence: "UNKNOWN",
    minimumPayment: "",
    paymentMode: "MINIMUM_ONLY",
    urgencyFlag: "NONE",
    urgencyNote: "",
    includeInSnowball: true,
    priorityOverride: "",
    status: "ACTIVE",
  });

  const loadData = async () => {
    try {
      const [resDebts, resAccs] = await Promise.all([
        fetch("/api/debts"),
        fetch("/api/accounts"),
      ]);

      if (resDebts.status === 401 || resAccs.status === 401) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      const d = await resDebts.json();
      const a = await resAccs.json();

      if (d?.error === "Unauthorized" || a?.error === "Unauthorized") {
        setUnauthorized(true);
      } else {
        setDebts(Array.isArray(d) ? d : []);
        setAccounts(Array.isArray(a) ? a : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setEditDebt(null);
    setForm({
      accountId: accounts.length > 0 ? accounts[0].id : "",
      currentBalance: "15000",
      balanceConfidence: "ESTIMATED",
      balanceSource: "",
      annualInterestRate: "21",
      interestRateConfidence: "UNKNOWN",
      minimumPayment: "750",
      paymentMode: "MINIMUM_ONLY",
      urgencyFlag: "NONE",
      urgencyNote: "",
      includeInSnowball: true,
      priorityOverride: "",
      status: "ACTIVE",
    });
    setShowModal(true);
  };

  const openEdit = (d: Debt) => {
    setEditDebt(d);
    setForm({
      accountId: d.accountId,
      currentBalance: String(d.currentBalance),
      balanceConfidence: d.balanceConfidence,
      balanceSource: d.balanceSource ?? "",
      annualInterestRate: d.annualInterestRate ? String(Number(d.annualInterestRate) * 100) : "",
      interestRateConfidence: d.interestRateConfidence,
      minimumPayment: String(d.minimumPayment),
      paymentMode: d.paymentMode,
      urgencyFlag: d.urgencyFlag,
      urgencyNote: d.urgencyNote ?? "",
      includeInSnowball: d.includeInSnowball,
      priorityOverride: d.priorityOverride ? String(d.priorityOverride) : "",
      status: d.status,
    });
    setShowModal(true);
  };

  const openSettleModal = (d: Debt) => {
    setTargetSettleDebt(d);
    setSettleAmount(String(Math.min(10000, Number(d.currentBalance))));
    setSettleDescription("Lump sum debt paydown");
    setShowSettleModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      currentBalance: parseFloat(form.currentBalance) || 0,
      annualInterestRate: form.annualInterestRate
        ? parseFloat(form.annualInterestRate) / 100
        : null,
      minimumPayment: parseFloat(form.minimumPayment) || 0,
      priorityOverride: form.priorityOverride ? parseInt(form.priorityOverride) : null,
    };

    if (editDebt) {
      await fetch(`/api/debts/${editDebt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setShowModal(false);
    loadData();
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSettleDebt) return;

    await fetch(`/api/debts/${targetSettleDebt.id}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseFloat(settleAmount),
        description: settleDescription,
        date: new Date().toISOString(),
      }),
    });

    setShowSettleModal(false);
    loadData();
  };

  const handleDeleteDebt = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete debt on account "${name}"?`)) return;
    await fetch(`/api/debts/${id}`, { method: "DELETE" });
    loadData();
  };

  const activeDebts = useMemo(() => debts.filter((d) => d.status === "ACTIVE"), [debts]);
  const snowballDebts = useMemo(() => activeDebts.filter((d) => d.includeInSnowball), [activeDebts]);
  const excludedDebts = useMemo(() => activeDebts.filter((d) => !d.includeInSnowball), [activeDebts]);

  const totalDebt = useMemo(() => {
    return activeDebts.reduce((s, d) => s + Number(d.currentBalance), 0);
  }, [activeDebts]);

  const totalMonthlyMin = useMemo(() => {
    return activeDebts.reduce((s, d) => s + Number(d.minimumPayment), 0);
  }, [activeDebts]);

  const shortTermDebts = useMemo(() => {
    return activeDebts.filter(
      (d) =>
        !d.account.name.toLowerCase().includes("home loan") &&
        !d.account.name.toLowerCase().includes("bond")
    );
  }, [activeDebts]);

  const longTermDebts = useMemo(() => {
    return activeDebts.filter(
      (d) =>
        d.account.name.toLowerCase().includes("home loan") ||
        d.account.name.toLowerCase().includes("bond")
    );
  }, [activeDebts]);

  const shortTermTotal = useMemo(() => {
    return shortTermDebts.reduce((s, d) => s + Number(d.currentBalance), 0);
  }, [shortTermDebts]);

  const longTermTotal = useMemo(() => {
    return longTermDebts.reduce((s, d) => s + Number(d.currentBalance), 0);
  }, [longTermDebts]);

  const weightedInterestRate = useMemo(() => {
    if (totalDebt === 0) return 0;
    const weightedSum = activeDebts.reduce((s, d) => {
      const rate = d.annualInterestRate ? Number(d.annualInterestRate) : 0.15;
      return s + Number(d.currentBalance) * rate;
    }, 0);
    return weightedSum / totalDebt;
  }, [activeDebts, totalDebt]);

  // Group by Bank / Institution
  const institutions = useMemo(() => {
    return Array.from(new Set(activeDebts.map((d) => d.account.institution)));
  }, [activeDebts]);

  const groupedDebts = useMemo(() => {
    return institutions.map((inst) => {
      const instDebts = activeDebts.filter((d) => d.account.institution === inst);
      const subtotal = instDebts.reduce((s, d) => s + Number(d.currentBalance), 0);
      const monthlyTotal = instDebts.reduce((s, d) => s + Number(d.minimumPayment), 0);
      return { institution: inst, debts: instDebts, subtotal, monthlyTotal };
    });
  }, [activeDebts, institutions]);

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Loading debt portfolio &amp; snowball paydown plan…
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Debt Register &amp; Waterfall Accelerator</h1>
            <p className="page-subtitle">All active debts organized by payoff order &amp; financial institutions</p>
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
              Please sign in to your MoneyManager account to view your debt portfolio and waterfall payoff schedules.
            </p>
            <a href="/login" className="btn btn-primary btn-lg inline-flex items-center gap-2">
              <LogIn size={18} />
              <span>Sign In to Access Debt Register</span>
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
            Debt Register &amp; Waterfall Accelerator
            <span className="badge badge-warning text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            All active debts organized by payoff priority order, interest rates, and banking institutions
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div
            className="flex"
            style={{
              background: "rgba(13, 20, 36, 0.9)",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              padding: "4px",
              gap: "4px",
            }}
          >
            <button
              onClick={() => setViewMode("CATEGORY")}
              className={`apple-pill-btn ${viewMode === "CATEGORY" ? "active" : ""}`}
              id="view-category-group"
            >
              Short vs Long Term
            </button>
            <button
              onClick={() => setViewMode("PRIORITY")}
              className={`apple-pill-btn ${viewMode === "PRIORITY" ? "active" : ""}`}
              id="view-priority-order"
            >
              Payoff Priority
            </button>
            <button
              onClick={() => setViewMode("BANK")}
              className={`apple-pill-btn ${viewMode === "BANK" ? "active" : ""}`}
              id="view-by-institution"
            >
              Group by Bank
            </button>
          </div>

          <button className="btn btn-primary flex items-center gap-1.5" onClick={openAdd} id="add-debt-btn">
            <Plus size={16} /> Add Debt
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Headline Stat Cards Grid */}
        <div className="stat-grid mb-6">
          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(225, 29, 72, 0.05))",
              borderColor: "rgba(244, 63, 94, 0.4)",
            }}
          >
            <div className="stat-label text-red-400 flex items-center gap-1.5">
              <CreditCard size={14} /> Aggregate Debt Obligations
            </div>
            <div className="stat-value text-red-400 font-extrabold">{formatZAR(totalDebt)}</div>
            <div className="stat-sub">Across {activeDebts.length} active liabilities</div>
          </div>

          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))",
              borderColor: "rgba(245, 158, 11, 0.4)",
            }}
          >
            <div className="stat-label text-amber-400 flex items-center gap-1.5">
              <Flame size={14} /> Short-Term Consumer Debt
            </div>
            <div className="stat-value text-amber-400 font-extrabold">{formatZAR(shortTermTotal)}</div>
            <div className="stat-sub text-emerald-400 font-bold">Clears in ~18 Months</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-blue-400 flex items-center gap-1.5">
              <DollarSign size={14} /> Monthly Minimum Payment
            </div>
            <div className="stat-value text-blue-400 font-extrabold">{formatZAR(totalMonthlyMin)}<span style={{ fontSize: "12px", color: "#94a3b8" }}>/mo</span></div>
            <div className="stat-sub">Required Monthly Servicing</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-purple-400 flex items-center gap-1.5">
              <TrendingDown size={14} /> Weighted Interest Rate
            </div>
            <div className="stat-value text-purple-300 font-extrabold">{formatPercent(weightedInterestRate)}</div>
            <div className="stat-sub text-muted">Effective Annual Cost</div>
          </div>
        </div>

        {/* Views Rendering */}
        {activeDebts.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "60px 24px", backdropFilter: "blur(24px)" }}>
            <CreditCard size={40} className="mx-auto mb-4 text-amber-400" />
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "#f8fafc" }}>
              No active debts recorded
            </h2>
            <p className="text-muted" style={{ marginBottom: "24px" }}>
              Add your debt accounts to configure your snowball payoff plan and clear interest faster.
            </p>
            <button className="btn btn-primary" onClick={openAdd}>Add your first debt</button>
          </div>
        ) : viewMode === "CATEGORY" ? (
          /* Short-Term vs Long-Term Category View */
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Short-Term Consumer Debts Card */}
            <div
              className="card"
              style={{
                borderLeft: "1px solid var(--border)",
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                borderTop: "3px solid #f59e0b",
                background: "rgba(13, 20, 36, 0.9)",
                backdropFilter: "blur(24px)",
              }}
            >
              <div className="card-header flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: 16 }}>
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#f59e0b",
                    }}
                  >
                    <CreditCard size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
                      Short-Term Consumer Debts
                    </h2>
                    <div className="text-muted text-xs">Clears rapidly in 18 Months (1 yr 6 mo) via Snowball Paydown</div>
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <span className="badge badge-danger font-mono text-xs">Owed: {formatZAR(shortTermTotal)}</span>
                  <span className="badge badge-gold font-mono text-xs">Target: 18 Months</span>
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Debt Account</th>
                      <th>Institution</th>
                      <th className="text-right">Balance</th>
                      <th>Rate</th>
                      <th className="text-right">Payment / Month</th>
                      <th>Mode</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shortTermDebts.map((debt) => (
                      <tr key={debt.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{debt.account.name}</div>
                          {debt.urgencyFlag !== "NONE" && (
                            <span className="badge danger" style={{ marginTop: 4 }}>
                              {URGENCY_LABEL[debt.urgencyFlag]?.label || debt.urgencyFlag}
                            </span>
                          )}
                        </td>
                        <td className="font-semibold text-slate-200">{debt.account.institution}</td>
                        <td className="td-mono font-extrabold text-red text-right" style={{ fontSize: "14px" }}>
                          {formatZAR(Number(debt.currentBalance))}
                        </td>
                        <td className="td-mono">
                          {debt.annualInterestRate ? formatPercent(Number(debt.annualInterestRate)) : "0%"}
                        </td>
                        <td className="td-mono text-right">{formatZAR(Number(debt.minimumPayment))}</td>
                        <td><span className="badge blue">{PAYMENT_MODE_LABEL[debt.paymentMode] ?? debt.paymentMode}</span></td>
                        <td className="text-right">
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: "11px", padding: "3px 8px" }}
                              onClick={() => openSettleModal(debt)}
                            >
                              Settle
                            </button>
                            <button
                              className="apple-pill-btn"
                              style={{ fontSize: "11px", padding: "3px 8px" }}
                              onClick={() => openEdit(debt)}
                            >
                              Edit
                            </button>
                            <button
                              style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}
                              onClick={() => handleDeleteDebt(debt.id, debt.account.name)}
                              title="Delete Debt"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Long-Term Home Loan Bond Card */}
            <div
              className="card"
              style={{
                borderLeft: "1px solid var(--border)",
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                borderTop: "3px solid #a855f7",
                background: "rgba(13, 20, 36, 0.9)",
                backdropFilter: "blur(24px)",
              }}
            >
              <div className="card-header flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: 16 }}>
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: "rgba(168, 85, 247, 0.15)",
                      border: "1px solid rgba(168, 85, 247, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#a855f7",
                    }}
                  >
                    <Home size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
                      Long-Term Mortgage &amp; Property Bonds
                    </h2>
                    <div className="text-muted text-xs">Primary residence mortgage bond (20-Year Amortization)</div>
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <span className="badge badge-danger font-mono text-xs">Balance: {formatZAR(longTermTotal)}</span>
                  <span className="badge blue font-mono text-xs">Term: 240 Months</span>
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Mortgage Account</th>
                      <th>Institution</th>
                      <th className="text-right">Balance</th>
                      <th>Rate</th>
                      <th className="text-right">Payment / Month</th>
                      <th>Mode</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {longTermDebts.map((debt) => (
                      <tr key={debt.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{debt.account.name}</div>
                        </td>
                        <td className="font-semibold text-slate-200">{debt.account.institution}</td>
                        <td className="td-mono font-extrabold text-purple-400 text-right" style={{ fontSize: "14px" }}>
                          {formatZAR(Number(debt.currentBalance))}
                        </td>
                        <td className="td-mono">
                          {debt.annualInterestRate ? formatPercent(Number(debt.annualInterestRate)) : "11.75%"}
                        </td>
                        <td className="td-mono text-right">{formatZAR(Number(debt.minimumPayment))}</td>
                        <td><span className="badge blue">{PAYMENT_MODE_LABEL[debt.paymentMode] ?? debt.paymentMode}</span></td>
                        <td className="text-right">
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: "11px", padding: "3px 8px" }}
                              onClick={() => openSettleModal(debt)}
                            >
                              Settle
                            </button>
                            <button
                              className="apple-pill-btn"
                              style={{ fontSize: "11px", padding: "3px 8px" }}
                              onClick={() => openEdit(debt)}
                            >
                              Edit
                            </button>
                            <button
                              style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}
                              onClick={() => handleDeleteDebt(debt.id, debt.account.name)}
                              title="Delete Debt"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : viewMode === "BANK" ? (
          /* Grouped by Bank / Institution View */
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {groupedDebts.map((g) => (
              <div
                key={g.institution}
                className="card"
                style={{
                  borderLeft: "1px solid var(--border)",
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  borderTop: "3px solid #3b82f6",
                  background: "rgba(13, 20, 36, 0.9)",
                  backdropFilter: "blur(24px)",
                }}
              >
                <div className="card-header" style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: 16 }}>
                  <div className="flex items-center gap-3">
                    <Building2 size={24} className="text-blue-400" />
                    <div>
                      <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>{g.institution}</h2>
                      <div className="text-muted text-xs">{g.debts.length} debt account{g.debts.length !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="badge badge-danger font-mono text-xs">Owed: {formatZAR(g.subtotal)}</span>
                    <span className="badge badge-gold font-mono text-xs">Monthly: {formatZAR(g.monthlyTotal)}</span>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Debt Account</th>
                        <th className="text-right">Balance</th>
                        <th>Confidence</th>
                        <th>Rate</th>
                        <th className="text-right">Payment / Month</th>
                        <th>Mode</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.debts.map((debt) => (
                        <tr key={debt.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{debt.account.name}</div>
                            {debt.urgencyFlag !== "NONE" && (
                              <span className="badge danger" style={{ marginTop: 4 }}>
                                {URGENCY_LABEL[debt.urgencyFlag]?.label || debt.urgencyFlag}
                              </span>
                            )}
                          </td>
                          <td className="td-mono font-extrabold text-red text-right" style={{ fontSize: "14px" }}>
                            {formatZAR(Number(debt.currentBalance))}
                          </td>
                          <td>
                            <span className="badge confirmed">{debt.balanceConfidence}</span>
                          </td>
                          <td className="td-mono">
                            {debt.annualInterestRate ? formatPercent(Number(debt.annualInterestRate)) : "0%"}
                          </td>
                          <td className="td-mono text-right">{formatZAR(Number(debt.minimumPayment))}</td>
                          <td><span className="badge blue">{PAYMENT_MODE_LABEL[debt.paymentMode] ?? debt.paymentMode}</span></td>
                          <td className="text-right">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                              <button
                                className="apple-pill-btn"
                                style={{ fontSize: "11px", padding: "3px 8px" }}
                                onClick={() => openEdit(debt)}
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Priority Payoff Order Table */
          <div
            className="card"
            style={{
              borderLeft: "1px solid var(--border)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              borderTop: "3px solid #f59e0b",
              background: "rgba(13, 20, 36, 0.9)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="card-header">
              <span className="card-title">In Snowball Payoff Simulation ({snowballDebts.length})</span>
              <span className="text-muted text-sm font-mono">Ordered by lowest balance payoff priority</span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Payoff Rank</th>
                    <th>Debt Account</th>
                    <th>Institution</th>
                    <th className="text-right">Balance</th>
                    <th>Confidence</th>
                    <th>Rate</th>
                    <th className="text-right">Payment / Month</th>
                    <th>Mode</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {snowballDebts.map((debt, i) => (
                    <tr key={debt.id}>
                      <td className="text-amber-400 font-bold font-mono">#{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{debt.account.name}</div>
                      </td>
                      <td className="font-semibold text-slate-200">{debt.account.institution}</td>
                      <td className="td-mono font-extrabold text-red text-right" style={{ fontSize: "14px" }}>
                        {formatZAR(Number(debt.currentBalance))}
                      </td>
                      <td>
                        <span className="badge confirmed">{debt.balanceConfidence}</span>
                      </td>
                      <td className="td-mono">
                        {debt.annualInterestRate ? formatPercent(Number(debt.annualInterestRate)) : "0%"}
                      </td>
                      <td className="td-mono text-right">{formatZAR(Number(debt.minimumPayment))}</td>
                      <td><span className="badge blue">{PAYMENT_MODE_LABEL[debt.paymentMode] ?? debt.paymentMode}</span></td>
                      <td className="text-right">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: "11px", padding: "3px 8px" }}
                            onClick={() => openSettleModal(debt)}
                          >
                            Settle
                          </button>
                          <button
                            className="apple-pill-btn"
                            style={{ fontSize: "11px", padding: "3px 8px" }}
                            onClick={() => openEdit(debt)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Debt Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editDebt ? "Edit Debt Details" : "Add Debt Account"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Account</label>
                  <select
                    className="form-select"
                    value={form.accountId}
                    onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                    required
                    id="debt-account-select"
                  >
                    <option value="">Select account…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.institution} — {a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label required">Current Balance (R)</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.currentBalance}
                      onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
                      required
                      id="debt-balance-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Balance Confidence</label>
                    <select
                      className="form-select"
                      value={form.balanceConfidence}
                      onChange={(e) => setForm({ ...form, balanceConfidence: e.target.value as any })}
                      id="debt-confidence-select"
                    >
                      <option value="CONFIRMED">Confirmed (statement on file)</option>
                      <option value="ESTIMATED">Estimated</option>
                      <option value="UNKNOWN">Unknown — exclude from simulation</option>
                    </select>
                  </div>
                </div>

                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label">Annual Interest Rate (%)</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 21"
                      value={form.annualInterestRate}
                      onChange={(e) => setForm({ ...form, annualInterestRate: e.target.value })}
                      id="debt-rate-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Monthly Payment (R)</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.minimumPayment}
                      onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })}
                      required
                      id="debt-payment-input"
                    />
                  </div>
                </div>

                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select
                      className="form-select"
                      value={form.paymentMode}
                      onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                      id="debt-mode-select"
                    >
                      <option value="MINIMUM_ONLY">Minimum Only (revolving)</option>
                      <option value="FIXED_INSTALMENT">Fixed Instalment (parallel)</option>
                      <option value="FIXED_TERM_LOAN">Fixed-Term Loan (amortizing)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Urgency Flag</label>
                    <select
                      className="form-select"
                      value={form.urgencyFlag}
                      onChange={(e) => setForm({ ...form, urgencyFlag: e.target.value })}
                      id="debt-urgency-select"
                    >
                      <option value="NONE">None</option>
                      <option value="SERVICE_INTERRUPTION_RISK">Service Interruption Risk</option>
                      <option value="LEGAL_ACTION_RISK">Legal Action Risk</option>
                      <option value="CREDIT_BUREAU_RISK">Credit Bureau Risk</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex items-center gap-1.5" id="save-debt-btn">
                  <CheckCircle2 size={16} />
                  <span>{editDebt ? "Save Changes" : "Add Debt"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Debt Settlement Modal */}
      {showSettleModal && targetSettleDebt && (
        <div className="modal-overlay" onClick={() => setShowSettleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Record Debt Payoff / Settlement</h2>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Debt: <strong style={{ color: "var(--gold)" }}>{targetSettleDebt.account.name}</strong>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowSettleModal(false)}>×</button>
            </div>

            <form onSubmit={handleSettleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Settlement / Payoff Amount (R)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="e.g. 10000"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Reason</label>
                  <input
                    className="form-input"
                    value={settleDescription}
                    onChange={(e) => setSettleDescription(e.target.value)}
                    placeholder="e.g. Lump sum debt paydown"
                  />
                </div>

                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    fontSize: "12px",
                    color: "#34d399",
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: "4px" }}>Remaining Balance After Payoff:</div>
                  <div style={{ fontSize: "16px", fontWeight: 900, fontFamily: "var(--font-mono)" }}>
                    {formatZAR(Math.max(Number(targetSettleDebt.currentBalance) - (parseFloat(settleAmount) || 0), 0))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSettleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

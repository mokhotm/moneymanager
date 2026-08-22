"use client";

import { useEffect, useState, useMemo } from "react";
import { formatZAR } from "@/lib/formatters";
import {
  Landmark,
  Building2,
  Plus,
  Layers,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Lock,
  LogIn,
  CreditCard,
  Wallet,
  Building,
  TrendingUp,
  RefreshCw,
  Filter,
  DollarSign,
} from "lucide-react";

interface Account {
  id: string;
  name: string;
  institution: string;
  accountNumberMasked: string | null;
  type: string;
  currency: string;
  openingBalance: string | number;
  openingBalanceDate: string | null;
  isDebt: boolean;
  notes: string | null;
  debt?: {
    currentBalance: string | number;
    balanceConfidence: string;
    annualInterestRate: string | number | null;
    minimumPayment: string | number;
  } | null;
}

const ACCOUNT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  CURRENT: { label: "Current / Checking", color: "#3b82f6" },
  CREDIT_CARD: { label: "Credit Card", color: "#f59e0b" },
  LOAN: { label: "Term Loan / Mortgage", color: "#ef4444" },
  MUNICIPAL: { label: "Municipal Services", color: "#64748b" },
  SERVICE_ACCOUNT: { label: "Service Provider / Telco", color: "#a855f7" },
  EDUCATION: { label: "Education / School Fees", color: "#f472b6" },
  INSURANCE: { label: "Insurance Policy", color: "#14b8a6" },
  SUBSCRIPTION: { label: "Subscription / Membership", color: "#8b5cf6" },
  SAVINGS: { label: "Savings & Deposit", color: "#10b981" },
  INVESTMENT: { label: "Investment & ETF", color: "#06b6d4" },
  CASH_WALLET: { label: "Physical Cash Wallet", color: "#ec4899" },
};

const INSTITUTION_COLORS: Record<string, string> = {
  "Standard Bank": "#3b82f6",
  "FNB": "#14b8a6",
  "Capitec": "#ef4444",
  "Absa": "#dc2626",
  "Nedbank": "#10b981",
  "City of Ekurhuleni": "#64748b",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [groupByInstitution, setGroupByInstitution] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);

  const [form, setForm] = useState({
    name: "",
    institution: "Standard Bank",
    accountNumberMasked: "",
    type: "CURRENT",
    currency: "ZAR",
    openingBalance: "0",
    isDebt: false,
    notes: "",
  });

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.status === 401) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data?.error === "Unauthorized") {
        setUnauthorized(true);
      } else {
        setAccounts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const openAdd = () => {
    setEditAccount(null);
    setForm({
      name: "",
      institution: "Standard Bank",
      accountNumberMasked: "",
      type: "CURRENT",
      currency: "ZAR",
      openingBalance: "0",
      isDebt: false,
      notes: "",
    });
    setShowModal(true);
  };

  const openEdit = (acc: Account) => {
    setEditAccount(acc);
    setForm({
      name: acc.name,
      institution: acc.institution,
      accountNumberMasked: acc.accountNumberMasked ?? "",
      type: acc.type,
      currency: acc.currency,
      openingBalance: String(Number(acc.openingBalance)),
      isDebt: acc.isDebt,
      notes: acc.notes ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      openingBalance: parseFloat(form.openingBalance) || 0,
    };

    if (editAccount) {
      await fetch(`/api/accounts/${editAccount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setShowModal(false);
    loadAccounts();
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete account "${name}"?`)) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    loadAccounts();
  };

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    if (activeFilter === "ALL") return accounts;
    return accounts.filter((a) => a.type === activeFilter);
  }, [accounts, activeFilter]);

  // Grouping logic by Institution
  const institutions = useMemo(() => {
    return Array.from(new Set(filteredAccounts.map((a) => a.institution)));
  }, [filteredAccounts]);

  const grouped = useMemo(() => {
    return institutions.map((inst) => {
      const instAccounts = filteredAccounts.filter((a) => a.institution === inst);
      const totalAssets = instAccounts
        .filter((a) => !a.isDebt)
        .reduce((s, a) => s + Math.max(0, Number(a.openingBalance)), 0);
      const totalDebts = instAccounts.reduce(
        (s, a) => s + (a.debt ? Number(a.debt.currentBalance) : a.isDebt ? Math.abs(Number(a.openingBalance)) : 0),
        0
      );
      return {
        institution: inst,
        accounts: instAccounts,
        totalAssets,
        totalDebts,
        netBalance: totalAssets - totalDebts,
      };
    });
  }, [filteredAccounts, institutions]);

  const overallAssets = useMemo(() => {
    return accounts
      .filter((a) => !a.isDebt)
      .reduce((s, a) => s + Math.max(0, Number(a.openingBalance)), 0);
  }, [accounts]);

  const overallDebts = useMemo(() => {
    return accounts.reduce(
      (s, a) => s + (a.debt ? Number(a.debt.currentBalance) : a.isDebt ? Math.abs(Number(a.openingBalance)) : 0),
      0
    );
  }, [accounts]);

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Loading accounts &amp; OpenBanking balances…
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Accounts &amp; Financial Register</h1>
            <p className="page-subtitle">List and manage all financial accounts — banks, credit cards, municipal, telco, school fees &amp; more</p>
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
              Please sign in to your MoneyManager account to view your linked financial accounts and balances.
            </p>
            <a href="/login" className="btn btn-primary btn-lg inline-flex items-center gap-2">
              <LogIn size={18} />
              <span>Sign In to Access Accounts</span>
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
            Accounts &amp; Financial Register
            <span className="badge badge-gold text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            List and manage all financial accounts — banks, credit cards, municipal, telco, school fees &amp; service providers
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className={`btn ${groupByInstitution ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setGroupByInstitution(!groupByInstitution)}
            id="toggle-group-institution-btn"
          >
            <Building2 size={16} />
            <span>{groupByInstitution ? "Grouped View" : "Flat List View"}</span>
          </button>
          <button className="btn btn-primary" onClick={openAdd} id="add-account-btn">
            <Plus size={16} />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Headline Stat Cards Grid */}
        <div className="stat-grid mb-6">
          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))",
              borderColor: "rgba(245, 158, 11, 0.4)",
            }}
          >
            <div className="stat-label text-amber-400 flex items-center gap-1.5">
              <Building2 size={14} /> Institutions Tracked
            </div>
            <div className="stat-value gold font-extrabold">{institutions.length}</div>
            <div className="stat-sub">Banks, Municipalities &amp; Lenders</div>
          </div>

          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))",
              borderColor: "rgba(34, 197, 94, 0.4)",
            }}
          >
            <div className="stat-label text-emerald-400 flex items-center gap-1.5">
              <Wallet size={14} /> Total Liquid Assets
            </div>
            <div className="stat-value text-emerald-400 font-extrabold">{formatZAR(overallAssets)}</div>
            <div className="stat-sub">Current &amp; Savings Balances</div>
          </div>

          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(225, 29, 72, 0.05))",
              borderColor: "rgba(244, 63, 94, 0.4)",
            }}
          >
            <div className="stat-label text-red-400 flex items-center gap-1.5">
              <CreditCard size={14} /> Total Liabilities / Debt
            </div>
            <div className="stat-value text-red-400 font-extrabold">{formatZAR(overallDebts)}</div>
            <div className="stat-sub">Across all linked accounts</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-blue-400 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Net Working Capital
            </div>
            <div className="stat-value text-blue-300 font-extrabold">{formatZAR(overallAssets - overallDebts)}</div>
            <div className="stat-sub text-emerald-400 font-bold">100% Reconciled</div>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", marginRight: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
            <Filter size={13} /> Filter:
          </span>
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`apple-pill-btn ${activeFilter === "ALL" ? "active" : ""}`}
          >
            All Accounts ({accounts.length})
          </button>
          {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => {
            const count = accounts.filter((a) => a.type === k).length;
            if (count === 0 && activeFilter !== k) return null;
            return (
              <button
                key={k}
                onClick={() => setActiveFilter(k)}
                className={`apple-pill-btn ${activeFilter === k ? "active" : ""}`}
              >
                {v.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Grouped View vs Flat Table View or Empty State */}
        {accounts.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "64px 24px",
              background: "rgba(13, 20, 36, 0.9)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px auto",
                color: "#f59e0b",
              }}
            >
              <Landmark size={32} />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
              No Financial Accounts Registered
            </h2>
            <p className="text-muted text-sm" style={{ maxWidth: "460px", margin: "0 auto 24px auto", lineHeight: 1.6 }}>
              You haven't linked any bank accounts, credit cards, municipal bills, or service providers yet. Get started by uploading a statement or manually registering your accounts.
            </p>
            <div className="flex justify-center gap-3">
              <button className="btn btn-primary" onClick={openAdd} id="empty-state-add-btn">
                <Plus size={16} />
                <span>Add Your First Account</span>
              </button>
              <a href="/documents" className="btn btn-secondary" id="empty-state-upload-btn">
                <Building2 size={16} />
                <span>Upload Statement</span>
              </a>
            </div>
          </div>
        ) : groupByInstitution ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {grouped.map((g) => {
              const instColor = INSTITUTION_COLORS[g.institution] || "#3b82f6";

              return (
                <div
                  key={g.institution}
                  className="card"
                  style={{
                    borderLeft: "1px solid var(--border)",
                    borderRight: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                    borderTop: `3px solid ${instColor}`,
                    background: "rgba(13, 20, 36, 0.9)",
                    backdropFilter: "blur(24px)",
                  }}
                >
                  <div className="card-header" style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: 16 }}>
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "12px",
                          background: `${instColor}20`,
                          border: `1px solid ${instColor}50`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: instColor,
                        }}
                      >
                        <Building2 size={22} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>{g.institution}</h2>
                        <div className="text-muted text-xs">
                          {g.accounts.length} account{g.accounts.length !== 1 ? "s" : ""} linked • OpenBanking Direct Feed
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 items-center">
                      {g.totalAssets > 0 && (
                        <span className="badge badge-success text-xs font-mono">Assets: {formatZAR(g.totalAssets)}</span>
                      )}
                      {g.totalDebts > 0 && (
                        <span className="badge badge-danger text-xs font-mono">Debt: {formatZAR(g.totalDebts)}</span>
                      )}
                    </div>
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Account Name</th>
                          <th>Account Number</th>
                          <th>Type</th>
                          <th className="text-right">Balance / Owed</th>
                          <th>Classification</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.accounts.map((acc) => {
                          const bal = acc.debt ? Number(acc.debt.currentBalance) : Number(acc.openingBalance);
                          const meta = ACCOUNT_TYPE_LABELS[acc.type] ?? { label: acc.type, color: "#64748b" };

                          return (
                            <tr key={acc.id}>
                              <td>
                                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{acc.name}</div>
                                {acc.notes && <div className="text-muted text-xs">{acc.notes}</div>}
                              </td>
                              <td className="td-mono text-muted">{acc.accountNumberMasked ?? "—"}</td>
                              <td>
                                <span
                                  className="badge"
                                  style={{
                                    background: `${meta.color}20`,
                                    border: `1px solid ${meta.color}50`,
                                    color: meta.color,
                                  }}
                                >
                                  {meta.label}
                                </span>
                              </td>
                              <td className="td-mono font-extrabold text-right">
                                <span className={acc.isDebt ? "text-red" : "text-green"} style={{ fontSize: "14px" }}>
                                  {formatZAR(Math.abs(bal))}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${acc.isDebt ? "danger" : "confirmed"}`}>
                                  {acc.isDebt ? "Liability" : "Asset"}
                                </span>
                              </td>
                              <td className="text-right">
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                                  <button
                                    className="apple-pill-btn"
                                    style={{ fontSize: "11px", padding: "4px 10px" }}
                                    onClick={() => openEdit(acc)}
                                    id={`edit-account-${acc.id}`}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}
                                    onClick={() => handleDeleteAccount(acc.id, acc.name)}
                                    title="Delete Account"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat List View */
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Account Name</th>
                    <th>Account Number</th>
                    <th>Type</th>
                    <th className="text-right">Balance / Owed</th>
                    <th>Category</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((acc) => {
                    const bal = acc.debt ? Number(acc.debt.currentBalance) : Number(acc.openingBalance);
                    const meta = ACCOUNT_TYPE_LABELS[acc.type] ?? { label: acc.type, color: "#64748b" };

                    return (
                      <tr key={acc.id}>
                        <td className="font-semibold text-slate-200">{acc.institution}</td>
                        <td>{acc.name}</td>
                        <td className="td-mono text-muted">{acc.accountNumberMasked ?? "—"}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: `${meta.color}20`,
                              border: `1px solid ${meta.color}50`,
                              color: meta.color,
                            }}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="td-mono font-extrabold text-right">
                          <span className={acc.isDebt ? "text-red" : "text-green"} style={{ fontSize: "14px" }}>
                            {formatZAR(Math.abs(bal))}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${acc.isDebt ? "danger" : "confirmed"}`}>
                            {acc.isDebt ? "Liability" : "Asset"}
                          </span>
                        </td>
                        <td className="text-right">
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                            <button
                              className="apple-pill-btn"
                              style={{ fontSize: "11px", padding: "4px 10px" }}
                              onClick={() => openEdit(acc)}
                            >
                              Edit
                            </button>
                            <button
                              style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}
                              onClick={() => handleDeleteAccount(acc.id, acc.name)}
                              title="Delete Account"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Account Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editAccount ? "Edit Account Details" : "Add Account"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Institution / Service Provider</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Standard Bank, City of Ekurhuleni, Telkom, School Admin"
                    value={form.institution}
                    onChange={(e) => setForm({ ...form, institution: e.target.value })}
                    required
                    id="account-institution-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Account Name</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Prestige Current Account, Rates & Taxes, Mobile Contract"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    id="account-name-input"
                  />
                </div>

                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label">Account Number (Masked)</label>
                    <input
                      className="form-input"
                      placeholder="e.g. •••• 9821"
                      value={form.accountNumberMasked}
                      onChange={(e) => setForm({ ...form, accountNumberMasked: e.target.value })}
                      id="account-number-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Account Type</label>
                    <select
                      className="form-select"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      id="account-type-select"
                    >
                      {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label">Opening / Current Balance (R)</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.openingBalance}
                      onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                      id="account-balance-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Classification</label>
                    <select
                      className="form-select"
                      value={form.isDebt ? "yes" : "no"}
                      onChange={(e) => setForm({ ...form, isDebt: e.target.value === "yes" })}
                      id="account-isdebt-select"
                    >
                      <option value="no">Asset (Savings / Current)</option>
                      <option value="yes">Liability / Debt Account</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Primary salary deposit account"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    id="account-notes-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex items-center gap-1.5" id="save-account-btn">
                  <CheckCircle2 size={16} />
                  <span>{editAccount ? "Save Changes" : "Add Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

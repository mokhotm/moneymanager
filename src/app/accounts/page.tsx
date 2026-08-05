"use client";

import { useEffect, useState } from "react";
import { formatZAR } from "@/lib/formatters";
import { Landmark, Building2, Plus, Layers, Pencil, Trash2 } from "lucide-react";

interface Account {
  id: string;
  name: string;
  institution: string;
  accountNumberMasked: string | null;
  type: string;
  currency: string;
  openingBalance: string;
  openingBalanceDate: string | null;
  isDebt: boolean;
  notes: string | null;
  debt?: {
    currentBalance: string;
    balanceConfidence: string;
    annualInterestRate: string | null;
    minimumPayment: string;
  } | null;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CURRENT: "Current / Checking",
  CREDIT_CARD: "Credit Card",
  LOAN: "Term Loan / Revolving",
  MUNICIPAL: "Municipal Services",
  SERVICE_ACCOUNT: "Service Provider / Telco",
  SAVINGS: "Savings",
  INVESTMENT: "Investment",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupByInstitution, setGroupByInstitution] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);

  const [form, setForm] = useState({
    name: "",
    institution: "",
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
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
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
      institution: "",
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

  // Grouping logic by Institution
  const institutions = Array.from(new Set(accounts.map((a) => a.institution)));
  const grouped = institutions.map((inst) => {
    const instAccounts = accounts.filter((a) => a.institution === inst);
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

  const overallAssets = accounts
    .filter((a) => !a.isDebt)
    .reduce((s, a) => s + Math.max(0, Number(a.openingBalance)), 0);
  const overallDebts = accounts.reduce(
    (s, a) => s + (a.debt ? Number(a.debt.currentBalance) : a.isDebt ? Math.abs(Number(a.openingBalance)) : 0),
    0
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounts &amp; Banking Register</h1>
          <p className="page-subtitle">List and manage all bank accounts, cards, loans &amp; municipal service accounts</p>
        </div>
        <div className="flex gap-3">
          <button
            className={`btn ${groupByInstitution ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setGroupByInstitution(!groupByInstitution)}
            id="toggle-group-institution-btn"
          >
            <Building2 size={16} />
            <span>{groupByInstitution ? "Grouped by Bank / Institution" : "Flat List View"}</span>
          </button>
          <button className="btn btn-primary" onClick={openAdd} id="add-account-btn">
            <Plus size={16} />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Overall Institution Summary */}
        <div className="stat-grid mb-6">
          <div className="stat-card">
            <div className="stat-label">Institutions Tracked</div>
            <div className="stat-value gold">{institutions.length}</div>
            <div className="stat-sub">Banks, Municipalities &amp; Lenders</div>
          </div>

          <div className="stat-card success">
            <div className="stat-label">Total Assets</div>
            <div className="stat-value green">{formatZAR(overallAssets)}</div>
            <div className="stat-sub">Current &amp; Savings Balances</div>
          </div>

          <div className="stat-card danger">
            <div className="stat-label">Total Liabilities / Debt</div>
            <div className="stat-value red">{formatZAR(overallDebts)}</div>
            <div className="stat-sub">Across all linked accounts</div>
          </div>
        </div>

        {loading ? (
          <div className="text-muted" style={{ padding: "48px 0", textAlign: "center" }}>
            Loading accounts…
          </div>
        ) : groupByInstitution ? (
          /* Grouped View by Bank / Institution */
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {grouped.map((g) => (
              <div key={g.institution} className="card">
                <div className="card-header" style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: 16 }}>
                  <div className="flex items-center gap-3">
                    <Building2 size={24} className="text-amber-400" />
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700 }}>{g.institution}</h2>
                      <div className="text-muted text-xs">
                        {g.accounts.length} account{g.accounts.length !== 1 ? "s" : ""} linked
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-center">
                    {g.totalAssets > 0 && (
                      <span className="badge active">Assets: {formatZAR(g.totalAssets)}</span>
                    )}
                    {g.totalDebts > 0 && (
                      <span className="badge danger">Debt: {formatZAR(g.totalDebts)}</span>
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
                        <th>Balance / Owed</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.accounts.map((acc) => {
                        const bal = acc.debt ? Number(acc.debt.currentBalance) : Number(acc.openingBalance);
                        return (
                          <tr key={acc.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{acc.name}</div>
                              {acc.notes && <div className="text-muted text-xs">{acc.notes}</div>}
                            </td>
                            <td className="td-mono text-muted">{acc.accountNumberMasked ?? "—"}</td>
                            <td>
                              <span className="badge blue">{ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}</span>
                            </td>
                            <td className="td-mono font-bold">
                              <span className={acc.isDebt ? "text-red" : "text-green"}>
                                {formatZAR(Math.abs(bal))}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${acc.isDebt ? "danger" : "active"}`}>
                                {acc.isDebt ? "Debt" : "Asset"}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openEdit(acc)}
                                id={`edit-account-${acc.id}`}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Flat Table View */
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Account Name</th>
                    <th>Account Number</th>
                    <th>Type</th>
                    <th>Balance / Owed</th>
                    <th>Category</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => {
                    const bal = acc.debt ? Number(acc.debt.currentBalance) : Number(acc.openingBalance);
                    return (
                      <tr key={acc.id}>
                        <td className="font-semibold">{acc.institution}</td>
                        <td>{acc.name}</td>
                        <td className="td-mono text-muted">{acc.accountNumberMasked ?? "—"}</td>
                        <td><span className="badge blue">{ACCOUNT_TYPE_LABELS[acc.type]}</span></td>
                        <td className="td-mono font-bold">
                          <span className={acc.isDebt ? "text-red" : "text-green"}>
                            {formatZAR(Math.abs(bal))}
                          </span>
                        </td>
                        <td><span className={`badge ${acc.isDebt ? "danger" : "active"}`}>{acc.isDebt ? "Liability" : "Asset"}</span></td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(acc)}>
                            Edit
                          </button>
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
              <h2 className="modal-title">{editAccount ? "Edit Account" : "Add Financial Account"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Bank / Institution</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Standard Bank, City of Ekurhuleni, Nedbank"
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
                    placeholder="e.g. Prestige Current Account, Revolving Loan"
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
                      placeholder="e.g. 02-307-446-9"
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
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label">Opening Balance / Balance (R)</label>
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
                <button type="submit" className="btn btn-primary" id="save-account-btn">
                  {editAccount ? "Save Changes" : "Add Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

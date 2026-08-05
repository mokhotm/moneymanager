"use client";

import { useEffect, useState } from "react";
import { formatZAR, formatPercent, formatMonths } from "@/lib/formatters";
import { AlertTriangle, Scale, TrendingDown, Building2, Plus, CreditCard, Home, Flame, Edit3, Trash2, CheckCircle2, ShieldCheck } from "lucide-react";

interface Debt {
  id: string;
  accountId: string;
  currentBalance: string;
  balanceConfidence: "CONFIRMED" | "ESTIMATED" | "UNKNOWN";
  balanceSource: string | null;
  annualInterestRate: string | null;
  interestRateConfidence: "CONFIRMED" | "ESTIMATED" | "UNKNOWN";
  minimumPayment: string;
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

const CONFIDENCE_LABEL: Record<string, string> = {
  CONFIRMED: "confirmed",
  ESTIMATED: "estimated",
  UNKNOWN: "unknown",
};

const PAYMENT_MODE_LABEL: Record<string, string> = {
  MINIMUM_ONLY: "Min only",
  FIXED_INSTALMENT: "Fixed instalment",
  FIXED_TERM_LOAN: "Fixed-term loan",
};

const URGENCY_LABEL: Record<string, string> = {
  NONE: "",
  SERVICE_INTERRUPTION_RISK: "Service Interruption Risk",
  LEGAL_ACTION_RISK: "Legal Action Risk",
  CREDIT_BUREAU_RISK: "Credit Bureau Risk",
};

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"PRIORITY" | "CATEGORY" | "BANK">("CATEGORY");
  const [showModal, setShowModal] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);

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
    const [d, a] = await Promise.all([
      fetch("/api/debts").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
    ]);
    setDebts(Array.isArray(d) ? d : []);
    setAccounts(Array.isArray(a) ? a : []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const openAdd = () => {
    setEditDebt(null);
    setForm({
      accountId: "", currentBalance: "", balanceConfidence: "ESTIMATED",
      balanceSource: "", annualInterestRate: "", interestRateConfidence: "UNKNOWN",
      minimumPayment: "", paymentMode: "MINIMUM_ONLY", urgencyFlag: "NONE",
      urgencyNote: "", includeInSnowball: true, priorityOverride: "", status: "ACTIVE",
    });
    setShowModal(true);
  };

  const openEdit = (d: Debt) => {
    setEditDebt(d);
    setForm({
      accountId: d.accountId,
      currentBalance: d.currentBalance,
      balanceConfidence: d.balanceConfidence,
      balanceSource: d.balanceSource ?? "",
      annualInterestRate: d.annualInterestRate ? String(Number(d.annualInterestRate) * 100) : "",
      interestRateConfidence: d.interestRateConfidence,
      minimumPayment: d.minimumPayment,
      paymentMode: d.paymentMode,
      urgencyFlag: d.urgencyFlag,
      urgencyNote: d.urgencyNote ?? "",
      includeInSnowball: d.includeInSnowball,
      priorityOverride: d.priorityOverride ? String(d.priorityOverride) : "",
      status: d.status,
    });
    setShowModal(true);
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

  const activeDebts = debts.filter((d) => d.status === "ACTIVE");
  const snowballDebts = activeDebts.filter((d) => d.includeInSnowball);
  const excludedDebts = activeDebts.filter((d) => !d.includeInSnowball);
  const totalDebt = activeDebts.reduce((s, d) => s + Number(d.currentBalance), 0);

  // Group by Bank / Institution
  const institutions = Array.from(new Set(activeDebts.map((d) => d.account.institution)));
  const groupedDebts = institutions.map((inst) => {
    const instDebts = activeDebts.filter((d) => d.account.institution === inst);
    const subtotal = instDebts.reduce((s, d) => s + Number(d.currentBalance), 0);
    const monthlyTotal = instDebts.reduce((s, d) => s + Number(d.minimumPayment), 0);
    return { institution: inst, debts: instDebts, subtotal, monthlyTotal };
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Debt Register</h1>
          <p className="page-subtitle">All active debts organized by payoff order &amp; financial institutions</p>
        </div>
        <div className="flex gap-3 items-center">
          <div
            className="flex"
            style={{
              background: "rgba(13, 20, 36, 0.6)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              padding: 4,
              gap: 4,
            }}
          >
            <button
              onClick={() => setViewMode("CATEGORY")}
              className={`btn btn-sm ${viewMode === "CATEGORY" ? "btn-primary" : "btn-secondary"}`}
              style={{ border: "none" }}
              id="view-category-group"
            >
              <CreditCard size={14} className="inline mr-1" /> Short vs Long Term
            </button>
            <button
              onClick={() => setViewMode("PRIORITY")}
              className={`btn btn-sm ${viewMode === "PRIORITY" ? "btn-primary" : "btn-secondary"}`}
              style={{ border: "none" }}
              id="view-priority-order"
            >
              <Flame size={14} className="inline mr-1 text-amber-400" /> Payoff Priority
            </button>
            <button
              onClick={() => setViewMode("BANK")}
              className={`btn btn-sm ${viewMode === "BANK" ? "btn-primary" : "btn-secondary"}`}
              style={{ border: "none" }}
              id="view-by-institution"
            >
              <Building2 size={14} className="inline mr-1 text-blue-400" /> Group by Bank
            </button>
          </div>

          <div className="badge danger font-bold">Total: {formatZAR(totalDebt)}</div>
          <button className="btn btn-primary flex items-center gap-1" onClick={openAdd} id="add-debt-btn">
            <Plus size={16} /> Add Debt
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="text-muted" style={{ padding: "48px 0", textAlign: "center" }}>Loading debts…</div>
        ) : activeDebts.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
            <CreditCard size={40} className="mx-auto mb-4 text-amber-400" />
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No debts entered yet</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              Add each debt — even if you don't know the exact balance yet.
            </p>
            <button className="btn btn-primary" onClick={openAdd}>Add your first debt</button>
          </div>
        ) : viewMode === "CATEGORY" ? (
          /* Grouped by Short-Term vs Long-Term Category */
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Short-Term Debts Card */}
            <div className="card" style={{ borderLeft: "4px solid var(--amber-500)" }}>
              <div className="card-header flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: 16 }}>
                <div className="flex items-center gap-3">
                  <CreditCard className="text-amber-400" size={24} />
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Short-Term Consumer Debts</h2>
                    <div className="text-muted text-xs">Clears rapidly in 18 Months (1 yr 6 mo)</div>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <span className="badge danger">Owed: {formatZAR(activeDebts.filter(d => !d.account.name.toLowerCase().includes("home loan") && !d.account.name.toLowerCase().includes("bond")).reduce((s, d) => s + Number(d.currentBalance), 0))}</span>
                  <span className="badge gold">Clears: 18 Months</span>
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Debt Account</th>
                      <th>Institution</th>
                      <th>Balance</th>
                      <th>Rate</th>
                      <th>Payment / Month</th>
                      <th>Mode</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDebts
                      .filter(d => !d.account.name.toLowerCase().includes("home loan") && !d.account.name.toLowerCase().includes("bond"))
                      .map((debt) => (
                        <tr key={debt.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{debt.account.name}</div>
                            {debt.urgencyFlag !== "NONE" && (
                              <span className="badge danger" style={{ marginTop: 4 }}>
                                {URGENCY_LABEL[debt.urgencyFlag]}
                              </span>
                            )}
                          </td>
                          <td className="font-semibold">{debt.account.institution}</td>
                          <td className="td-mono font-bold text-red">{formatZAR(Number(debt.currentBalance))}</td>
                          <td className="td-mono">
                            {debt.annualInterestRate ? formatPercent(Number(debt.annualInterestRate)) : "0%"}
                          </td>
                          <td className="td-mono">{formatZAR(Number(debt.minimumPayment))}</td>
                          <td><span className="badge blue">{PAYMENT_MODE_LABEL[debt.paymentMode]}</span></td>
                          <td>
                            <button className="btn btn-secondary btn-sm flex items-center gap-1" onClick={() => openEdit(debt)}>
                              <Edit3 size={12} /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Long-Term Home Loan Card */}
            <div className="card" style={{ borderLeft: "4px solid var(--purple-500)", background: "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(15, 23, 42, 0.4))" }}>
              <div className="card-header flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: 16 }}>
                <div className="flex items-center gap-3">
                  <Home className="text-purple-400" size={24} />
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Long-Term Mortgage & Property Bonds</h2>
                    <div className="text-muted text-xs">Primary residence mortgage bond (20-30 Year Term)</div>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <span className="badge danger">Balance: {formatZAR(activeDebts.filter(d => d.account.name.toLowerCase().includes("home loan") || d.account.name.toLowerCase().includes("bond")).reduce((s, d) => s + Number(d.currentBalance), 0))}</span>
                  <span className="badge blue">Term: 240 Months</span>
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Mortgage Account</th>
                      <th>Institution</th>
                      <th>Balance</th>
                      <th>Rate</th>
                      <th>Payment / Month</th>
                      <th>Mode</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDebts
                      .filter(d => d.account.name.toLowerCase().includes("home loan") || d.account.name.toLowerCase().includes("bond"))
                      .map((debt) => (
                        <tr key={debt.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{debt.account.name}</div>
                          </td>
                          <td className="font-semibold">{debt.account.institution}</td>
                          <td className="td-mono font-bold text-purple-400">{formatZAR(Number(debt.currentBalance))}</td>
                          <td className="td-mono">
                            {debt.annualInterestRate ? formatPercent(Number(debt.annualInterestRate)) : "11.75%"}
                          </td>
                          <td className="td-mono">{formatZAR(Number(debt.minimumPayment))}</td>
                          <td><span className="badge blue">{PAYMENT_MODE_LABEL[debt.paymentMode]}</span></td>
                          <td>
                            <button className="btn btn-secondary btn-sm flex items-center gap-1" onClick={() => openEdit(debt)}>
                              <Edit3 size={12} /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : viewMode === "BANK" ? (
          /* Grouped by Bank / Institution */
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {groupedDebts.map((g) => (
              <div key={g.institution} className="card">
                <div className="card-header" style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: 16 }}>
                  <div className="flex items-center gap-3">
                    <Building2 size={24} className="text-blue-400" />
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700 }}>{g.institution}</h2>
                      <div className="text-muted text-xs">{g.debts.length} debt account{g.debts.length !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="badge danger">Owed: {formatZAR(g.subtotal)}</span>
                    <span className="badge gold">Monthly: {formatZAR(g.monthlyTotal)}</span>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Debt Account</th>
                        <th>Balance</th>
                        <th>Confidence</th>
                        <th>Rate</th>
                        <th>Payment / Month</th>
                        <th>Mode</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.debts.map((debt) => (
                        <tr key={debt.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{debt.account.name}</div>
                            {debt.urgencyFlag !== "NONE" && (
                              <span className="badge danger" style={{ marginTop: 4 }}>
                                {URGENCY_LABEL[debt.urgencyFlag]}
                              </span>
                            )}
                          </td>
                          <td className="td-mono font-bold text-red">{formatZAR(Number(debt.currentBalance))}</td>
                          <td>
                            <span className={`badge ${CONFIDENCE_LABEL[debt.balanceConfidence]}`}>
                              {debt.balanceConfidence}
                            </span>
                          </td>
                          <td className="td-mono">
                            {debt.annualInterestRate ? formatPercent(Number(debt.annualInterestRate)) : "0%"}
                          </td>
                          <td className="td-mono">{formatZAR(Number(debt.minimumPayment))}</td>
                          <td><span className="badge blue">{PAYMENT_MODE_LABEL[debt.paymentMode]}</span></td>
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(debt)}>
                              Edit
                            </button>
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
          /* Priority Order Table */
          <>
            <div className="card mb-6">
              <div className="card-header">
                <span className="card-title">In Payoff Simulation ({snowballDebts.length})</span>
                <span className="text-muted text-sm">Ordered by payoff priority</span>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Debt Account</th>
                      <th>Institution</th>
                      <th>Balance</th>
                      <th>Confidence</th>
                      <th>Rate</th>
                      <th>Payment / Month</th>
                      <th>Mode</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snowballDebts.map((debt, i) => (
                      <tr key={debt.id}>
                        <td className="text-muted font-bold">{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{debt.account.name}</div>
                          {debt.urgencyFlag !== "NONE" && (
                            <span className="badge danger" style={{ marginTop: 4 }}>
                              {URGENCY_LABEL[debt.urgencyFlag]}
                            </span>
                          )}
                        </td>
                        <td className="font-semibold">{debt.account.institution}</td>
                        <td className="td-mono font-bold text-red">{formatZAR(Number(debt.currentBalance))}</td>
                        <td>
                          <span className={`badge ${CONFIDENCE_LABEL[debt.balanceConfidence]}`}>
                            {debt.balanceConfidence}
                          </span>
                        </td>
                        <td className="td-mono">
                          {debt.annualInterestRate ? formatPercent(Number(debt.annualInterestRate)) : "0%"}
                        </td>
                        <td className="td-mono">{formatZAR(Number(debt.minimumPayment))}</td>
                        <td><span className="badge blue">{PAYMENT_MODE_LABEL[debt.paymentMode]}</span></td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(debt)}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {excludedDebts.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Not Yet Included ({excludedDebts.length})</span>
                  <span className="badge unknown">UNKNOWN confidence — excluded from simulation</span>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Debt</th>
                        <th>Institution</th>
                        <th>Balance</th>
                        <th>Confidence</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excludedDebts.map((debt) => (
                        <tr key={debt.id}>
                          <td className="font-semibold">{debt.account.name}</td>
                          <td>{debt.account.institution}</td>
                          <td className="td-mono">{formatZAR(Number(debt.currentBalance))}</td>
                          <td><span className="badge unknown">UNKNOWN</span></td>
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(debt)}>
                              Confirm
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Debt Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editDebt ? "Edit Debt" : "Add Debt"}</h2>
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
                      <option value="FIXED_INSTALMENT">Fixed Instalment (parallel, off the top)</option>
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

                {form.urgencyFlag !== "NONE" && (
                  <div className="form-group">
                    <label className="form-label">Urgency Note</label>
                    <textarea
                      className="form-textarea"
                      placeholder="e.g. Pre-termination notice issued on account statement"
                      value={form.urgencyNote}
                      onChange={(e) => setForm({ ...form, urgencyNote: e.target.value })}
                      id="debt-urgency-note"
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" id="save-debt-btn">
                  {editDebt ? "Save Changes" : "Add Debt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

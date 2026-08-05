"use client";

import { useEffect, useState } from "react";
import { formatZAR, formatZARSigned, currentMonthKey } from "@/lib/formatters";
import { Calendar, AlertCircle, CheckCircle2, Clock, Sparkles, SlidersHorizontal, Home, CreditCard, ShoppingCart, PiggyBank, Zap, Plus, Edit3, Trash2 } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  FIXED_HOUSEHOLD_OBLIGATIONS: "Fixed Household Obligations",
  DEBT_ACCELERATION_PLAN: "Debt Acceleration Plan",
  FAMILY_AND_DISCRETIONARY: "Family & Discretionary",
  SAVINGS_GOALS: "Savings Goals",
  ONE_OFF_UNEXPECTED: "One-Off / Unexpected",
};

const CATEGORY_ICONS: Record<string, any> = {
  FIXED_HOUSEHOLD_OBLIGATIONS: Home,
  DEBT_ACCELERATION_PLAN: CreditCard,
  FAMILY_AND_DISCRETIONARY: ShoppingCart,
  SAVINGS_GOALS: PiggyBank,
  ONE_OFF_UNEXPECTED: Zap,
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

interface LineItem {
  id: string;
  category: string;
  label: string;
  amount: string;
  confidence: string;
  note: string | null;
  isComputed: boolean;
}

interface BudgetData {
  month: string;
  items: LineItem[];
}

interface Income {
  id: string;
  sourceName: string;
  recurringAmount: string;
  recurringAmountConfidence: string;
}

interface PayCycleInfo {
  mode: "PAYSLIP_AUTO" | "CALENDAR_MONTH" | "CUSTOM_RANGE";
  startDate: string;
  endDate: string;
  payDate: string;
  actualPayDate: string;
  wasShifted: boolean;
  shiftReason?: string;
  formattedRange: string;
}

export default function BudgetPage() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [income, setIncome] = useState<Income[]>([]);
  const [cycle, setCycle] = useState<PayCycleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  // Month key is resolved from the active pay cycle, not the calendar month
  const [month, setMonth] = useState(currentMonthKey());
  const [monthResolved, setMonthResolved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<LineItem | null>(null);
  const [form, setForm] = useState({
    category: "FIXED_HOUSEHOLD_OBLIGATIONS",
    label: "",
    amount: "",
    confidence: "ESTIMATED",
    note: "",
  });

  const loadData = async () => {
    // Fetch cycle first so we use its month key, not the calendar month
    const cyc = await fetch("/api/budget/cycle").then((r) => r.json());
    let activeMonth = month;
    if (cyc.success && cyc.cycle?.cycleMonthKey) {
      activeMonth = cyc.cycle.cycleMonthKey;
      if (!monthResolved) {
        setMonth(activeMonth);
        setMonthResolved(true);
      }
      setCycle(cyc.cycle);
    }

    const [b, inc] = await Promise.all([
      fetch(`/api/budget?month=${activeMonth}`).then((r) => r.json()),
      fetch("/api/income").then((r) => r.json()),
    ]);
    setData(b);
    setIncome(Array.isArray(inc) ? inc : []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [month]);

  const handleCycleModeChange = async (newMode: "PAYSLIP_AUTO" | "CALENDAR_MONTH" | "CUSTOM_RANGE") => {
    const res = await fetch("/api/budget/cycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: newMode }),
    });
    const result = await res.json();
    if (result.success) {
      setCycle(result.cycle);
    }
  };

  const openAdd = (cat: string) => {
    setEditItem(null);
    setForm({ category: cat, label: "", amount: "", confidence: "ESTIMATED", note: "" });
    setShowModal(true);
  };

  const openEdit = (item: LineItem) => {
    setEditItem(item);
    setForm({
      category: item.category,
      label: item.label,
      amount: String(Number(item.amount)),
      confidence: item.confidence,
      note: item.note ?? "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/budget?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, amount: parseFloat(form.amount) || 0, month };
    if (editItem) {
      await fetch("/api/budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editItem.id, ...payload }),
      });
    } else {
      await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setShowModal(false);
    loadData();
  };

  const items = data?.items ?? [];
  const totalIncome = income.reduce((s, i) => s + Number(i.recurringAmount), 0);
  const recurringItems = items.filter((i) => i.category !== "ONE_OFF_UNEXPECTED");
  const oneOffItems = items.filter((i) => i.category === "ONE_OFF_UNEXPECTED");
  const totalRecurring = recurringItems.reduce((s, i) => s + Number(i.amount), 0);
  const totalOneOff = oneOffItems.reduce((s, i) => s + Number(i.amount), 0);
  const netMarginRecurring = totalIncome - totalRecurring;
  const netMarginActual = netMarginRecurring - totalOneOff;
  const hasOneOff = oneOffItems.length > 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Monthly Budget
          </h1>
          <p className="page-subtitle">Track income vs expenses against your active pay cycle</p>
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="form-input"
            style={{ width: "auto" }}
            id="budget-month-picker"
          />
        </div>
      </div>

      <div className="page-body">
        {/* Pay-Cycle Control Bar & Weekend/Holiday Shift Indicator */}
        <div
          className="card mb-6"
          style={{
            background: "linear-gradient(135deg, var(--card-bg) 0%, rgba(20, 184, 166, 0.05) 100%)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "rgba(20, 184, 166, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#14b8a6",
                }}
              >
                <Calendar size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold" style={{ fontSize: 16 }}>
                    Active Pay Cycle: {cycle ? cycle.formattedRange : "Loading..."}
                  </span>
                  {cycle?.mode === "PAYSLIP_AUTO" && (
                    <span className="badge blue flex items-center gap-1" style={{ fontSize: 11 }}>
                      <Sparkles size={12} /> Auto Payslip (15th Pay Date)
                    </span>
                  )}
                  {cycle?.mode === "CALENDAR_MONTH" && (
                    <span className="badge gray" style={{ fontSize: 11 }}>
                      Calendar Month (1st-31st)
                    </span>
                  )}
                </div>
                {cycle?.wasShifted && (
                  <div className="text-amber flex items-center gap-1 text-xs" style={{ marginTop: 4 }}>
                    <AlertCircle size={13} /> {cycle.shiftReason}
                  </div>
                )}
                {!cycle?.wasShifted && (
                  <div className="text-muted text-xs" style={{ marginTop: 4 }}>
                    Anchored to your confirmed take-home salary deposit
                  </div>
                )}
              </div>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-2" style={{ background: "rgba(0,0,0,0.2)", padding: 4, borderRadius: 8 }}>
              <button
                className={`btn btn-sm ${cycle?.mode === "PAYSLIP_AUTO" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => handleCycleModeChange("PAYSLIP_AUTO")}
                style={{ fontSize: 12 }}
                id="btn-mode-payslip"
              >
                Payslip Auto
              </button>
              <button
                className={`btn btn-sm ${cycle?.mode === "CALENDAR_MONTH" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => handleCycleModeChange("CALENDAR_MONTH")}
                style={{ fontSize: 12 }}
                id="btn-mode-calendar"
              >
                Calendar Month
              </button>
            </div>
          </div>
        </div>

        {/* Dual Net Margin — spec §2.5 requirement */}
        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">Net Margin</span>
            {hasOneOff && <span className="badge amber">One-off expenses recorded</span>}
          </div>
          <div className="two-col">
            <div>
              <div className="stat-label" style={{ marginBottom: 6 }}>Recurring Margin</div>
              <div
                className={`stat-value ${netMarginRecurring >= 0 ? "green" : "red"}`}
                style={{ fontSize: 30 }}
              >
                {formatZARSigned(netMarginRecurring)}
              </div>
              <div className="text-muted text-sm" style={{ marginTop: 6 }}>
                {formatZAR(totalIncome)} take-home income − {formatZAR(totalRecurring)} recurring expenses
              </div>
            </div>
            {hasOneOff && (
              <div>
                <div className="stat-label" style={{ marginBottom: 6 }}>Actual This Month</div>
                <div
                  className={`stat-value ${netMarginActual >= 0 ? "green" : "red"}`}
                  style={{ fontSize: 30 }}
                >
                  {formatZARSigned(netMarginActual)}
                </div>
                <div className="text-muted text-sm" style={{ marginTop: 6 }}>
                  After one-off expenses ({formatZAR(totalOneOff)})
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-muted" style={{ textAlign: "center", padding: "48px 0" }}>Loading budget…</div>
        ) : (
          CATEGORIES.map((cat) => {
            const catItems = items.filter((i) => i.category === cat);
            const catTotal = catItems.reduce((s, i) => s + Number(i.amount), 0);
            return (
              <div key={cat} className="card mb-5">
                <div className="card-header">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const IconComp = CATEGORY_ICONS[cat];
                      return <IconComp size={20} className="text-amber-400" />;
                    })()}
                    <span className="card-title">{CATEGORY_LABELS[cat]}</span>
                    {cat === "ONE_OFF_UNEXPECTED" && (
                      <span className="badge amber">Excluded from recurring margin</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-muted">{formatZAR(catTotal)}</span>
                    <button
                      className="btn btn-secondary btn-sm flex items-center gap-1"
                      onClick={() => openAdd(cat)}
                      id={`add-budget-${cat}`}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>

                {catItems.length === 0 ? (
                  <div className="text-muted text-sm" style={{ padding: "8px 0" }}>
                    No items yet. Click + Add to enter expenses.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 0",
                          borderBottom: "1px solid var(--border-light)",
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 500 }}>{item.label}</span>
                          {item.isComputed && (
                            <span className="badge blue" style={{ marginLeft: 8 }}>computed</span>
                          )}
                          {item.confidence === "ESTIMATED" && (
                            <span className="badge estimated" style={{ marginLeft: 8 }}>estimate</span>
                          )}
                          {item.note && (
                            <div className="text-muted text-xs" style={{ marginTop: 2 }}>{item.note}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="td-mono font-bold">{formatZAR(Number(item.amount))}</span>
                          {!item.isComputed && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openEdit(item)}
                                id={`edit-budget-${item.id}`}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(item.id)}
                                id={`delete-budget-${item.id}`}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit/Add Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ width: 440, maxWidth: "90vw" }}>
            <div className="card-header">
              <span className="card-title">
                {editItem ? "Edit Budget Item" : "Add Budget Item"}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Label</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. Groceries"
                  required
                />
              </div>

              <div>
                <label className="form-label">Monthly Amount (ZAR)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="form-label">Confidence</label>
                <select
                  className="form-input"
                  value={form.confidence}
                  onChange={(e) => setForm({ ...form, confidence: e.target.value })}
                >
                  <option value="CONFIRMED">CONFIRMED (from statement)</option>
                  <option value="ESTIMATED">ESTIMATED</option>
                </select>
              </div>

              <div>
                <label className="form-label">Note (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Additional context"
                />
              </div>

              <div className="flex gap-3 justify-end" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editItem ? "Save Changes" : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

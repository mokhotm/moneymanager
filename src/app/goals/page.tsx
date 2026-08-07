"use client";

import { useEffect, useState } from "react";
import { formatZAR } from "@/lib/formatters";
import { ShieldCheck, Sparkles, Home, TrendingUp, GraduationCap, ShoppingBag, Target, Plus } from "lucide-react";

interface Goal {
  id: string;
  name: string;
  type: string;
  targetAmount: string | null;
  targetFormula: string | null;
  currentAmount: string;
  monthlyContribution: string;
  priority: number;
  status: string;
  note: string | null;
  projection: {
    monthsToTarget: number;
    projectedCompletionDate: string;
    isAchieved: boolean;
    shortfall: number;
  };
}

const GOAL_TYPE_LABELS: Record<string, { label: string; Icon: any }> = {
  EMERGENCY_FUND: { label: "Emergency Reserve", Icon: ShieldCheck },
  DEBT_FREE_BY_DATE: { label: "Debt Freedom", Icon: Sparkles },
  HOUSE_DEPOSIT: { label: "House Deposit", Icon: Home },
  RETIREMENT_INVESTMENT: { label: "Retirement Top-Up", Icon: TrendingUp },
  EDUCATION_FUND: { label: "Education Fund", Icon: GraduationCap },
  MAJOR_PURCHASE: { label: "Major Purchase", Icon: ShoppingBag },
  CUSTOM: { label: "Custom Goal", Icon: Target },
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "EMERGENCY_FUND",
    targetAmount: "",
    targetFormula: "",
    currentAmount: "0",
    monthlyContribution: "1000",
    priority: "1",
    note: "",
  });

  const loadGoals = async () => {
    try {
      const res = await fetch("/api/goals");
      const data = await res.json();
      setGoals(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGoals(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    loadGoals();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Financial Goals &amp; Wealth Targets
            <span className="badge badge-gold text-xs font-mono">Targets Active</span>
          </h1>
          <p className="page-subtitle">Track emergency reserves, debt freedom, and wealth-building targets</p>
        </div>
        <button className="btn btn-primary flex items-center gap-1.5" onClick={() => setShowModal(true)} id="add-goal-btn">
          <Plus size={16} /> Add New Goal
        </button>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="text-muted" style={{ padding: "48px 0", textAlign: "center" }}>
            <div className="animate-pulse">Loading financial wealth targets…</div>
          </div>
        ) : (
          <div className="two-col mb-6">
            {goals.map((goal) => {
              const current = Number(goal.currentAmount);
              const target = goal.targetAmount ? Number(goal.targetAmount) : 0;
              const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100;

              const meta = GOAL_TYPE_LABELS[goal.type] ?? { label: goal.type, Icon: Target };
              const GoalIcon = meta.Icon;

              return (
                <div key={goal.id} className="card flex flex-col justify-between" style={{ borderTop: "3px solid var(--gold)" }}>
                  <div>
                    <div className="card-header mb-4">
                      <div>
                        <span className="badge badge-gold flex items-center gap-1.5" style={{ display: "inline-flex" }}>
                          <GoalIcon size={12} />
                          <span>{meta.label}</span>
                        </span>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginTop: 6 }}>{goal.name}</h2>
                      </div>
                      <span className="badge badge-blue">Priority #{goal.priority}</span>
                    </div>

                    {goal.note && <p className="text-muted text-sm mb-4">{goal.note}</p>}

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2 font-semibold">
                        <span>Saved: <strong className="text-emerald-400 font-mono">{formatZAR(current)}</strong></span>
                        <span>Target: <strong className="text-amber-400 font-mono">{target > 0 ? formatZAR(target) : "Formula"}</strong></span>
                      </div>
                      <div style={{ height: "8px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--gold-gradient)", borderRadius: "99px" }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted mt-2 font-mono">
                        <span className="text-emerald-400 font-bold">{pct}% Funded</span>
                        <span>Shortfall: {formatZAR(goal.projection.shortfall)}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "rgba(7, 11, 20, 0.8)",
                      borderRadius: "14px",
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <div className="text-muted text-xs font-semibold">Monthly Allocation</div>
                      <div className="font-extrabold text-amber-400 td-mono">{formatZAR(Number(goal.monthlyContribution))}/mo</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="text-muted text-xs font-semibold">Completion Date</div>
                      <div className="font-extrabold text-emerald-400">{goal.projection.projectedCompletionDate}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Financial Goal</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Goal Name</label>
                  <input
                    className="form-input"
                    placeholder="e.g. 3-Month Emergency Reserve"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    id="goal-name-input"
                  />
                </div>

                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label required">Category</label>
                    <select
                      className="form-select"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      id="goal-type-select"
                    >
                      {Object.entries(GOAL_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority Order</label>
                    <input
                      className="form-input"
                      type="number"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      id="goal-priority-input"
                    />
                  </div>
                </div>

                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label">Target Amount (R)</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="e.g. 150000"
                      value={form.targetAmount}
                      onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                      id="goal-target-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Monthly Contribution (R)</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="e.g. 2500"
                      value={form.monthlyContribution}
                      onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })}
                      id="goal-monthly-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Dedicated savings account linked"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    id="goal-notes-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="save-goal-btn">Save Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

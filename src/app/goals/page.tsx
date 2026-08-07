"use client";

import { useEffect, useState, useMemo } from "react";
import { formatZAR } from "@/lib/formatters";
import {
  ShieldCheck,
  Sparkles,
  Home,
  TrendingUp,
  GraduationCap,
  ShoppingBag,
  Target,
  Plus,
  Lock,
  LogIn,
  DollarSign,
  PiggyBank,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Edit3,
  Trash2,
  Filter,
  Zap,
} from "lucide-react";

interface Goal {
  id: string;
  name: string;
  type: string;
  targetAmount: string | number | null;
  targetFormula: string | null;
  currentAmount: string | number;
  monthlyContribution: string | number;
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

const GOAL_TYPE_LABELS: Record<string, { label: string; Icon: any; color: string }> = {
  EMERGENCY_FUND: { label: "Emergency Reserve", Icon: ShieldCheck, color: "#10b981" },
  DEBT_FREE_BY_DATE: { label: "Debt Freedom", Icon: Sparkles, color: "#f59e0b" },
  HOUSE_DEPOSIT: { label: "House Deposit", Icon: Home, color: "#3b82f6" },
  RETIREMENT_INVESTMENT: { label: "Retirement & ETF", Icon: TrendingUp, color: "#a855f7" },
  EDUCATION_FUND: { label: "Education Fund", Icon: GraduationCap, color: "#06b6d4" },
  MAJOR_PURCHASE: { label: "Major Purchase", Icon: ShoppingBag, color: "#ec4899" },
  CUSTOM: { label: "Custom Target", Icon: Target, color: "#64748b" },
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  // Modal States
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [targetDepositGoal, setTargetDepositGoal] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>("5000");

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
      if (res.status === 401) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data?.error === "Unauthorized") {
        setUnauthorized(true);
      } else {
        setGoals(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const openCreateModal = () => {
    setEditingGoal(null);
    setForm({
      name: "",
      type: "EMERGENCY_FUND",
      targetAmount: "150000",
      targetFormula: "",
      currentAmount: "0",
      monthlyContribution: "2500",
      priority: "1",
      note: "",
    });
    setShowGoalModal(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name,
      type: goal.type,
      targetAmount: goal.targetAmount ? String(goal.targetAmount) : "",
      targetFormula: goal.targetFormula || "",
      currentAmount: String(goal.currentAmount),
      monthlyContribution: String(goal.monthlyContribution),
      priority: String(goal.priority),
      note: goal.note || "",
    });
    setShowGoalModal(true);
  };

  const openDepositModal = (goal: Goal) => {
    setTargetDepositGoal(goal);
    setDepositAmount("5000");
    setShowDepositModal(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGoal) {
      await fetch(`/api/goals?id=${editingGoal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setShowGoalModal(false);
    loadGoals();
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDepositGoal) return;
    await fetch(`/api/goals?id=${targetDepositGoal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depositAmount: parseFloat(depositAmount) }),
    });
    setShowDepositModal(false);
    loadGoals();
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete goal "${name}"?`)) return;
    await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
    loadGoals();
  };

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    if (activeFilter === "ALL") return goals;
    return goals.filter((g) => g.type === activeFilter);
  }, [goals, activeFilter]);

  // Aggregate Metrics
  const totalSaved = useMemo(() => {
    return goals.reduce((acc, g) => acc + Number(g.currentAmount), 0);
  }, [goals]);

  const totalTarget = useMemo(() => {
    return goals.reduce((acc, g) => acc + (g.targetAmount ? Number(g.targetAmount) : 0), 0);
  }, [goals]);

  const overallProgressPct = useMemo(() => {
    return totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 100;
  }, [totalSaved, totalTarget]);

  const totalMonthlyAllocation = useMemo(() => {
    return goals.reduce((acc, g) => acc + Number(g.monthlyContribution), 0);
  }, [goals]);

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Loading financial wealth targets &amp; emergency reserves…
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Financial Goals &amp; Wealth Targets</h1>
            <p className="page-subtitle">Track emergency reserves, debt freedom, and wealth-building targets</p>
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
              Please sign in to your MoneyManager account to view your financial wealth targets and emergency reserves.
            </p>
            <a href="/login" className="btn btn-primary btn-lg inline-flex items-center gap-2">
              <LogIn size={18} />
              <span>Sign In to Access Goals</span>
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
            Financial Goals &amp; Wealth Engine
            <span className="badge badge-gold text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            Track emergency reserves, debt freedom milestones, and wealth-building targets with AI allocation guidance
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button className="btn btn-primary flex items-center gap-1.5" onClick={openCreateModal} id="add-goal-btn">
            <Plus size={16} /> Add New Goal
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Headline Wealth Stat Grid */}
        <div className="stat-grid mb-6">
          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05))",
              borderColor: "rgba(16, 185, 129, 0.4)",
            }}
          >
            <div className="stat-label text-emerald-400 flex items-center gap-1.5">
              <PiggyBank size={14} /> Total Capital Saved
            </div>
            <div className="stat-value text-emerald-400 font-extrabold">{formatZAR(totalSaved)}</div>
            <div className="stat-sub">Across {goals.length} active wealth targets</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-amber-400 flex items-center gap-1.5">
              <Target size={14} /> Aggregate Wealth Goal
            </div>
            <div className="stat-value text-amber-400 font-extrabold">{formatZAR(totalTarget)}</div>
            <div className="stat-sub text-muted">Target Wealth Horizon</div>
          </div>

          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.05))",
              borderColor: "rgba(59, 130, 246, 0.4)",
            }}
          >
            <div className="stat-label text-blue-400 flex items-center gap-1.5">
              <DollarSign size={14} /> Monthly Goal Allocation
            </div>
            <div className="stat-value text-blue-400 font-extrabold">{formatZAR(totalMonthlyAllocation)}<span style={{ fontSize: "12px", color: "#94a3b8" }}>/mo</span></div>
            <div className="stat-sub">Automated Monthly Paydown</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-purple-400 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Overall Funding Rate
            </div>
            <div className="stat-value text-purple-300 font-extrabold">{overallProgressPct}%</div>
            <div className="stat-sub text-emerald-400 font-bold">{formatZAR(totalTarget - totalSaved)} Shortfall</div>
          </div>
        </div>

        {/* AI Goals Strategy Insight Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: "18px",
            padding: "20px 24px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f59e0b",
                flexShrink: 0,
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>GOALS_AGENT Wealth Strategy Recommendation</span>
                <span className="badge badge-gold text-xs">High Safety Score</span>
              </div>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", margin: 0 }}>
                Your Emergency Reserve is 100% funded (6.2 months covered). Surplus cashflow can safely accelerate your Debt Freedom &amp; ETF Wealth targets by R4,250/mo.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const emergencyGoal = goals.find((g) => g.type === "EMERGENCY_FUND") || goals[0];
              if (emergencyGoal) openDepositModal(emergencyGoal);
            }}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            style={{ fontSize: "12px", padding: "8px 16px", whiteSpace: "nowrap" }}
          >
            <Zap size={14} style={{ color: "#f59e0b" }} />
            <span>Deposit Surplus</span>
          </button>
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
            All Goals ({goals.length})
          </button>
          {Object.entries(GOAL_TYPE_LABELS).map(([k, v]) => {
            const count = goals.filter((g) => g.type === k).length;
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

        {/* Apple Obsidian Goal Cards Grid */}
        <div className="two-col mb-6">
          {filteredGoals.map((goal) => {
            const current = Number(goal.currentAmount);
            const target = goal.targetAmount ? Number(goal.targetAmount) : 0;
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100;

            const meta = GOAL_TYPE_LABELS[goal.type] ?? { label: goal.type, Icon: Target, color: "#64748b" };
            const GoalIcon = meta.Icon;

            return (
              <div
                key={goal.id}
                className="card flex flex-col justify-between"
                style={{
                  borderLeft: "1px solid var(--border)",
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  borderTop: `3px solid ${meta.color}`,
                  background: "rgba(13, 20, 36, 0.9)",
                  backdropFilter: "blur(24px)",
                }}
              >
                <div>
                  <div className="card-header mb-4 flex items-center justify-between">
                    <div>
                      <span
                        className="badge flex items-center gap-1.5"
                        style={{
                          display: "inline-flex",
                          background: `${meta.color}20`,
                          border: `1px solid ${meta.color}50`,
                          color: meta.color,
                        }}
                      >
                        <GoalIcon size={13} />
                        <span>{meta.label}</span>
                      </span>
                      <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginTop: "8px" }}>
                        {goal.name}
                      </h2>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="badge badge-blue font-mono">Priority #{goal.priority}</span>
                      <button
                        onClick={() => openEditModal(goal)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                        title="Edit Goal"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id, goal.name)}
                        style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}
                        title="Delete Goal"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {goal.note && <p className="text-muted text-sm mb-4">{goal.note}</p>}

                  {/* Progress Bar & Balances */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2 font-semibold">
                      <span>Saved: <strong className="text-emerald-400 font-mono">{formatZAR(current)}</strong></span>
                      <span>Target: <strong className="text-amber-400 font-mono">{target > 0 ? formatZAR(target) : "Formula"}</strong></span>
                    </div>

                    <div style={{ height: "10px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${meta.color} 0%, #fbbf24 100%)`,
                          borderRadius: "99px",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-muted mt-2 font-mono">
                      <span className="text-emerald-400 font-bold">{pct}% Funded</span>
                      <span>Shortfall: {formatZAR(goal.projection.shortfall)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Allocation Card & Quick Deposit Button */}
                <div
                  style={{
                    background: "rgba(7, 11, 20, 0.8)",
                    borderRadius: "14px",
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid var(--border)",
                    marginTop: "16px",
                  }}
                >
                  <div>
                    <div className="text-muted text-xs font-semibold">Monthly Allocation</div>
                    <div className="font-extrabold text-amber-400 td-mono" style={{ fontSize: "15px" }}>
                      {formatZAR(Number(goal.monthlyContribution))}/mo
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "right" }}>
                      <div className="text-muted text-xs font-semibold">Completion Date</div>
                      <div className="font-extrabold text-emerald-400" style={{ fontSize: "13px" }}>
                        {goal.projection.projectedCompletionDate}
                      </div>
                    </div>

                    <button
                      onClick={() => openDepositModal(goal)}
                      className="btn btn-primary btn-sm flex items-center gap-1"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      <Plus size={13} />
                      <span>Deposit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create / Edit Goal Modal */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingGoal ? "Edit Financial Goal" : "Create Financial Goal"}</h2>
              <button className="modal-close" onClick={() => setShowGoalModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveGoal}>
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
                  <label className="form-label">Current Saved Balance (R)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.currentAmount}
                    onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                    id="goal-current-input"
                  />
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowGoalModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="save-goal-btn">
                  {editingGoal ? "Save Changes" : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Capital Deposit Modal */}
      {showDepositModal && targetDepositGoal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Deposit Capital to Goal</h2>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Target: <strong style={{ color: "var(--gold)" }}>{targetDepositGoal.name}</strong>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowDepositModal(false)}>×</button>
            </div>

            <form onSubmit={handleDepositSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Deposit Amount (R)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    required
                    autoFocus
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
                  <div style={{ fontWeight: 800, marginBottom: "4px" }}>New Projected Balance:</div>
                  <div style={{ fontSize: "16px", fontWeight: 900, fontFamily: "var(--font-mono)" }}>
                    {formatZAR(Number(targetDepositGoal.currentAmount) + (parseFloat(depositAmount) || 0))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDepositModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

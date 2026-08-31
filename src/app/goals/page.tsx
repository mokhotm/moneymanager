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
  Bot,
  RefreshCw,
  Sliders,
  Check,
  ChevronRight,
  Info,
  Scale,
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
  linkToBudget: boolean;
  autoAllocateSurplus: boolean;
  allocatedBudgetAmount: number;
  aiFeasibilityScore: number | null;
  aiShouldAllocate: boolean | null;
  aiRecommendedAllocation: number | null;
  aiEvaluationSummary: string | null;
  aiLastEvaluatedAt: string | null;
  projection: {
    monthsToTarget: number;
    projectedCompletionDate: string;
    isAchieved: boolean;
    shortfall: number;
  };
}

interface CashflowSurplusSummary {
  monthlyIncome: number;
  fixedObligations: number;
  debtObligations: number;
  availableSurplus: number;
  allocatedToGoals: number;
  remainingCashBuffer: number;
  linkedGoalsCount: number;
  activeCycleMonth: string;
}

interface AIEvaluationDetail {
  goalId: string;
  goalName: string;
  isFeasible: boolean;
  feasibilityScore: number;
  shouldAllocateBudget: boolean;
  recommendedMonthlyAllocation: number;
  allocationPriorityRank: number;
  reasoning: string;
  riskFactors: string[];
  actionableAdvice: string;
  evaluatedByModel?: string;
  evaluatedAt: string;
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
  const [surplus, setSurplus] = useState<CashflowSurplusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [isSyncingSurplus, setIsSyncingSurplus] = useState(false);
  const [evaluatingGoalId, setEvaluatingGoalId] = useState<string | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<AIEvaluationDetail | null>(null);

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
    linkToBudget: true,
    autoAllocateSurplus: true,
  });

  const loadData = async () => {
    try {
      const [goalsRes, surplusRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/goals/sync-budget"),
      ]);

      if (goalsRes.status === 401) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      const goalsData = await goalsRes.json();
      if (goalsData?.error === "Unauthorized") {
        setUnauthorized(true);
      } else {
        setGoals(Array.isArray(goalsData) ? goalsData : []);
      }

      if (surplusRes.ok) {
        const surplusData = await surplusRes.json();
        setSurplus(surplusData);
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

  const handleSyncAllGoalsToBudget = async () => {
    setIsSyncingSurplus(true);
    try {
      const res = await fetch("/api/goals/sync-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to sync goals to budget:", err);
    } finally {
      setIsSyncingSurplus(false);
    }
  };

  const handleEvaluateAI = async (goal: Goal) => {
    setEvaluatingGoalId(goal.id);
    try {
      const res = await fetch(`/api/goals/${goal.id}/evaluate-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        setSelectedEvaluation(data.evaluation);
        await loadData();
      }
    } catch (err) {
      console.error("AI Evaluation error:", err);
    } finally {
      setEvaluatingGoalId(null);
    }
  };

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
      linkToBudget: true,
      autoAllocateSurplus: true,
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
      linkToBudget: Boolean(goal.linkToBudget),
      autoAllocateSurplus: Boolean(goal.autoAllocateSurplus),
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
    loadData();
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
    loadData();
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete goal "${name}"?`)) return;
    await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
    loadData();
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

  const totalBudgetLinkedAllocation = useMemo(() => {
    return goals
      .filter((g) => g.linkToBudget)
      .reduce((acc, g) => acc + Number(g.allocatedBudgetAmount || g.monthlyContribution), 0);
  }, [goals]);

  if (loading) {
    return (
      <div className="page-body" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div style={{ textAlign: "center", color: "var(--text-muted)" }} className="animate-pulse">
          <Target size={40} style={{ margin: "0 auto 16px", color: "var(--gold)" }} />
          <p style={{ fontWeight: 600 }}>Loading Wealth &amp; Savings Goals…</p>
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="page-body">
        <div className="card" style={{ maxWidth: "480px", margin: "40px auto", textAlign: "center" }}>
          <Lock size={48} style={{ color: "var(--gold)", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "8px" }}>Authentication Required</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "14px" }}>
            Please log in to manage your financial goals and auto-budget allocations.
          </p>
          <a href="/login" className="btn btn-primary" style={{ width: "100%" }}>
            <LogIn size={16} /> Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              Financial Goals &amp; Wealth Lineage
            </h1>
            <span className="badge gold">AI Allocation Engine</span>
          </div>
          <p className="page-subtitle">
            Set capital accumulation targets, verify cashflow feasibility with AI, and dynamically allocate monthly surplus from your budget.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleSyncAllGoalsToBudget}
            disabled={isSyncingSurplus}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={isSyncingSurplus ? "animate-spin" : ""} />
            <span>{isSyncingSurplus ? "Syncing Budget..." : "Sync All Goals to Budget"}</span>
          </button>

          <button onClick={openCreateModal} className="btn btn-primary btn-sm">
            <Plus size={14} /> New Financial Goal
          </button>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* ─── 1. DYNAMIC CASHFLOW SURPLUS ALLOCATION HUD ────────────────── */}
        {surplus && (
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-card) 100%)",
              border: "1px solid var(--border)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--gold-dim)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--gold-light)",
                  }}
                >
                  <Scale size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                    Monthly Cashflow Surplus &amp; Goal Allocation Hub ({surplus.activeCycleMonth})
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                    Intelligent priority-based waterfall allocates surplus into goals when funds are available.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="badge active">
                  {surplus.linkedGoalsCount} Linked Goal{surplus.linkedGoalsCount === 1 ? "" : "s"}
                </span>
                <span className="badge blue">
                  Buffer: {formatZAR(surplus.remainingCashBuffer)}
                </span>
              </div>
            </div>

            {/* 4 Flow Columns */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
              <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Monthly Net Income
                </div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {formatZAR(surplus.monthlyIncome)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Salary &amp; Recurring Incomes
                </div>
              </div>

              <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Fixed &amp; Debt Commitments
                </div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                  {formatZAR(surplus.fixedObligations + surplus.debtObligations)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Fixed: {formatZAR(surplus.fixedObligations)} • Debts: {formatZAR(surplus.debtObligations)}
                </div>
              </div>

              <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Available Cashflow Surplus
                </div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                  {formatZAR(surplus.availableSurplus)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--green)", marginTop: "4px", fontWeight: "600" }}>
                  Eligible for Goal Allocation
                </div>
              </div>

              <div style={{ background: "var(--gold-dim)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--gold-light)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Allocated to Active Budget
                </div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--gold-light)", fontFamily: "var(--font-mono)" }}>
                  {formatZAR(surplus.allocatedToGoals)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--gold-light)", marginTop: "4px" }}>
                  {surplus.remainingCashBuffer >= 1500 ? "✓ Healthy safety margin" : "⚠️ Tight margin"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 2. STAT KPI CARDS ────────────────────────────────────────────── */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total Capital Accumulated</div>
            <div className="stat-value gold">{formatZAR(totalSaved)}</div>
            <div className="stat-sub">Across {goals.length} active wealth targets</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Target Completion</div>
            <div className="stat-value" style={{ color: "var(--green)" }}>{overallProgressPct}%</div>
            <div className="stat-sub">Target sum: {formatZAR(totalTarget)}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Budget Allocated Contributions</div>
            <div className="stat-value" style={{ color: "var(--cyan)" }}>
              {formatZAR(totalBudgetLinkedAllocation)}<span style={{ fontSize: "14px", color: "var(--text-muted)" }}>/mo</span>
            </div>
            <div className="stat-sub">
              {goals.filter((g) => g.linkToBudget).length} goals linked to monthly budget
            </div>
          </div>
        </div>

        {/* ─── 3. FILTER PILLS & ACTION BAR ─────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`btn btn-sm ${activeFilter === "ALL" ? "btn-primary" : "btn-secondary"}`}
            >
              All Goals ({goals.length})
            </button>
            {Object.keys(GOAL_TYPE_LABELS).map((typeKey) => {
              const count = goals.filter((g) => g.type === typeKey).length;
              if (count === 0 && activeFilter !== typeKey) return null;
              const typeInfo = GOAL_TYPE_LABELS[typeKey];
              return (
                <button
                  key={typeKey}
                  onClick={() => setActiveFilter(typeKey)}
                  className={`btn btn-sm ${activeFilter === typeKey ? "btn-primary" : "btn-secondary"}`}
                >
                  <typeInfo.Icon size={13} />
                  <span>{typeInfo.label} ({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── 4. GOAL CARDS GRID ───────────────────────────────────────────── */}
        {filteredGoals.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <PiggyBank size={48} style={{ color: "var(--text-muted)", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "6px" }}>No Financial Goals Found</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", maxWidth: "450px", margin: "0 auto 20px" }}>
              Define your emergency reserves, house deposits, or investment milestones and enable AI to assess their feasibility within your budget.
            </p>
            <button onClick={openCreateModal} className="btn btn-primary btn-sm">
              <Plus size={14} /> Create Your First Goal
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
            {filteredGoals.map((goal) => {
              const typeConfig = GOAL_TYPE_LABELS[goal.type] || GOAL_TYPE_LABELS.CUSTOM;
              const currentAmt = Number(goal.currentAmount);
              const targetAmt = goal.targetAmount ? Number(goal.targetAmount) : 0;
              const progressPct = targetAmt > 0 ? Math.min(100, Math.round((currentAmt / targetAmt) * 100)) : 100;
              const isAchieved = currentAmt >= targetAmt && targetAmt > 0;
              const monthly = Number(goal.monthlyContribution);

              return (
                <div
                  key={goal.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "18px",
                    background: "var(--bg-card)",
                    border: goal.linkToBudget ? "1px solid var(--border-hover)" : "1px solid var(--border)",
                  }}
                >
                  {/* Card Top Header */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "var(--radius-md)",
                            background: `${typeConfig.color}18`,
                            border: `1px solid ${typeConfig.color}40`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: typeConfig.color,
                          }}
                        >
                          <typeConfig.Icon size={20} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                            {goal.name}
                          </h4>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>{typeConfig.label}</span>
                            <span>•</span>
                            <span>Priority #{goal.priority}</span>
                          </div>
                        </div>
                      </div>

                      {/* Linking Badge */}
                      <span className={`badge ${goal.linkToBudget ? "active" : "unknown"}`}>
                        {goal.linkToBudget ? "🏦 Budget Linked" : "Standalone"}
                      </span>
                    </div>

                    {/* Progress Bar & Balances */}
                    <div style={{ margin: "14px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                        <span style={{ fontSize: "22px", fontWeight: "800", color: isAchieved ? "var(--green)" : "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                          {formatZAR(currentAmt)}
                        </span>
                        <span style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          / {targetAmt > 0 ? formatZAR(targetAmt) : "No Target Cap"}
                        </span>
                      </div>

                      <div style={{ width: "100%", height: "8px", background: "var(--bg-input)", borderRadius: "99px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${progressPct}%`,
                            height: "100%",
                            background: isAchieved ? "var(--green)" : typeConfig.color,
                            borderRadius: "99px",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
                        <span>{progressPct}% Completed</span>
                        <span>
                          {goal.projection?.isAchieved
                            ? "🎯 Target Achieved!"
                            : goal.projection?.monthsToTarget
                            ? `~${goal.projection.monthsToTarget} months (${goal.projection.projectedCompletionDate})`
                            : "Ongoing Target"}
                        </span>
                      </div>
                    </div>

                    {/* AI Feasibility & Allocation Insight Box */}
                    <div
                      style={{
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-light)",
                        borderRadius: "var(--radius-md)",
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Bot size={14} style={{ color: "var(--cyan)" }} />
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--cyan)", textTransform: "uppercase" }}>
                            AI Feasibility Assessment
                          </span>
                        </div>

                        {goal.aiFeasibilityScore !== null ? (
                          <span
                            className={`badge ${
                              goal.aiFeasibilityScore >= 80 ? "confirmed" : goal.aiFeasibilityScore >= 50 ? "estimated" : "danger"
                            }`}
                            style={{ fontSize: "10px" }}
                          >
                            Score: {goal.aiFeasibilityScore}/100
                          </span>
                        ) : (
                          <button
                            onClick={() => handleEvaluateAI(goal)}
                            disabled={evaluatingGoalId === goal.id}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: "10px", padding: "2px 8px" }}
                          >
                            {evaluatingGoalId === goal.id ? "Analyzing..." : "Evaluate AI"}
                          </button>
                        )}
                      </div>

                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        {goal.aiEvaluationSummary || "AI has not evaluated cashflow feasibility yet. Click evaluate to run full actuarial analysis."}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", paddingTop: "6px", borderTop: "1px solid var(--border-light)" }}>
                        <span style={{ color: "var(--text-muted)" }}>
                          Monthly Target: <strong style={{ color: "var(--text-primary)" }}>{formatZAR(monthly)}/mo</strong>
                        </span>
                        {goal.linkToBudget && (
                          <span style={{ color: "var(--gold-light)", fontWeight: "700" }}>
                            Allocated in Budget: {formatZAR(goal.allocatedBudgetAmount || monthly)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Bottom Toolbar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", paddingTop: "12px", borderTop: "1px solid var(--border-light)" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => openDepositModal(goal)}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        + Deposit
                      </button>

                      <button
                        onClick={() => handleEvaluateAI(goal)}
                        disabled={evaluatingGoalId === goal.id}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: "12px", padding: "6px 10px" }}
                        title="Run AI Feasibility Evaluation"
                      >
                        <Bot size={13} className={evaluatingGoalId === goal.id ? "animate-spin" : ""} />
                        <span>AI Review</span>
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => openEditModal(goal)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "6px 8px" }}
                        title="Edit Goal"
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        onClick={() => handleDeleteGoal(goal.id, goal.name)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: "6px 8px" }}
                        title="Delete Goal"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── CREATE / EDIT GOAL MODAL ─────────────────────────────────────── */}
      {showGoalModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "var(--glass-blur)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "560px",
              background: "var(--bg-modal)",
              border: "1px solid var(--border-hover)",
              boxShadow: "var(--shadow-modal)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Target size={22} style={{ color: "var(--gold)" }} />
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                  {editingGoal ? "Edit Financial Goal" : "Create New Financial Goal"}
                </h3>
              </div>
              <button
                onClick={() => setShowGoalModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="form-group" style={{ gap: "16px" }}>
              <div>
                <label className="form-label required">Goal Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. 6-Month Emergency Fund, House Deposit"
                  className="form-input"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label required">Goal Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="form-select"
                  >
                    {Object.entries(GOAL_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label required">Priority Ranking</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="form-select"
                  >
                    <option value="1">Priority #1 (Highest - Emergency/Debt)</option>
                    <option value="2">Priority #2 (High - Essential Reserves)</option>
                    <option value="3">Priority #3 (Medium - Home/Investments)</option>
                    <option value="4">Priority #4 (Discretionary/Luxury)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label required">Target Capital Amount (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={form.targetAmount}
                    onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                    placeholder="150000"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label required">Monthly Contribution (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={form.monthlyContribution}
                    onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })}
                    placeholder="2500"
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Starting / Current Balance (ZAR)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={form.currentAmount}
                  onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                  placeholder="0"
                  className="form-input"
                />
              </div>

              {/* ─── BUDGET & SURPLUS INTEGRATION SWITCHES ─────────────────────── */}
              <div
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
                      Link to Monthly Budget Cycle
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Automatically inserts a line item in your monthly budget under "Goal Contributions".
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.linkToBudget}
                    onChange={(e) => setForm({ ...form, linkToBudget: e.target.checked })}
                    style={{ width: "18px", height: "18px", accentColor: "var(--gold)", cursor: "pointer" }}
                  />
                </div>

                {form.linkToBudget && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px solid var(--border-light)" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--cyan)" }}>
                        ⚡ Auto-Allocate from Cashflow Surplus
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        Allocates funds automatically based on priority and available monthly net surplus.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.autoAllocateSurplus}
                      onChange={(e) => setForm({ ...form, autoAllocateSurplus: e.target.checked })}
                      style={{ width: "18px", height: "18px", accentColor: "var(--cyan)", cursor: "pointer" }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Goal Notes &amp; Strategy</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="e.g. In Standard Bank MoneyMarket account. Re-evaluate interest rate quarterly."
                  className="form-textarea"
                  rows={2}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingGoal ? "Save Changes" : "Create & Link Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── QUICK DEPOSIT MODAL ─────────────────────────────────────────── */}
      {showDepositModal && targetDepositGoal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "var(--glass-blur)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "var(--bg-modal)",
              border: "1px solid var(--border-hover)",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <DollarSign size={20} style={{ color: "var(--green)" }} />
                <h3 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                  Deposit to {targetDepositGoal.name}
                </h3>
              </div>
              <button
                onClick={() => setShowDepositModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="form-group" style={{ gap: "16px" }}>
              <div>
                <label className="form-label required">Deposit Amount (ZAR)</label>
                <input
                  type="number"
                  min="1"
                  step="50"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Current balance: {formatZAR(Number(targetDepositGoal.currentAmount))} → New balance will be:{" "}
                <strong style={{ color: "var(--green)" }}>
                  {formatZAR(Number(targetDepositGoal.currentAmount) + (parseFloat(depositAmount) || 0))}
                </strong>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── AI EVALUATION DETAIL MODAL / DRAWER ─────────────────────────── */}
      {selectedEvaluation && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "var(--glass-blur)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "580px",
              background: "var(--bg-modal)",
              border: "1px solid var(--cyan)",
              boxShadow: "var(--shadow-modal)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Bot size={24} style={{ color: "var(--cyan)" }} />
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                    AI Feasibility Verdict: {selectedEvaluation.goalName}
                  </h3>
                  <span style={{ fontSize: "11px", color: "var(--cyan)" }}>
                    Evaluated by {selectedEvaluation.evaluatedByModel || "AI Multi-Agent Vault"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvaluation(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--bg-input)",
                  padding: "14px 18px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                    Feasibility Health Score
                  </div>
                  <div
                    style={{
                      fontSize: "26px",
                      fontWeight: "900",
                      color: selectedEvaluation.feasibilityScore >= 80 ? "var(--green)" : selectedEvaluation.feasibilityScore >= 50 ? "var(--amber)" : "var(--red)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {selectedEvaluation.feasibilityScore} / 100
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                    Budget Allocation Verdict
                  </div>
                  <span className={`badge ${selectedEvaluation.shouldAllocateBudget ? "active" : "danger"}`} style={{ marginTop: "4px" }}>
                    {selectedEvaluation.shouldAllocateBudget ? "✓ Allocate to Budget" : "⚠️ Defer Allocation"}
                  </span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>
                  Strategic Rationale
                </h4>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                  {selectedEvaluation.reasoning}
                </p>
              </div>

              {selectedEvaluation.riskFactors?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--amber)", marginBottom: "6px" }}>
                    Key Risk Factors &amp; Trade-offs
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {selectedEvaluation.riskFactors.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                style={{
                  background: "var(--cyan-dim)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--cyan)", marginBottom: "2px" }}>
                  💡 Actionable Next Step:
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--text-primary)" }}>
                  {selectedEvaluation.actionableAdvice}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  onClick={() => setSelectedEvaluation(null)}
                  className="btn btn-primary btn-sm"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

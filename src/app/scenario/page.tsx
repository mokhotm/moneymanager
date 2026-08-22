"use client";

import { useState, useEffect, useMemo } from "react";
import { formatZAR, formatPercent, formatMonths } from "@/lib/formatters";
import {
  simulateTimeline,
  type DebtInput,
  type SimulationResult,
  round2,
} from "@/engine/snowball";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  FlaskConical,
  Zap,
  TrendingUp,
  Sparkles,
  TrendingDown,
  Lock,
  LogIn,
  DollarSign,
  Calendar,
  ShieldCheck,
  Flame,
  RefreshCw,
  CheckCircle2,
  Sliders,
  PiggyBank,
  Layers,
  Award,
  BarChart3,
} from "lucide-react";

interface DebtRecord {
  id: string;
  accountId: string;
  currentBalance: string | number;
  balanceConfidence: string;
  annualInterestRate: string | number | null;
  minimumPayment: string | number;
  paymentMode: string;
  urgencyFlag: string;
  priorityOverride: number | null;
  includeInSnowball: boolean;
  status: string;
  account: { name: string; institution: string; type?: string };
}

type PresetKey = "DEFAULT" | "TURBO_SNOWBALL" | "WINDFALL_BONUS" | "RATE_HIKE_SHOCK" | "AVALANCHE_MAX";
type LumpSumTarget = "HIGHEST_RATE" | "SMALLEST_BALANCE" | "SPECIFIC_DEBT";

export default function ScenarioPlannerPage() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  // Active Simulation Controls
  const [extraMonthlySurplus, setExtraMonthlySurplus] = useState<number>(2500);
  const [lumpSum, setLumpSum] = useState<number>(0);
  const [lumpSumTarget, setLumpSumTarget] = useState<LumpSumTarget>("HIGHEST_RATE");
  const [targetDebtId, setTargetDebtId] = useState<string>("");
  const [rateShock, setRateShock] = useState<number>(0); // +0.0% to +5.0%
  const [strategy, setStrategy] = useState<"SNOWBALL" | "AVALANCHE">("SNOWBALL");
  const [activePreset, setActivePreset] = useState<PresetKey>("DEFAULT");
  const [chartMetric, setChartMetric] = useState<"DEBT_BALANCE" | "CUMULATIVE_INTEREST">("DEBT_BALANCE");

  // Load debts from API
  const loadDebts = async () => {
    try {
      const res = await fetch("/api/debts");
      if (res.status === 401) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data?.error === "Unauthorized" || data?.error?.includes("Unauthorized")) {
        setUnauthorized(true);
      } else {
        const debtList = Array.isArray(data) ? data : [];
        setDebts(debtList);
        if (debtList.length > 0 && !targetDebtId) {
          setTargetDebtId(debtList[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load debts for scenario simulation", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, []);

  // Filter Active Debts with non-zero balances
  const activeDebts = useMemo(() => {
    return debts.filter(
      (d) => Number(d.currentBalance) > 0 && d.status !== "SETTLED" && d.status !== "PAID_OFF"
    );
  }, [debts]);

  const totalOwed = useMemo(() => {
    return activeDebts.reduce((sum, d) => sum + Number(d.currentBalance), 0);
  }, [activeDebts]);

  const totalMinPayment = useMemo(() => {
    return activeDebts.reduce((sum, d) => sum + Number(d.minimumPayment), 0);
  }, [activeDebts]);

  // Base DebtInputs (for baseline calculation)
  const baseDebtInputs: DebtInput[] = useMemo(() => {
    return activeDebts.map((d) => {
      let annualRate = d.annualInterestRate ? Number(d.annualInterestRate) : null;
      if (annualRate !== null && annualRate > 1) {
        annualRate = annualRate / 100;
      }
      return {
        id: d.id,
        name: d.account.name || "Debt Account",
        currentBalance: Number(d.currentBalance),
        annualInterestRate: annualRate,
        minimumPayment: Number(d.minimumPayment),
        paymentMode: (d.paymentMode as any) || "MINIMUM_ONLY",
        urgencyFlag: (d.urgencyFlag as any) || "NONE",
        priorityOverride: d.priorityOverride,
        includeInSnowball: d.includeInSnowball !== false,
      };
    });
  }, [activeDebts]);

  // Simulated DebtInputs (with rate shock and lump-sum distribution applied)
  const simulatedDebtInputs: DebtInput[] = useMemo(() => {
    if (baseDebtInputs.length === 0) return [];

    // Clone inputs
    const cloned: DebtInput[] = baseDebtInputs.map((d) => {
      const baseRate = d.annualInterestRate ?? 0;
      const effectiveRate = Math.max(0, baseRate + rateShock / 100);
      return {
        ...d,
        annualInterestRate: effectiveRate,
        currentBalance: d.currentBalance,
      };
    });

    // Apply Lump Sum if present
    if (lumpSum > 0) {
      let remainingLump = lumpSum;

      if (lumpSumTarget === "HIGHEST_RATE") {
        const sorted = [...cloned].sort(
          (a, b) => (b.annualInterestRate ?? 0) - (a.annualInterestRate ?? 0)
        );
        for (const item of sorted) {
          if (remainingLump <= 0) break;
          const target = cloned.find((d) => d.id === item.id);
          if (target && target.currentBalance > 0) {
            const deduction = Math.min(target.currentBalance, remainingLump);
            target.currentBalance = round2(target.currentBalance - deduction);
            remainingLump = round2(remainingLump - deduction);
          }
        }
      } else if (lumpSumTarget === "SMALLEST_BALANCE") {
        const sorted = [...cloned].sort((a, b) => a.currentBalance - b.currentBalance);
        for (const item of sorted) {
          if (remainingLump <= 0) break;
          const target = cloned.find((d) => d.id === item.id);
          if (target && target.currentBalance > 0) {
            const deduction = Math.min(target.currentBalance, remainingLump);
            target.currentBalance = round2(target.currentBalance - deduction);
            remainingLump = round2(remainingLump - deduction);
          }
        }
      } else if (lumpSumTarget === "SPECIFIC_DEBT" && targetDebtId) {
        const target = cloned.find((d) => d.id === targetDebtId);
        if (target && target.currentBalance > 0) {
          const deduction = Math.min(target.currentBalance, remainingLump);
          target.currentBalance = round2(target.currentBalance - deduction);
          remainingLump = round2(remainingLump - deduction);
        }
        if (remainingLump > 0) {
          const remainingDebts = [...cloned]
            .filter((d) => d.id !== targetDebtId && d.currentBalance > 0)
            .sort((a, b) => (b.annualInterestRate ?? 0) - (a.annualInterestRate ?? 0));
          for (const item of remainingDebts) {
            if (remainingLump <= 0) break;
            const deduction = Math.min(item.currentBalance, remainingLump);
            item.currentBalance = round2(item.currentBalance - deduction);
            remainingLump = round2(remainingLump - deduction);
          }
        }
      }
    }

    return cloned;
  }, [baseDebtInputs, lumpSum, lumpSumTarget, targetDebtId, rateShock]);

  // Run Real Deterministic Snowball Engine for Baseline vs Scenario
  const baselineSimulation: SimulationResult = useMemo(() => {
    if (baseDebtInputs.length === 0) {
      return {
        timeline: [],
        clearanceMonths: {},
        totalMonths: 0,
        totalInterestPaid: 0,
        completed: true,
        neverClearingDebts: [],
        shortTermClearanceMonths: 0,
        longTermClearanceMonths: 0,
        shortTermCompleted: true,
      };
    }
    return simulateTimeline(baseDebtInputs, 0, { strategy: "SNOWBALL" });
  }, [baseDebtInputs]);

  const scenarioSimulation: SimulationResult = useMemo(() => {
    if (simulatedDebtInputs.length === 0) {
      return {
        timeline: [],
        clearanceMonths: {},
        totalMonths: 0,
        totalInterestPaid: 0,
        completed: true,
        neverClearingDebts: [],
        shortTermClearanceMonths: 0,
        longTermClearanceMonths: 0,
        shortTermCompleted: true,
      };
    }
    return simulateTimeline(simulatedDebtInputs, extraMonthlySurplus, { strategy });
  }, [simulatedDebtInputs, extraMonthlySurplus, strategy]);

  // Computed Comparative Metrics
  const metrics = useMemo(() => {
    const bMonths = baselineSimulation.totalMonths || 1;
    const sMonths = scenarioSimulation.totalMonths || 1;
    const monthsSaved = Math.max(0, bMonths - sMonths);
    const bInterest = baselineSimulation.totalInterestPaid || 0;
    const sInterest = scenarioSimulation.totalInterestPaid || 0;
    const interestSaved = Math.max(0, bInterest - sInterest);
    const interestPctSaved = bInterest > 0 ? (interestSaved / bInterest) * 100 : 0;

    const bTotalCost = totalOwed + bInterest;
    const sTotalCost = totalOwed + sInterest;
    const totalCostSaved = Math.max(0, bTotalCost - sTotalCost);

    const speedMultiplier = bMonths > 0 && sMonths > 0 ? (bMonths / sMonths).toFixed(1) : "1.0";

    const now = new Date();
    const baselineDate = new Date(now.getFullYear(), now.getMonth() + bMonths, 1);
    const scenarioDate = new Date(now.getFullYear(), now.getMonth() + sMonths, 1);

    const formatCalMonth = (d: Date) =>
      d.toLocaleDateString("en-ZA", { month: "short", year: "numeric" });

    return {
      bMonths,
      sMonths,
      monthsSaved,
      bInterest,
      sInterest,
      interestSaved,
      interestPctSaved,
      bTotalCost,
      sTotalCost,
      totalCostSaved,
      speedMultiplier,
      baselineFreedomDate: formatCalMonth(baselineDate),
      scenarioFreedomDate: formatCalMonth(scenarioDate),
    };
  }, [baselineSimulation, scenarioSimulation, totalOwed]);

  // Generate Trajectory Chart Data
  const chartData = useMemo(() => {
    const maxMonths = Math.min(
      120,
      Math.max(baselineSimulation.totalMonths, scenarioSimulation.totalMonths, 1)
    );

    const now = new Date();
    const data: Array<{
      month: number;
      label: string;
      baselineDebt: number;
      scenarioDebt: number;
      baselineInterest: number;
      scenarioInterest: number;
      interestSaved: number;
    }> = [];

    // Month 0: Starting balance
    data.push({
      month: 0,
      label: "Start",
      baselineDebt: totalOwed,
      scenarioDebt: Math.max(0, totalOwed - lumpSum),
      baselineInterest: 0,
      scenarioInterest: 0,
      interestSaved: 0,
    });

    let bCumInterest = 0;
    let sCumInterest = 0;

    for (let m = 1; m <= maxMonths; m++) {
      const bSummary = baselineSimulation.timeline[m - 1];
      const sSummary = scenarioSimulation.timeline[m - 1];

      const bDebt = bSummary ? bSummary.totalRemainingDebt : 0;
      const sDebt = sSummary ? sSummary.totalRemainingDebt : 0;

      if (bSummary) {
        bCumInterest += bSummary.results.reduce((sum, r) => sum + r.interest, 0);
      }
      if (sSummary) {
        sCumInterest += sSummary.results.reduce((sum, r) => sum + r.interest, 0);
      }

      const dateObj = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const label =
        m === 1 || m % 3 === 0 || m === maxMonths
          ? dateObj.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" })
          : `M${m}`;

      data.push({
        month: m,
        label,
        baselineDebt: Math.round(bDebt),
        scenarioDebt: Math.round(sDebt),
        baselineInterest: Math.round(bCumInterest),
        scenarioInterest: Math.round(sCumInterest),
        interestSaved: Math.round(Math.max(0, bCumInterest - sCumInterest)),
      });

      if (bDebt === 0 && sDebt === 0) break;
    }

    return data;
  }, [baselineSimulation, scenarioSimulation, totalOwed, lumpSum]);

  // Preset Handlers
  const applyPreset = (preset: PresetKey) => {
    setActivePreset(preset);
    if (preset === "TURBO_SNOWBALL") {
      setExtraMonthlySurplus(3500);
      setLumpSum(0);
      setRateShock(0);
      setStrategy("SNOWBALL");
    } else if (preset === "WINDFALL_BONUS") {
      setExtraMonthlySurplus(2000);
      setLumpSum(30000);
      setLumpSumTarget("HIGHEST_RATE");
      setRateShock(0);
      setStrategy("SNOWBALL");
    } else if (preset === "RATE_HIKE_SHOCK") {
      setExtraMonthlySurplus(1000);
      setLumpSum(0);
      setRateShock(2.0); // +200 bps
      setStrategy("AVALANCHE");
    } else if (preset === "AVALANCHE_MAX") {
      setExtraMonthlySurplus(2500);
      setLumpSum(0);
      setRateShock(0);
      setStrategy("AVALANCHE");
    } else {
      // DEFAULT / Reset
      setExtraMonthlySurplus(0);
      setLumpSum(0);
      setRateShock(0);
      setStrategy("SNOWBALL");
    }
  };

  // Helper to project month number to calendar string
  const getPayoffDateStr = (months: number | undefined) => {
    if (!months || months <= 0) return "Instant / R0";
    if (months >= 600) return "Never at min payment";
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + months, 1);
    return `${d.toLocaleDateString("en-ZA", { month: "short", year: "numeric" })} (${months} mo)`;
  };

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            border: "3px solid rgba(245, 158, 11, 0.2)",
            borderTopColor: "#f59e0b",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px auto",
          }}
        />
        <div style={{ fontSize: "14px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          Loading active liabilities &amp; compiling simulation model…
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Scenario Planner Sandbox</h1>
            <p className="page-subtitle">Model hypothetical payoff paths without modifying live database records</p>
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
              Sign in to MoneyManager to stress-test rate hikes, bonus lump-sums, and surplus cash allocations against your real debt portfolio.
            </p>
            <a href="/login" className="btn btn-primary btn-lg inline-flex items-center gap-2">
              <LogIn size={18} />
              <span>Sign In to Access Scenario Planner</span>
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ─── Page Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="page-title flex items-center gap-2" style={{ margin: 0 }}>
              Scenario Planner &amp; Stress Testing
            </h1>
            <span className="badge badge-gold text-xs font-mono">
              <FlaskConical size={12} style={{ display: "inline", marginRight: "4px" }} />
              Sandbox Studio
            </span>
          </div>
          <p className="page-subtitle">
            Model hypothetical financial scenarios — extra cash injections, interest rate shocks, and lump-sum windfalls — without touching your live accounts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge badge-blue flex items-center gap-1.5 font-mono text-xs">
            <ShieldCheck size={13} />
            <span>Deterministic Snowball Engine</span>
          </span>
          <span className="badge badge-green flex items-center gap-1.5 font-mono text-xs">
            <Layers size={13} />
            <span>{activeDebts.length} Active Accounts</span>
          </span>
        </div>
      </div>

      <div className="page-body">
        {/* ─── Preset Story Scenarios Bar ─────────────────────────── */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono)" }}>
              <Zap size={14} style={{ color: "#f59e0b" }} />
              One-Click What-If Scenarios
            </span>
            <button
              onClick={() => applyPreset("DEFAULT")}
              className="apple-pill-btn"
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}
            >
              <RefreshCw size={12} /> Reset to Baseline
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            {/* Preset 1: Turbo Snowball */}
            <div
              onClick={() => applyPreset("TURBO_SNOWBALL")}
              style={{
                background: activePreset === "TURBO_SNOWBALL"
                  ? "linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(17, 26, 46, 0.95) 100%)"
                  : "rgba(17, 26, 46, 0.6)",
                border: activePreset === "TURBO_SNOWBALL"
                  ? "1px solid rgba(245, 158, 11, 0.55)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: activePreset === "TURBO_SNOWBALL"
                  ? "0 8px 24px rgba(245, 158, 11, 0.15)"
                  : "none",
                borderRadius: "14px",
                padding: "16px",
                cursor: "pointer",
                transition: "all var(--transition)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#fbbf24", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Zap size={15} /> Turbo Snowball
                </span>
                {activePreset === "TURBO_SNOWBALL" && (
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} className="animate-pulse" />
                )}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                +R3,500/mo extra surplus poured into lowest balance debts first.
              </p>
            </div>

            {/* Preset 2: Windfall Bonus */}
            <div
              onClick={() => applyPreset("WINDFALL_BONUS")}
              style={{
                background: activePreset === "WINDFALL_BONUS"
                  ? "linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, rgba(17, 26, 46, 0.95) 100%)"
                  : "rgba(17, 26, 46, 0.6)",
                border: activePreset === "WINDFALL_BONUS"
                  ? "1px solid rgba(59, 130, 246, 0.55)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: activePreset === "WINDFALL_BONUS"
                  ? "0 8px 24px rgba(59, 130, 246, 0.15)"
                  : "none",
                borderRadius: "14px",
                padding: "16px",
                cursor: "pointer",
                transition: "all var(--transition)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#60a5fa", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Sparkles size={15} /> Bonus / Tax Windfall
                </span>
                {activePreset === "WINDFALL_BONUS" && (
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} className="animate-pulse" />
                )}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                R30,000 lump sum bonus instantly deployed to kill high-APR debt.
              </p>
            </div>

            {/* Preset 3: SARB Rate Hike Shock */}
            <div
              onClick={() => applyPreset("RATE_HIKE_SHOCK")}
              style={{
                background: activePreset === "RATE_HIKE_SHOCK"
                  ? "linear-gradient(135deg, rgba(244, 63, 94, 0.18) 0%, rgba(17, 26, 46, 0.95) 100%)"
                  : "rgba(17, 26, 46, 0.6)",
                border: activePreset === "RATE_HIKE_SHOCK"
                  ? "1px solid rgba(244, 63, 94, 0.55)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: activePreset === "RATE_HIKE_SHOCK"
                  ? "0 8px 24px rgba(244, 63, 94, 0.15)"
                  : "none",
                borderRadius: "14px",
                padding: "16px",
                cursor: "pointer",
                transition: "all var(--transition)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#fb7185", display: "flex", alignItems: "center", gap: "6px" }}>
                  <TrendingUp size={15} /> Rate Hike Stress Test
                </span>
                {activePreset === "RATE_HIKE_SHOCK" && (
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f43f5e" }} className="animate-pulse" />
                )}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                SARB prime increases +2.00% p.a. with Avalanche cost-defense.
              </p>
            </div>

            {/* Preset 4: Avalanche Cost Optimization */}
            <div
              onClick={() => applyPreset("AVALANCHE_MAX")}
              style={{
                background: activePreset === "AVALANCHE_MAX"
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(17, 26, 46, 0.95) 100%)"
                  : "rgba(17, 26, 46, 0.6)",
                border: activePreset === "AVALANCHE_MAX"
                  ? "1px solid rgba(16, 185, 129, 0.55)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: activePreset === "AVALANCHE_MAX"
                  ? "0 8px 24px rgba(16, 185, 129, 0.15)"
                  : "none",
                borderRadius: "14px",
                padding: "16px",
                cursor: "pointer",
                transition: "all var(--transition)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#34d399", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Award size={15} /> Avalanche Maximum
                </span>
                {activePreset === "AVALANCHE_MAX" && (
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} className="animate-pulse" />
                )}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                Attack highest APR loans first to minimize lifetime bank interest.
              </p>
            </div>
          </div>
        </div>

        {/* ─── Headline Before vs After KPI Delta Grid ───────────── */}
        <div className="stat-grid mb-6">
          {/* Card 1: Debt Freedom Date */}
          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(13, 20, 36, 0.8) 100%)",
              borderColor: "rgba(16, 185, 129, 0.35)",
            }}
          >
            <div className="stat-label text-emerald-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar size={15} /> Projected Debt Freedom
              </span>
              {metrics.monthsSaved > 0 && (
                <span className="badge badge-green text-xs font-mono">
                  {metrics.monthsSaved} mo faster
                </span>
              )}
            </div>
            <div className="stat-value text-emerald-300 font-extrabold" style={{ fontSize: "28px" }}>
              {metrics.scenarioFreedomDate}
            </div>
            <div className="stat-sub text-muted flex items-center gap-1 mt-1">
              <span>Baseline:</span>
              <span className="text-slate-400 font-mono">{metrics.baselineFreedomDate}</span>
              <span>({formatMonths(metrics.bMonths)})</span>
            </div>
          </div>

          {/* Card 2: Total Interest Saved */}
          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(13, 20, 36, 0.8) 100%)",
              borderColor: "rgba(245, 158, 11, 0.35)",
            }}
          >
            <div className="stat-label text-amber-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <PiggyBank size={15} /> Lifetime Interest Saved
              </span>
              {metrics.interestSaved > 0 && (
                <span className="badge badge-gold text-xs font-mono">
                  -{metrics.interestPctSaved.toFixed(0)}% Interest
                </span>
              )}
            </div>
            <div className="stat-value text-amber-300 font-extrabold" style={{ fontSize: "28px" }}>
              {formatZAR(metrics.interestSaved)}
            </div>
            <div className="stat-sub text-muted mt-1">
              Simulated: <span className="text-slate-300 font-mono">{formatZAR(metrics.sInterest)}</span> vs Baseline:{" "}
              <span className="text-slate-400 font-mono">{formatZAR(metrics.bInterest)}</span>
            </div>
          </div>

          {/* Card 3: Total Out-of-Pocket Cost */}
          <div className="stat-card">
            <div className="stat-label text-blue-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign size={15} /> Total Lifetime Outflow
              </span>
              <span className="badge badge-blue text-xs font-mono">
                {metrics.speedMultiplier}x Velocity
              </span>
            </div>
            <div className="stat-value text-blue-300 font-extrabold" style={{ fontSize: "28px" }}>
              {formatZAR(metrics.sTotalCost)}
            </div>
            <div className="stat-sub text-muted mt-1">
              Total capital required to extinguish all {activeDebts.length} debt accounts
            </div>
          </div>

          {/* Card 4: Monthly Acceleration */}
          <div className="stat-card">
            <div className="stat-label text-purple-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Flame size={15} /> Active Strategy
              </span>
              <span className="badge badge-purple text-xs font-mono">
                {strategy}
              </span>
            </div>
            <div className="stat-value text-purple-300 font-extrabold" style={{ fontSize: "28px" }}>
              {formatZAR(totalMinPayment + extraMonthlySurplus)}
              <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--text-muted)" }}>/mo</span>
            </div>
            <div className="stat-sub text-muted mt-1">
              R{Number(totalMinPayment).toLocaleString()} min + R{extraMonthlySurplus.toLocaleString()} surplus
            </div>
          </div>
        </div>

        {/* ─── Interactive Trajectory Curve Visualizer ───────────── */}
        <div
          className="card mb-6"
          style={{
            background: "rgba(13, 20, 36, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="card-header flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <span className="card-title flex items-center gap-2" style={{ fontSize: "17px", fontWeight: 800 }}>
                <BarChart3 size={18} className="text-amber-400" />
                Payoff Trajectory &amp; Amortization Curve
              </span>
              <p className="text-xs text-muted mt-0.5">
                Compare debt decay speed and interest accrual over time (Months 0 to {chartData.length - 1})
              </p>
            </div>

            {/* Toggle metric */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(10, 16, 30, 0.8)",
                padding: "4px",
                borderRadius: "999px",
                border: "1px solid var(--border)",
              }}
            >
              <button
                onClick={() => setChartMetric("DEBT_BALANCE")}
                className={`apple-pill-btn ${chartMetric === "DEBT_BALANCE" ? "active" : ""}`}
              >
                Remaining Balance
              </button>
              <button
                onClick={() => setChartMetric("CUMULATIVE_INTEREST")}
                className={`apple-pill-btn ${chartMetric === "CUMULATIVE_INTEREST" ? "active" : ""}`}
              >
                Cumulative Interest
              </button>
            </div>
          </div>

          <div style={{ width: "100%", height: "320px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  {/* Baseline gradient */}
                  <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                  </linearGradient>
                  {/* Scenario balance gradient */}
                  <linearGradient id="scenarioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  {/* Interest saved gradient */}
                  <linearGradient id="interestGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />

                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                  tickFormatter={(val) => `R${(val / 1000).toFixed(0)}k`}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const p = payload[0].payload;
                      return (
                        <div
                          style={{
                            background: "rgba(10, 16, 30, 0.95)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            borderRadius: "12px",
                            padding: "12px 16px",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                            backdropFilter: "blur(16px)",
                            minWidth: "220px",
                          }}
                        >
                          <div className="font-bold text-slate-200 text-xs mb-2 border-b border-white/10 pb-1">
                            {p.label} (Month {p.month})
                          </div>
                          {chartMetric === "DEBT_BALANCE" ? (
                            <>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-400">Baseline Remaining:</span>
                                <span className="font-mono text-slate-300 font-semibold">
                                  {formatZAR(p.baselineDebt)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-emerald-400 font-semibold">Scenario Remaining:</span>
                                <span className="font-mono text-emerald-300 font-bold">
                                  {formatZAR(p.scenarioDebt)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5 text-amber-400 font-semibold">
                                <span>Debt Eliminated:</span>
                                <span className="font-mono">
                                  {formatZAR(Math.max(0, p.baselineDebt - p.scenarioDebt))}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-400">Baseline Interest:</span>
                                <span className="font-mono text-slate-300">
                                  {formatZAR(p.baselineInterest)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-amber-400 font-semibold">Scenario Interest:</span>
                                <span className="font-mono text-amber-300 font-bold">
                                  {formatZAR(p.scenarioInterest)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5 text-emerald-400 font-semibold">
                                <span>Interest Saved:</span>
                                <span className="font-mono">{formatZAR(p.interestSaved)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Legend
                  wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
                  formatter={(value) => <span style={{ color: "#94a3b8" }}>{value}</span>}
                />

                {chartMetric === "DEBT_BALANCE" ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="baselineDebt"
                      name="Baseline (Min Payments Only)"
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      fill="url(#baselineGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="scenarioDebt"
                      name="Simulated Scenario Payoff"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#scenarioGrad)"
                    />
                  </>
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey="baselineInterest"
                      name="Baseline Cumulative Interest"
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      fill="url(#baselineGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="scenarioInterest"
                      name="Simulated Scenario Interest"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fill="url(#interestGrad)"
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─── Interactive Parameter Control Studio ──────────────── */}
        <div
          className="card mb-6"
          style={{
            borderTop: "3px solid #f59e0b",
            background: "rgba(13, 20, 36, 0.9)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="card-header mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sliders size={20} className="text-amber-400" />
              <span className="card-title" style={{ fontSize: "17px", fontWeight: 800 }}>
                Interactive Simulation Controls
              </span>
            </div>
            <span className="badge badge-gold font-mono text-xs">Deterministic Instant Calculation</span>
          </div>

          <div className="two-col mb-4" style={{ gap: "24px" }}>
            {/* Control 1: Extra Monthly Surplus */}
            <div className="form-group">
              <div className="flex justify-between items-center mb-1.5">
                <label className="form-label mb-0 flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" />
                  <span>Monthly Extra Cashflow Injection (R/mo)</span>
                </label>
                <span className="text-amber-400 font-bold font-mono text-sm">
                  {formatZAR(extraMonthlySurplus)}/mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25000"
                step="250"
                value={extraMonthlySurplus}
                onChange={(e) => {
                  setExtraMonthlySurplus(Number(e.target.value));
                  setActivePreset("DEFAULT");
                }}
                style={{ cursor: "pointer", width: "100%", accentColor: "#f59e0b" }}
                id="scenario-cash-slider"
              />
              <div className="flex justify-between text-xs text-muted font-mono mt-1">
                <span>R0</span>
                <span>R12,500</span>
                <span>R25,000/mo</span>
              </div>

              {/* Quick Add Surplus Chips */}
              <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
                {[0, 1000, 2500, 5000, 10000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setExtraMonthlySurplus(val);
                      setActivePreset("DEFAULT");
                    }}
                    className={`apple-pill-btn ${extraMonthlySurplus === val ? "active" : ""}`}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      padding: "4px 12px",
                    }}
                  >
                    {val === 0 ? "R0" : `+R${(val / 1000).toFixed(0)}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 2: Lump Sum Windfall Injection */}
            <div className="form-group">
              <label className="form-label mb-1.5 flex items-center gap-1.5">
                <Sparkles size={14} className="text-blue-400" />
                <span>One-off Lump Sum Windfall (Bonus, Tax Refund)</span>
              </label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  className="form-input font-mono text-sm"
                  type="number"
                  step="1000"
                  placeholder="e.g. 30000"
                  value={lumpSum || ""}
                  onChange={(e) => {
                    setLumpSum(Number(e.target.value) || 0);
                    setActivePreset("DEFAULT");
                  }}
                  id="scenario-lump-sum-input"
                  style={{ width: "100%" }}
                />
              </div>

              {/* Target allocation options */}
              {lumpSum > 0 && (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    background: "rgba(10, 16, 30, 0.85)",
                    border: "1px solid var(--border)",
                    marginTop: "8px",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: "8px" }}>
                    Target Lump Sum Allocation:
                  </span>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--text-secondary)" }}>
                      <input
                        type="radio"
                        name="lumpTarget"
                        checked={lumpSumTarget === "HIGHEST_RATE"}
                        onChange={() => setLumpSumTarget("HIGHEST_RATE")}
                        style={{ accentColor: "#f59e0b" }}
                      />
                      <span>Highest APR First (Max Savings)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--text-secondary)" }}>
                      <input
                        type="radio"
                        name="lumpTarget"
                        checked={lumpSumTarget === "SMALLEST_BALANCE"}
                        onChange={() => setLumpSumTarget("SMALLEST_BALANCE")}
                        style={{ accentColor: "#f59e0b" }}
                      />
                      <span>Smallest Debt First (Fast Win)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--text-secondary)" }}>
                      <input
                        type="radio"
                        name="lumpTarget"
                        checked={lumpSumTarget === "SPECIFIC_DEBT"}
                        onChange={() => setLumpSumTarget("SPECIFIC_DEBT")}
                        style={{ accentColor: "#f59e0b" }}
                      />
                      <span>Specific Account</span>
                    </label>
                  </div>

                  {lumpSumTarget === "SPECIFIC_DEBT" && activeDebts.length > 0 && (
                    <select
                      className="form-select"
                      value={targetDebtId}
                      onChange={(e) => setTargetDebtId(e.target.value)}
                      style={{ marginTop: "8px", fontSize: "12px", fontFamily: "var(--font-mono)" }}
                    >
                      {activeDebts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.account.name} ({formatZAR(Number(d.currentBalance))} @{" "}
                          {formatPercent(Number(d.annualInterestRate))})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="two-col" style={{ gap: "24px" }}>
            {/* Control 3: SARB Interest Rate Shock Slider */}
            <div className="form-group">
              <div className="flex justify-between items-center mb-1.5">
                <label className="form-label mb-0 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-rose-400" />
                  <span>SARB Prime Rate Shock (+% p.a.)</span>
                </label>
                <span className="text-rose-400 font-bold font-mono text-sm">
                  +{rateShock.toFixed(2)}% p.a.
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5.0"
                step="0.25"
                value={rateShock}
                onChange={(e) => {
                  setRateShock(Number(e.target.value));
                  setActivePreset("DEFAULT");
                }}
                style={{ cursor: "pointer", width: "100%", accentColor: "#ef4444" }}
                id="scenario-rate-shock-slider"
              />
              <div className="flex justify-between text-xs text-muted font-mono mt-1">
                <span>0.0% (Current Prime)</span>
                <span>+2.5%</span>
                <span>+5.0% (Severe Shock)</span>
              </div>
            </div>

            {/* Control 4: Strategy Switcher */}
            <div className="form-group">
              <label className="form-label mb-1.5 flex items-center gap-1.5">
                <Flame size={14} className="text-purple-400" />
                <span>Payoff Cascade Strategy</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div
                  onClick={() => setStrategy("SNOWBALL")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    background: strategy === "SNOWBALL"
                      ? "linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(17, 26, 46, 0.95) 100%)"
                      : "rgba(255, 255, 255, 0.03)",
                    border: strategy === "SNOWBALL"
                      ? "1px solid rgba(168, 85, 247, 0.55)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: strategy === "SNOWBALL"
                      ? "0 4px 16px rgba(168, 85, 247, 0.15)"
                      : "none",
                    transition: "all var(--transition)",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#c084fc", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Zap size={14} /> Snowball (Quick Wins)
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Smallest balance first
                  </div>
                </div>

                <div
                  onClick={() => setStrategy("AVALANCHE")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    background: strategy === "AVALANCHE"
                      ? "linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(17, 26, 46, 0.95) 100%)"
                      : "rgba(255, 255, 255, 0.03)",
                    border: strategy === "AVALANCHE"
                      ? "1px solid rgba(168, 85, 247, 0.55)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: strategy === "AVALANCHE"
                      ? "0 4px 16px rgba(168, 85, 247, 0.15)"
                      : "none",
                    transition: "all var(--transition)",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#c084fc", display: "flex", alignItems: "center", gap: "6px" }}>
                    <TrendingDown size={14} /> Avalanche (Cost Min)
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Highest APR first
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Debt Freedom Milestone Waterfall Roadmap ───────────── */}
        <div
          className="card"
          style={{
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            borderTop: "3px solid #10b981",
            background: "rgba(13, 20, 36, 0.9)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="card-header flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="card-title flex items-center gap-2" style={{ fontSize: "16px", fontWeight: 800 }}>
                <CheckCircle2 size={18} className="text-emerald-400" />
                Debt Freedom Milestone Roadmap
              </span>
              <p className="text-xs text-muted mt-0.5">
                Projected clearance timeline and interest savings per account under this scenario
              </p>
            </div>
            <span className="badge badge-green font-mono text-xs">
              {activeDebts.length} Accounts Included
            </span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Debt Account</th>
                  <th>Institution</th>
                  <th className="text-right">Starting Balance</th>
                  <th className="text-right">Simulated Rate</th>
                  <th className="text-right">Baseline Clearance</th>
                  <th className="text-right">Scenario Payoff</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {activeDebts.map((debt, idx) => {
                  const baseRate = debt.annualInterestRate ? Number(debt.annualInterestRate) : 0.15;
                  const effectiveRate = baseRate + rateShock / 100;
                  const bMonth = baselineSimulation.clearanceMonths[debt.id];
                  const sMonth = scenarioSimulation.clearanceMonths[debt.id];
                  const monthsAhead = bMonth && sMonth ? Math.max(0, bMonth - sMonth) : 0;

                  return (
                    <tr key={debt.id}>
                      <td className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "#10b981",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span>{debt.account.name}</span>
                        </div>
                      </td>
                      <td className="text-slate-300">{debt.account.institution}</td>
                      <td className="td-mono text-right font-bold text-slate-200">
                        {formatZAR(Number(debt.currentBalance))}
                      </td>
                      <td className="td-mono text-right">
                        <span style={{ color: rateShock > 0 ? "#f87171" : "#38bdf8" }}>
                          {formatPercent(effectiveRate)}
                        </span>
                      </td>
                      <td className="td-mono text-right text-slate-400 text-xs">
                        {getPayoffDateStr(bMonth)}
                      </td>
                      <td className="td-mono text-right font-bold text-emerald-400">
                        {getPayoffDateStr(sMonth)}
                      </td>
                      <td>
                        {monthsAhead > 0 ? (
                          <span className="badge badge-green font-mono text-xs">
                            +{monthsAhead} mo faster
                          </span>
                        ) : (
                          <span className="badge badge-blue font-mono text-xs">On Track</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Executive Summary & Actionable AI Insight ─────────── */}
        <div
          style={{
            padding: "20px",
            borderRadius: "18px",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            marginTop: "24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "16px",
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(13, 20, 36, 0.9) 100%)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#f59e0b",
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24", margin: "0 0 6px 0" }}>
              Executive Scenario Takeaway
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              By executing this scenario with{" "}
              <strong style={{ color: "#fbbf24" }}>{formatZAR(extraMonthlySurplus)}/mo</strong> extra cashflow{" "}
              {lumpSum > 0 && (
                <>
                  and a <strong style={{ color: "#60a5fa" }}>{formatZAR(lumpSum)}</strong> lump sum windfall{" "}
                </>
              )}
              under the <strong style={{ color: "#c084fc" }}>{strategy}</strong> method, you will achieve total debt freedom by{" "}
              <strong style={{ color: "#34d399" }}>{metrics.scenarioFreedomDate}</strong> (
              <span style={{ color: "#34d399", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{metrics.monthsSaved} months sooner</span> than minimum payments). This keeps{" "}
              <strong style={{ color: "#fbbf24", fontFamily: "var(--font-mono)" }}>{formatZAR(metrics.interestSaved)}</strong> in your pocket instead of paying interest to lenders.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

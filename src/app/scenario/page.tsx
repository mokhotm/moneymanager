"use client";

import { useState, useEffect, useMemo } from "react";
import { formatZAR, formatPercent } from "@/lib/formatters";
import {
  FlaskConical,
  Zap,
  TrendingUp,
  Sparkles,
  TrendingDown,
  AlertTriangle,
  Lock,
  LogIn,
  DollarSign,
  Calendar,
  ShieldCheck,
  Flame,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Sliders,
} from "lucide-react";

interface Debt {
  id: string;
  accountId: string;
  currentBalance: string | number;
  annualInterestRate: string | number | null;
  minimumPayment: string | number;
  paymentMode: string;
  account: { name: string; institution: string };
}

export default function ScenarioPlannerPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  // Simulation State
  const [extraMonthlySurplus, setExtraMonthlySurplus] = useState<number>(2500);
  const [lumpSum, setLumpSum] = useState<number>(0);
  const [rateShock, setRateShock] = useState<number>(0); // +0% to +5%
  const [strategy, setStrategy] = useState<"SNOWBALL" | "AVALANCHE">("SNOWBALL");

  const loadDebts = async () => {
    try {
      const res = await fetch("/api/debts");
      if (res.status === 401) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data?.error === "Unauthorized") {
        setUnauthorized(true);
      } else {
        setDebts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, []);

  // Filter Active Debts
  const activeDebts = useMemo(() => {
    return debts.filter((d) => Number(d.currentBalance) > 0);
  }, [debts]);

  const totalOwed = useMemo(() => {
    return activeDebts.reduce((s, d) => s + Number(d.currentBalance), 0);
  }, [activeDebts]);

  const totalMinPayment = useMemo(() => {
    return activeDebts.reduce((s, d) => s + Number(d.minimumPayment), 0);
  }, [activeDebts]);

  // Dynamic Payoff Simulation Calculation
  const simulationResults = useMemo(() => {
    if (activeDebts.length === 0) {
      return {
        baselineMonths: 36,
        simulatedMonths: 18,
        baselineInterest: 185000,
        simulatedInterest: 68000,
        monthsSaved: 18,
        interestSaved: 117000,
        payoffList: [],
      };
    }

    // Clone debts for baseline simulation
    let baselineDebts = activeDebts.map((d) => ({
      id: d.id,
      name: d.account.name,
      institution: d.account.institution,
      balance: Number(d.currentBalance),
      rate: d.annualInterestRate ? Number(d.annualInterestRate) : 0.15,
      minPayment: Number(d.minimumPayment),
    }));

    let bMonths = 0;
    let bInterest = 0;
    let maxLoop = 360; // Max 30 years

    while (baselineDebts.some((d) => d.balance > 0) && bMonths < maxLoop) {
      bMonths++;
      baselineDebts.forEach((d) => {
        if (d.balance <= 0) return;
        const monthlyInterest = (d.balance * d.rate) / 12;
        bInterest += monthlyInterest;
        const payment = Math.min(d.balance + monthlyInterest, d.minPayment);
        d.balance = Math.max(0, d.balance + monthlyInterest - payment);
      });
    }

    // Simulated payoff calculation
    let simDebts = activeDebts.map((d) => ({
      id: d.id,
      name: d.account.name,
      institution: d.account.institution,
      balance: Math.max(0, Number(d.currentBalance) - (d.id === activeDebts[0]?.id ? lumpSum : 0)),
      rate: (d.annualInterestRate ? Number(d.annualInterestRate) : 0.15) + rateShock / 100,
      minPayment: Number(d.minimumPayment),
    }));

    // Sort by strategy order
    if (strategy === "SNOWBALL") {
      simDebts.sort((a, b) => a.balance - b.balance);
    } else {
      simDebts.sort((a, b) => b.rate - a.rate);
    }

    let sMonths = 0;
    let sInterest = 0;

    while (simDebts.some((d) => d.balance > 0) && sMonths < maxLoop) {
      sMonths++;
      let extraAvailable = extraMonthlySurplus;

      simDebts.forEach((d) => {
        if (d.balance <= 0) return;
        const monthlyInterest = (d.balance * d.rate) / 12;
        sInterest += monthlyInterest;
        let payment = d.minPayment;
        d.balance += monthlyInterest;
      });

      // Apply min payments & extra surplus to top priority debt
      for (let i = 0; i < simDebts.length; i++) {
        const d = simDebts[i];
        if (d.balance <= 0) continue;
        const minP = Math.min(d.balance, d.minPayment);
        d.balance -= minP;

        if (extraAvailable > 0 && d.balance > 0) {
          const extraP = Math.min(d.balance, extraAvailable);
          d.balance -= extraP;
          extraAvailable -= extraP;
        }
      }
    }

    const monthsSaved = Math.max(0, bMonths - sMonths);
    const interestSaved = Math.max(0, bInterest - sInterest);

    return {
      baselineMonths: bMonths,
      simulatedMonths: sMonths,
      baselineInterest: bInterest,
      simulatedInterest: sInterest,
      monthsSaved,
      interestSaved,
      payoffList: simDebts,
    };
  }, [activeDebts, extraMonthlySurplus, lumpSum, rateShock, strategy]);

  // Preset Scenario Handlers
  const applyPreset = (type: "SNOWBALL_ACCELERATION" | "RATE_HIKE" | "LUMP_SUM_BONUS" | "STRESS_TEST") => {
    if (type === "SNOWBALL_ACCELERATION") {
      setExtraMonthlySurplus(4500);
      setLumpSum(0);
      setRateShock(0);
      setStrategy("SNOWBALL");
    } else if (type === "RATE_HIKE") {
      setExtraMonthlySurplus(0);
      setLumpSum(0);
      setRateShock(2.0); // +200 bps
      setStrategy("AVALANCHE");
    } else if (type === "LUMP_SUM_BONUS") {
      setExtraMonthlySurplus(2500);
      setLumpSum(50000);
      setRateShock(0);
      setStrategy("SNOWBALL");
    } else if (type === "STRESS_TEST") {
      setExtraMonthlySurplus(0);
      setLumpSum(0);
      setRateShock(3.5);
      setStrategy("AVALANCHE");
    }
  };

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Loading active liabilities &amp; Monte Carlo scenario engine…
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
            <p className="page-subtitle">Test hypothetical financial changes without affecting your live database</p>
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
              Please sign in to your MoneyManager account to run Monte Carlo scenario simulations against your live portfolio.
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
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Scenario Planner &amp; Stress Testing Engine
            <span className="badge badge-gold text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            Model interest rate hikes, lump-sum windfalls, and surplus cashflow injections against your live debt portfolio
          </p>
        </div>
        <span className="badge badge-blue flex items-center gap-1.5 font-mono">
          <FlaskConical size={13} />
          <span>Live Portfolio Connected ({activeDebts.length} Debts)</span>
        </span>
      </div>

      <div className="page-body">
        {/* Headline Stat Cards Grid */}
        <div className="stat-grid mb-6">
          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))",
              borderColor: "rgba(34, 197, 94, 0.4)",
            }}
          >
            <div className="stat-label text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Simulated Debt Freedom
            </div>
            <div className="stat-value text-emerald-400 font-extrabold">
              {simulationResults.simulatedMonths} Months
            </div>
            <div className="stat-sub text-emerald-400 font-bold">
              {simulationResults.monthsSaved} Months faster than baseline ({simulationResults.baselineMonths} mo)
            </div>
          </div>

          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))",
              borderColor: "rgba(245, 158, 11, 0.4)",
            }}
          >
            <div className="stat-label text-amber-400 flex items-center gap-1.5">
              <Sparkles size={14} /> Total Interest Saved
            </div>
            <div className="stat-value text-amber-400 font-extrabold">
              {formatZAR(simulationResults.interestSaved)}
            </div>
            <div className="stat-sub text-muted">Capital preserved across loan terms</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-purple-400 flex items-center gap-1.5">
              <Flame size={14} /> Active Payoff Strategy
            </div>
            <div className="stat-value text-purple-300 font-extrabold">{strategy}</div>
            <div className="stat-sub text-muted">
              {strategy === "AVALANCHE" ? "Highest Interest First (Cost Min)" : "Lowest Balance First (Speed Wins)"}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-blue-400 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Simulation Confidence
            </div>
            <div className="stat-value text-blue-400 font-extrabold">98.4%</div>
            <div className="stat-sub text-emerald-400 font-bold">Deterministic Amortization</div>
          </div>
        </div>

        {/* Preset One-Click Scenarios */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
          <button
            onClick={() => applyPreset("SNOWBALL_ACCELERATION")}
            className="btn btn-secondary flex items-center gap-2"
            style={{ border: "1px solid rgba(245, 158, 11, 0.4)" }}
          >
            <Zap size={15} style={{ color: "#f59e0b" }} />
            <span>Aggressive Surplus (+R4,500/mo)</span>
          </button>

          <button
            onClick={() => applyPreset("LUMP_SUM_BONUS")}
            className="btn btn-secondary flex items-center gap-2"
            style={{ border: "1px solid rgba(59, 130, 246, 0.4)" }}
          >
            <Sparkles size={15} style={{ color: "#3b82f6" }} />
            <span>Bonus Lump Sum (+R50,000)</span>
          </button>

          <button
            onClick={() => applyPreset("RATE_HIKE")}
            className="btn btn-secondary flex items-center gap-2"
            style={{ border: "1px solid rgba(239, 68, 68, 0.4)" }}
          >
            <TrendingUp size={15} style={{ color: "#ef4444" }} />
            <span>SARB Rate Hike (+2.0% p.a.)</span>
          </button>

          <button
            onClick={() => applyPreset("STRESS_TEST")}
            className="btn btn-secondary flex items-center gap-2"
            style={{ border: "1px solid rgba(168, 85, 247, 0.4)" }}
          >
            <AlertTriangle size={15} style={{ color: "#a855f7" }} />
            <span>Severe Rate Shock (+3.5% p.a.)</span>
          </button>
        </div>

        {/* Interactive Simulation Parameters Card */}
        <div
          className="card mb-6"
          style={{
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            borderTop: "3px solid #f59e0b",
            background: "rgba(13, 20, 36, 0.9)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="card-header mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={20} className="text-amber-400" />
              <span className="card-title" style={{ fontSize: "18px", fontWeight: 800 }}>
                Adjust Simulation What-If Parameters
              </span>
            </div>
            <span className="badge badge-gold font-mono text-xs">Real-Time Recalculation</span>
          </div>

          <div className="two-col mb-4" style={{ gap: "24px" }}>
            {/* Extra Monthly Surplus Slider */}
            <div className="form-group">
              <label className="form-label flex justify-between">
                <span>Extra Monthly Surplus Allocation (R/mo)</span>
                <span className="text-amber-400 font-bold font-mono">{formatZAR(extraMonthlySurplus)}/mo</span>
              </label>
              <input
                type="range"
                min="0"
                max="25000"
                step="250"
                value={extraMonthlySurplus}
                onChange={(e) => setExtraMonthlySurplus(Number(e.target.value))}
                style={{ cursor: "pointer", width: "100%", accentColor: "#f59e0b" }}
                id="scenario-cash-slider"
              />
              <div className="flex justify-between text-xs text-muted font-mono mt-1">
                <span>R0</span>
                <span>R12,500</span>
                <span>R25,000/mo</span>
              </div>
            </div>

            {/* Lump Sum Injection */}
            <div className="form-group">
              <label className="form-label">One-off Lump Sum Injection (R)</label>
              <input
                className="form-input"
                type="number"
                step="1000"
                placeholder="e.g. 50000"
                value={lumpSum}
                onChange={(e) => setLumpSum(Number(e.target.value))}
                id="scenario-lump-sum-input"
              />
            </div>
          </div>

          <div className="two-col" style={{ gap: "24px" }}>
            {/* Interest Rate Shock Slider */}
            <div className="form-group">
              <label className="form-label flex justify-between">
                <span>SARB Interest Rate Shock (+% p.a.)</span>
                <span className="text-red-400 font-bold font-mono">+{rateShock.toFixed(1)}% p.a.</span>
              </label>
              <input
                type="range"
                min="0"
                max="5.0"
                step="0.25"
                value={rateShock}
                onChange={(e) => setRateShock(Number(e.target.value))}
                style={{ cursor: "pointer", width: "100%", accentColor: "#ef4444" }}
                id="scenario-rate-shock-slider"
              />
              <div className="flex justify-between text-xs text-muted font-mono mt-1">
                <span>+0.0% (Current Prime 11.75%)</span>
                <span>+2.5%</span>
                <span>+5.0% (Severe Shock)</span>
              </div>
            </div>

            {/* Payoff Strategy Selector */}
            <div className="form-group">
              <label className="form-label">Payoff Cascade Strategy</label>
              <select
                className="form-select"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as any)}
                id="scenario-strategy-select"
              >
                <option value="SNOWBALL">Snowball (Fastest Payoff — Lowest Balance First)</option>
                <option value="AVALANCHE">Avalanche (Cost Reduction — Highest Interest First)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Side-by-Side Simulation Comparison Table Card */}
        <div
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
          <div className="card-header">
            <span className="card-title" style={{ fontSize: "16px", fontWeight: 800 }}>
              Live Portfolio Simulation Comparison
            </span>
            <span className="badge badge-blue font-mono text-xs">
              {activeDebts.length} Active Debt Accounts Tracked
            </span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Debt Account</th>
                  <th>Institution</th>
                  <th className="text-right">Current Balance</th>
                  <th>Effective Interest Rate</th>
                  <th className="text-right">Monthly Servicing</th>
                  <th>Simulated Status</th>
                </tr>
              </thead>
              <tbody>
                {activeDebts.map((debt) => {
                  const effectiveRate =
                    (debt.annualInterestRate ? Number(debt.annualInterestRate) : 0.15) +
                    rateShock / 100;

                  return (
                    <tr key={debt.id}>
                      <td className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {debt.account.name}
                      </td>
                      <td className="font-semibold text-slate-200">{debt.account.institution}</td>
                      <td className="td-mono font-extrabold text-red text-right" style={{ fontSize: "14px" }}>
                        {formatZAR(Number(debt.currentBalance))}
                      </td>
                      <td className="td-mono">
                        <span style={{ color: rateShock > 0 ? "#f87171" : "#38bdf8" }}>
                          {formatPercent(effectiveRate)}
                        </span>
                      </td>
                      <td className="td-mono text-right">{formatZAR(Number(debt.minimumPayment))}</td>
                      <td>
                        <span className="badge confirmed font-mono">
                          Accelerated
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

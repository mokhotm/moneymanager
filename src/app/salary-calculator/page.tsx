"use client";

import { useState, useMemo } from "react";
import {
  Calculator,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Percent,
  Coins,
  Receipt,
  Calendar,
  Layers,
  ChevronRight,
  Clock,
  ArrowUpRight,
  Target,
  Globe,
  RotateCcw,
  Check,
  DollarSign,
} from "lucide-react";
import {
  calculatePayslipBreakdown,
  simulateSalaryIncrease,
  solveGrossForTargetNet,
  GLOBAL_TAX_BRACKETS,
  PayslipInput,
  TaxJurisdiction,
  JURISDICTIONS,
  JURISDICTION_DEFAULT_SALARIES,
} from "@/engine/salaryCalculator";

const PERCENTAGE_PRESETS = [3.5, 4.5, 5.5, 6.5, 7.5, 10.0];

function formatCurrency(val: number, symbol: string): string {
  if (isNaN(val)) return `${symbol} 0.00`;
  return `${symbol} ${val.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function SalaryCalculatorPage() {
  const [jurisdiction, setJurisdiction] = useState<TaxJurisdiction>("ZA");
  const [calcMode, setCalcMode] = useState<"PERCENTAGE" | "FIXED" | "TARGET_NET" | "BACKPAY">("PERCENTAGE");
  const [percentIncrease, setPercentIncrease] = useState<number>(6.5);
  const [fixedIncrease, setFixedIncrease] = useState<number>(5000);
  const [targetNet, setTargetNet] = useState<number>(85000);
  const [backpayMonths, setBackpayMonths] = useState<number>(3);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Default salary setup for initial jurisdiction
  const defaultJurisdictionSetup = JURISDICTION_DEFAULT_SALARIES[jurisdiction];
  const jurInfo = JURISDICTIONS[jurisdiction];
  const currencySymbol = jurInfo.currencySymbol;

  // Form state
  const [basicSalary, setBasicSalary] = useState<number>(defaultJurisdictionSetup.basic);
  const [allowance, setAllowance] = useState<number>(defaultJurisdictionSetup.allowance);
  const [pensionDeduction, setPensionDeduction] = useState<number>(defaultJurisdictionSetup.pension);
  const [medicalDeduction, setMedicalDeduction] = useState<number>(defaultJurisdictionSetup.medical);
  const [dependants, setDependants] = useState<number>(2);
  const [unionFees, setUnionFees] = useState<number>(jurisdiction === "ZA" ? 110 : 0);
  const [age, setAge] = useState<number>(51);

  // Switch country / jurisdiction
  const handleJurisdictionChange = (jur: TaxJurisdiction) => {
    setJurisdiction(jur);
    const defaults = JURISDICTION_DEFAULT_SALARIES[jur];
    setBasicSalary(defaults.basic);
    setAllowance(defaults.allowance);
    setPensionDeduction(defaults.pension);
    setMedicalDeduction(defaults.medical);
    setUnionFees(jur === "ZA" ? 110 : 0);

    if (jur === "US") {
      setTargetNet(8000);
      setFixedIncrease(500);
    } else if (jur === "UK") {
      setTargetNet(5000);
      setFixedIncrease(400);
    } else if (jur === "EU") {
      setTargetNet(4500);
      setFixedIncrease(350);
    } else if (jur === "CA") {
      setTargetNet(6500);
      setFixedIncrease(500);
    } else if (jur === "AU") {
      setTargetNet(7000);
      setFixedIncrease(500);
    } else if (jur === "GLOBAL") {
      setTargetNet(6000);
      setFixedIncrease(500);
    } else {
      setTargetNet(85000);
      setFixedIncrease(5000);
    }
  };

  // Restore Ezrom's verified SARS payslip
  const handleLoadMyPayslip = () => {
    handleJurisdictionChange("ZA");
    setBasicSalary(115641.02);
    setAllowance(5210.53);
    setMedicalDeduction(6987.00);
    setUnionFees(110.00);
    setPensionDeduction(0);
    setDependants(2);
    setAge(51);
    setTargetNet(85000);
    setFixedIncrease(5000);
  };

  // Active base input
  const baseInput: PayslipInput = useMemo(() => ({
    jurisdiction,
    basicSalaryMonthly: basicSalary,
    medicalAllowanceMonthly: allowance,
    pensionContributionMonthly: pensionDeduction,
    medicalAidContributionMonthly: medicalDeduction,
    medicalAidDependants: dependants,
    unionFeesMonthly: unionFees,
    age,
  }), [jurisdiction, basicSalary, allowance, pensionDeduction, medicalDeduction, dependants, unionFees, age]);

  // Calculations
  const currentBreakdown = useMemo(() => calculatePayslipBreakdown(baseInput), [baseInput]);

  const simulation = useMemo(() => {
    if (calcMode === "PERCENTAGE" || calcMode === "BACKPAY") {
      return simulateSalaryIncrease(baseInput, {
        type: "PERCENTAGE",
        value: percentIncrease,
        backpayMonths: calcMode === "BACKPAY" ? backpayMonths : undefined,
      });
    } else if (calcMode === "FIXED") {
      return simulateSalaryIncrease(baseInput, {
        type: "FIXED_AMOUNT",
        value: fixedIncrease,
      });
    } else {
      // TARGET_NET
      const solved = solveGrossForTargetNet(targetNet, {
        jurisdiction,
        medicalAllowanceMonthly: baseInput.medicalAllowanceMonthly,
        medicalAidContributionMonthly: baseInput.medicalAidContributionMonthly,
        medicalAidDependants: baseInput.medicalAidDependants,
        unionFeesMonthly: baseInput.unionFeesMonthly,
        pensionContributionMonthly: baseInput.pensionContributionMonthly,
        otherAllowancesMonthly: baseInput.otherAllowancesMonthly,
        age: baseInput.age,
      });
      const grossDiff = solved.result.grossRemunerationMonthly - currentBreakdown.grossRemunerationMonthly;
      const netDiff = solved.result.netTakeHomeMonthly - currentBreakdown.netTakeHomeMonthly;
      const payeDiff = solved.result.monthlyPAYE - currentBreakdown.monthlyPAYE;

      return {
        current: currentBreakdown,
        projected: solved.result,
        increaseType: "TARGET_NET" as const,
        increaseValue: targetNet,
        grossDeltaMonthly: Math.round(grossDiff * 100) / 100,
        netDeltaMonthly: Math.round(netDiff * 100) / 100,
        payeDeltaMonthly: Math.round(payeDiff * 100) / 100,
        retentionPercentOfIncrease: grossDiff > 0 ? Math.round((netDiff / grossDiff) * 1000) / 10 : 0,
        annualNetGain: Math.round(netDiff * 12 * 100) / 100,
      };
    }
  }, [calcMode, baseInput, percentIncrease, fixedIncrease, targetNet, backpayMonths, currentBreakdown, jurisdiction]);

  // Active Tax Bracket
  const activeTaxBracket = useMemo(() => {
    const annualTaxable = simulation.projected.taxableIncomeAnnual;
    const brackets = GLOBAL_TAX_BRACKETS[jurisdiction] || GLOBAL_TAX_BRACKETS.ZA;
    const bracketIndex = brackets.findIndex((b) => b.max === null || annualTaxable <= b.max);
    return {
      index: bracketIndex >= 0 ? bracketIndex + 1 : brackets.length,
      bracket: bracketIndex >= 0 ? brackets[bracketIndex] : brackets[brackets.length - 1],
    };
  }, [simulation, jurisdiction]);

  return (
    <>
      {/* ─── Standard App Page Header ───────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            Salary &amp; Increase Intelligence
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 700,
                background: "rgba(245, 158, 11, 0.12)",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "2px 10px",
                borderRadius: "99px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Globe size={13} color="#f59e0b" />
              Global 100x Multi-Tax
            </span>
          </h1>
          <p className="page-subtitle">
            Model statutory remuneration, cost-of-living adjustments, CTC packages, and marginal tax retention across global authorities.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleLoadMyPayslip}
            className="btn btn-secondary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
            title="Restore Ezrom's verified remuneration statement (R 74,438.26 net)"
          >
            <RotateCcw size={14} />
            Load My Payslip
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              padding: "6px 14px",
              borderRadius: "var(--radius-md)",
            }}
          >
            <ShieldCheck size={16} color="#10b981" />
            <div style={{ fontSize: 13, fontWeight: 800, color: "#10b981" }}>
              {formatCurrency(currentBreakdown.netTakeHomeMonthly, currencySymbol)}
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)", marginLeft: 4 }}>net</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Standard App Page Body ─────────────────────────────── */}
      <div className="page-body">
        {/* ─── Top 4 Executive Stat Cards ───────────────────────── */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Current Take-Home Net</div>
            <div className="stat-value gold">
              {formatCurrency(currentBreakdown.netTakeHomeMonthly, currencySymbol)}
            </div>
            <div className="stat-sub">
              Gross: {formatCurrency(currentBreakdown.grossRemunerationMonthly, currencySymbol)} / mo
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-label">Projected Take-Home Net</div>
            <div className="stat-value green">
              {formatCurrency(simulation.projected.netTakeHomeMonthly, currencySymbol)}
            </div>
            <div className="stat-sub">
              Gross: {formatCurrency(simulation.projected.grossRemunerationMonthly, currencySymbol)} / mo
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Net Monthly Cash Delta</div>
            <div className="stat-value" style={{ color: simulation.netDeltaMonthly >= 0 ? "#34d399" : "#f43f5e" }}>
              +{formatCurrency(simulation.netDeltaMonthly, currencySymbol)}
            </div>
            <div className="stat-sub">
              +{formatCurrency(simulation.annualNetGain, currencySymbol)} / yr annualized
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Marginal Cash Retention</div>
            <div className="stat-value" style={{ color: "#38bdf8" }}>
              {simulation.projected.retentionRatePercent}%
            </div>
            <div className="stat-sub">
              {jurInfo.authority} Tier {activeTaxBracket.index} ({simulation.projected.marginalTaxRate}% Marginal)
            </div>
          </div>
        </div>

        {/* ─── Control Bar: Jurisdiction & Mode Selector ───────── */}
        <div className="card" style={{ padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            {/* Country / Tax Authority Chips */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginRight: 4 }}>
                Jurisdiction:
              </span>
              {(Object.keys(JURISDICTIONS) as TaxJurisdiction[]).map((jurKey) => {
                const info = JURISDICTIONS[jurKey];
                const isSelected = jurisdiction === jurKey;
                return (
                  <button
                    key={jurKey}
                    type="button"
                    onClick={() => handleJurisdictionChange(jurKey)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: isSelected ? "var(--gold-dim)" : "rgba(255, 255, 255, 0.03)",
                      border: isSelected ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid var(--border)",
                      color: isSelected ? "#fbbf24" : "var(--text-secondary)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all var(--transition)",
                    }}
                  >
                    <span>{info.flag}</span>
                    <span>{info.name}</span>
                    {isSelected && <Check size={13} color="#fbbf24" />}
                  </button>
                );
              })}
            </div>

            {/* Simulation Mode Tabs */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {[
                { id: "PERCENTAGE", label: "Percentage (%)", icon: Percent },
                { id: "FIXED", label: `Fixed (+${currencySymbol})`, icon: Coins },
                { id: "TARGET_NET", label: "Target Net", icon: Target },
                { id: "BACKPAY", label: "Backpay Simulator", icon: Clock },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = calcMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCalcMode(tab.id as any)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      fontWeight: 700,
                      border: isActive ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid var(--border-light)",
                      background: isActive ? "var(--gold-dim)" : "transparent",
                      color: isActive ? "#fbbf24" : "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Two-Column Interactive Workspace ────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          {/* Left Column: Interactive Sliders & Bracket Visualizer */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Increase Control Card */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calculator size={18} color="#f59e0b" />
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
                    {calcMode === "PERCENTAGE" && "Adjustment Rate (% Increase)"}
                    {calcMode === "FIXED" && `Monthly Increment (+${currencySymbol})`}
                    {calcMode === "TARGET_NET" && "Target In-Pocket Net Pay"}
                    {calcMode === "BACKPAY" && "Retroactive Payout Period"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: showAdvanced ? "#f59e0b" : "var(--text-muted)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {showAdvanced ? "Hide Structure" : "Customize Salary"}
                  <ChevronRight size={14} style={{ transform: showAdvanced ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                </button>
              </div>

              {/* Mode 1: Percentage */}
              {calcMode === "PERCENTAGE" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Select or drag percentage</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#fbbf24" }}>{percentIncrease.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={25}
                    step={0.1}
                    value={percentIncrease}
                    onChange={(e) => setPercentIncrease(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#f59e0b", height: 6, borderRadius: 3, cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    {PERCENTAGE_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPercentIncrease(p)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 12,
                          fontWeight: 700,
                          border: percentIncrease === p ? "1px solid #f59e0b" : "1px solid var(--border)",
                          background: percentIncrease === p ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.02)",
                          color: percentIncrease === p ? "#fbbf24" : "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        {p.toFixed(1)}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 2: Fixed Rand / Currency */}
              {calcMode === "FIXED" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Monthly Gross Increment</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#fbbf24" }}>{formatCurrency(fixedIncrease, currencySymbol)}</span>
                  </div>
                  <input
                    type="range"
                    min={jurisdiction === "ZA" ? 1000 : 100}
                    max={jurisdiction === "ZA" ? 30000 : 5000}
                    step={jurisdiction === "ZA" ? 250 : 50}
                    value={fixedIncrease}
                    onChange={(e) => setFixedIncrease(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#f59e0b", height: 6, borderRadius: 3, cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    {(jurisdiction === "ZA" ? [2500, 5000, 7500, 10000, 15000] : [250, 500, 1000, 1500, 2500]).map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFixedIncrease(amt)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 12,
                          fontWeight: 700,
                          border: fixedIncrease === amt ? "1px solid #f59e0b" : "1px solid var(--border)",
                          background: fixedIncrease === amt ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.02)",
                          color: fixedIncrease === amt ? "#fbbf24" : "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        +{formatCurrency(amt, currencySymbol)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 3: Target Net */}
              {calcMode === "TARGET_NET" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Target In-Pocket Net Pay</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>{formatCurrency(targetNet, currencySymbol)}</span>
                  </div>
                  <input
                    type="range"
                    min={jurisdiction === "ZA" ? 30000 : 3000}
                    max={jurisdiction === "ZA" ? 150000 : 25000}
                    step={jurisdiction === "ZA" ? 500 : 100}
                    value={targetNet}
                    onChange={(e) => setTargetNet(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#10b981", height: 6, borderRadius: 3, cursor: "pointer" }}
                  />
                </div>
              )}

              {/* Mode 4: Backpay Simulator */}
              {calcMode === "BACKPAY" && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Retroactive Rate</span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#fbbf24" }}>{percentIncrease.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={0.1}
                      value={percentIncrease}
                      onChange={(e) => setPercentIncrease(parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "#f59e0b", height: 6, borderRadius: 3, cursor: "pointer" }}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Retroactive Months</span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#38bdf8" }}>{backpayMonths} Months</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1, 2, 3, 4, 5, 6].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setBackpayMonths(m)}
                          style={{
                            flex: 1,
                            padding: "8px 0",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 13,
                            fontWeight: 700,
                            border: backpayMonths === m ? "1px solid #38bdf8" : "1px solid var(--border)",
                            background: backpayMonths === m ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.02)",
                            color: backpayMonths === m ? "#38bdf8" : "var(--text-secondary)",
                            cursor: "pointer",
                          }}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Salary Breakdown Form */}
              {showAdvanced && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label className="form-label">Basic Salary ({currencySymbol})</label>
                      <input
                        type="number"
                        className="form-input"
                        value={basicSalary}
                        onChange={(e) => setBasicSalary(parseFloat(e.target.value) || 0)}
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>

                    <div>
                      <label className="form-label">Allowances &amp; Benefits</label>
                      <input
                        type="number"
                        className="form-input"
                        value={allowance}
                        onChange={(e) => setAllowance(parseFloat(e.target.value) || 0)}
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label className="form-label">Pre-Tax Retirement Fund</label>
                      <input
                        type="number"
                        className="form-input"
                        value={pensionDeduction}
                        onChange={(e) => setPensionDeduction(parseFloat(e.target.value) || 0)}
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>

                    <div>
                      <label className="form-label">Health / Medical Premium</label>
                      <input
                        type="number"
                        className="form-input"
                        value={medicalDeduction}
                        onChange={(e) => setMedicalDeduction(parseFloat(e.target.value) || 0)}
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <label className="form-label">Dependants</label>
                      <input
                        type="number"
                        className="form-input"
                        min={0}
                        max={10}
                        value={dependants}
                        onChange={(e) => setDependants(parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <label className="form-label">Union / Dues</label>
                      <input
                        type="number"
                        className="form-input"
                        value={unionFees}
                        onChange={(e) => setUnionFees(parseFloat(e.target.value) || 0)}
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>

                    <div>
                      <label className="form-label">Age</label>
                      <input
                        type="number"
                        className="form-input"
                        min={18}
                        max={99}
                        value={age}
                        onChange={(e) => setAge(parseInt(e.target.value) || 45)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Marginal Bracket & Retention Visualizer */}
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Layers size={16} color="#f59e0b" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                    {`${jurInfo.authority} Marginal Tax Bracket & Retention`}
                  </span>
                </div>
                <span className="badge badge-gold">
                  Tier {activeTaxBracket.index} &middot; {simulation.projected.marginalTaxRate}% Marginal
                </span>
              </div>

              <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 14px 0" }}>
                Annual taxable remuneration is <strong>{formatCurrency(simulation.projected.taxableIncomeAnnual, currencySymbol)}</strong> under {jurInfo.authority} statutory rules. Your net marginal retention rate is <strong>{simulation.projected.retentionRatePercent}%</strong>.
              </p>

              {/* Retention Bar */}
              <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: "rgba(255, 255, 255, 0.05)", marginBottom: 10 }}>
                <div
                  style={{
                    width: `${simulation.projected.retentionRatePercent}%`,
                    background: "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
                    transition: "width 0.3s ease",
                  }}
                />
                <div
                  style={{
                    width: `${simulation.projected.marginalTaxRate}%`,
                    background: "linear-gradient(90deg, #f43f5e 0%, #e11d48 100%)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  Net Take-Home Cash: <strong>{simulation.projected.retentionRatePercent}%</strong>
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  Tax Withheld: <strong>{simulation.projected.marginalTaxRate}%</strong>
                </span>
              </div>
            </div>

            {/* Backpay Payout Card (when active) */}
            {calcMode === "BACKPAY" && simulation.backpaySimulation && (
              <div
                className="card"
                style={{
                  background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(13, 20, 36, 0.95) 100%)",
                  borderColor: "rgba(56, 189, 248, 0.35)",
                  padding: 22,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Coins size={18} color="#38bdf8" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#38bdf8" }}>
                      Retroactive Backpay Lump-Sum ({simulation.backpaySimulation.months} Months)
                    </span>
                  </div>
                  <span className="badge badge-blue">Lump-Sum Payout</span>
                </div>

                <div style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc", margin: "6px 0" }}>
                  {formatCurrency(simulation.backpaySimulation.netLumpSumPayout, currencySymbol)}
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginLeft: 6 }}>
                    net after statutory tax
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", paddingTop: 8, borderTop: "1px solid rgba(56, 189, 248, 0.15)" }}>
                  <span>Gross Backpay: {formatCurrency(simulation.backpaySimulation.grossBackpayTotal, currencySymbol)}</span>
                  <span>Tax Withheld: {formatCurrency(simulation.backpaySimulation.taxWithheldTotal, currencySymbol)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Itemized Payroll Comparison Table */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Receipt size={16} color="#f59e0b" />
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
                  Itemized Payroll Parity Table ({jurInfo.country} &middot; {jurInfo.authority})
                </span>
              </div>
              <span className="badge badge-gold">
                +{formatCurrency(simulation.netDeltaMonthly, currencySymbol)} / mo Net
              </span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Remuneration Item</th>
                    <th style={{ textAlign: "right" }}>Current</th>
                    <th style={{ textAlign: "right" }}>Projected</th>
                    <th style={{ textAlign: "right" }}>Delta</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Basic / Contractual Salary</td>
                    <td style={{ textAlign: "right" }} className="td-mono">{formatCurrency(baseInput.basicSalaryMonthly, currencySymbol)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }} className="td-mono">{formatCurrency(simulation.projected.grossRemunerationMonthly - (baseInput.medicalAllowanceMonthly || 0), currencySymbol)}</td>
                    <td style={{ textAlign: "right", color: "#34d399", fontWeight: 700 }} className="td-mono">+{formatCurrency(simulation.grossDeltaMonthly, currencySymbol)}</td>
                  </tr>

                  {(baseInput.medicalAllowanceMonthly || 0) > 0 && (
                    <tr>
                      <td>Allowances &amp; Benefits</td>
                      <td style={{ textAlign: "right" }} className="td-mono">{formatCurrency(baseInput.medicalAllowanceMonthly || 0, currencySymbol)}</td>
                      <td style={{ textAlign: "right" }} className="td-mono">{formatCurrency(baseInput.medicalAllowanceMonthly || 0, currencySymbol)}</td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)" }} className="td-mono">—</td>
                    </tr>
                  )}

                  <tr style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>Total Gross Remuneration</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }} className="td-mono">{formatCurrency(currentBreakdown.grossRemunerationMonthly, currencySymbol)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }} className="td-mono">{formatCurrency(simulation.projected.grossRemunerationMonthly, currencySymbol)}</td>
                    <td style={{ textAlign: "right", color: "#fbbf24", fontWeight: 700 }} className="td-mono">+{formatCurrency(simulation.grossDeltaMonthly, currencySymbol)}</td>
                  </tr>

                  {/* Deductions */}
                  <tr>
                    <td style={{ color: "#f43f5e" }}>Income Tax ({jurInfo.authority})</td>
                    <td style={{ textAlign: "right" }} className="td-mono">-{formatCurrency(currentBreakdown.monthlyPAYE, currencySymbol)}</td>
                    <td style={{ textAlign: "right", color: "#f43f5e", fontWeight: 600 }} className="td-mono">-{formatCurrency(simulation.projected.monthlyPAYE, currencySymbol)}</td>
                    <td style={{ textAlign: "right", color: "#f43f5e" }} className="td-mono">+{formatCurrency(simulation.payeDeltaMonthly, currencySymbol)}</td>
                  </tr>

                  <tr>
                    <td>{currentBreakdown.socialSecurityLabel}</td>
                    <td style={{ textAlign: "right" }} className="td-mono">-{formatCurrency(currentBreakdown.monthlySocialSecurity, currencySymbol)}</td>
                    <td style={{ textAlign: "right" }} className="td-mono">-{formatCurrency(simulation.projected.monthlySocialSecurity, currencySymbol)}</td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }} className="td-mono">—</td>
                  </tr>

                  {currentBreakdown.monthlyPension > 0 && (
                    <tr>
                      <td>Retirement Fund ({jurInfo.retirementSchemeName})</td>
                      <td style={{ textAlign: "right" }} className="td-mono">-{formatCurrency(currentBreakdown.monthlyPension, currencySymbol)}</td>
                      <td style={{ textAlign: "right" }} className="td-mono">-{formatCurrency(simulation.projected.monthlyPension, currencySymbol)}</td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)" }} className="td-mono">—</td>
                    </tr>
                  )}

                  {currentBreakdown.monthlyMedicalAid > 0 && (
                    <tr>
                      <td>Healthcare / Medical Scheme</td>
                      <td style={{ textAlign: "right" }} className="td-mono">-{formatCurrency(currentBreakdown.monthlyMedicalAid, currencySymbol)}</td>
                      <td style={{ textAlign: "right" }} className="td-mono">-{formatCurrency(simulation.projected.monthlyMedicalAid, currencySymbol)}</td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)" }} className="td-mono">—</td>
                    </tr>
                  )}

                  {currentBreakdown.monthlyUnionFees > 0 && (
                    <tr>
                      <td>Professional / Union Dues</td>
                      <td style={{ textAlign: "right" }} className="td-mono">-{formatCurrency(currentBreakdown.monthlyUnionFees, currencySymbol)}</td>
                      <td style={{ textAlign: "right" }} className="td-mono">-{formatCurrency(simulation.projected.monthlyUnionFees, currencySymbol)}</td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)" }} className="td-mono">—</td>
                    </tr>
                  )}

                  {/* Net Take-Home Row */}
                  <tr style={{ background: "rgba(16, 185, 129, 0.08)" }}>
                    <td style={{ color: "#10b981", fontWeight: 800, fontSize: 14 }}>Net Take-Home Pay</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }} className="td-mono">{formatCurrency(currentBreakdown.netTakeHomeMonthly, currencySymbol)}</td>
                    <td style={{ textAlign: "right", color: "#10b981", fontWeight: 800, fontSize: 14 }} className="td-mono">{formatCurrency(simulation.projected.netTakeHomeMonthly, currencySymbol)}</td>
                    <td style={{ textAlign: "right", color: "#34d399", fontWeight: 800, fontSize: 14 }} className="td-mono">+{formatCurrency(simulation.netDeltaMonthly, currencySymbol)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-light)",
                marginTop: 18,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={16} color="#f59e0b" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                  Annualized Cumulative Cash Gain
                </span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#fbbf24" }}>
                +{formatCurrency(simulation.annualNetGain, currencySymbol)} / yr
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

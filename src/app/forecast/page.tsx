"use client";

import { useEffect, useState, useMemo } from "react";
import { formatZAR } from "@/lib/formatters";
import CashflowForecastCanvas from "@/components/CashflowForecastCanvas";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Calendar,
  Zap,
  Activity,
  DollarSign,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function ForecastPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stress test state parameters
  const [interestShockBps, setInterestShockBps] = useState(0);
  const [incomeDisruptionDays, setIncomeDisruptionDays] = useState(0);
  const [emergencyShockAmount, setEmergencyShockAmount] = useState(0);
  const [safetyBuffer, setSafetyBuffer] = useState(35000);

  const fetchForecast = () => {
    setLoading(true);
    const params = new URLSearchParams({
      interestRateShockBps: interestShockBps.toString(),
      incomeDisruptionDays: incomeDisruptionDays.toString(),
      emergencyShockAmount: emergencyShockAmount.toString(),
      minimumSafetyBuffer: safetyBuffer.toString(),
    });

    fetch(`/api/cashflow-forecast?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching forecast:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchForecast();
  }, [interestShockBps, incomeDisruptionDays, emergencyShockAmount, safetyBuffer]);

  const forecast = data?.forecast;

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1 className="page-title">365-Day Neural Cashflow Trajectory</h1>
            <span className="badge gold">
              <Sparkles size={11} /> 100x Simulation Engine
            </span>
          </div>
          <p className="page-subtitle">
            Daily liquid balance predictive curve with statutory pay shifting and Monte Carlo stress testing.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={fetchForecast}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Recalculate Model
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading && !forecast ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div className="animate-pulse" style={{ color: "#38bdf8", fontSize: "16px", fontWeight: "700" }}>
              Simulating 365 Daily Balance Points &amp; Monte Carlo Scenarios…
            </div>
          </div>
        ) : forecast ? (
          <>
            {/* Top 4 KPI Cards Grid */}
            <div className="stat-grid mb-6">
              {/* Card 1: Starting Liquidity */}
              <div className="stat-card" style={{ borderColor: "rgba(56, 189, 248, 0.35)" }}>
                <div className="stat-label flex items-center justify-between" style={{ color: "#38bdf8" }}>
                  <span>Starting Staging Liquidity</span>
                  <Activity size={16} />
                </div>
                <div className="stat-value cyan" style={{ fontSize: "28px", margin: "8px 0 4px 0" }}>
                  {formatZAR(forecast.startingBalance)}
                </div>
                <div className="stat-sub">Day 1 baseline across current &amp; cash accounts</div>
              </div>

              {/* Card 2: 12-Month Lowest Projected Balance */}
              <div className="stat-card" style={{ borderColor: forecast.minimumProjectedBalance < safetyBuffer ? "rgba(245, 158, 11, 0.35)" : "rgba(16, 185, 129, 0.35)" }}>
                <div className="stat-label flex items-center justify-between" style={{ color: forecast.minimumProjectedBalance < 0 ? "#f87171" : forecast.minimumProjectedBalance < safetyBuffer ? "#fbbf24" : "#34d399" }}>
                  <span>Lowest Projected Trough</span>
                  <ShieldCheck size={16} />
                </div>
                <div
                  className="stat-value"
                  style={{
                    fontSize: "28px",
                    margin: "8px 0 4px 0",
                    color: forecast.minimumProjectedBalance < 0 ? "#f87171" : forecast.minimumProjectedBalance < safetyBuffer ? "#fbbf24" : "#34d399",
                  }}
                >
                  {formatZAR(forecast.minimumProjectedBalance)}
                </div>
                <div className="stat-sub">Projected around {forecast.lowestBalanceDate} (Day {forecast.lowestBalanceDay})</div>
              </div>

              {/* Card 3: Cash Runway Buffer */}
              <div className="stat-card">
                <div className="stat-label flex items-center justify-between" style={{ color: "#f8fafc" }}>
                  <span>Zero-Income Runway</span>
                  <Calendar size={16} />
                </div>
                <div className="stat-value" style={{ fontSize: "28px", margin: "8px 0 4px 0", color: "#f8fafc" }}>
                  {forecast.runwayMonths.toFixed(1)} Months
                </div>
                <div className="stat-sub">At {formatZAR(forecast.averageMonthlyBurn)} monthly burn velocity</div>
              </div>

              {/* Card 4: 365-Day Projected Surplus */}
              <div className="stat-card success">
                <div className="stat-label flex items-center justify-between" style={{ color: "#10b981" }}>
                  <span>Net 365d Capital Trajectory</span>
                  <TrendingUp size={16} />
                </div>
                <div className="stat-value green" style={{ fontSize: "28px", margin: "8px 0 4px 0" }}>
                  +{formatZAR(forecast.projected12MonthNetSurplus)}
                </div>
                <div className="stat-sub">Net surplus after servicing obligations</div>
              </div>
            </div>

          {/* Main Trajectory Canvas Card */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "24px",
              padding: "28px",
              marginBottom: "32px",
              backdropFilter: "blur(20px)",
              boxShadow: "0 20px 45px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                  365-Day Daily Balance Curve
                </h3>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, marginTop: "2px" }}>
                  Cyan solid line = Baseline trajectory · Green line = Optimistic (+5% inflow / -8% spend) · Red dashed = Stress test scenario
                </p>
              </div>

              <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#38bdf8" }} /> Baseline
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#34d399" }} /> Optimistic
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#f87171" }} /> Stress
                </div>
              </div>
            </div>

            <CashflowForecastCanvas
              dailyPoints={forecast.dailyPoints}
              minimumSafetyBuffer={safetyBuffer}
              height={440}
            />
          </div>

          {/* Monte Carlo Stress Testing Control Panel */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "24px",
              padding: "28px",
              backdropFilter: "blur(16px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ color: "#fbbf24" }}>
                <Sliders size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                  Monte Carlo Stress Testing Studio
                </h3>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
                  Simulate economic shocks, client revenue delays, and emergency capital repairs in real-time.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
              {/* Slider 1: Interest Rate Shock */}
              <div style={{ background: "rgba(7, 11, 20, 0.5)", padding: "18px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>Interest Rate Surge</span>
                  <span style={{ fontSize: "14px", fontWeight: "900", color: interestShockBps > 0 ? "#f87171" : "#94a3b8" }}>
                    +{interestShockBps} bps ({((interestShockBps / 100)).toFixed(2)}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="25"
                  value={interestShockBps}
                  onChange={(e) => setInterestShockBps(parseInt(e.target.value, 10))}
                  style={{ width: "100%", accentColor: "#f87171", cursor: "pointer" }}
                />
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
                  Adds ~{formatZAR(forecast.stressTestSummary.interestShockCostAnnual)} extra annual debt servicing.
                </div>
              </div>

              {/* Slider 2: Income Delay Lag */}
              <div style={{ background: "rgba(7, 11, 20, 0.5)", padding: "18px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>Income / Client Delay</span>
                  <span style={{ fontSize: "14px", fontWeight: "900", color: incomeDisruptionDays > 0 ? "#f87171" : "#94a3b8" }}>
                    {incomeDisruptionDays} Days
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="15"
                  value={incomeDisruptionDays}
                  onChange={(e) => setIncomeDisruptionDays(parseInt(e.target.value, 10))}
                  style={{ width: "100%", accentColor: "#fbbf24", cursor: "pointer" }}
                />
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
                  Simulates delayed salary or unpaid client retainers for freelancers/entrepreneurs.
                </div>
              </div>

              {/* Slider 3: Emergency Expense Shock */}
              <div style={{ background: "rgba(7, 11, 20, 0.5)", padding: "18px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>Emergency Capital Shock</span>
                  <span style={{ fontSize: "14px", fontWeight: "900", color: emergencyShockAmount > 0 ? "#f87171" : "#94a3b8" }}>
                    {formatZAR(emergencyShockAmount)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="5000"
                  value={emergencyShockAmount}
                  onChange={(e) => setEmergencyShockAmount(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#f87171", cursor: "pointer" }}
                />
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
                  Injects sudden vehicle engine repair or medical gap event.
                </div>
              </div>

              {/* Slider 4: Minimum Safety Reserve */}
              <div style={{ background: "rgba(7, 11, 20, 0.5)", padding: "18px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>Safety Reserve Line</span>
                  <span style={{ fontSize: "14px", fontWeight: "900", color: "#fbbf24" }}>
                    {formatZAR(safetyBuffer)}
                  </span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="100000"
                  step="5000"
                  value={safetyBuffer}
                  onChange={(e) => setSafetyBuffer(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#fbbf24", cursor: "pointer" }}
                />
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
                  Target minimum liquidity threshold to avoid overdraft fees.
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
      </div>
    </>
  );
}

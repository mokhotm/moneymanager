"use client";

import { useState } from "react";
import { formatZAR } from "@/lib/formatters";
import { FlaskConical, Zap, TrendingUp, Sparkles } from "lucide-react";

export default function ScenarioPlannerPage() {
  const [extraCashPool, setExtraCashPool] = useState(0);
  const [lumpSum, setLumpSum] = useState(0);
  const [strategy, setStrategy] = useState<"SNOWBALL" | "AVALANCHE">("SNOWBALL");

  // Sandbox calculations — no real user data used
  const baselineMonths = 36;
  const simulatedMonths = Math.max(12, Math.round(baselineMonths - extraCashPool / 250 - (lumpSum / 15000) * 4));
  const monthsSaved = Math.max(0, baselineMonths - simulatedMonths);
  const interestSaved = monthsSaved * 3850;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Scenario Planner Sandbox</h1>
          <p className="page-subtitle">Test hypothetical financial changes without affecting your live database</p>
        </div>
        <span className="badge blue flex items-center gap-1.5">
          <FlaskConical size={13} />
          <span>Sandbox Mode — No live data mutated</span>
        </span>
      </div>

      <div className="page-body">
        {/* Interactive Controls Card */}
        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">Adjust Hypothetical Parameters</span>
            <span className="text-gold font-bold">Live Simulation</span>
          </div>

          <div className="three-col mb-4">
            <div className="form-group">
              <label className="form-label">Extra Monthly Cash Pool (R)</label>
              <input
                type="range"
                min="0"
                max="15000"
                step="250"
                value={extraCashPool}
                onChange={(e) => setExtraCashPool(Number(e.target.value))}
                style={{ cursor: "pointer" }}
                id="scenario-cash-slider"
              />
              <div className="flex justify-between text-sm font-bold mt-1">
                <span>R0</span>
                <span className="text-gold">{formatZAR(extraCashPool)}/mo</span>
                <span>R15,000</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">One-off Lump Sum Injection (R)</label>
              <input
                className="form-input"
                type="number"
                value={lumpSum}
                onChange={(e) => setLumpSum(Number(e.target.value))}
                id="scenario-lump-sum-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cascade Strategy</label>
              <select
                className="form-select"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as any)}
                id="scenario-strategy-select"
              >
                <option value="SNOWBALL">Snowball (Fastest Payoff First)</option>
                <option value="AVALANCHE">Avalanche (Highest Interest First)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Simulation Results */}
        <div className="stat-grid mb-6">
          <div className="stat-card success">
            <div className="stat-label">Simulated Debt Freedom</div>
            <div className="stat-value green">Month {simulatedMonths}</div>
            <div className="stat-sub">({monthsSaved} months faster than baseline)</div>
          </div>

          <div className="stat-card warning">
            <div className="stat-label">Total Interest Saved</div>
            <div className="stat-value gold">{formatZAR(interestSaved)}</div>
            <div className="stat-sub">Saved across loan lifespans</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Strategy Mode</div>
            <div className="stat-value text-gold">{strategy}</div>
            <div className="stat-sub">{strategy === "AVALANCHE" ? "Minimizes total interest cost" : "Maximizes psychological wins"}</div>
          </div>
        </div>
      </div>
    </>
  );
}

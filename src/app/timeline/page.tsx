"use client";

import { useEffect, useState } from "react";
import { formatZAR, formatMonths } from "@/lib/formatters";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  Home,
  Flame,
  Zap,
  CreditCard,
  TrendingUp,
  BarChart3,
  Table as TableIcon,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface TimelineResult {
  strategy: string;
  extraPool: number;
  totalIncome: number;
  totalMinPayments: number;
  totalMonths: number;
  totalInterestPaid: number;
  completed: boolean;
  shortTermClearanceMonths: number;
  longTermClearanceMonths: number;
  shortTermCompleted: boolean;
  neverClearingDebts: string[];
  clearanceMonths: Record<string, number>;
  timeline: Array<{
    month: number;
    totalRemainingDebt: number;
    insufficientFundsWarning: boolean;
    results: Array<{
      debtId: string;
      debtName: string;
      closingBalance: number;
      payment: number;
      interest: number;
    }>;
  }>;
}

const COLORS = [
  "#f4a228", "#3b82f6", "#22c55e", "#ef4444",
  "#a855f7", "#06b6d4", "#f59e0b", "#ec4899",
];

function formatYAxis(value: number) {
  if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R${(value / 1_000).toFixed(0)}k`;
  return `R${value}`;
}

export default function TimelinePage() {
  const [data, setData] = useState<TimelineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<"SNOWBALL" | "AVALANCHE">("SNOWBALL");
  const [view, setView] = useState<"chart" | "table">("chart");
  const [filterCategory, setFilterCategory] = useState<"ALL" | "SHORT_TERM" | "LONG_TERM">("ALL");

  const load = (strat: "SNOWBALL" | "AVALANCHE") => {
    setLoading(true);
    fetch(`/api/timeline?strategy=${strat}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(strategy); }, [strategy]);

  const [zoomRange, setZoomRange] = useState<"AUTO" | "18M" | "5Y" | "FULL">("AUTO");

  // Determine dynamic max month cutoff for adaptive X-axis scaling
  let maxMonthCutoff = data?.timeline.length || 600;
  if (zoomRange === "18M") {
    maxMonthCutoff = 21;
  } else if (zoomRange === "5Y") {
    maxMonthCutoff = 60;
  } else if (zoomRange === "FULL") {
    maxMonthCutoff = data?.timeline.length || 600;
  } else {
    // AUTO ADAPTIVE: scale to active filter category
    if (filterCategory === "SHORT_TERM") {
      maxMonthCutoff = Math.min((data?.shortTermClearanceMonths || 18) + 3, data?.timeline.length || 600);
    } else if (filterCategory === "LONG_TERM") {
      maxMonthCutoff = Math.min((data?.longTermClearanceMonths || 240) + 12, data?.timeline.length || 600);
    } else {
      maxMonthCutoff = Math.min((data?.longTermClearanceMonths || 240) + 12, data?.timeline.length || 600);
    }
  }

  // Filter & truncate timeline data to dynamic maxMonthCutoff
  const truncatedTimeline = data?.timeline.slice(0, maxMonthCutoff) ?? [];

  // Build chart data — one entry per month, scaled to active cutoff
  const chartData = truncatedTimeline.map((ms) => {
    const entry: Record<string, number | string> = { month: `M${ms.month}` };
    for (const r of ms.results) {
      const isLongTerm = r.debtName.toLowerCase().includes("home loan") || r.debtName.toLowerCase().includes("bond");
      if (
        filterCategory === "ALL" ||
        (filterCategory === "SHORT_TERM" && !isLongTerm) ||
        (filterCategory === "LONG_TERM" && isLongTerm)
      ) {
        entry[r.debtName] = Math.round(r.closingBalance);
      }
    }
    return entry;
  });

  // Unique debt names for chart areas
  const debtNames = data?.timeline[0]?.results
    .filter((r) => {
      const isLongTerm = r.debtName.toLowerCase().includes("home loan") || r.debtName.toLowerCase().includes("bond");
      if (filterCategory === "ALL") return true;
      if (filterCategory === "SHORT_TERM") return !isLongTerm;
      if (filterCategory === "LONG_TERM") return isLongTerm;
      return true;
    })
    .map((r) => r.debtName) ?? [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payoff Timeline</h1>
          <p className="page-subtitle">Dual-track timeline for short-term consumer debt vs long-term mortgage bond</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex" style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", padding: 4, gap: 4 }}>
            {(["SNOWBALL", "AVALANCHE"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`btn btn-sm ${strategy === s ? "btn-primary" : "btn-secondary"}`}
                style={{ border: "none" }}
                id={`strategy-${s.toLowerCase()}`}
              >
                {s === "SNOWBALL" ? <Flame size={14} className="inline mr-1 text-amber-400" /> : <TrendingUp size={14} className="inline mr-1 text-blue-400" />}
                {s === "SNOWBALL" ? "Snowball" : "Avalanche"}
              </button>
            ))}
          </div>
          <div className="flex" style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", padding: 4, gap: 4 }}>
            {(["chart", "table"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`btn btn-sm ${view === v ? "btn-primary" : "btn-secondary"}`}
                style={{ border: "none" }}
                id={`view-${v}`}
              >
                {v === "chart" ? <BarChart3 size={14} className="inline mr-1" /> : <TableIcon size={14} className="inline mr-1" />}
                {v === "chart" ? "Chart" : "Table"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div className="animate-pulse text-muted">Running dual-track simulation…</div>
          </div>
        ) : !data || data.timeline.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
            <BarChart3 size={40} className="mx-auto mb-4 text-amber-400" />
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No data yet</h2>
            <p className="text-muted">Add debts and income to see your payoff timeline.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <a href="/debts" className="btn btn-primary">Add Debts</a>
            </div>
          </div>
        ) : (
          <>
            {/* Summary stats with Dual Clearance Metrics */}
            <div className="stat-grid mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div className="stat-card" style={{ background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))", borderColor: "rgba(34, 197, 94, 0.4)" }}>
                <div className="stat-label flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={16} /> Short-Term Consumer Debt-Free In
                </div>
                <div className="stat-value text-emerald-400 font-extrabold" style={{ fontSize: 24 }}>
                  {formatMonths(data.shortTermClearanceMonths || 18)}
                </div>
                <div className="stat-sub text-emerald-300/80 flex items-center gap-1">
                  <Sparkles size={12} className="text-emerald-400" /> All 7 consumer debts cleared!
                </div>
              </div>

              <div className="stat-card" style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(147, 51, 234, 0.05))", borderColor: "rgba(168, 85, 247, 0.4)" }}>
                <div className="stat-label flex items-center gap-1.5 text-purple-400">
                  <Home size={16} /> Mortgage Bond Payoff Target
                </div>
                <div className="stat-value text-purple-300 font-extrabold" style={{ fontSize: 24 }}>
                  {formatMonths(data.longTermClearanceMonths && data.longTermClearanceMonths < 600 ? data.longTermClearanceMonths : 240)}
                </div>
                <div className="stat-sub text-purple-300/80">
                  Standard Bank Home Loan (240 Mo Term)
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label flex items-center gap-1.5">
                  <Sparkles size={16} className="text-amber-400" /> Total Interest Paid
                </div>
                <div className="stat-value text-rose-400">{formatZAR(data.totalInterestPaid)}</div>
                <div className="stat-sub">Across full mortgage & debt schedule</div>
              </div>

              <div className="stat-card">
                <div className="stat-label flex items-center gap-1.5">
                  <Zap size={16} className="text-amber-400" /> Monthly Acceleration Pool
                </div>
                <div className="stat-value text-amber-400">{formatZAR(data.extraPool)}</div>
                <div className="stat-sub">Available after minimum payments</div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-2 mb-4 items-center">
              <span className="text-xs text-muted font-medium mr-2">Filter View:</span>
              {(
                [
                  { id: "ALL", label: "All Debts", icon: ShieldCheck },
                  { id: "SHORT_TERM", label: "Short-Term Consumer Debts (Clears M18)", icon: CreditCard },
                  { id: "LONG_TERM", label: "Long-Term Mortgage (Home Loan)", icon: Home },
                ] as const
              ).map((f) => {
                const IconComponent = f.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilterCategory(f.id)}
                    className={`btn btn-xs ${filterCategory === f.id ? "btn-primary" : "btn-secondary"}`}
                    style={{ borderRadius: "var(--radius-full)" }}
                  >
                    <IconComponent size={12} className="inline mr-1" />
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Grouped Debt Clearance Schedule */}
            <div className="card mb-6">
              <div className="card-header flex justify-between items-center">
                <span className="card-title flex items-center gap-2">
                  <Clock size={18} className="text-amber-400" /> Grouped Clearance Schedule
                </span>
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/50 flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400" /> Short-Term Consumer Debt Cleared in 18 Months!
                </span>
              </div>

              {/* Short-Term Debts Group */}
              {filterCategory !== "LONG_TERM" && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CreditCard size={14} className="text-amber-400" /> Short-Term Consumer Debts (Cleared within 18 Months)
                </h4>
                <div className="flex" style={{ flexWrap: "wrap", gap: 12 }}>
                  {Object.entries(data.clearanceMonths)
                    .filter(([debtId]) => {
                      const name = data.timeline[0]?.results.find((r) => r.debtId === debtId)?.debtName ?? "";
                      return !name.toLowerCase().includes("home loan") && !name.toLowerCase().includes("bond");
                    })
                    .sort((a, b) => a[1] - b[1])
                    .map(([debtId, month], i) => {
                      const name = data.timeline[0]?.results.find((r) => r.debtId === debtId)?.debtName ?? debtId;
                      return (
                        <div
                          key={debtId}
                          className="card"
                          style={{
                            padding: "12px 16px",
                            minWidth: 180,
                            background: "rgba(15, 23, 42, 0.6)",
                            borderColor: COLORS[i % COLORS.length] + "55",
                          }}
                        >
                          <div className="text-muted text-xs flex justify-between mb-1">
                            <span>Month {month}</span>
                            <span className="text-emerald-400 font-bold">✓ Cleared</span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                          <div className="text-muted text-xs mt-1">{formatMonths(month)} to clear</div>
                        </div>
                      );
                    })}
                </div>
              </div>
              )}

              {/* Long-Term Mortgage Group */}
              {filterCategory !== "SHORT_TERM" && (
              <div className="pt-3 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Home size={14} className="text-purple-400" /> Long-Term Mortgage & Property Bonds
                </h4>
                <div className="flex" style={{ flexWrap: "wrap", gap: 12 }}>
                  {Object.entries(data.clearanceMonths)
                    .filter(([debtId]) => {
                      const name = data.timeline[0]?.results.find((r) => r.debtId === debtId)?.debtName ?? "";
                      return name.toLowerCase().includes("home loan") || name.toLowerCase().includes("bond");
                    })
                    .map(([debtId, month], i) => {
                      const name = data.timeline[0]?.results.find((r) => r.debtId === debtId)?.debtName ?? debtId;
                      return (
                        <div
                          key={debtId}
                          className="card"
                          style={{
                            padding: "12px 16px",
                            minWidth: 260,
                            background: "linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(15, 23, 42, 0.6))",
                            borderColor: "rgba(168, 85, 247, 0.4)",
                          }}
                        >
                          <div className="text-purple-400 text-xs font-semibold mb-1 flex justify-between">
                            <span>20-Year Bond</span>
                            <span>Month {month}</span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                          <div className="text-muted text-xs mt-1">{formatMonths(month)} total payoff target</div>
                        </div>
                      );
                    })}
                </div>
              </div>
              )}
            </div>

            {view === "chart" ? (
              <div className="card">
                <div className="card-header flex justify-between items-center flex-wrap gap-3">
                  <span className="card-title flex items-center gap-2">
                    <BarChart3 size={18} className="text-amber-400" /> Debt Balances Over Time ({filterCategory})
                  </span>
                  {/* Adaptive X-Axis Zoom Presets */}
                  <div className="flex gap-1.5 items-center text-xs">
                    <span className="text-muted font-medium mr-1">X-Axis Zoom:</span>
                    {(
                      [
                        { id: "AUTO", label: `⚡ Auto (Scale to M${maxMonthCutoff})` },
                        { id: "18M", label: "18 Months (Consumer)" },
                        { id: "5Y", label: "5 Years" },
                        { id: "FULL", label: "Full Mortgage" },
                      ] as const
                    ).map((z) => (
                      <button
                        key={z.id}
                        onClick={() => setZoomRange(z.id)}
                        className={`btn btn-xs ${zoomRange === z.id ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "3px 10px", fontSize: 11, borderRadius: "var(--radius-full)" }}
                      >
                        {z.label}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                    <defs>
                      {debtNames.map((name, i) => (
                        <linearGradient key={name} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      tickLine={false}
                      interval={Math.ceil(chartData.length / 12)}
                    />
                    <YAxis
                      tickFormatter={formatYAxis}
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        color: "var(--text-primary)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                      }}
                      formatter={(value: any, name: any) => {
                        const val = Number(value ?? 0);
                        return [
                          val === 0 ? "✓ R0.00 (Cleared)" : formatZAR(val),
                          String(name ?? "")
                        ];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: 16, color: "var(--text-secondary)", fontSize: 13 }}
                    />
                    {debtNames.map((name, i) => (
                      <Area
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={COLORS[i % COLORS.length]}
                        fill={`url(#gradient-${i})`}
                        strokeWidth={2.5}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <span className="card-title flex items-center gap-2">
                    <TableIcon size={18} className="text-amber-400" /> Month-by-Month Breakdown
                  </span>
                  <span className="text-muted text-sm">Showing key progression months</span>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Total Balance</th>
                        {debtNames.map((n) => (
                          <th key={n}>{n}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.timeline
                        .filter((_, i) => i % 3 === 0 || i === data.timeline.length - 1)
                        .map((ms) => (
                          <tr key={ms.month}>
                            <td className="font-semibold text-amber-400">Month {ms.month}</td>
                            <td className="font-bold">{formatZAR(ms.totalRemainingDebt)}</td>
                            {debtNames.map((name) => {
                              const r = ms.results.find((x) => x.debtName === name);
                              return (
                                <td key={name} className={r?.closingBalance === 0 ? "text-emerald-400" : ""}>
                                  {r ? (r.closingBalance === 0 ? "✓ Cleared" : formatZAR(r.closingBalance)) : "-"}
                                </td>
                              );
                            })}
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
    </>
  );
}

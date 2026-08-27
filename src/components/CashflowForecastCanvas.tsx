"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { formatZAR } from "@/lib/formatters";
import { DailyBalancePoint } from "@/engine/cashflowForecast";

interface CashflowForecastCanvasProps {
  dailyPoints: DailyBalancePoint[];
  minimumSafetyBuffer: number;
  height?: number;
}

export default function CashflowForecastCanvas({
  dailyPoints,
  minimumSafetyBuffer,
  height = 420,
}: CashflowForecastCanvasProps) {
  // Downsample to weekly points for smooth 60fps chart rendering
  const chartData = useMemo(() => {
    return dailyPoints
      .filter((_, idx) => idx % 4 === 0 || idx === dailyPoints.length - 1)
      .map((p) => ({
        day: `Day ${p.day}`,
        date: p.date,
        baseline: p.baselineBalance,
        optimistic: p.optimisticBalance,
        pessimistic: p.pessimisticBalance,
        inflow: p.inflow,
        outflow: p.outflow,
        eventNote: p.eventNote,
      }));
  }, [dailyPoints]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "12px",
            padding: "14px 18px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", marginBottom: "4px" }}>
            📅 {data.date} ({label})
          </div>
          <div style={{ fontSize: "18px", fontWeight: "900", color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
            {formatZAR(data.baseline)}
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "11px", marginTop: "6px" }}>
            <span style={{ color: "#34d399" }}>Optimistic: {formatZAR(data.optimistic)}</span>
            <span style={{ color: "#f87171" }}>Stress: {formatZAR(data.pessimistic)}</span>
          </div>
          {data.eventNote && (
            <div style={{ marginTop: "8px", fontSize: "11px", color: "#fbbf24", fontWeight: "700", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "6px" }}>
              ⚡ {data.eventNote}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height, position: "relative" }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastBaselineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="forecastOptimisticGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />

          <XAxis
            dataKey="day"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            interval={6}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `R${(val / 1000).toFixed(0)}k`}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Minimum Safety Buffer Line */}
          <ReferenceLine
            y={minimumSafetyBuffer}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{
              value: `Safety Reserve (R${(minimumSafetyBuffer / 1000).toFixed(0)}k)`,
              fill: "#f59e0b",
              fontSize: 11,
              position: "insideTopRight",
            }}
          />

          {/* Zero Deficit Line */}
          <ReferenceLine y={0} stroke="#ef4444" strokeWidth={1.5} />

          {/* Stress Pessimistic Band */}
          <Line
            type="monotone"
            dataKey="pessimistic"
            stroke="#f87171"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
          />

          {/* Optimistic Band */}
          <Line
            type="monotone"
            dataKey="optimistic"
            stroke="#34d399"
            strokeWidth={1.5}
            dot={false}
          />

          {/* Baseline Forecast Area */}
          <Area
            type="monotone"
            dataKey="baseline"
            stroke="#38bdf8"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#forecastBaselineGrad)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

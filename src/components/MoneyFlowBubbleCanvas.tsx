"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { formatZAR } from "@/lib/formatters";
import { FlowItem } from "./MoneyFlowNetworkCanvas";
import { Sparkles, Info } from "lucide-react";

interface MoneyFlowBubbleCanvasProps {
  flows: FlowItem[];
  selectedFlowId: string | null;
  onSelectFlow: (id: string) => void;
  activeFilter: string;
}

const FLOW_COLORS: Record<string, string> = {
  INCOME: "#22c55e",
  TRANSFER: "#3b82f6",
  DEBT_PAYMENT: "#f4a228",
  CASH_WITHDRAWAL: "#a855f7",
  CASH_SPENDING: "#ec4899",
  INVESTMENT: "#06b6d4",
  OTHER: "#64748b",
};

const FLOW_ICONS: Record<string, string> = {
  INCOME: "↗",
  TRANSFER: "⇄",
  DEBT_PAYMENT: "⬇",
  CASH_WITHDRAWAL: "₹",
  CASH_SPENDING: "💳",
  INVESTMENT: "◆",
  OTHER: "•",
};

interface Bubble {
  id: string;
  label: string;
  amount: number;
  flowType: string;
  flowId: string;
  count: number;
  percentage: number;
  color: string;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function MoneyFlowBubbleCanvas({
  flows,
  selectedFlowId,
  onSelectFlow,
  activeFilter,
}: MoneyFlowBubbleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const bubblesRef = useRef<Bubble[]>([]);
  const [hoveredBubble, setHoveredBubble] = useState<Bubble | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ bubbleId: string | null; offsetX: number; offsetY: number }>({
    bubbleId: null,
    offsetX: 0,
    offsetY: 0,
  });
  const timeRef = useRef(0);

  // Filter flows
  const filteredFlows = useMemo(() => {
    if (activeFilter === "ALL") return flows;
    return flows.filter((f) => {
      if (activeFilter === "INCOME") return f.flowType === "INCOME";
      if (activeFilter === "DEBT") return f.flowType === "DEBT_PAYMENT";
      if (activeFilter === "TRANSFER") return f.flowType === "TRANSFER";
      if (activeFilter === "CASH")
        return f.flowType === "CASH_WITHDRAWAL" || f.flowType === "CASH_SPENDING";
      if (activeFilter === "INVESTMENT") return f.flowType === "INVESTMENT";
      return true;
    });
  }, [flows, activeFilter]);

  const totalVolume = useMemo(
    () => filteredFlows.reduce((s, f) => s + f.amount, 0),
    [filteredFlows]
  );

  // Build bubble data from aggregated destinations
  const bubbleData = useMemo(() => {
function formatBubbleLabel(name: string, type?: string): string {
  if (!name) return type === "CASH_WALLET" ? "Physical Cash Wallet" : "Account";
  if (name === "cash-wallet-primary" || type === "CASH_WALLET") {
    return "Physical Cash Wallet";
  }
  if (/^c[a-z0-9]{20,}$/i.test(name) || name.startsWith("cms")) {
    if (type === "INCOME" || name.includes("salary")) return "Net Salary Inflow";
    return "Primary Account";
  }
  return name;
}

    const map = new Map<
      string,
      { label: string; amount: number; flowType: string; flowId: string; count: number }
    >();
    filteredFlows.forEach((f) => {
      const rawKey = f.destinationRef || f.destinationType || f.id;
      const key = formatBubbleLabel(rawKey, f.destinationType);
      if (!map.has(key)) {
        map.set(key, {
          label: key,
          amount: f.amount,
          flowType: f.flowType,
          flowId: f.id,
          count: 1,
        });
      } else {
        const item = map.get(key)!;
        item.amount += f.amount;
        item.count += 1;
      }
    });

    const items = Array.from(map.values());
    const maxAmount = Math.max(...items.map((i) => i.amount), 1000);

    return items.map((item) => {
      const norm = Math.sqrt(item.amount / maxAmount);
      const radius = Math.max(40, Math.min(90, norm * 90));
      const percentage =
        totalVolume > 0 ? Math.round((item.amount / totalVolume) * 100) : 0;

      return {
        ...item,
        id: item.label,
        radius,
        percentage,
        color: FLOW_COLORS[item.flowType] || "#64748b",
      };
    });
  }, [filteredFlows, totalVolume]);

  // Selected bubble detail
  const activeBubble = useMemo(() => {
    if (!selectedFlowId) return null;
    const selectedFlow = flows.find((f) => f.id === selectedFlowId);
    if (!selectedFlow) return null;
    const key = selectedFlow.destinationRef || selectedFlow.destinationType;
    return bubbleData.find((b) => b.id === key) ?? null;
  }, [selectedFlowId, flows, bubbleData]);

  // Initialize bubble positions in a radial layout
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = 480;
    const cx = w / 2;
    const cy = h / 2;

    bubblesRef.current = bubbleData.map((bd, i) => {
      const angle = (i / bubbleData.length) * Math.PI * 2 - Math.PI / 2;
      const spread = Math.min(w, h) * 0.3;
      const x = cx + Math.cos(angle) * spread * (0.6 + Math.random() * 0.4);
      const y = cy + Math.sin(angle) * spread * (0.6 + Math.random() * 0.4);

      return {
        ...bd,
        x,
        y,
        vx: 0,
        vy: 0,
        targetX: cx + Math.cos(angle) * spread * 0.7,
        targetY: cy + Math.sin(angle) * spread * 0.7,
      };
    });
  }, [bubbleData]);

  // Canvas rendering + physics simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = container.clientWidth;
      const h = 480;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const w = container.clientWidth;
      const h = 480;
      const cx = w / 2;
      const cy = h / 2;
      timeRef.current += 0.016;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);

      // Background radial gradient
      const bgGrad = ctx.createRadialGradient(cx, cy * 0.8, 0, cx, cy, w * 0.6);
      bgGrad.addColorStop(0, "rgba(30, 41, 59, 0.3)");
      bgGrad.addColorStop(0.5, "rgba(15, 23, 42, 0.15)");
      bgGrad.addColorStop(1, "rgba(7, 11, 20, 0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle grid dots
      ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
      for (let gx = 0; gx < w; gx += 40) {
        for (let gy = 0; gy < h; gy += 40) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const bubbles = bubblesRef.current;

      // Physics: gravity towards center + collision avoidance
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        if (dragRef.current.bubbleId === b.id) continue;

        // Gentle gravity towards center
        const dx = cx - b.x;
        const dy = cy - b.y;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        if (distToCenter > 1) {
          b.vx += (dx / distToCenter) * 0.08;
          b.vy += (dy / distToCenter) * 0.08;
        }

        // Collision avoidance with other bubbles
        for (let j = 0; j < bubbles.length; j++) {
          if (i === j) continue;
          const o = bubbles[j];
          const ddx = b.x - o.x;
          const ddy = b.y - o.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          const minDist = b.radius + o.radius + 12; // 12px padding
          if (dist < minDist && dist > 0) {
            const force = (minDist - dist) / dist * 0.5;
            b.vx += ddx * force;
            b.vy += ddy * force;
          }
        }

        // Damping
        b.vx *= 0.92;
        b.vy *= 0.92;

        // Apply velocity
        b.x += b.vx;
        b.y += b.vy;

        // Boundary containment
        const margin = b.radius + 8;
        if (b.x < margin) { b.x = margin; b.vx *= -0.5; }
        if (b.x > w - margin) { b.x = w - margin; b.vx *= -0.5; }
        if (b.y < margin) { b.y = margin; b.vy *= -0.5; }
        if (b.y > h - margin) { b.y = h - margin; b.vy *= -0.5; }
      }

      // Draw connection lines between bubbles (subtle web)
      ctx.lineWidth = 0.5;
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const a = bubbles[i];
          const b = bubbles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 280;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.08;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw each bubble
      for (const b of bubbles) {
        const isSelected =
          activeBubble?.id === b.id;
        const isHovered = hoveredBubble?.id === b.id;
        const pulse = Math.sin(t * 2 + bubbles.indexOf(b) * 0.7) * 0.03;
        const r = b.radius * (1 + (isHovered ? 0.06 : 0) + (isSelected ? 0.04 : 0) + pulse);

        // Outer glow
        if (isSelected) {
          const glow = ctx.createRadialGradient(b.x, b.y, r * 0.8, b.x, b.y, r * 1.6);
          glow.addColorStop(0, hexToRgba("#f59e0b", 0.25));
          glow.addColorStop(1, hexToRgba("#f59e0b", 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(b.x, b.y, r * 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else if (isHovered) {
          const glow = ctx.createRadialGradient(b.x, b.y, r * 0.8, b.x, b.y, r * 1.4);
          glow.addColorStop(0, hexToRgba(b.color, 0.15));
          glow.addColorStop(1, hexToRgba(b.color, 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(b.x, b.y, r * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Main bubble body — multi-layered radial gradient
        const grad = ctx.createRadialGradient(
          b.x - r * 0.25,
          b.y - r * 0.3,
          r * 0.1,
          b.x,
          b.y,
          r
        );
        grad.addColorStop(0, hexToRgba(b.color, 0.45));
        grad.addColorStop(0.4, hexToRgba(b.color, 0.2));
        grad.addColorStop(0.75, hexToRgba(b.color, 0.08));
        grad.addColorStop(1, "rgba(7, 11, 20, 0.85)");

        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Border ring
        ctx.strokeStyle = isSelected
          ? hexToRgba("#f59e0b", 0.8)
          : isHovered
          ? hexToRgba(b.color, 0.6)
          : hexToRgba(b.color, 0.25);
        ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1;
        ctx.stroke();

        // Glass reflection highlight (top-left crescent)
        const reflGrad = ctx.createRadialGradient(
          b.x - r * 0.3,
          b.y - r * 0.35,
          r * 0.05,
          b.x - r * 0.15,
          b.y - r * 0.2,
          r * 0.6
        );
        reflGrad.addColorStop(0, "rgba(255, 255, 255, 0.12)");
        reflGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.beginPath();
        ctx.arc(b.x, b.y, r * 0.95, 0, Math.PI * 2);
        ctx.fillStyle = reflGrad;
        ctx.fill();

        // Icon / glyph
        const icon = FLOW_ICONS[b.flowType] || "•";
        ctx.fillStyle = hexToRgba(b.color, 0.7);
        ctx.font = `${Math.max(14, r * 0.28)}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(icon, b.x, b.y - r * 0.22);

        // Label text
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = `600 ${Math.max(10, r * 0.18)}px 'Inter', system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label =
          b.label.length > 14 ? b.label.slice(0, 12) + "…" : b.label;
        ctx.fillText(label, b.x, b.y + r * 0.05);

        // Amount
        ctx.fillStyle = b.color;
        ctx.font = `800 ${Math.max(10, r * 0.2)}px 'JetBrains Mono', 'SF Mono', monospace`;
        ctx.fillText(formatZAR(b.amount), b.x, b.y + r * 0.3);

        // Percentage badge
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.font = `600 ${Math.max(8, r * 0.14)}px 'Inter', system-ui, sans-serif`;
        ctx.fillText(`${b.percentage}%`, b.x, b.y + r * 0.52);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [bubbleData, activeBubble, hoveredBubble]);

  // Mouse interaction handlers
  const findBubbleAt = useCallback(
    (mx: number, my: number): Bubble | null => {
      const bubbles = bubblesRef.current;
      // Iterate in reverse to pick top-most first
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        const dx = mx - b.x;
        const dy = my - b.y;
        if (dx * dx + dy * dy <= b.radius * b.radius) return b;
      }
      return null;
    },
    []
  );

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      const b = findBubbleAt(x, y);
      if (b) {
        dragRef.current = { bubbleId: b.id, offsetX: x - b.x, offsetY: y - b.y };
        onSelectFlow(b.flowId);
      }
    },
    [findBubbleAt, getCanvasCoords, onSelectFlow]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);

      if (dragRef.current.bubbleId) {
        const b = bubblesRef.current.find((b) => b.id === dragRef.current.bubbleId);
        if (b) {
          b.x = x - dragRef.current.offsetX;
          b.y = y - dragRef.current.offsetY;
          b.vx = 0;
          b.vy = 0;
        }
        return;
      }

      const b = findBubbleAt(x, y);
      setHoveredBubble(b);
      setTooltipPos({ x, y });

      if (canvasRef.current) {
        canvasRef.current.style.cursor = b ? "grab" : "default";
      }
    },
    [findBubbleAt, getCanvasCoords]
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = { bubbleId: null, offsetX: 0, offsetY: 0 };
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredBubble(null);
    dragRef.current = { bubbleId: null, offsetX: 0, offsetY: 0 };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: "20px",
        border: "1px solid var(--border)",
        background:
          "radial-gradient(ellipse at 50% 30%, rgba(30, 41, 59, 0.35) 0%, rgba(7, 11, 20, 0.98) 100%)",
        overflow: "hidden",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Sparkles size={16} style={{ color: "var(--gold)" }} />
          <span>
            Force-Directed Capital Orbs ({bubbleData.length} Destinations)
          </span>
        </div>
        <div
          style={{
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
          }}
        >
          Total Volume:{" "}
          <strong style={{ color: "var(--gold-light)" }}>
            {formatZAR(totalVolume)}
          </strong>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            display: "block",
            width: "100%",
            height: "480px",
          }}
        />

        {/* Hover Tooltip */}
        {hoveredBubble && !dragRef.current.bubbleId && (
          <div
            style={{
              position: "absolute",
              left: tooltipPos.x + 16,
              top: tooltipPos.y - 10,
              background: "rgba(7, 11, 20, 0.95)",
              backdropFilter: "blur(16px)",
              border: `1px solid ${hoveredBubble.color}55`,
              borderRadius: "12px",
              padding: "12px 16px",
              pointerEvents: "none",
              zIndex: 50,
              minWidth: "180px",
              boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px ${hexToRgba(hoveredBubble.color, 0.15)}`,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: hoveredBubble.color,
                  boxShadow: `0 0 8px ${hoveredBubble.color}`,
                }}
              />
              {hoveredBubble.label}
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 900,
                color: hoveredBubble.color,
                fontFamily: "var(--font-mono)",
                marginBottom: "4px",
              }}
            >
              {formatZAR(hoveredBubble.amount)}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              <span style={{ color: hoveredBubble.color, fontWeight: 700 }}>
                {hoveredBubble.flowType}
              </span>{" "}
              • {hoveredBubble.percentage}% of total flow •{" "}
              {hoveredBubble.count} transaction{hoveredBubble.count > 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Selected Orb Inspector Drawer */}
      <div
        style={{
          padding: "16px 24px",
          borderTop: "1px solid rgba(255, 255, 255, 0.04)",
          minHeight: "60px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {activeBubble ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: hexToRgba(activeBubble.color, 0.15),
                  border: `1px solid ${hexToRgba(activeBubble.color, 0.4)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Info size={18} style={{ color: activeBubble.color }} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  {activeBubble.label}
                </div>
                <div
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                >
                  <strong style={{ color: activeBubble.color }}>
                    {activeBubble.flowType}
                  </strong>{" "}
                  • Absorbs{" "}
                  <strong style={{ color: "var(--gold-light)" }}>
                    {activeBubble.percentage}%
                  </strong>{" "}
                  of total cashflow volume
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  color: activeBubble.color,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {formatZAR(activeBubble.amount)}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#4ade80",
                  fontWeight: 700,
                }}
              >
                100% Reconciled
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              width: "100%",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            Click any capital orb to inspect its flow details. Drag to
            rearrange.
          </div>
        )}
      </div>
    </div>
  );
}

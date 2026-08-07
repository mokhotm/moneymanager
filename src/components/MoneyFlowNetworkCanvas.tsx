"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { formatZAR } from "@/lib/formatters";
import {
  Landmark,
  Wallet,
  TrendingUp,
  CreditCard,
  Building,
  Receipt,
  Sparkles,
  Zap,
  RotateCcw,
  Move,
} from "lucide-react";

export interface FlowItem {
  id: string;
  parentFlowId: string | null;
  sourceType: string;
  sourceRef: string | null;
  destinationType: string;
  destinationRef: string | null;
  amount: number;
  flowType: string;
  status: string;
}

interface MoneyFlowNetworkCanvasProps {
  flows: FlowItem[];
  selectedFlowId: string | null;
  onSelectFlow: (id: string) => void;
  activeFilter: string;
  zoomLevel: number;
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

interface GraphNode {
  id: string;
  label: string;
  type: string;
  layer: number;
  amount: number;
  x: number;
  y: number;
  iconName: string;
}

interface GraphEdge {
  id: string;
  flow: FlowItem;
  sourceNodeId: string;
  targetNodeId: string;
  color: string;
  amount: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function MoneyFlowNetworkCanvas({
  flows,
  selectedFlowId,
  onSelectFlow,
  activeFilter,
  zoomLevel,
}: MoneyFlowNetworkCanvasProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Dragging state for custom node positions
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartPos = useRef<{ mouseX: number; mouseY: number; nodeX: number; nodeY: number }>({
    mouseX: 0,
    mouseY: 0,
    nodeX: 0,
    nodeY: 0,
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Filter flows
  const filteredFlows = useMemo(() => {
    if (activeFilter === "ALL") return flows;
    return flows.filter((f) => {
      if (activeFilter === "INCOME") return f.flowType === "INCOME";
      if (activeFilter === "DEBT") return f.flowType === "DEBT_PAYMENT";
      if (activeFilter === "TRANSFER") return f.flowType === "TRANSFER";
      if (activeFilter === "CASH") return f.flowType === "CASH_WITHDRAWAL" || f.flowType === "CASH_SPENDING";
      if (activeFilter === "INVESTMENT") return f.flowType === "INVESTMENT";
      return true;
    });
  }, [flows, activeFilter]);

  // Construct DAG layout with custom position overrides and uniform node dimensions
  const { nodes, edges, width, height } = useMemo(() => {
    const nodeMap = new Map<string, { label: string; type: string; layer: number; amount: number }>();

    filteredFlows.forEach((f) => {
      const srcName = f.sourceRef || f.sourceType || "External Source";
      const dstName = f.destinationRef || f.destinationType || "External Endpoint";

      if (!nodeMap.has(srcName)) {
        let layer = 1;
        let type = "ACCOUNT";
        if (f.flowType === "INCOME" || f.sourceType === "EXTERNAL") {
          layer = 0;
          type = "INFLOW";
        }
        nodeMap.set(srcName, { label: srcName, type, layer, amount: 0 });
      }

      if (!nodeMap.has(dstName)) {
        let layer = 3;
        let type = "TERMINAL";
        if (f.destinationType === "ACCOUNT" || f.destinationType === "CASH_WALLET") {
          layer = 1;
          type = "ACCOUNT";
        } else if (f.flowType === "TRANSFER" || f.flowType === "INVESTMENT") {
          layer = 2;
          type = "ALLOCATION";
        }
        nodeMap.set(dstName, { label: dstName, type, layer, amount: 0 });
      }

      const srcNode = nodeMap.get(srcName)!;
      const dstNode = nodeMap.get(dstName)!;
      srcNode.amount += f.amount;
      dstNode.amount += f.amount;
    });

    // Group nodes into 4 layers
    const layerNodes: Array<Array<{ label: string; type: string; layer: number; amount: number; id: string }>> = [
      [],
      [],
      [],
      [],
    ];

    nodeMap.forEach((data, id) => {
      const targetLayer = Math.min(3, Math.max(0, data.layer));
      layerNodes[targetLayer].push({ ...data, id });
    });

    const canvasWidth = 1200;
    const paddingX = 150;
    const availableWidth = canvasWidth - paddingX * 2;
    const layerSpacingX = availableWidth / 3;

    const maxInLayer = Math.max(...layerNodes.map((l) => l.length), 1);
    const nodeHeightStep = 72;
    const canvasHeight = Math.max(540, maxInLayer * nodeHeightStep + 120);

    const calculatedNodes: GraphNode[] = [];

    layerNodes.forEach((nodesInLayer, layerIndex) => {
      const count = nodesInLayer.length;
      const totalH = count * nodeHeightStep;
      const startY = (canvasHeight - totalH) / 2 + nodeHeightStep / 2;

      nodesInLayer.forEach((n, idx) => {
        const defaultX = paddingX + layerIndex * layerSpacingX;
        const defaultY = startY + idx * nodeHeightStep;

        const posX = customPositions[n.id]?.x ?? defaultX;
        const posY = customPositions[n.id]?.y ?? defaultY;

        let iconName = "landmark";
        const lbl = n.label.toLowerCase();
        if (lbl.includes("salary") || lbl.includes("income") || lbl.includes("sars")) iconName = "trending-up";
        else if (lbl.includes("cash") || lbl.includes("wallet")) iconName = "wallet";
        else if (lbl.includes("card") || lbl.includes("credit") || lbl.includes("loan")) iconName = "credit-card";
        else if (lbl.includes("home") || lbl.includes("bond") || lbl.includes("mortgage")) iconName = "building";
        else if (lbl.includes("spending") || lbl.includes("groceries") || lbl.includes("fees")) iconName = "receipt";
        else if (lbl.includes("savings") || lbl.includes("etf") || lbl.includes("invest")) iconName = "sparkles";

        calculatedNodes.push({
          id: n.id,
          label: n.label,
          type: n.type,
          layer: layerIndex,
          amount: n.amount,
          x: posX,
          y: posY,
          iconName,
        });
      });
    });

    const nodePosMap = new Map<string, GraphNode>();
    calculatedNodes.forEach((n) => nodePosMap.set(n.id, n));

    const calculatedEdges: GraphEdge[] = [];
    filteredFlows.forEach((f) => {
      const srcName = f.sourceRef || f.sourceType || "External Source";
      const dstName = f.destinationRef || f.destinationType || "External Endpoint";

      const srcNode = nodePosMap.get(srcName);
      const dstNode = nodePosMap.get(dstName);

      if (srcNode && dstNode) {
        calculatedEdges.push({
          id: f.id,
          flow: f,
          sourceNodeId: srcNode.id,
          targetNodeId: dstNode.id,
          color: FLOW_COLORS[f.flowType] || "#64748b",
          amount: f.amount,
          x1: srcNode.x + 105, // Exactly right-center edge of 210px capsule
          y1: srcNode.y,
          x2: dstNode.x - 105, // Exactly left-center edge of 210px capsule
          y2: dstNode.y,
        });
      }
    });

    return {
      nodes: calculatedNodes,
      edges: calculatedEdges,
      width: canvasWidth,
      height: canvasHeight,
    };
  }, [filteredFlows, customPositions]);

  // Drag Handlers for 360° unconstrained node movement
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    setDraggingNodeId(node.id);
    dragStartPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingNodeId) return;

      const deltaX = (e.clientX - dragStartPos.current.mouseX) / zoomLevel;
      const deltaY = (e.clientY - dragStartPos.current.mouseY) / zoomLevel;

      const newX = Math.max(80, Math.min(width - 80, dragStartPos.current.nodeX + deltaX));
      const newY = Math.max(40, Math.min(height - 40, dragStartPos.current.nodeY + deltaY));

      setCustomPositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: newX, y: newY },
      }));
    },
    [draggingNodeId, zoomLevel, width, height]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingNodeId(null);
  }, []);

  const activeFlow = useMemo(() => {
    if (!selectedFlowId) return null;
    return flows.find((f) => f.id === selectedFlowId) ?? null;
  }, [selectedFlowId, flows]);

  const activeNodesSet = useMemo(() => {
    const set = new Set<string>();
    if (!activeFlow) return set;
    const srcName = activeFlow.sourceRef || activeFlow.sourceType;
    const dstName = activeFlow.destinationRef || activeFlow.destinationType;
    if (srcName) set.add(srcName);
    if (dstName) set.add(dstName);
    return set;
  }, [activeFlow]);

  return (
    <div
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: "relative",
        width: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        borderRadius: "20px",
        border: "1px solid var(--border)",
        background: "radial-gradient(ellipse at 50% 20%, rgba(17, 24, 39, 0.98) 0%, rgba(7, 11, 20, 0.98) 100%)",
        padding: "16px",
        cursor: draggingNodeId ? "grabbing" : "default",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${zoomLevel})`,
          transformOrigin: "top left",
          transition: draggingNodeId ? "none" : "transform 0.3s ease",
        }}
      >
        <svg
          width={width}
          height={height}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}
        >
          <defs>
            <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Bezier Flow Edges */}
          {edges.map((edge) => {
            const isSelected = edge.id === selectedFlowId;
            const isHovered = edge.id === hoveredEdgeId;
            const isConnected = activeNodesSet.has(edge.sourceNodeId) || activeNodesSet.has(edge.targetNodeId);

            const dx = Math.abs(edge.x2 - edge.x1) * 0.45;
            const pathD = `M ${edge.x1} ${edge.y1} C ${edge.x1 + dx} ${edge.y1}, ${edge.x2 - dx} ${edge.y2}, ${edge.x2} ${edge.y2}`;

            const strokeWidth = isSelected ? 4 : isHovered ? 3.5 : Math.max(1.5, Math.min(4.5, Math.log10(edge.amount) * 0.8));
            const opacity = isSelected || isHovered || isConnected ? 0.95 : selectedFlowId ? 0.2 : 0.65;

            return (
              <g key={edge.id} style={{ pointerEvents: "auto", cursor: "pointer" }}>
                {isSelected && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={edge.color}
                    strokeWidth={strokeWidth + 6}
                    strokeOpacity={0.35}
                    filter="url(#glow-amber)"
                  />
                )}

                <path
                  d={pathD}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  strokeDasharray={isSelected ? "6, 4" : "none"}
                  onClick={() => onSelectFlow(edge.id)}
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                />

                {(isSelected || isHovered || opacity > 0.5) && (
                  <circle r={isSelected ? 4 : 3} fill={edge.color}>
                    <animateMotion
                      path={pathD}
                      dur={`${Math.max(2, 6 - Math.log10(edge.amount))}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Uniform 210px x 52px Apple Glassmorphic Node Capsules */}
        {nodes.map((node) => {
          const isSelected = activeNodesSet.has(node.id);
          const isHovered = hoveredNodeId === node.id;
          const isDragging = draggingNodeId === node.id;
          const isDimmed = selectedFlowId !== null && !isSelected;

          let badgeBg = "rgba(59, 130, 246, 0.15)";
          let badgeBorder = "rgba(59, 130, 246, 0.4)";
          let textColor = "#60a5fa";
          let iconColor = "#3b82f6";

          if (node.layer === 0) {
            badgeBg = "rgba(34, 197, 94, 0.15)";
            badgeBorder = "rgba(34, 197, 94, 0.5)";
            textColor = "#4ade80";
            iconColor = "#22c55e";
          } else if (node.type === "ALLOCATION") {
            badgeBg = "rgba(6, 182, 212, 0.15)";
            badgeBorder = "rgba(6, 182, 212, 0.5)";
            textColor = "#22d3ee";
            iconColor = "#06b6d4";
          } else if (node.type === "TERMINAL") {
            badgeBg = "rgba(244, 162, 40, 0.15)";
            badgeBorder = "rgba(244, 162, 40, 0.5)";
            textColor = "#fbbf24";
            iconColor = "#f4a228";
          }

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onClick={() => {
                const matchingFlow = flows.find(
                  (f) =>
                    (f.sourceRef || f.sourceType) === node.id ||
                    (f.destinationRef || f.destinationType) === node.id
                );
                if (matchingFlow) onSelectFlow(matchingFlow.id);
              }}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              style={{
                position: "absolute",
                left: `${node.x}px`,
                top: `${node.y}px`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 14px",
                width: "210px",
                height: "52px",
                borderRadius: "14px",
                border: isDragging
                  ? "2px solid #38bdf8"
                  : isSelected
                  ? "2px solid #f4a228"
                  : `1px solid ${badgeBorder}`,
                background: isDragging
                  ? "rgba(14, 165, 233, 0.25)"
                  : isHovered
                  ? "rgba(30, 41, 59, 0.95)"
                  : isSelected
                  ? "rgba(30, 41, 59, 0.9)"
                  : "rgba(13, 20, 36, 0.92)",
                boxShadow: isDragging
                  ? "0 0 30px rgba(56, 189, 248, 0.6)"
                  : isSelected
                  ? "0 0 25px rgba(244, 162, 40, 0.4)"
                  : "0 8px 20px rgba(0,0,0,0.5)",
                backdropFilter: "blur(20px)",
                opacity: isDimmed ? 0.35 : 1,
                cursor: isDragging ? "grabbing" : "grab",
                userSelect: "none",
                transition: isDragging ? "none" : "all 0.2s ease",
                zIndex: isDragging ? 50 : isSelected ? 30 : 10,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: badgeBg,
                  border: `1px solid ${badgeBorder}`,
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                {node.iconName === "trending-up" && <TrendingUp size={18} style={{ color: iconColor }} />}
                {node.iconName === "wallet" && <Wallet size={18} style={{ color: iconColor }} />}
                {node.iconName === "credit-card" && <CreditCard size={18} style={{ color: iconColor }} />}
                {node.iconName === "building" && <Building size={18} style={{ color: iconColor }} />}
                {node.iconName === "receipt" && <Receipt size={18} style={{ color: iconColor }} />}
                {node.iconName === "sparkles" && <Sparkles size={18} style={{ color: iconColor }} />}
                {node.iconName === "landmark" && <Landmark size={18} style={{ color: iconColor }} />}

                {isSelected && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-2px",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#f59e0b",
                      boxShadow: "0 0 8px #f59e0b",
                    }}
                  />
                )}
              </div>

              <div style={{ overflow: "hidden", textAlign: "left", flex: 1 }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "135px",
                  }}
                  title={node.label}
                >
                  {node.label}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: textColor, fontFamily: "var(--font-mono)" }}>
                  {formatZAR(node.amount)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Canvas Layer Markers & Reset Control */}
      <div style={{ marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "12px", fontSize: "12px", color: "var(--text-muted)", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#4ade80", fontWeight: 600 }}>
            ● Layer 1: Inflows
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#60a5fa", fontWeight: 600 }}>
            ● Layer 2: Core Accounts
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#22d3ee", fontWeight: 600 }}>
            ● Layer 3: Allocations
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fbbf24", fontWeight: 600 }}>
            ● Layer 4: End Terminals
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
          {Object.keys(customPositions).length > 0 && (
            <button
              onClick={() => setCustomPositions({})}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "99px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "#fbbf24",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <RotateCcw size={13} /> Reset Node Positions
            </button>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
            <Move size={14} style={{ color: "var(--gold)" }} /> Drag nodes 360° anywhere • Bezier curves auto-adjust
          </span>
        </div>
      </div>
    </div>
  );
}

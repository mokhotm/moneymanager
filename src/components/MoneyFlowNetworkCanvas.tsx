"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
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
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Target,
  Layers,
  Eye,
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
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
  isExpandedExternal?: boolean;
  onToggleExpandExternal?: () => void;
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

function formatDisplayLabel(name: string, type?: string, flowType?: string): string {
  if (!name) return type === "CASH_WALLET" ? "Physical Cash Wallet" : "Primary Account";
  
  const lower = name.toLowerCase();

  // Cash Wallet
  if (type === "CASH_WALLET" || lower.includes("cash-wallet") || lower.includes("physical cash")) {
    return "Physical Cash Wallet";
  }

  // Salary Inflow
  if (type === "INFLOW" || flowType === "INCOME" || lower.includes("salary") || lower.includes("inflow")) {
    return name.includes("SARS") ? "SARS Net Salary Inflow" : "Net Salary Inflow";
  }

  return name;
}

export function MoneyFlowNetworkCanvas({
  flows,
  selectedFlowId,
  onSelectFlow,
  activeFilter,
  zoomLevel: externalZoom,
  onZoomChange,
  isExpandedExternal,
  onToggleExpandExternal,
}: MoneyFlowNetworkCanvasProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Local Expand State fallback
  const [localExpanded, setLocalExpanded] = useState(false);
  const isExpanded = isExpandedExternal !== undefined ? isExpandedExternal : localExpanded;
  const toggleExpand = onToggleExpandExternal || (() => setLocalExpanded((e) => !e));

  // Dragging state for custom node positions & canvas viewport panning
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartPos = useRef<{ mouseX: number; mouseY: number; nodeX: number; nodeY: number }>({
    mouseX: 0,
    mouseY: 0,
    nodeX: 0,
    nodeY: 0,
  });

  // Canvas Viewport Panning & Scale State
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [internalScale, setInternalScale] = useState(1.0);
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const canvasPanStart = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number }>({
    mouseX: 0,
    mouseY: 0,
    panX: 0,
    panY: 0,
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const effectiveZoom = externalZoom !== undefined ? externalZoom * internalScale : internalScale;

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

  // Construct DAG layout with consolidated nodes and accurate pay-cycle amounts
  const { nodes, edges, width, height } = useMemo(() => {
    const nodeMap = new Map<
      string,
      { label: string; type: string; layer: number; amount: number; inAmount: number; outAmount: number }
    >();

    filteredFlows.forEach((f) => {
      const srcName = formatDisplayLabel(f.sourceRef || f.sourceType || "External Source", f.sourceType, f.flowType);
      const dstName = formatDisplayLabel(f.destinationRef || f.destinationType || "External Endpoint", f.destinationType, f.flowType);

      if (!nodeMap.has(srcName)) {
        let layer = 1;
        let type = "ACCOUNT";
        if (f.flowType === "INCOME" || f.sourceType === "EXTERNAL" || srcName === "SARS Net Salary Inflow") {
          layer = 0;
          type = "INFLOW";
        }
        nodeMap.set(srcName, { label: srcName, type, layer, amount: 0, inAmount: 0, outAmount: 0 });
      }

      if (!nodeMap.has(dstName)) {
        let layer = 3;
        let type = "TERMINAL";
        if (
          dstName === "Prestige Current Account (XXXX4469)" ||
          dstName === "Physical Cash Wallet" ||
          dstName.includes("Credit Card")
        ) {
          layer = 1;
          type = "ACCOUNT";
        } else if (f.flowType === "TRANSFER" || f.flowType === "INVESTMENT") {
          layer = 2;
          type = "ALLOCATION";
        }
        nodeMap.set(dstName, { label: dstName, type, layer, amount: 0, inAmount: 0, outAmount: 0 });
      }

      const srcNode = nodeMap.get(srcName)!;
      const dstNode = nodeMap.get(dstName)!;
      srcNode.outAmount += f.amount;
      dstNode.inAmount += f.amount;
    });

    // Determine clean, unambiguous amount for each node
    nodeMap.forEach((n) => {
      if (n.layer === 0) {
        n.amount = n.outAmount; // Inflows generated
      } else if (n.layer === 3 || n.layer === 2) {
        n.amount = n.inAmount; // Spend/allocation received
      } else {
        // Core account: show total inflow deposited (e.g. R71k salary) or total routed through it
        n.amount = n.inAmount > 0 ? n.inAmount : n.outAmount;
      }
    });

    // Group nodes into 4 distinct DAG layers
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
    const paddingX = 140;
    const availableWidth = canvasWidth - paddingX * 2;
    const layerSpacingX = availableWidth / 3;

    const maxInLayer = Math.max(...layerNodes.map((l) => l.length), 1);
    const nodeHeightStep = 68;
    const canvasHeight = Math.max(540, maxInLayer * nodeHeightStep + 100);

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
        else if (lbl.includes("spending") || lbl.includes("groceries") || lbl.includes("fees") || lbl.includes("wage")) iconName = "receipt";
        else if (lbl.includes("savings") || lbl.includes("etf") || lbl.includes("invest") || lbl.includes("trust")) iconName = "sparkles";

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
      const srcName = formatDisplayLabel(f.sourceRef || f.sourceType || "External Source", f.sourceType, f.flowType);
      const dstName = formatDisplayLabel(f.destinationRef || f.destinationType || "External Endpoint", f.destinationType, f.flowType);

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
          x1: srcNode.x + 105, // Right edge of 210px capsule
          y1: srcNode.y,
          x2: dstNode.x - 105, // Left edge of 210px capsule
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

  // Auto-Fit Function: Automatically scales and centers ALL nodes into the viewport
  const fitToView = useCallback(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    const containerRect = canvasRef.current.getBoundingClientRect();
    const containerW = containerRect.width || 1100;
    const containerH = isExpanded ? Math.max(760, height + 40) : (containerRect.height || 600);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach((n) => {
      minX = Math.min(minX, n.x - 110);
      maxX = Math.max(maxX, n.x + 110);
      minY = Math.min(minY, n.y - 32);
      maxY = Math.max(maxY, n.y + 32);
    });

    const graphW = Math.max(maxX - minX + 60, 400);
    const graphH = Math.max(maxY - minY + 60, 300);

    const scaleX = (containerW - 60) / graphW;
    const scaleY = (containerH - 60) / graphH;
    const optimalScale = Math.min(1.0, Math.max(0.48, Math.min(scaleX, scaleY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const panX = containerW / 2 - centerX * optimalScale;
    const panY = containerH / 2 - centerY * optimalScale;

    setPan({ x: panX, y: panY });
    setInternalScale(optimalScale);
  }, [nodes, height, isExpanded]);

  // Trigger auto-fit whenever nodes, filter, or expanded state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToView();
    }, 60);
    return () => clearTimeout(timer);
  }, [activeFilter, isExpanded, flows.length]);

  // Canvas Mouse Down: Start Canvas Panning when clicking background
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (draggingNodeId) return;
      setIsPanningCanvas(true);
      canvasPanStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [draggingNodeId, pan]
  );

  // Drag Handlers for 360° unconstrained node movement & canvas panning
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
      if (draggingNodeId) {
        const deltaX = (e.clientX - dragStartPos.current.mouseX) / effectiveZoom;
        const deltaY = (e.clientY - dragStartPos.current.mouseY) / effectiveZoom;

        const newX = dragStartPos.current.nodeX + deltaX;
        const newY = dragStartPos.current.nodeY + deltaY;

        setCustomPositions((prev) => ({
          ...prev,
          [draggingNodeId]: { x: newX, y: newY },
        }));
      } else if (isPanningCanvas) {
        const deltaX = e.clientX - canvasPanStart.current.mouseX;
        const deltaY = e.clientY - canvasPanStart.current.mouseY;

        setPan({
          x: canvasPanStart.current.panX + deltaX,
          y: canvasPanStart.current.panY + deltaY,
        });
      }
    },
    [draggingNodeId, isPanningCanvas, effectiveZoom]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingNodeId(null);
    setIsPanningCanvas(false);
  }, []);

  // Mouse wheel zoom attached via non-passive listener to prevent browser warnings
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setInternalScale((prev) => Math.min(1.8, Math.max(0.4, prev * zoomFactor)));
    };

    el.addEventListener("wheel", onWheelHandler, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheelHandler);
    };
  }, []);

  const resetView = useCallback(() => {
    setCustomPositions({});
    fitToView();
  }, [fitToView]);

  const activeFlow = useMemo(() => {
    if (!selectedFlowId) return null;
    return flows.find((f) => f.id === selectedFlowId) ?? null;
  }, [selectedFlowId, flows]);

  const activeNodesSet = useMemo(() => {
    const set = new Set<string>();
    if (!activeFlow) return set;
    const srcName = formatDisplayLabel(activeFlow.sourceRef || activeFlow.sourceType, activeFlow.sourceType, activeFlow.flowType);
    const dstName = formatDisplayLabel(activeFlow.destinationRef || activeFlow.destinationType, activeFlow.destinationType, activeFlow.flowType);
    if (srcName) set.add(srcName);
    if (dstName) set.add(dstName);
    return set;
  }, [activeFlow]);

  // Determine dynamic container height
  const containerHeight = isExpanded ? Math.max(760, height + 40) : "600px";

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: "relative",
        width: "100%",
        height: typeof containerHeight === "number" ? `${containerHeight}px` : containerHeight,
        overflow: "hidden",
        borderBottomLeftRadius: "24px",
        borderBottomRightRadius: "24px",
        border: "none",
        background: "radial-gradient(ellipse at 50% 25%, rgba(17, 24, 39, 0.98) 0%, rgba(7, 11, 20, 0.99) 100%)",
        padding: 0,
        margin: 0,
        isolation: "isolate",
        WebkitMaskImage: "-webkit-radial-gradient(white, black)",
        cursor: draggingNodeId || isPanningCanvas ? "grabbing" : "grab",
        userSelect: "none",
        transition: "height 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Floating Canvas Control Overlay (Top Right) */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          zIndex: 60,
          background: "rgba(10, 16, 30, 0.88)",
          padding: "6px 12px",
          borderRadius: "99px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={fitToView}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "99px",
            padding: "4px 10px",
            color: "#38bdf8",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
          title="Auto-Fit all neural network nodes into view"
        >
          <Target size={13} />
          <span>Fit View</span>
        </button>

        <button
          onClick={toggleExpand}
          style={{
            background: isExpanded ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.08)",
            border: isExpanded ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "99px",
            padding: "4px 10px",
            color: isExpanded ? "#fbbf24" : "#e2e8f0",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
          title={isExpanded ? "Collapse Canvas View" : "Expand Canvas to full height"}
        >
          {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{isExpanded ? "Collapse View" : "Expand View"}</span>
        </button>

        <div style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.15)" }} />

        <button
          onClick={() => setInternalScale((s) => Math.max(0.4, s - 0.12))}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
          }}
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>

        <span
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono, monospace)",
            color: "#cbd5e1",
            minWidth: "36px",
            textAlign: "center",
            fontWeight: 700,
          }}
        >
          {Math.round(effectiveZoom * 100)}%
        </span>

        <button
          onClick={() => setInternalScale((s) => Math.min(1.8, s + 0.12))}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
          }}
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>

        <button
          onClick={resetView}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
          }}
          title="Reset View & Node Drags"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Pan & Zoom Transform Layer */}
      <div
        style={{
          position: "relative",
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveZoom})`,
          transformOrigin: "0 0",
          transition: draggingNodeId || isPanningCanvas ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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
            <filter id="glow-flow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
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
                  <circle r={isSelected ? 4 : 3} fill={edge.color} filter="url(#glow-flow)">
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
                    formatDisplayLabel(f.sourceRef || f.sourceType, f.sourceType, f.flowType) === node.id ||
                    formatDisplayLabel(f.destinationRef || f.destinationType, f.destinationType, f.flowType) === node.id
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
                <div style={{ fontSize: "12px", fontWeight: 800, color: textColor, fontFamily: "var(--font-mono, monospace)" }}>
                  {formatZAR(node.amount)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Canvas Legend & Instructions */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "20px",
          right: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "#94a3b8",
          flexWrap: "wrap",
          gap: "12px",
          background: "rgba(10, 16, 30, 0.88)",
          padding: "8px 16px",
          borderRadius: "14px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(12px)",
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
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

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          <Move size={13} style={{ color: "#f59e0b" }} />
          <span>Click &amp; drag canvas to pan • Drag nodes to customize • Scroll to zoom</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useRef } from "react";
import {
  MapPin,
  Navigation,
  Compass,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  ShoppingBag,
  Zap,
  Building2,
  Car,
  Utensils,
} from "lucide-react";
import { formatZAR } from "@/lib/formatters";

export interface SpendingLocation {
  id: string;
  merchant: string;
  locationName: string;
  address?: string;
  lat: number;
  lng: number;
  amount: number;
  category: string;
  date: string;
  city: string;
}

interface SpendingLocationMapProps {
  locations?: SpendingLocation[];
}

export function SpendingLocationMap({ locations = [] }: SpendingLocationMapProps) {
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeLocation, setActiveLocation] = useState<SpendingLocation | null>(null);

  // Zoom & Pan Interactive State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const filtered = locations.filter((loc) => {
    if (selectedCity !== "ALL" && loc.city !== selectedCity) return false;
    if (selectedCategory !== "ALL" && loc.category !== selectedCategory) return false;
    return true;
  });

  const cities = ["ALL", "Johannesburg", "Pretoria", "Cape Town", "Durban"];
  const categories = [
    "ALL",
    "Groceries & Household",
    "Municipal Utilities",
    "Tech & Equipment",
    "Fuel & Transport",
    "Dining & Social",
  ];

  // RSA Geographic Bounds mapping to Canvas 0-100%
  const minLat = -34.8;
  const maxLat = -24.5;
  const minLng = 16.5;
  const maxLng = 33.0;

  const getCanvasCoords = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
    return {
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(12, Math.min(88, y)),
    };
  };

  const totalMapSpending = filtered.reduce((s, l) => s + l.amount, 0);

  // Zoom Controls
  const handleZoomIn = () => setZoom((z) => Math.min(Number((z + 0.35).toFixed(2)), 4.0));
  const handleZoomOut = () => setZoom((z) => Math.max(Number((z - 0.35).toFixed(2)), 0.8));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Drag & Pan Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if left click
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom((z) => Math.min(Math.max(Number((z + delta).toFixed(2)), 0.8), 4.0));
  };

  const getPillButtonStyle = (isActive: boolean) => ({
    padding: "6px 14px",
    borderRadius: "99px",
    fontSize: "11px",
    fontWeight: isActive ? 700 : 600,
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    border: isActive ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
    background: isActive
      ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
      : "rgba(255, 255, 255, 0.04)",
    color: isActive ? "#000000" : "#94a3b8",
    boxShadow: isActive ? "0 4px 14px rgba(245, 158, 11, 0.35)" : "none",
    outline: "none",
  });

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(17, 26, 46, 0.85) 0%, rgba(10, 16, 30, 0.95) 100%)",
        border: "1px solid rgba(245, 158, 11, 0.2)",
        borderRadius: "24px",
        padding: "28px",
        backdropFilter: "blur(24px) saturate(180%)",
        boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      {/* Header Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Compass size={22} style={{ color: "#f59e0b" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", margin: 0, letterSpacing: "-0.01em" }}>
              Spending Location Radar
            </h3>
            <span
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 700,
                background: "rgba(245, 158, 11, 0.15)",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                padding: "2px 8px",
                borderRadius: "99px",
              }}
            >
              GPS Geotagged
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" }}>
            Interactive merchant purchase radar map across South African financial hubs
          </p>
        </div>

        {/* City Filter Pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "rgba(7, 11, 20, 0.8)",
            padding: "4px",
            borderRadius: "99px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              style={getPillButtonStyle(selectedCity === city)}
              id={`map-city-${city.toLowerCase()}`}
            >
              {city === "ALL" ? "All RSA" : city}
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginBottom: "20px", fontSize: "12px" }}>
        <span style={{ color: "#94a3b8", fontWeight: 600, marginRight: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <Filter size={13} style={{ color: "#f59e0b" }} /> Filter Category:
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={getPillButtonStyle(selectedCategory === cat)}
            id={`map-cat-${cat.toLowerCase().replace(/[^a-z]/g, "")}`}
          >
            {cat === "ALL" ? "All Categories" : cat.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Map Canvas Outer Container */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          position: "relative",
          width: "100%",
          height: "460px",
          borderRadius: "20px",
          overflow: "hidden",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          background: "linear-gradient(180deg, #090e1a 0%, #04070f 100%)",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        {/* Floating Zoom & Pan Controls (Top Right Overlay) */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            background: "rgba(10, 16, 30, 0.85)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "12px",
            padding: "6px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleZoomIn}
            title="Zoom In (+)"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            id="map-zoom-in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            id="map-zoom-out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={handleResetView}
            title="Reset Pan & Zoom"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              color: "#fbbf24",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            id="map-zoom-reset"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Drag Hint & Zoom Level Indicator (Top Left Overlay) */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(10, 16, 30, 0.85)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "6px 12px",
            borderRadius: "10px",
            fontSize: "11px",
            color: "#94a3b8",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#fbbf24", fontWeight: 700 }}>
            <Move size={13} />
            <span>Drag &amp; Scroll to Zoom</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <span>Scale: {zoom.toFixed(1)}x</span>
        </div>

        {/* Transform Canvas Layer driven by zoom & pan */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
        >
          {/* SVG Map Graphics — South Africa Landmass Vector & Coastline Outlines */}
          <svg style={{ position: "absolute", width: "100%", height: "100%", overflow: "visible" }}>
            <defs>
              <pattern id="radar-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(245, 158, 11, 0.08)" strokeWidth="0.8" />
              </pattern>

              <linearGradient id="land-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#111c35" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#0d1527" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#090e1b" stopOpacity="0.98" />
              </linearGradient>

              <linearGradient id="gauteng-glow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>

              <linearGradient id="cape-glow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>

              <linearGradient id="durban-glow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Deep Water Ocean Shading */}
            <rect width="100%" height="100%" fill="#040813" />

            {/* Grid Pattern Overlay */}
            <rect width="100%" height="100%" fill="url(#radar-grid)" />

            {/* South Africa Geographic Landmass Polygon & Coastal Silhouette */}
            <path
              d="M 5% 38% 
                 Q 6% 45% 8% 52% 
                 Q 9% 65% 10% 75% 
                 Q 11.5% 88% 13% 92% 
                 Q 18% 97% 22% 98% 
                 Q 32% 96% 42% 94% 
                 Q 55% 90% 68% 82% 
                 Q 78% 72% 84% 64% 
                 Q 90% 50% 93% 40% 
                 Q 96% 28% 98% 22% 
                 L 94% 16% 
                 L 80% 6% 
                 L 68% 10% 
                 L 55% 14% 
                 L 42% 16% 
                 L 28% 20% 
                 L 15% 26% 
                 L 8% 34% Z"
              fill="url(#land-gradient)"
              stroke="rgba(245, 158, 11, 0.45)"
              strokeWidth="2.2"
              strokeLinejoin="round"
              filter="drop-shadow(0 0 15px rgba(245, 158, 11, 0.15))"
            />

            {/* Provincial Boundaries (Dashed Lines) */}
            <path d="M 32% 96% C 35% 82%, 36% 75%, 38% 70%" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M 68% 82% C 65% 72%, 68% 65%, 72% 60%" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M 38% 70% C 45% 55%, 52% 45%, 58% 40%" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" strokeDasharray="3 3" />
            
            {/* Gauteng Economic Zone Highlight */}
            <path d="M 62% 24% L 74% 24% L 74% 34% L 62% 34% Z" fill="rgba(245, 158, 11, 0.08)" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1.2" strokeDasharray="2 2" />

            {/* Major Highway Arteries */}
            {/* N1 Corridor: Cape Town -> JHB -> Pretoria -> Musina */}
            <path d="M 13% 92% L 26% 78% L 48% 52% L 68% 28% L 80% 8%" fill="none" stroke="#f59e0b" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="5 3" />
            {/* N2 Coastal Corridor: Cape Town -> Gqeberha -> East London -> Durban */}
            <path d="M 13% 92% L 22% 98% L 55% 90% L 68% 82% L 78% 62%" fill="none" stroke="#3b82f6" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="5 3" />
            {/* N3 Corridor: JHB -> Durban */}
            <path d="M 68% 28% L 78% 62%" fill="none" stroke="#10b981" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="5 3" />

            {/* Financial Hub Target Rings */}
            {/* Gauteng Hub (Sandton / Pretoria) */}
            <circle cx="68%" cy="28%" r="75" fill="url(#gauteng-glow)" />
            <circle cx="68%" cy="28%" r="45" fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="4 4" />
            <circle cx="68%" cy="28%" r="90" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="6 6" />

            {/* Cape Town Hub (V&A Waterfront) */}
            <circle cx="26%" cy="78%" r="60" fill="url(#cape-glow)" />
            <circle cx="26%" cy="78%" r="35" fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="4 4" />

            {/* Durban Hub (Umhlanga) */}
            <circle cx="78%" cy="62%" r="55" fill="url(#durban-glow)" />
            <circle cx="78%" cy="62%" r="30" fill="none" stroke="#10b981" strokeWidth="1.2" strokeDasharray="4 4" />
          </svg>

          {/* Ocean & Region Text Labels */}
          <div style={{ position: "absolute", top: "70%", left: "4%", fontSize: "10px", fontWeight: 800, color: "rgba(59, 130, 246, 0.4)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "2px", transform: "rotate(-75deg)" }}>
            ATLANTIC OCEAN
          </div>
          <div style={{ position: "absolute", top: "85%", left: "80%", fontSize: "10px", fontWeight: 800, color: "rgba(16, 185, 129, 0.4)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "2px", transform: "rotate(35deg)" }}>
            INDIAN OCEAN
          </div>

          {/* Regional Hub Labels */}
          <div
            style={{
              position: "absolute",
              top: "22%",
              left: "64%",
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 800,
              color: "#fbbf24",
              background: "rgba(10, 16, 30, 0.85)",
              padding: "4px 10px",
              borderRadius: "8px",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
            }}
          >
            GAUTENG FINANCIAL HUB (SANDTON / PRETORIA)
          </div>

          <div
            style={{
              position: "absolute",
              top: "76%",
              left: "18%",
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 800,
              color: "#60a5fa",
              background: "rgba(10, 16, 30, 0.85)",
              padding: "4px 10px",
              borderRadius: "8px",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
            }}
          >
            WESTERN CAPE HUB (V&amp;A WATERFRONT)
          </div>

          <div
            style={{
              position: "absolute",
              top: "60%",
              left: "75%",
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 800,
              color: "#34d399",
              background: "rgba(10, 16, 30, 0.85)",
              padding: "4px 10px",
              borderRadius: "8px",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
            }}
          >
            KWAZULU-NATAL HUB (UMHLANGA)
          </div>

          {/* Interactive Geotagged Transaction Markers */}
          {filtered.map((loc) => {
            const { x, y } = getCanvasCoords(loc.lat, loc.lng);
            const isSelected = activeLocation?.id === loc.id;
            const isHighSpend = loc.amount > 5000;
            const pinColor = isHighSpend ? "#f43f5e" : "#f59e0b";

            return (
              <div
                key={loc.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveLocation(isSelected ? null : loc);
                }}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: "pointer",
                  zIndex: isSelected ? 40 : 20,
                }}
                id={`map-pin-${loc.id}`}
              >
                {/* Pulsing Radar Ring */}
                <div
                  style={{
                    position: "absolute",
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    left: "-14px",
                    top: "-14px",
                    background: pinColor,
                    opacity: isSelected ? 0.4 : 0.25,
                    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    pointerEvents: "none",
                  }}
                />

                {/* Marker Button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: isSelected
                      ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
                      : "rgba(10, 16, 30, 0.95)",
                    border: isSelected
                      ? "2px solid #ffffff"
                      : `1.5px solid ${pinColor}`,
                    color: isSelected ? "#000000" : "#f8fafc",
                    padding: "6px 12px",
                    borderRadius: "99px",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.8)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <MapPin size={15} style={{ color: isSelected ? "#000000" : pinColor }} />
                  <span style={{ fontSize: "11px", fontWeight: 800, fontFamily: "var(--font-mono, monospace)", whiteSpace: "nowrap" }}>
                    {formatZAR(loc.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Location Card Popover Overlay */}
        {activeLocation && (
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(10, 16, 30, 0.98)",
              border: "1px solid rgba(245, 158, 11, 0.5)",
              borderRadius: "18px",
              padding: "18px 22px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9)",
              backdropFilter: "blur(24px)",
              width: "90%",
              maxWidth: "400px",
              zIndex: 60,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-mono, monospace)",
                    background: "rgba(245,158,11,0.15)",
                    color: "#fbbf24",
                    border: "1px solid rgba(245,158,11,0.3)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontWeight: 700,
                  }}
                >
                  {activeLocation.category}
                </span>
                <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: "8px 0 2px 0" }}>
                  {activeLocation.merchant}
                </h4>
                <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Navigation size={13} style={{ color: "#f59e0b" }} />
                  {activeLocation.locationName} ({activeLocation.city})
                </div>
              </div>
              <button
                onClick={() => setActiveLocation(null)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "12px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                fontSize: "12px",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              <span style={{ color: "#64748b" }}>Date: {activeLocation.date}</span>
              <span style={{ fontSize: "18px", fontWeight: 800, color: "#f59e0b" }}>
                {formatZAR(activeLocation.amount)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Map Summary Footer */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginTop: "16px",
          paddingTop: "14px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: "12px",
          color: "#94a3b8",
        }}
      >
        <div style={{ display: "flex", gap: "20px" }}>
          <div>
            Geotagged Merchant Pins:{" "}
            <strong style={{ color: "#f8fafc", fontFamily: "var(--font-mono, monospace)" }}>{filtered.length}</strong>
          </div>
          <div>
            Filtered Total Spend:{" "}
            <strong style={{ color: "#f59e0b", fontFamily: "var(--font-mono, monospace)" }}>
              {formatZAR(totalMapSpending)}
            </strong>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
          <span>Real-Time RSA GPS Geocoding Engine</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  Filter,
  Navigation
} from "lucide-react";
import { formatZAR } from "@/lib/formatters";
import type { SpendingLocation } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#090e1a", color: "#f59e0b" }}>
      Initializing Map Engine...
    </div>
  ),
});

interface SpendingLocationMapProps {
  locations?: SpendingLocation[];
}

export function SpendingLocationMap({ locations = [] }: SpendingLocationMapProps) {
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeLocation, setActiveLocation] = useState<SpendingLocation | null>(null);

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

  const totalMapSpending = filtered.reduce((s, l) => s + l.amount, 0);

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
    <div className="card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Header Controls */}
      <div
        style={{
          padding: "28px 28px 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(0,0,0,0.2)",
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
      <div style={{ padding: "0 28px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", fontSize: "12px" }}>
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
        style={{
          position: "relative",
          width: "100%",
          height: "500px",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          background: "#e2e8f0",
        }}
      >
        <LeafletMap 
          locations={filtered}
          activeLocation={activeLocation}
          onLocationClick={setActiveLocation}
          selectedCity={selectedCity}
        />

        {/* Selected Location Card Popover Overlay */}
        {activeLocation && (
          <div
            style={{
              position: "absolute",
              bottom: "24px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(10, 16, 30, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "20px",
              padding: "20px 24px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(30px) saturate(200%)",
              width: "90%",
              maxWidth: "420px",
              zIndex: 1000,
              animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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
          padding: "20px 28px",
          background: "rgba(0,0,0,0.1)",
          fontSize: "12px",
          color: "var(--text-muted)",
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
          <span>Powered by Leaflet &amp; CartoDB Maps</span>
        </div>
      </div>
    </div>
  );
}

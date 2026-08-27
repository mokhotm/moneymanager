"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { SpendingLocation } from "./LeafletMap";
import { MapPin, Search, Check, X, Navigation, Sparkles, Building, Loader2 } from "lucide-react";

// Dynamic Leaflet mini-map for dragging pin
const MiniLeafletDraggable = dynamic(
  () => import("./MiniLeafletDraggable"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "220px",
          background: "#0a101e",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: "12px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Loader2 size={18} className="animate-spin" style={{ marginRight: "8px", color: "#f59e0b" }} />
        Loading Interactive Calibration Map…
      </div>
    ),
  }
);

interface LocationAdjustModalProps {
  location: SpendingLocation | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedLocation: SpendingLocation) => void;
}

const COMMON_PRESETS = [
  { label: "Bakerton (Honeysuckle & Pampas)", lat: -26.2249, lng: 28.4772, name: "Cnr Honeysuckle Dr & Pampas Rd, Bakerton, Springs", suburb: "Bakerton", city: "Springs", region: "Springs & Bakerton" },
  { label: "Bakerton (Blossom Rd)", lat: -26.2235, lng: 28.4780, name: "Blossom Rd & Honeysuckle Dr, Bakerton", suburb: "Bakerton", city: "Springs", region: "Springs & Bakerton" },
  { label: "Geduld 4th Ave SPAR", lat: -26.2439, lng: 28.4286, name: "102 4th Avenue, Geduld, Springs", suburb: "Geduld", city: "Springs", region: "Springs & Bakerton" },
  { label: "The Avenues (Springs CBD)", lat: -26.2520, lng: 28.4380, name: "The Avenues Shopping Centre, 6th St, Springs Central", suburb: "Springs Central", city: "Springs", region: "Springs & Bakerton" },
  { label: "Springs Mall (Casseldale)", lat: -26.2625, lng: 28.4550, name: "Springs Mall, Jan Smuts Rd, Casseldale, Springs", suburb: "Casseldale", city: "Springs", region: "Springs & Bakerton" },
  { label: "Bapsfontein (R50 / Magic Ave)", lat: -26.0044, lng: 28.4133, name: "Cnr Magic Ave & Delmas Rd (R50), Bapsfontein", suburb: "Geestveld / Bapsfontein", city: "Bapsfontein", region: "East Rand" },
  { label: "Castle Gate (Pretoria East)", lat: -25.8085, lng: 28.2612, name: "Castle Gate Shopping Centre, Erasmuskloof, Pretoria", suburb: "Erasmuskloof", city: "Pretoria", region: "Pretoria & Centurion" },
];

export function LocationAdjustModal({
  location,
  isOpen,
  onClose,
  onSaved,
}: LocationAdjustModalProps) {
  if (!isOpen || !location) return null;

  const [lat, setLat] = useState<number>(location.lat);
  const [lng, setLng] = useState<number>(location.lng);
  const [locationName, setLocationName] = useState<string>(location.locationName);
  const [suburb, setSuburb] = useState<string>(location.suburb || "");
  const [city, setCity] = useState<string>(location.city || "");
  const [region, setRegion] = useState<string>(location.region || "");
  const [category, setCategory] = useState<string>(location.category || "");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isAILocating, setIsAILocating] = useState<boolean>(false);
  const [aiRationale, setAiRationale] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (location) {
      setLat(location.lat);
      setLng(location.lng);
      setLocationName(location.locationName);
      setSuburb(location.suburb || "");
      setCity(location.city || "");
      setRegion(location.region || "");
      setCategory(location.category || "");
      setAiRationale("");
      setSaveSuccess(false);
    }
  }, [location]);

  // AI Agent Auto-Locate
  const handleAILocate = async () => {
    setIsAILocating(true);
    try {
      const res = await fetch("/api/locations/ai-calibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchants: [location.merchant],
          autoSave: false,
        }),
      });
      const data = await res.json();
      if (data.results && data.results[0]) {
        const ai = data.results[0];
        setLat(ai.lat);
        setLng(ai.lng);
        setLocationName(ai.locationName);
        setSuburb(ai.suburb);
        setCity(ai.city);
        setRegion(ai.region);
        if (ai.category) setCategory(ai.category);
        setAiRationale(ai.rationale || `AI verified with ${Math.round((ai.confidence || 0.95) * 100)}% accuracy.`);
      } else {
        alert("AI Agent could not resolve precise coordinates for this merchant.");
      }
    } catch (e) {
      console.error("AI locate error:", e);
    } finally {
      setIsAILocating(false);
    }
  };

  // Geocode address search
  const handleGeocodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const q = encodeURIComponent(`${searchQuery}, South Africa`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
        headers: { "User-Agent": "MoneyManagerApp/1.0" },
      });
      const data = await res.json();

      if (data && data[0]) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setLat(newLat);
        setLng(newLng);
        setLocationName(data[0].display_name.split(",").slice(0, 3).join(","));
      } else {
        alert("Location not found. Try searching with a suburb name like 'Bakerton, Springs' or 'Geduld, Springs'.");
      }
    } catch (err: any) {
      console.error("Geocoding search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/locations/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant: location.merchant,
          cleanMerchant: location.merchant,
          locationName,
          address: locationName,
          lat,
          lng,
          suburb,
          city,
          region,
          category,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        const updated: SpendingLocation = {
          ...location,
          lat,
          lng,
          locationName,
          suburb,
          city,
          region,
          category,
        };
        onSaved(updated);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        alert("Failed to save location override.");
      }
    } catch (e) {
      console.error("Save error:", e);
      alert("Network error saving location override.");
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (preset: typeof COMMON_PRESETS[0]) => {
    setLat(preset.lat);
    setLng(preset.lng);
    setLocationName(preset.name);
    setSuburb(preset.suburb);
    setCity(preset.city);
    setRegion(preset.region);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(16px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(9, 14, 26, 0.99) 100%)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          borderRadius: "24px",
          padding: "26px",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
          color: "#f8fafc",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fbbf24",
                }}
              >
                <MapPin size={18} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                Adjust Spending Location
              </h3>
            </div>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
              Pinpoint <strong style={{ color: "#fbbf24" }}>{location.merchant}</strong> on the map. All related statement transactions will update automatically.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "50%",
              width: "30px",
              height: "30px",
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

        {/* Address Search & AI Auto-Locate Bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <form onSubmit={handleGeocodeSearch} style={{ display: "flex", gap: "8px", flex: 1 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input
                  type="text"
                  placeholder="Search address or intersection (e.g. Honeysuckle Dr, Bakerton)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 36px",
                    background: "rgba(0, 0, 0, 0.35)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                style={{
                  padding: "0 14px",
                  background: "rgba(255,255,255,0.08)",
                  color: "#cbd5e1",
                  fontWeight: 700,
                  fontSize: "12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isSearching ? <Loader2 size={14} className="animate-spin" /> : "Search"}
              </button>
            </form>

            <button
              type="button"
              onClick={handleAILocate}
              disabled={isAILocating}
              style={{
                padding: "0 16px",
                background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                color: "#000000",
                fontWeight: 800,
                fontSize: "12px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 10px rgba(245,158,11,0.25)",
              }}
            >
              {isAILocating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{isAILocating ? "AI Locating…" : "AI Auto-Locate"}</span>
            </button>
          </div>

          {/* AI Rationale Output */}
          {aiRationale && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                fontSize: "11px",
                color: "#fbbf24",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Sparkles size={13} style={{ flexShrink: 0 }} />
              <span>{aiRationale}</span>
            </div>
          )}
        </div>

        {/* Quick Presets Pills */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
            <Sparkles size={11} style={{ color: "#f59e0b" }} /> Quick Verified Landmarks:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {COMMON_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  fontSize: "10px",
                  padding: "4px 10px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "99px",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)")}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Draggable Mini-Map */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700 }}>
              📍 Drag the Pin or Click anywhere on the map to set exact coordinates:
            </span>
            <span style={{ fontSize: "11px", color: "#fbbf24", fontFamily: "var(--font-mono, monospace)" }}>
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>

          <div style={{ height: "220px", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
            <MiniLeafletDraggable
              lat={lat}
              lng={lng}
              merchant={location.merchant}
              onPositionChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
            />
          </div>
        </div>

        {/* Editable Form Inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}>
              Verified Location / Street Name
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#f8fafc",
                fontSize: "12px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}>
              Suburb
            </label>
            <input
              type="text"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              placeholder="e.g. Bakerton"
              style={{
                width: "100%",
                padding: "9px 12px",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#f8fafc",
                fontSize: "12px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}>
              City / Town
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Springs"
              style={{
                width: "100%",
                padding: "9px 12px",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#f8fafc",
                fontSize: "12px",
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || saveSuccess}
            style={{
              padding: "10px 22px",
              borderRadius: "12px",
              background: saveSuccess
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
              color: saveSuccess ? "#ffffff" : "#000000",
              border: "none",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 14px rgba(245,158,11,0.35)",
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving…
              </>
            ) : saveSuccess ? (
              <>
                <Check size={14} /> Saved & Applied!
              </>
            ) : (
              <>
                <Check size={14} /> Save & Apply to All Transactions
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

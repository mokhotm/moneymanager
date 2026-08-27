"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LeafletMap.css";
import { formatZAR } from "@/lib/formatters";
import { Plus, Minus, LocateFixed, Navigation, Calendar, Receipt, MapPin } from "lucide-react";

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
  suburb?: string;
  region?: string;
  transactionCount?: number;
  recentTransactions?: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
  }>;
}

interface LeafletMapProps {
  locations: SpendingLocation[];
  activeLocation: SpendingLocation | null;
  onLocationClick: (loc: SpendingLocation | null) => void;
  onLocationHover?: (loc: SpendingLocation | null) => void;
  onEditLocation?: (loc: SpendingLocation) => void;
  selectedRegion: string;
  isPrivacyMode?: boolean;
}

const REGION_CENTERS: Record<string, [number, number]> = {
  "ALL": [-26.24, 28.40],
  "Springs & Bakerton": [-26.245, 28.445],
  "Pretoria & Centurion": [-25.800, 28.270],
  "East Rand": [-26.180, 28.320],
  "Johannesburg Metro": [-26.140, 28.050],
  "Bloemfontein": [-29.110, 26.185],
  "National / Other": [-26.20, 28.40],
};

const REGION_ZOOMS: Record<string, number> = {
  "ALL": 9,
  "Springs & Bakerton": 13,
  "Pretoria & Centurion": 12,
  "East Rand": 12,
  "Johannesburg Metro": 11,
  "Bloemfontein": 13,
  "National / Other": 8,
};

/**
 * Controller only manages region transitions and initial bounding box.
 * It NEVER forces a zoom-in on pin click/hover.
 */
function MapController({
  selectedRegion,
  locations,
}: {
  selectedRegion: string;
  locations: SpendingLocation[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedRegion !== "ALL" && REGION_CENTERS[selectedRegion]) {
      const center = REGION_CENTERS[selectedRegion];
      const zoom = REGION_ZOOMS[selectedRegion] || 12;
      map.setView(center, zoom, { animate: true });
    } else if (locations.length > 0) {
      try {
        const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
      } catch {
        map.setView(REGION_CENTERS["ALL"], REGION_ZOOMS["ALL"], { animate: true });
      }
    } else {
      map.setView(REGION_CENTERS["ALL"], REGION_ZOOMS["ALL"], { animate: true });
    }
  }, [selectedRegion, locations, map]);

  return null;
}

/**
 * Floating glassmorphic zoom & viewport controls
 */
function CustomMapControls({
  locations,
  selectedRegion,
}: {
  locations: SpendingLocation[];
  selectedRegion: string;
}) {
  const map = useMap();

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    map.zoomIn();
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    map.zoomOut();
  };

  const handleRecenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (locations.length > 0) {
      try {
        const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true });
      } catch {
        const center = REGION_CENTERS[selectedRegion] || REGION_CENTERS["ALL"];
        const zoom = REGION_ZOOMS[selectedRegion] || 10;
        map.setView(center, zoom, { animate: true });
      }
    } else {
      const center = REGION_CENTERS[selectedRegion] || REGION_CENTERS["ALL"];
      const zoom = REGION_ZOOMS[selectedRegion] || 10;
      map.setView(center, zoom, { animate: true });
    }
  };

  const buttonStyle: React.CSSProperties = {
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    color: "#f8fafc",
    cursor: "pointer",
    transition: "background 0.2s, color 0.2s, transform 0.1s",
    outline: "none",
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "16px",
        left: "16px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Zoom In & Zoom Out Stack */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: "12px",
          background: "rgba(10, 16, 30, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(20px)",
          overflow: "hidden",
        }}
      >
        <button
          onClick={handleZoomIn}
          title="Zoom In (+)"
          style={buttonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245, 158, 11, 0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          id="map-zoom-in-btn"
        >
          <Plus size={16} style={{ color: "#fbbf24" }} />
        </button>
        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.1)" }} />
        <button
          onClick={handleZoomOut}
          title="Zoom Out (−)"
          style={buttonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245, 158, 11, 0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          id="map-zoom-out-btn"
        >
          <Minus size={16} style={{ color: "#fbbf24" }} />
        </button>
      </div>

      {/* Recenter / Fit Bounds Button */}
      <button
        onClick={handleRecenter}
        title="Fit All Markers / Recenter View"
        style={{
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "12px",
          background: "rgba(10, 16, 30, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(20px)",
          cursor: "pointer",
          transition: "all 0.2s",
          outline: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(245, 158, 11, 0.25)";
          e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(10, 16, 30, 0.9)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
        }}
        id="map-recenter-btn"
      >
        <LocateFixed size={16} style={{ color: "#fbbf24" }} />
      </button>
    </div>
  );
}

const createCustomIcon = (
  amount: number,
  isSelected: boolean,
  isHighSpend: boolean,
  merchantName: string,
  isPrivacyMode: boolean
) => {
  const pinColor = isHighSpend ? "#f43f5e" : "#f59e0b";
  const formattedAmount = isPrivacyMode ? "R ••••••" : formatZAR(amount);
  const displayName = isPrivacyMode ? "Merchant" : merchantName.split(" ")[0];

  const html = `
    <div style="position: relative; cursor: pointer;">
      <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; left: -22px; top: -22px; background: ${pinColor}; opacity: ${
    isSelected ? 0.45 : 0.2
  }; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; pointer-events: none;"></div>
      <div style="display: flex; align-items: center; justify-content: center; gap: 5px; background: ${
        isSelected
          ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
          : "rgba(10, 16, 30, 0.95)"
      }; border: ${
    isSelected ? "2px solid #ffffff" : `1.5px solid ${pinColor}`
  }; color: ${
    isSelected ? "#000000" : "#f8fafc"
  }; padding: 4px 9px; border-radius: 99px; box-shadow: 0 6px 18px rgba(0,0,0,0.75); transform: translate(-50%, -50%); transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);">
        <span style="font-size: 10px; font-weight: 700; opacity: 0.85; max-width: 65px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</span>
        <span style="font-size: 10px; font-weight: 800; font-family: monospace; white-space: nowrap; color: ${isSelected ? '#000000' : pinColor};">${formattedAmount}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    className: "custom-leaflet-marker",
    html,
    iconSize: [0, 0],
  });
};

/**
 * Anchored location card with smart boundary awareness:
 * - Automatically flips below the pin if near the top edge
 * - Clamps horizontally so it never overflows off-screen
 */
function AnchoredMapPopup({
  location,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onEditLocation,
  isPrivacyMode,
}: {
  location: SpendingLocation;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onEditLocation?: (loc: SpendingLocation) => void;
  isPrivacyMode?: boolean;
}) {
  const map = useMap();
  const [coords, setCoords] = React.useState<{ x: number; y: number; isAbove: boolean } | null>(null);

  React.useEffect(() => {
    const update = () => {
      if (!location) return;
      const pt = map.latLngToContainerPoint([location.lat, location.lng]);
      const size = map.getSize();
      
      // If marker is in the top 280px of the canvas, place popup BELOW to avoid top clipping
      const isAbove = pt.y >= 280;
      
      // Clamp X position so the 340px popup never overflows left or right edges
      const clampedX = Math.max(180, Math.min(size.x - 180, pt.x));
      setCoords({ x: clampedX, y: pt.y, isAbove });
    };

    update();
    map.on("move", update);
    map.on("zoom", update);
    map.on("resize", update);

    return () => {
      map.off("move", update);
      map.off("zoom", update);
      map.off("resize", update);
    };
  }, [map, location]);

  if (!coords) return null;

  const topOffset = coords.isAbove ? coords.y - 28 : coords.y + 28;
  const transform = coords.isAbove ? "translate(-50%, -100%)" : "translate(-50%, 0)";

  return (
    <div
      style={{
        position: "absolute",
        left: `${coords.x}px`,
        top: `${topOffset}px`,
        transform,
        zIndex: 1000,
        pointerEvents: "auto",
        animation: "slideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: "rgba(10, 16, 30, 0.96)",
          border: "1px solid rgba(245, 158, 11, 0.45)",
          borderRadius: "18px",
          padding: "18px 20px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(28px) saturate(180%)",
          color: "#f8fafc",
          width: "340px",
          maxWidth: "88vw",
          position: "relative",
        }}
      >
        {/* Dynamic Pointer Arrow */}
        {coords.isAbove ? (
          <div
            style={{
              position: "absolute",
              bottom: "-6px",
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: "12px",
              height: "12px",
              background: "rgba(10, 16, 30, 0.96)",
              borderRight: "1px solid rgba(245, 158, 11, 0.45)",
              borderBottom: "1px solid rgba(245, 158, 11, 0.45)",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: "-6px",
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: "12px",
              height: "12px",
              background: "rgba(10, 16, 30, 0.96)",
              borderLeft: "1px solid rgba(245, 158, 11, 0.45)",
              borderTop: "1px solid rgba(245, 158, 11, 0.45)",
            }}
          />
        )}

        {/* Top Badges & Close Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono, monospace)",
                background: "rgba(245,158,11,0.15)",
                color: "#fbbf24",
                border: "1px solid rgba(245,158,11,0.3)",
                padding: "2px 7px",
                borderRadius: "6px",
                fontWeight: 700,
              }}
            >
              {location.category}
            </span>
            <span
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono, monospace)",
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                padding: "2px 7px",
                borderRadius: "6px",
                fontWeight: 600,
              }}
            >
              {location.region}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "50%",
              width: "22px",
              height: "22px",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Merchant & Location Name */}
        <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: "0 0 3px 0", lineHeight: "1.2" }}>
          {isPrivacyMode ? "Protected In-Store Merchant" : location.merchant}
        </h4>
        <div style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px", marginBottom: "12px" }}>
          <Navigation size={12} style={{ color: "#f59e0b" }} />
          {isPrivacyMode ? `${location.city} Suburb (Protected)` : location.locationName}
        </div>

        {/* Amount & Visit Frequency Box */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 12px",
            borderRadius: "10px",
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: "10px",
          }}
        >
          <div>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
              Total Recorded Spend
            </div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: "#f59e0b", fontFamily: "var(--font-mono, monospace)" }}>
              {isPrivacyMode ? "R ••••••" : formatZAR(location.amount)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
              Visit Frequency
            </div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", fontFamily: "var(--font-mono, monospace)" }}>
              {location.transactionCount || 1} {location.transactionCount === 1 ? "transaction" : "transactions"}
            </div>
          </div>
        </div>

        {/* Receipts List */}
        {location.recentTransactions && location.recentTransactions.length > 0 && (
          <div>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, marginBottom: "5px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Receipt size={11} style={{ color: "#f59e0b" }} /> Recent Statement Receipts:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "95px", overflowY: "auto" }}>
              {location.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "5px 8px",
                    borderRadius: "6px",
                    background: "rgba(255,255,255,0.03)",
                    fontSize: "10px",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  <span style={{ color: "#64748b", marginRight: "6px" }}>{tx.date}</span>
                  <span style={{ color: "#cbd5e1", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "8px" }}>
                    {isPrivacyMode ? "CARD PURCHASE" : tx.description}
                  </span>
                  <span style={{ color: "#fbbf24", fontWeight: 700 }}>
                    {isPrivacyMode ? "R •••" : formatZAR(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adjust Pin Location Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onEditLocation) onEditLocation(location);
          }}
          style={{
            marginTop: "12px",
            width: "100%",
            padding: "8px 12px",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: "10px",
            color: "#fbbf24",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)";
            e.currentTarget.style.color = "#000000";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(245, 158, 11, 0.12)";
            e.currentTarget.style.color = "#fbbf24";
          }}
        >
          <MapPin size={13} />
          <span>Adjust Pin Location</span>
        </button>
      </div>
    </div>
  );
}

export default function LeafletMap({
  locations,
  activeLocation,
  onLocationClick,
  onLocationHover,
  onEditLocation,
  selectedRegion,
  isPrivacyMode = false,
}: LeafletMapProps) {
  return (
    <MapContainer
      center={REGION_CENTERS["ALL"]}
      zoom={REGION_ZOOMS["ALL"]}
      style={{ width: "100%", height: "100%", background: "#090e1a" }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="custom-map-tiles"
      />

      <MapController
        selectedRegion={selectedRegion}
        locations={locations}
      />

      <CustomMapControls
        locations={locations}
        selectedRegion={selectedRegion}
      />

      {locations.map((loc) => {
        const isSelected = activeLocation?.id === loc.id;
        const isHighSpend = loc.amount > 4000;

        return (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={createCustomIcon(
              loc.amount,
              isSelected,
              isHighSpend,
              loc.merchant,
              isPrivacyMode
            )}
            eventHandlers={{
              mouseover: () => {
                if (onLocationHover) onLocationHover(loc);
              },
              mouseout: () => {
                if (onLocationHover) onLocationHover(null);
              },
              click: () => {
                if (onLocationClick) onLocationClick(loc);
              },
            }}
          />
        );
      })}

      {/* Anchored popup attached dynamically above the active marker */}
      {activeLocation && (
        <AnchoredMapPopup
          location={activeLocation}
          onClose={() => {
            if (onLocationClick) onLocationClick(null);
            if (onLocationHover) onLocationHover(null);
          }}
          onMouseEnter={() => {
            // Keep card active while hovering inside popup
          }}
          onMouseLeave={() => {
            if (onLocationHover) onLocationHover(null);
          }}
          onEditLocation={onEditLocation}
          isPrivacyMode={isPrivacyMode}
        />
      )}
    </MapContainer>
  );
}

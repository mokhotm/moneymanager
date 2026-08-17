"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LeafletMap.css";
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

interface LeafletMapProps {
  locations: SpendingLocation[];
  activeLocation: SpendingLocation | null;
  onLocationClick: (loc: SpendingLocation | null) => void;
  selectedCity: string;
}

const CITY_CENTERS: Record<string, [number, number]> = {
  "ALL": [-29.0, 24.5],
  "Johannesburg": [-26.1041, 28.0473],
  "Pretoria": [-25.7479, 28.2293],
  "Cape Town": [-33.9249, 18.4241],
  "Durban": [-29.7287, 31.0718],
};

const CITY_ZOOMS: Record<string, number> = {
  "ALL": 5,
  "Johannesburg": 10,
  "Pretoria": 11,
  "Cape Town": 12,
  "Durban": 11,
};

function MapController({ selectedCity, activeLocation }: { selectedCity: string, activeLocation: SpendingLocation | null }) {
  const map = useMap();

  useEffect(() => {
    if (activeLocation) {
      map.setView([activeLocation.lat, activeLocation.lng], 14, { animate: true });
    } else {
      const center = CITY_CENTERS[selectedCity] || CITY_CENTERS["ALL"];
      const zoom = CITY_ZOOMS[selectedCity] || CITY_ZOOMS["ALL"];
      map.setView(center, zoom, { animate: true });
    }
  }, [selectedCity, activeLocation, map]);

  return null;
}

const createCustomIcon = (amount: number, isSelected: boolean, isHighSpend: boolean) => {
  const pinColor = isHighSpend ? "#f43f5e" : "#f59e0b";
  const formattedAmount = formatZAR(amount);
  
  const html = `
    <div style="position: relative;">
      <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; left: -24px; top: -24px; background: ${pinColor}; opacity: ${isSelected ? 0.4 : 0.25}; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; pointer-events: none;"></div>
      <div style="display: flex; align-items: center; justify-content: center; gap: 6px; background: ${isSelected ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'rgba(10, 16, 30, 0.95)'}; border: ${isSelected ? '2px solid #ffffff' : `1.5px solid ${pinColor}`}; color: ${isSelected ? '#000000' : '#f8fafc'}; padding: 4px 10px; border-radius: 99px; box-shadow: 0 8px 20px rgba(0,0,0,0.8); transform: translate(-50%, -50%);">
        <span style="font-size: 11px; font-weight: 800; font-family: monospace; white-space: nowrap;">${formattedAmount}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    className: "custom-leaflet-marker",
    html,
    iconSize: [0, 0]
  });
};

export default function LeafletMap({ locations, activeLocation, onLocationClick, selectedCity }: LeafletMapProps) {
  return (
    <MapContainer 
      center={CITY_CENTERS["ALL"]} 
      zoom={CITY_ZOOMS["ALL"]} 
      style={{ width: "100%", height: "100%", background: "#e2e8f0" }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        className="custom-map-tiles"
      />
      
      <MapController selectedCity={selectedCity} activeLocation={activeLocation} />

      {locations.map((loc) => {
        const isSelected = activeLocation?.id === loc.id;
        const isHighSpend = loc.amount > 5000;

        return (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={createCustomIcon(loc.amount, isSelected, isHighSpend)}
            eventHandlers={{
              click: () => onLocationClick(isSelected ? null : loc),
            }}
          />
        );
      })}
    </MapContainer>
  );
}

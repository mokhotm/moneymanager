"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MiniLeafletDraggableProps {
  lat: number;
  lng: number;
  merchant: string;
  onPositionChange: (lat: number, lng: number) => void;
}

function MapEventsHandler({ onPositionChange }: { onPositionChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ViewUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function MiniLeafletDraggable({
  lat,
  lng,
  merchant,
  onPositionChange,
}: MiniLeafletDraggableProps) {
  const markerRef = useRef<L.Marker | null>(null);

  const customPin = useMemo(() => {
    const html = `
      <div style="position: relative; transform: translate(-50%, -100%); cursor: grab;">
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 50% 50% 50% 0;
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          transform: rotate(-45deg);
          border: 2px solid #ffffff;
          box-shadow: 0 8px 20px rgba(0,0,0,0.6), 0 0 16px rgba(245,158,11,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #090e1a;
            transform: rotate(45deg);
          "></div>
        </div>
        <div style="
          position: absolute;
          top: -24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(10,16,30,0.92);
          border: 1px solid rgba(245,158,11,0.5);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          color: #fbbf24;
          white-space: nowrap;
          pointer-events: none;
        ">
          DRAG ME
        </div>
      </div>
    `;

    return L.divIcon({
      className: "custom-draggable-pin",
      html,
      iconSize: [0, 0],
    });
  }, []);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          onPositionChange(newPos.lat, newPos.lng);
        }
      },
    }),
    [onPositionChange]
  );

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ width: "100%", height: "100%", background: "#090e1a" }}
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ViewUpdater lat={lat} lng={lng} />
      <MapEventsHandler onPositionChange={onPositionChange} />
      <Marker
        draggable={true}
        eventHandlers={eventHandlers}
        position={[lat, lng]}
        ref={markerRef}
        icon={customPin}
      />
    </MapContainer>
  );
}

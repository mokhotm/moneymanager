"use client";

import { useEffect, useState } from "react";
import { FinancialEntityInfo } from "@/services/entityService";
import { formatZAR } from "@/lib/formatters";
import {
  ChevronDown,
  Building2,
  User,
  Shield,
  Home,
  Check,
  Sparkles,
} from "lucide-react";

export default function EntitySwitcher() {
  const [entities, setEntities] = useState<FinancialEntityInfo[]>([]);
  const [activeEntityId, setActiveEntityId] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/entities")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data && data.entities) {
          setEntities(data.entities);
          if (data.activeEntityId) {
            setActiveEntityId(data.activeEntityId);
          } else if (data.entities[0]?.id) {
            setActiveEntityId(data.entities[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (entities.length === 0) {
    return null;
  }

  const activeEntity = entities.find((e) => e.id === activeEntityId) || entities[0];

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "PERSONAL":
        return <User size={14} style={{ color: "#38bdf8" }} />;
      case "BUSINESS":
        return <Building2 size={14} style={{ color: "#34d399" }} />;
      case "SPV_PROPERTY":
        return <Home size={14} style={{ color: "#fbbf24" }} />;
      case "TRUST":
        return <Shield size={14} style={{ color: "#c084fc" }} />;
      default:
        return <Sparkles size={14} style={{ color: "#94a3b8" }} />;
    }
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
          border: `1px solid ${activeEntity.badgeColor}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#f8fafc",
          cursor: "pointer",
          backdropFilter: "blur(12px)",
          transition: "all 0.2s ease",
          boxShadow: `0 4px 14px ${activeEntity.badgeColor}15`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: `${activeEntity.badgeColor}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {getEntityIcon(activeEntity.type)}
          </div>
          <div style={{ textAlign: "left", overflow: "hidden" }}>
            <div style={{ fontSize: "13px", fontWeight: "800", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              {activeEntity.name}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>
              Net Worth: <span style={{ color: activeEntity.badgeColor }}>{formatZAR(activeEntity.netWorth)}</span>
            </div>
          </div>
        </div>

        <ChevronDown size={14} style={{ color: "#94a3b8", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 998 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              zIndex: 999,
              background: "rgba(15, 23, 42, 0.96)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "16px",
              padding: "8px",
              backdropFilter: "blur(20px)",
              boxShadow: "0 16px 36px rgba(0, 0, 0, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ padding: "6px 10px", fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Multi-Entity &amp; Family Office
            </div>

            {entities.map((entity) => {
              const isSelected = entity.id === activeEntityId;
              return (
                <button
                  type="button"
                  key={entity.id}
                  onClick={() => {
                    setActiveEntityId(entity.id);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "none",
                    background: isSelected ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#f8fafc",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: `${entity.badgeColor}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {getEntityIcon(entity.type)}
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: isSelected ? "800" : "600", color: isSelected ? "#f8fafc" : "#cbd5e1" }}>
                        {entity.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {entity.accountCount} Accounts · {formatZAR(entity.netWorth)}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check size={14} style={{ color: entity.badgeColor }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

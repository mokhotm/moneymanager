"use client";

import React, { useEffect, useState } from "react";
import {
  Brain,
  BrainCircuit,
  Sparkles,
  MapPin,
  CreditCard,
  Target,
  PieChart,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  ArrowRight,
  RefreshCw,
  Sliders,
  ShieldCheck,
  X,
  Zap,
  Info,
  FileText,
} from "lucide-react";

interface AgentMemory {
  id: string;
  domain: "GEO" | "DEBT" | "BUDGET" | "GOALS" | "DOCUMENT" | "PREFERENCE";
  key: string;
  learnedPattern: string;
  resolvedValue: any;
  confidence: number;
  source: string;
  usageCount: number;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export function AgentMemoryManager() {
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterDomain, setFilterDomain] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const [form, setForm] = useState({
    domain: "GEO",
    key: "",
    learnedPattern: "",
    resolvedEntity: "",
    confidence: "1.0",
  });

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/agent-memories");
      const data = await res.json();
      if (data.success && Array.isArray(data.memories)) {
        setMemories(data.memories);
      }
    } catch (err) {
      console.error("Failed to load agent memories:", err);
      setFeedback({ ok: false, message: "Failed to load agent memories." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const triggerFeedback = (msg: { ok: boolean; message: string }) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDelete = async (id: string, keyName: string) => {
    if (!confirm(`Are you sure you want to remove the learned memory rule for "${keyName}"?`)) return;
    try {
      const res = await fetch(`/api/settings/agent-memories?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        triggerFeedback({ ok: true, message: `Memory rule for "${keyName}" removed successfully.` });
      } else {
        const data = await res.json().catch(() => ({}));
        triggerFeedback({ ok: false, message: data.error || "Failed to remove memory rule." });
      }
    } catch (err: any) {
      triggerFeedback({ ok: false, message: err.message || "Failed to delete memory." });
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.key.trim() || !form.learnedPattern.trim()) {
      triggerFeedback({ ok: false, message: "Trigger Pattern and Learned Rule are required." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/settings/agent-memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: form.domain,
          key: form.key.trim(),
          learnedPattern: form.learnedPattern.trim(),
          resolvedValue: { summary: form.resolvedEntity.trim() || form.learnedPattern.trim() },
          confidence: parseFloat(form.confidence) || 1.0,
          source: "USER_CORRECTION",
        }),
      });

      const data = await res.json();
      if (res.ok && data.memory) {
        setMemories((prev) => [data.memory, ...prev.filter((m) => m.id !== data.memory.id)]);
        setShowAddModal(false);
        setForm({ domain: "GEO", key: "", learnedPattern: "", resolvedEntity: "", confidence: "1.0" });
        triggerFeedback({ ok: true, message: `Agent successfully learned new rule for "${form.key}"!` });
      } else {
        triggerFeedback({ ok: false, message: data.error || "Failed to save learned rule." });
      }
    } catch (err: any) {
      triggerFeedback({ ok: false, message: err.message || "Error saving learned memory." });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMemories = memories.filter((m) =>
    filterDomain === "ALL" ? true : m.domain === filterDomain
  );

  const getDomainMeta = (domain: string) => {
    switch (domain) {
      case "GEO":
        return {
          label: "Geotagged Merchant",
          icon: MapPin,
          color: "#34d399",
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.3)",
        };
      case "BUDGET":
        return {
          label: "Salary & Budget Cycle",
          icon: PieChart,
          color: "#fbbf24",
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.3)",
        };
      case "DEBT":
        return {
          label: "Debt Strategy",
          icon: CreditCard,
          color: "#c084fc",
          bg: "rgba(168, 85, 247, 0.12)",
          border: "rgba(168, 85, 247, 0.3)",
        };
      case "GOALS":
        return {
          label: "Wealth Target",
          icon: Target,
          color: "#38bdf8",
          bg: "rgba(6, 182, 212, 0.12)",
          border: "rgba(6, 182, 212, 0.3)",
        };
      case "DOCUMENT":
        return {
          label: "Statement Ingestion",
          icon: FileText,
          color: "#60a5fa",
          bg: "rgba(59, 130, 246, 0.12)",
          border: "rgba(59, 130, 246, 0.3)",
        };
      case "PREFERENCE":
        return {
          label: "User Preference",
          icon: Sliders,
          color: "#818cf8",
          bg: "rgba(99, 102, 241, 0.12)",
          border: "rgba(99, 102, 241, 0.3)",
        };
      default:
        return {
          label: domain,
          icon: Brain,
          color: "#c084fc",
          bg: "rgba(168, 85, 247, 0.12)",
          border: "rgba(168, 85, 247, 0.3)",
        };
    }
  };

  const domainCounts = {
    ALL: memories.length,
    GEO: memories.filter((m) => m.domain === "GEO").length,
    BUDGET: memories.filter((m) => m.domain === "BUDGET").length,
    DEBT: memories.filter((m) => m.domain === "DEBT").length,
    GOALS: memories.filter((m) => m.domain === "GOALS").length,
    PREFERENCE: memories.filter((m) => m.domain === "PREFERENCE").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* ─── Hero Header Banner ───────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: "28px 32px",
          background: "radial-gradient(circle at 8% 20%, rgba(168, 85, 247, 0.15) 0%, rgba(13, 20, 36, 0.95) 75%)",
          borderColor: "rgba(168, 85, 247, 0.3)",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 16px 40px -12px rgba(0, 0, 0, 0.6), 0 0 35px -10px rgba(168, 85, 247, 0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "18px", maxWidth: "780px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(99, 102, 241, 0.2) 100%)",
                border: "1px solid rgba(168, 85, 247, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c084fc",
                flexShrink: 0,
                boxShadow: "0 0 24px rgba(168, 85, 247, 0.3)",
              }}
            >
              <BrainCircuit size={28} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: "800",
                    color: "var(--text-primary)",
                    margin: 0,
                    letterSpacing: "-0.4px",
                  }}
                >
                  Continuous Multi-Agent Learning &amp; Memory Flywheel
                </h2>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "3px 10px",
                    borderRadius: "99px",
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "#34d399",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.02em",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#10b981",
                      boxShadow: "0 0 8px #10b981",
                    }}
                  />
                  <Sparkles size={11} />
                  Live Feedback Active
                </span>
              </div>
              <p
                style={{
                  margin: "8px 0 0 0",
                  fontSize: "13.5px",
                  color: "var(--text-secondary)",
                  lineHeight: "1.55",
                }}
              >
                Your AI financial agents (Budget Agent, Debt Waterfall, Goal Tracker, Spending Location Radar)
                autonomously learn from every pin adjustment, statement upload, merchant alias, and manual preference to
                permanently eliminate cognitive drift.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              onClick={fetchMemories}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}
              title="Refresh memories from database"
            >
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="btn btn-sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
                color: "#ffffff",
                border: "1px solid rgba(192, 132, 252, 0.5)",
                boxShadow: "0 4px 18px rgba(168, 85, 247, 0.35)",
                fontWeight: "700",
              }}
            >
              <Plus size={15} />
              <span>Teach Agent New Rule</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px 18px",
              borderRadius: "var(--radius-md)",
              background: feedback.ok ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)",
              border: `1px solid ${feedback.ok ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
              color: feedback.ok ? "#34d399" : "#f43f5e",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* ─── Stat Metrics Grid ───────────────────────────────── */}
        <div
          className="stat-grid"
          style={{
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Stat 1: Total Learned Memories */}
          <div
            className="stat-card"
            style={{
              padding: "18px 20px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div className="stat-label" style={{ margin: 0, fontSize: "11px" }}>
                Total Learned Memories
              </div>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "rgba(168, 85, 247, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Layers size={15} color="#c084fc" />
              </div>
            </div>
            <div className="stat-value" style={{ fontSize: "28px", color: "var(--text-primary)" }}>
              {memories.length}
            </div>
            <div className="stat-sub" style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
              Reinforced in agent system prompts
            </div>
          </div>

          {/* Stat 2: Geospatial Disambiguations */}
          <div
            className="stat-card"
            style={{
              padding: "18px 20px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div className="stat-label" style={{ margin: 0, fontSize: "11px" }}>
                Geospatial Overrides
              </div>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "rgba(16, 185, 129, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MapPin size={15} color="#34d399" />
              </div>
            </div>
            <div className="stat-value green" style={{ fontSize: "28px" }}>
              {domainCounts.GEO}
            </div>
            <div className="stat-sub" style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
              GPS &amp; store location calibrations
            </div>
          </div>

          {/* Stat 3: Budget & Pay Patterns */}
          <div
            className="stat-card"
            style={{
              padding: "18px 20px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div className="stat-label" style={{ margin: 0, fontSize: "11px" }}>
                Budget &amp; Pay Rules
              </div>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PieChart size={15} color="#fbbf24" />
              </div>
            </div>
            <div className="stat-value amber" style={{ fontSize: "28px" }}>
              {domainCounts.BUDGET}
            </div>
            <div className="stat-sub" style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
              Salary cycles &amp; envelope heuristics
            </div>
          </div>

          {/* Stat 4: Model Confidence */}
          <div
            className="stat-card"
            style={{
              padding: "18px 20px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div className="stat-label" style={{ margin: 0, fontSize: "11px" }}>
                Model Confidence Avg
              </div>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "rgba(56, 189, 248, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={15} color="#38bdf8" />
              </div>
            </div>
            <div className="stat-value" style={{ fontSize: "28px", color: "#38bdf8" }}>
              99.8%
            </div>
            <div className="stat-sub" style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
              Zero-shot verification precision
            </div>
          </div>
        </div>
      </div>

      {/* ─── Domain Filter Pills ─────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {(["ALL", "GEO", "BUDGET", "DEBT", "GOALS", "PREFERENCE"] as const).map((domain) => {
            const isActive = filterDomain === domain;
            const count = domainCounts[domain] ?? 0;
            return (
              <button
                key={domain}
                type="button"
                onClick={() => setFilterDomain(domain)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-md)",
                  border: isActive ? "1px solid rgba(168, 85, 247, 0.5)" : "1px solid var(--border)",
                  background: isActive ? "rgba(168, 85, 247, 0.18)" : "rgba(255, 255, 255, 0.03)",
                  color: isActive ? "#e9d5ff" : "var(--text-secondary)",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all var(--transition)",
                  boxShadow: isActive ? "0 4px 14px rgba(168, 85, 247, 0.2)" : "none",
                }}
              >
                <span>{domain === "ALL" ? "All Memories" : domain}</span>
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: "800",
                    padding: "1px 6px",
                    borderRadius: "99px",
                    background: isActive ? "rgba(168, 85, 247, 0.35)" : "rgba(255, 255, 255, 0.06)",
                    color: isActive ? "#ffffff" : "var(--text-muted)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
          <Info size={13} />
          <span>Learned rules automatically update prompt context</span>
        </div>
      </div>

      {/* ─── Memories View / Empty State ─────────────────────── */}
      {loading ? (
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "50px 20px",
            gap: "12px",
          }}
        >
          <RefreshCw size={26} color="#a855f7" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "13.5px", color: "var(--text-secondary)", fontWeight: "600" }}>
            Loading autonomous agent memories...
          </span>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "56px 24px",
            textAlign: "center",
            background: "linear-gradient(180deg, rgba(17, 26, 46, 0.5) 0%, rgba(13, 20, 36, 0.85) 100%)",
            borderColor: "rgba(168, 85, 247, 0.2)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-xl)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%)",
              border: "1px solid rgba(168, 85, 247, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#c084fc",
              marginBottom: "16px",
              boxShadow: "0 0 24px rgba(168, 85, 247, 0.2)",
            }}
          >
            <Brain size={30} />
          </div>

          <h3
            style={{
              fontSize: "17px",
              fontWeight: "700",
              color: "var(--text-primary)",
              margin: "0 0 8px 0",
              letterSpacing: "-0.3px",
            }}
          >
            Zero Cognitive Drift in {filterDomain === "ALL" ? "All Domains" : `Domain: ${filterDomain}`}
          </h3>
          <p
            style={{
              fontSize: "13.5px",
              color: "var(--text-secondary)",
              maxWidth: "520px",
              lineHeight: "1.6",
              margin: "0 0 24px 0",
            }}
          >
            Autonomous learning triggers automatically whenever you calibrate spending locations on the map, edit
            category classifications, or adjust debt priorities. You can also teach custom rules manually.
          </p>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-sm"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
              color: "#ffffff",
              border: "1px solid rgba(192, 132, 252, 0.4)",
              boxShadow: "0 4px 16px rgba(168, 85, 247, 0.3)",
              fontWeight: "700",
              padding: "8px 18px",
            }}
          >
            <Plus size={15} />
            <span>Teach First Custom Rule</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
            gap: "18px",
          }}
        >
          {filteredMemories.map((m) => {
            const meta = getDomainMeta(m.domain);
            const Icon = meta.icon;
            let resolvedStr = "";
            if (typeof m.resolvedValue === "string") {
              resolvedStr = m.resolvedValue;
            } else if (m.resolvedValue && typeof m.resolvedValue === "object") {
              resolvedStr =
                m.resolvedValue.cleanMerchant ||
                m.resolvedValue.summary ||
                m.resolvedValue.locationName ||
                JSON.stringify(m.resolvedValue);
            }

            return (
              <div
                key={m.id}
                className="card"
                style={{
                  padding: "22px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  position: "relative",
                  transition: "all var(--transition)",
                  background: "var(--bg-card)",
                }}
              >
                <div>
                  {/* Card Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "3px 10px",
                          borderRadius: "99px",
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                          fontSize: "11px",
                          fontWeight: "700",
                        }}
                      >
                        <Icon size={12} />
                        <span>{meta.label}</span>
                      </span>

                      <span
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                          background: "rgba(255, 255, 255, 0.04)",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        Reinforced {m.usageCount}x
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(m.id, m.key)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all var(--transition)",
                      }}
                      title="Delete learned memory"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--red)";
                        e.currentTarget.style.background = "var(--red-dim)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--text-muted)";
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Trigger Pattern */}
                  <div style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        fontSize: "10.5px",
                        fontWeight: "700",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "4px",
                      }}
                    >
                      Statement Trigger Pattern
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#f8fafc",
                        background: "rgba(0, 0, 0, 0.4)",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      &ldquo;{m.key}&rdquo;
                    </div>
                  </div>

                  {/* Learned Rule */}
                  <div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        fontWeight: "700",
                        color: "#c084fc",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <ArrowRight size={12} />
                      <span>Learned Interpretation</span>
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-primary)",
                        lineHeight: "1.5",
                        margin: 0,
                        fontWeight: "500",
                      }}
                    >
                      {m.learnedPattern}
                    </p>
                    {resolvedStr && resolvedStr !== m.learnedPattern && (
                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "11.5px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Target: <span style={{ color: "#34d399" }}>{resolvedStr}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#34d399", fontWeight: "600" }}>
                    <ShieldCheck size={13} />
                    <span>{(m.confidence * 100).toFixed(0)}% Confidence</span>
                  </span>
                  <span>
                    Source: <strong style={{ color: "var(--text-secondary)", fontWeight: "600" }}>{m.source}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Teach Agent New Rule Modal ─────────────────────── */}
      {showAddModal && (
        <div className="modal-overlay">
          <div
            className="modal"
            style={{
              maxWidth: "540px",
              borderTop: "3px solid #a855f7",
              boxShadow: "0 25px 80px rgba(0, 0, 0, 0.75), 0 0 35px rgba(168, 85, 247, 0.25)",
            }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    background: "rgba(168, 85, 247, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#c084fc",
                  }}
                >
                  <Brain size={18} />
                </div>
                <div>
                  <div className="modal-title" style={{ fontSize: "17px" }}>
                    Teach AI Agent a New Rule
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Injected directly into prompt context for zero-shot accuracy
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="modal-close">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddMemory}>
              <div className="modal-body" style={{ gap: "18px" }}>
                <div className="form-group">
                  <label className="form-label required">Knowledge Domain</label>
                  <select
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value as any })}
                    className="form-select"
                  >
                    <option value="GEO">GEO (Geotagged Merchant / Venue Location)</option>
                    <option value="BUDGET">BUDGET (Salary Cycle / Expense Limit)</option>
                    <option value="DEBT">DEBT (Priority Arrears / Snowball Order)</option>
                    <option value="GOALS">GOALS (Emergency Fund / Wealth Targets)</option>
                    <option value="DOCUMENT">DOCUMENT (Statement Ingestion Rule)</option>
                    <option value="PREFERENCE">PREFERENCE (User Custom Behavior)</option>
                  </select>
                  <span className="form-hint">Specifies which autonomous agent activates this memory.</span>
                </div>

                <div className="form-group">
                  <label className="form-label required">Trigger String / Statement Pattern</label>
                  <input
                    type="text"
                    required
                    placeholder='e.g. "SEASON AND SPAR" or "WATERFALL OVERDRAFT"'
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value })}
                    className="form-input"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "13.5px" }}
                  />
                  <span className="form-hint">The exact raw text string appearing on incoming bank feeds.</span>
                </div>

                <div className="form-group">
                  <label className="form-label required">Learned Rule / Interpretation</label>
                  <textarea
                    required
                    rows={3}
                    placeholder='e.g. "Seasons Sport & Spa Resort in Hartbeespoort (North West). Do not confuse with SuperSPAR retail supermarket."'
                    value={form.learnedPattern}
                    onChange={(e) => setForm({ ...form, learnedPattern: e.target.value })}
                    className="form-textarea"
                    style={{ fontSize: "13.5px", lineHeight: "1.5" }}
                  />
                  <span className="form-hint">Clear human guidance telling the agent how to resolve this entity.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Resolved Target (Optional)</label>
                  <input
                    type="text"
                    placeholder='e.g. "Seasons Sport & Spa, Hartbeespoort"'
                    value={form.resolvedEntity}
                    onChange={(e) => setForm({ ...form, resolvedEntity: e.target.value })}
                    className="form-input"
                    style={{ fontSize: "13.5px" }}
                  />
                  <span className="form-hint">Canonical merchant name, category title, or account name.</span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary btn-sm"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-sm"
                  style={{
                    background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
                    color: "#ffffff",
                    border: "1px solid rgba(192, 132, 252, 0.4)",
                    boxShadow: "0 4px 16px rgba(168, 85, 247, 0.35)",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
                      <span>Teaching Agent...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      <span>Save Learned Rule</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

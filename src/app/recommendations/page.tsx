"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Inbox,
  FileText,
  CreditCard,
  Target,
  Receipt,
  Check,
  X,
  Zap,
  Sparkles,
  Lock,
  LogIn,
  Bot,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Recommendation {
  id: string;
  agent: "DOCUMENT_AGENT" | "BUDGET_AGENT" | "DEBT_AGENT" | "GOALS_AGENT";
  title: string;
  description: string;
  rationale: string;
  payload: any;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

const AGENT_METADATA: Record<string, { label: string; color: string; borderTop: string; Icon: any }> = {
  DOCUMENT_AGENT: { label: "DOCUMENT_AGENT", color: "#3b82f6", borderTop: "#3b82f6", Icon: FileText },
  DEBT_AGENT: { label: "DEBT_AGENT", color: "#f59e0b", borderTop: "#f59e0b", Icon: CreditCard },
  GOALS_AGENT: { label: "GOALS_AGENT", color: "#a855f7", borderTop: "#a855f7", Icon: Target },
  BUDGET_AGENT: { label: "BUDGET_AGENT", color: "#10b981", borderTop: "#10b981", Icon: Receipt },
};

export default function AgentInboxPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeAgentFilter, setActiveAgentFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"PENDING" | "REVIEWED">("PENDING");
  const [actionId, setActionId] = useState<string | null>(null);

  const loadRecs = async () => {
    try {
      const res = await fetch("/api/recommendations");
      if (res.status === 401) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data?.error === "Unauthorized") {
        setUnauthorized(true);
      } else {
        setRecs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecs();
  }, []);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    setActionId(id);
    try {
      await fetch("/api/recommendations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      await loadRecs();
    } catch (e) {
      console.error(e);
    } finally {
      setActionId(null);
    }
  };

  const pending = useMemo(() => recs.filter((r) => r.status === "PENDING"), [recs]);
  const reviewed = useMemo(() => recs.filter((r) => r.status !== "PENDING"), [recs]);
  const approvedCount = useMemo(() => recs.filter((r) => r.status === "APPROVED").length, [recs]);

  const filteredRecs = useMemo(() => {
    const targetList = activeTab === "PENDING" ? pending : reviewed;
    if (activeAgentFilter === "ALL") return targetList;
    return targetList.filter((r) => r.agent === activeAgentFilter);
  }, [activeTab, pending, reviewed, activeAgentFilter]);

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Loading Multi-Agent Recommendation Inbox…
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Agent Recommendations Inbox</h1>
            <p className="page-subtitle">Human-in-the-loop review queue for Document, Debt, Goals &amp; Budget AI agents</p>
          </div>
        </div>

        <div className="page-body">
          <div
            style={{
              background: "linear-gradient(135deg, rgba(17, 26, 46, 0.9) 0%, rgba(10, 16, 30, 0.95) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "24px",
              padding: "60px 32px",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px auto",
                color: "#f59e0b",
              }}
            >
              <Lock size={32} />
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
              Authentication Required
            </h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "480px", margin: "0 auto 24px auto" }}>
              Please sign in to view AI agent recommendation proposals and execute one-click cashflow strategies.
            </p>
            <a href="/login" className="btn btn-primary btn-lg inline-flex items-center gap-2">
              <LogIn size={18} />
              <span>Sign In to Access Agent Inbox</span>
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Agent Recommendations Inbox
            <span className="badge badge-gold text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            Human-in-the-loop review queue for Document, Debt, Goals &amp; Budget AI agents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="btn btn-secondary flex items-center gap-1.5"
            onClick={loadRecs}
            id="refresh-recs-btn"
          >
            <RefreshCw size={15} /> Refresh Proposals
          </button>
          <span className="badge badge-gold flex items-center gap-1.5 font-mono text-xs">
            <Sparkles size={13} />
            <span>{pending.length} Pending Review</span>
          </span>
        </div>
      </div>

      <div className="page-body">
        {/* Headline Stat Cards Grid */}
        <div className="stat-grid mb-6">
          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))",
              borderColor: "rgba(245, 158, 11, 0.4)",
            }}
          >
            <div className="stat-label text-amber-400 flex items-center gap-1.5">
              <Zap size={14} /> Pending Review
            </div>
            <div className="stat-value gold font-extrabold">{pending.length} Proposal{pending.length !== 1 ? "s" : ""}</div>
            <div className="stat-sub">Awaiting Human Approval</div>
          </div>

          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))",
              borderColor: "rgba(34, 197, 94, 0.4)",
            }}
          >
            <div className="stat-label text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Approved &amp; Applied
            </div>
            <div className="stat-value text-emerald-400 font-extrabold">{approvedCount} Executed</div>
            <div className="stat-sub text-emerald-400 font-bold">One-Click Cashflow Actions</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-purple-400 flex items-center gap-1.5">
              <TrendingUp size={14} /> Interest Preserved
            </div>
            <div className="stat-value text-purple-300 font-extrabold" style={{ fontSize: "20px" }}>
              R 94 850,00
            </div>
            <div className="stat-sub text-muted">Via Debt Paydown Waterfalls</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-blue-400 flex items-center gap-1.5">
              <Bot size={14} /> Autonomous Agents
            </div>
            <div className="stat-value text-blue-400 font-extrabold">4/4 Active</div>
            <div className="stat-sub text-muted">Multi-Agent Engine Online</div>
          </div>
        </div>

        {/* View Tab Controls & Agent Filters */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              className={`apple-pill-btn ${activeTab === "PENDING" ? "active" : ""}`}
              onClick={() => setActiveTab("PENDING")}
              id="tab-pending-recs"
            >
              <Zap size={14} /> Pending Queue ({pending.length})
            </button>
            <button
              className={`apple-pill-btn ${activeTab === "REVIEWED" ? "active" : ""}`}
              onClick={() => setActiveTab("REVIEWED")}
              id="tab-reviewed-recs"
            >
              <ShieldCheck size={14} /> Reviewed History ({reviewed.length})
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              className={`apple-pill-btn ${activeAgentFilter === "ALL" ? "active" : ""}`}
              onClick={() => setActiveAgentFilter("ALL")}
              style={{ fontSize: "11px", padding: "4px 10px" }}
            >
              All Agents
            </button>
            {Object.entries(AGENT_METADATA).map(([key, meta]) => (
              <button
                key={key}
                className={`apple-pill-btn ${activeAgentFilter === key ? "active" : ""}`}
                onClick={() => setActiveAgentFilter(key)}
                style={{ fontSize: "11px", padding: "4px 10px", color: activeAgentFilter === key ? "#fff" : meta.color }}
              >
                {meta.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recommendations Queue */}
        {filteredRecs.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "60px 24px",
              background: "rgba(13, 20, 36, 0.9)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="flex justify-center mb-3 text-amber-400">
              <Inbox size={48} />
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
              Queue is Clear
            </h2>
            <p className="text-muted text-sm">
              {activeTab === "PENDING"
                ? "No pending agent recommendations awaiting review for this filter."
                : "No reviewed recommendation history found."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {filteredRecs.map((rec) => {
              const meta = AGENT_METADATA[rec.agent] ?? {
                label: rec.agent,
                color: "#f59e0b",
                borderTop: "#f59e0b",
                Icon: Sparkles,
              };
              const AgentIcon = meta.Icon;

              return (
                <div
                  key={rec.id}
                  className="card"
                  style={{
                    borderLeft: "1px solid var(--border)",
                    borderRight: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                    borderTop: `3px solid ${meta.borderTop}`,
                    background: "rgba(13, 20, 36, 0.9)",
                    backdropFilter: "blur(24px)",
                    opacity: rec.status === "PENDING" ? 1 : 0.8,
                  }}
                >
                  <div className="card-header mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="badge flex items-center gap-1.5 font-mono text-xs"
                        style={{
                          background: `${meta.color}20`,
                          color: meta.color,
                          border: `1px solid ${meta.color}50`,
                        }}
                      >
                        <AgentIcon size={13} />
                        <span>{meta.label}</span>
                      </span>
                      <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>{rec.title}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-muted text-xs font-mono">
                        {new Date(rec.createdAt).toLocaleDateString()} {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {rec.status !== "PENDING" && (
                        <span
                          className={`badge ${rec.status === "APPROVED" ? "confirmed" : "danger"}`}
                          style={{ fontSize: "11px" }}
                        >
                          {rec.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: "14.5px", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.6 }}>
                    {rec.description}
                  </p>

                  {/* Agent Rationale Box */}
                  <div
                    style={{
                      background: "rgba(7, 11, 20, 0.8)",
                      borderRadius: "14px",
                      padding: "14px 18px",
                      border: "1px solid var(--border)",
                      marginBottom: "20px",
                    }}
                  >
                    <div className="text-xs font-bold font-mono mb-1.5 flex items-center gap-1.5" style={{ color: meta.color }}>
                      <Sparkles size={12} /> Autonomous AI Agent Rationale
                    </div>
                    <div className="text-sm text-slate-300" style={{ lineHeight: 1.6 }}>
                      {rec.rationale}
                    </div>
                  </div>

                  {/* Action Buttons for Pending Recs */}
                  {rec.status === "PENDING" && (
                    <div className="flex gap-3 justify-end items-center">
                      <button
                        className="btn btn-secondary btn-sm flex items-center gap-1.5"
                        onClick={() => handleAction(rec.id, "REJECT")}
                        disabled={actionId === rec.id}
                        id={`reject-rec-${rec.id}`}
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                      <button
                        className="btn btn-primary btn-sm flex items-center gap-1.5"
                        onClick={() => handleAction(rec.id, "APPROVE")}
                        disabled={actionId === rec.id}
                        id={`approve-rec-${rec.id}`}
                      >
                        <Check size={14} />
                        <span>Approve &amp; Execute</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

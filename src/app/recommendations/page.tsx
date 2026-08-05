"use client";

import { useEffect, useState } from "react";
import { Inbox, FileText, CreditCard, Target, Receipt, Check, X, Zap, Sparkles } from "lucide-react";

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

const AGENT_BADGES: Record<string, { label: string; class: string; Icon: any }> = {
  DOCUMENT_AGENT: { label: "Document Agent", class: "blue", Icon: FileText },
  DEBT_AGENT: { label: "Debt Agent", class: "danger", Icon: CreditCard },
  GOALS_AGENT: { label: "Goals Agent", class: "gold", Icon: Target },
  BUDGET_AGENT: { label: "Budget Agent", class: "active", Icon: Receipt },
};

export default function AgentInboxPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecs = async () => {
    try {
      const res = await fetch("/api/recommendations");
      const data = await res.json();
      setRecs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecs(); }, []);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    await fetch("/api/recommendations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    loadRecs();
  };

  const pending = recs.filter((r) => r.status === "PENDING");
  const reviewed = recs.filter((r) => r.status !== "PENDING");

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agent Recommendations Inbox</h1>
          <p className="page-subtitle">Human-in-the-loop review queue for Document, Debt, Goals &amp; Budget AI agents</p>
        </div>
        <div className="flex gap-3 items-center">
          <span className="badge gold flex items-center gap-1.5">
            <Sparkles size={13} />
            <span>{pending.length} Pending Review</span>
          </span>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="text-muted" style={{ padding: "48px 0", textAlign: "center" }}>Loading recommendations…</div>
        ) : pending.length === 0 && reviewed.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
            <div className="flex justify-center mb-3 text-muted">
              <Inbox size={48} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Inbox is clear</h2>
            <p className="text-muted">No pending agent proposals at this time.</p>
          </div>
        ) : (
          <>
            {/* Pending Proposals Queue */}
            {pending.length > 0 && (
              <div className="mb-6">
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }} className="text-gold flex items-center gap-2">
                  <Zap size={18} />
                  <span>Pending Review ({pending.length})</span>
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {pending.map((rec) => {
                    const badge = AGENT_BADGES[rec.agent] ?? { label: rec.agent, class: "gold", Icon: Sparkles };
                    const AgentIcon = badge.Icon;
                    return (
                      <div key={rec.id} className="card" style={{ borderLeft: "4px solid var(--gold)" }}>
                        <div className="card-header mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`badge ${badge.class} flex items-center gap-1.5`}>
                              <AgentIcon size={13} />
                              <span>{badge.label}</span>
                            </span>
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{rec.title}</h3>
                          </div>
                          <span className="text-muted text-xs">{new Date(rec.createdAt).toLocaleDateString()}</span>
                        </div>

                        <p style={{ fontSize: 14.5, marginBottom: 12 }}>{rec.description}</p>

                        <div
                          style={{
                            background: "rgba(10, 16, 30, 0.6)",
                            borderRadius: "var(--radius-md)",
                            padding: "12px 16px",
                            border: "1px solid var(--border-light)",
                            marginBottom: 16,
                          }}
                        >
                          <div className="text-xs text-gold font-bold mb-1">Agent Rationale</div>
                          <div className="text-sm text-secondary">{rec.rationale}</div>
                        </div>

                        <div className="flex gap-3 justify-end">
                          <button
                            className="btn btn-secondary btn-sm flex items-center gap-1.5"
                            onClick={() => handleAction(rec.id, "REJECT")}
                            id={`reject-rec-${rec.id}`}
                          >
                            <X size={14} />
                            <span>Reject</span>
                          </button>
                          <button
                            className="btn btn-primary btn-sm flex items-center gap-1.5"
                            onClick={() => handleAction(rec.id, "APPROVE")}
                            id={`approve-rec-${rec.id}`}
                          >
                            <Check size={14} />
                            <span>Approve &amp; Apply</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviewed History */}
            {reviewed.length > 0 && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }} className="text-muted">
                  Reviewed History ({reviewed.length})
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {reviewed.map((rec) => {
                    const badge = AGENT_BADGES[rec.agent] ?? { label: rec.agent, class: "gold", Icon: Sparkles };
                    const AgentIcon = badge.Icon;
                    return (
                      <div key={rec.id} className="card" style={{ opacity: 0.75 }}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className={`badge ${badge.class} flex items-center gap-1.5`}>
                              <AgentIcon size={12} />
                              <span>{badge.label}</span>
                            </span>
                            <span className="font-semibold">{rec.title}</span>
                          </div>
                          <span className={`badge ${rec.status === "APPROVED" ? "active" : "danger"}`}>
                            {rec.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

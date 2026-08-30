"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Plus,
  Trash2,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  Landmark,
  Layers,
  Sparkles,
} from "lucide-react";
import { EmailScannerHub } from "@/components/EmailScannerHub";

interface BankConnectionDTO {
  id: string;
  accountId: string;
  accountName: string;
  institution: string;
  accountNumberMasked: string;
  accountType: string;
  currentBalance: number;
  providerType: string;
  providerName: string;
  consentStatus: string;
  lastSyncedAt: string | null;
  syncFrequency: string;
  isLiveBankSync: boolean;
  totalSyncedTransactions: number;
}

interface UnlinkedAccountDTO {
  id: string;
  name: string;
  institution: string;
  accountNumberMasked: string | null;
  type: string;
  openingBalance: number;
}

interface SABankConnector {
  id: string;
  institution: string;
  displayName: string;
  primaryColor: string;
  logoText: string;
  supportedProducts: string[];
  status: string;
  isRecommended: boolean;
}

export function BankingTab() {
  const [connections, setConnections] = useState<BankConnectionDTO[]>([]);
  const [unlinkedAccounts, setUnlinkedAccounts] = useState<UnlinkedAccountDTO[]>([]);
  const [connectors, setConnectors] = useState<SABankConnector[]>([]);
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // Link Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [selectedConnector, setSelectedConnector] = useState<SABankConnector | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isLinking, setIsLinking] = useState<boolean>(false);

  const loadBankingData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/banking");
      if (!res.ok) throw new Error("Failed to fetch banking connections");
      const data = await res.json();
      setConnections(data.connections || []);
      setUnlinkedAccounts(data.unlinkedAccounts || []);
      setConnectors(data.availableConnectors || []);
      setIsSandboxMode(data.isSandboxMode ?? true);
    } catch (err: any) {
      console.error(err);
      setFeedback({ ok: false, message: err.message || "Failed to load bank sync data." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBankingData();
  }, []);

  const triggerFeedback = (fb: { ok: boolean; message: string }) => {
    setFeedback(fb);
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      const res = await fetch("/api/banking/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncAll: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      triggerFeedback({
        ok: true,
        message: data.message || "All bank accounts synchronized successfully!",
      });
      await loadBankingData();
    } catch (err: any) {
      triggerFeedback({ ok: false, message: err.message || "Error syncing bank feeds." });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSyncSingle = async (connectionId: string, accountName: string) => {
    setSyncingId(connectionId);
    try {
      const res = await fetch("/api/banking/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      triggerFeedback({
        ok: true,
        message: data.message || `Successfully synced ${accountName}!`,
      });
      await loadBankingData();
    } catch (err: any) {
      triggerFeedback({ ok: false, message: err.message || `Error syncing ${accountName}.` });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (connectionId: string, accountName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${accountName} from live bank API sync?`)) return;

    try {
      const res = await fetch(`/api/banking/${connectionId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disconnect");
      triggerFeedback({
        ok: true,
        message: data.message || `Disconnected ${accountName}.`,
      });
      await loadBankingData();
    } catch (err: any) {
      triggerFeedback({ ok: false, message: err.message || "Failed to disconnect bank account." });
    }
  };

  const handleOpenLinkModal = (connector?: SABankConnector) => {
    setSelectedConnector(connector || connectors[0] || null);
    if (unlinkedAccounts.length > 0) {
      setSelectedAccountId(unlinkedAccounts[0].id);
    }
    setIsLinkModalOpen(true);
  };

  const handleConfirmLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      alert("Please select an account to link.");
      return;
    }

    setIsLinking(true);
    try {
      const res = await fetch("/api/banking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          institution: selectedConnector?.institution || "Standard Bank",
          syncFrequency: "DAILY",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to link account");

      setIsLinkModalOpen(false);
      triggerFeedback({
        ok: true,
        message: data.message || "Bank account linked successfully! Ingesting initial transactions...",
      });

      // Auto-trigger first sync
      await fetch("/api/banking/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: data.id }),
      });

      await loadBankingData();
    } catch (err: any) {
      alert(err.message || "Failed to link bank account.");
    } finally {
      setIsLinking(false);
    }
  };

  const formatZAR = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Action Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.4px" }}>
              South African Bank Feeds &amp; Open Banking
            </h2>
            <span className="badge blue">Stitch Open Finance</span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", margin: "4px 0 0 0" }}>
            Automated real-time statement feeds for South African banks, paired with multi-agent document ingestion.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll || connections.length === 0}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={isSyncingAll ? "animate-spin" : ""} />
            <span>{isSyncingAll ? "Syncing All Feeds..." : "Sync All Feeds"}</span>
          </button>

          <button
            onClick={() => handleOpenLinkModal()}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} />
            <span>Connect SA Bank</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedback && (
        <div className={`urgency-banner ${feedback.ok ? "amber" : ""}`} style={{ borderColor: feedback.ok ? "var(--green)" : "var(--red)", borderLeftColor: feedback.ok ? "var(--green)" : "var(--red)" }}>
          <div className="urgency-banner-icon" style={{ color: feedback.ok ? "var(--green)" : "var(--red)" }}>
            {feedback.ok ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
          </div>
          <div>
            <div className="urgency-banner-title">
              {feedback.ok ? "System Synchronized" : "Bank Feed Alert"}
            </div>
            <div className="urgency-banner-text">{feedback.message}</div>
          </div>
        </div>
      )}

      {/* Key Metrics Cards using Global .stat-grid & .stat-card classes */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Active Bank Feeds</div>
          <div className="stat-value gold" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {connections.length}
            <span className="badge active" style={{ fontSize: "10px" }}>Live Feed</span>
          </div>
          <div className="stat-sub">
            Standard Bank Prestige, MyMo &amp; Titanium Card
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Hybrid Ingestion Architecture</div>
          <div className="stat-value" style={{ fontSize: "20px", color: "var(--cyan)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Zap size={22} style={{ color: "var(--gold)" }} />
            API + Document Fallback
          </div>
          <div className="stat-sub">
            Live bank feeds + PDF OCR vision for invoices &amp; municipal
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Open Finance Engine</div>
          <div className="stat-value" style={{ fontSize: "20px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={22} style={{ color: "var(--green)" }} />
            Stitch Open Banking
          </div>
          <div className="stat-sub" style={{ color: isSandboxMode ? "var(--gold)" : "var(--green)" }}>
            {isSandboxMode ? "⚡ Sandbox & Live Simulator Active" : "🔒 Production Stitch OAuth"}
          </div>
        </div>
      </div>

      {/* Section 1: Active Connected Bank Accounts */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Activity size={18} style={{ color: "var(--green)" }} />
            <h3 className="card-title" style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)" }}>
              Connected Bank Feeds ({connections.length})
            </h3>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Read-Only Consent Active
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }} className="animate-pulse">
            Loading bank feed connections…
          </div>
        ) : connections.length === 0 ? (
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <Building2 size={48} style={{ color: "var(--text-muted)", margin: "0 auto 16px" }} />
            <h4 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>
              No Bank Accounts Linked via API Yet
            </h4>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto 20px" }}>
              Connect your South African bank accounts (Standard Bank, Capitec, FNB, Nedbank) to stream live transactions directly without manual statement uploads.
            </p>
            <button onClick={() => handleOpenLinkModal()} className="btn btn-primary btn-sm">
              + Connect Your First Bank
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
            {connections.map((conn) => (
              <div
                key={conn.id}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all var(--transition)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "var(--radius-md)",
                        background: "var(--gold-dim)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--gold-light)",
                        fontWeight: "900",
                        fontSize: "13px",
                      }}
                    >
                      SBG
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
                        {conn.accountName}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{conn.institution}</span>
                        <span>•</span>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{conn.accountNumberMasked}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${conn.consentStatus === "ACTIVE" ? "active" : "danger"}`}>
                    {conn.consentStatus === "ACTIVE" ? "Live Feed" : conn.consentStatus}
                  </span>
                </div>

                <div style={{ margin: "14px 0", padding: "14px", background: "var(--bg-input)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Current Tracked Balance</span>
                    <span
                      style={{
                        fontSize: "18px",
                        fontWeight: "800",
                        color: conn.currentBalance >= 0 ? "var(--text-primary)" : "var(--red)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {formatZAR(conn.currentBalance)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--text-muted)" }}>
                    <span>Last Synced: {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleString("en-ZA") : "Just now"}</span>
                    <span>{conn.totalSyncedTransactions} Transactions</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", paddingTop: "10px", borderTop: "1px solid var(--border-light)" }}>
                  <button
                    onClick={() => handleSyncSingle(conn.id, conn.accountName)}
                    disabled={syncingId === conn.id}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "12px" }}
                  >
                    <RefreshCw size={13} className={syncingId === conn.id ? "animate-spin" : ""} />
                    <span>{syncingId === conn.id ? "Syncing..." : "Sync Feed"}</span>
                  </button>

                  <button
                    onClick={() => handleDisconnect(conn.id, conn.accountName)}
                    className="btn btn-danger btn-sm"
                    style={{ fontSize: "12px", padding: "6px 10px" }}
                  >
                    <Trash2 size={13} />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: South African Bank Connectors Directory */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Building2 size={18} style={{ color: "var(--cyan)" }} />
            <h3 className="card-title" style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)" }}>
              Supported South African Commercial Banks (8)
            </h3>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Stitch Open Finance Hub
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {connectors.map((c) => (
            <div
              key={c.id}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "14px",
                transition: "all var(--transition)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "var(--radius-md)",
                    background: c.primaryColor || "var(--bg-card)",
                    color: "#ffffff",
                    fontWeight: "900",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  {c.logoText}
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {c.displayName}
                  </div>
                  <div style={{ fontSize: "11px", color: c.status === "ACTIVE" ? "var(--green)" : "var(--text-muted)", fontWeight: "600" }}>
                    {c.status === "ACTIVE" ? "✓ Open Banking Active" : "Stitch Beta"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {c.supportedProducts.slice(0, 2).map((p) => (
                  <span
                    key={p}
                    style={{
                      fontSize: "10px",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--border-light)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>

              <button
                onClick={() => handleOpenLinkModal(c)}
                className={`btn btn-sm ${c.isRecommended ? "btn-primary" : "btn-secondary"}`}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <span>Connect {c.displayName}</span>
                <ArrowUpRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Inbound Email Statement Scanner Hub */}
      <div>
        <EmailScannerHub />
      </div>

      {/* Connect Bank Modal using Global Form & Modal styling */}
      {isLinkModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "var(--glass-blur)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "var(--bg-modal)",
              border: "1px solid var(--border-hover)",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Landmark size={22} style={{ color: "var(--gold)" }} />
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                  Link {selectedConnector?.displayName || "Bank Account"}
                </h3>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmLink} className="form-group" style={{ gap: "16px" }}>
              <div>
                <label className="form-label required">
                  Select Internal Account to Link with API Feed
                </label>
                {unlinkedAccounts.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "var(--text-muted)", padding: "12px", background: "var(--bg-input)", borderRadius: "var(--radius-md)" }}>
                    All accounts are already linked or no accounts exist.
                  </div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="form-select"
                    required
                  >
                    {unlinkedAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.institution}) — {acc.type}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div
                style={{
                  padding: "14px",
                  background: "var(--cyan-dim)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--cyan)", fontSize: "12.5px", fontWeight: "700", marginBottom: "4px" }}>
                  <ShieldCheck size={16} /> Stitch Open Banking Authorization
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  You will be connected via Stitch financial API with read-only transaction consent. Your banking credentials are encrypted and never stored on MoneyManager servers.
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLinking || unlinkedAccounts.length === 0}
                  className="btn btn-primary btn-sm"
                >
                  {isLinking ? "Authorizing with Stitch..." : "Authorize & Connect Bank"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

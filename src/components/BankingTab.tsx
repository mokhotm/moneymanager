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
  CreditCard,
  Landmark,
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
    <div>
      {/* Header Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
            South African Bank Feeds &amp; Open Banking
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: "4px 0 0 0" }}>
            Automated bank statement feeds via Stitch Open Finance, paired with multi-agent document ingestion.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll || connections.length === 0}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px" }}
          >
            <RefreshCw size={14} className={isSyncingAll ? "animate-spin" : ""} />
            {isSyncingAll ? "Syncing All Feeds..." : "Sync All Feeds"}
          </button>

          <button
            onClick={() => handleOpenLinkModal()}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px" }}
          >
            <Plus size={14} />
            Connect SA Bank
          </button>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedback && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "12px",
            marginBottom: "24px",
            background: feedback.ok ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${feedback.ok ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
            color: feedback.ok ? "#34d399" : "#f87171",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          {feedback.ok ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <div style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
            Active Bank Feeds
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", display: "flex", alignItems: "center", gap: "10px" }}>
            {connections.length}
            <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "12px" }}>
              ● Real-time Active
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
            Standard Bank Prestige, MyMo &amp; Titanium Card
          </div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
            Hybrid Engine Mode
          </div>
          <div style={{ fontSize: "18px", fontWeight: "800", color: "#38bdf8", display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <Zap size={20} style={{ color: "#fbbf24" }} />
            API + Document Fallback
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
            Live bank transactions + PDF OCR for municipal &amp; tax
          </div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
            Integration Engine
          </div>
          <div style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <ShieldCheck size={20} style={{ color: "#34d399" }} />
            Stitch Open Finance
          </div>
          <div style={{ fontSize: "12px", color: isSandboxMode ? "#fbbf24" : "#10b981", marginTop: "8px" }}>
            {isSandboxMode ? "⚡ Sandbox &amp; Live Simulator Active" : "🔒 Production Stitch OAuth"}
          </div>
        </div>
      </div>

      {/* Section 1: Active Connected Bank Accounts */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#f1f5f9", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={18} style={{ color: "#10b981" }} />
            Connected Bank Feeds ({connections.length})
          </h3>
        </div>

        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading bank connections...</div>
        ) : connections.length === 0 ? (
          <div
            style={{
              background: "rgba(15, 23, 42, 0.4)",
              border: "1px dashed rgba(255, 255, 255, 0.15)",
              borderRadius: "16px",
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <Building2 size={48} style={{ color: "#64748b", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc", marginBottom: "6px" }}>
              No Bank Accounts Linked via API Yet
            </h3>
            <p style={{ fontSize: "13px", color: "#94a3b8", maxWidth: "480px", margin: "0 auto 20px" }}>
              Connect your South African bank accounts (Standard Bank, Capitec, FNB, Nedbank) to stream live transactions directly without manual statement uploads.
            </p>
            <button
              onClick={() => handleOpenLinkModal()}
              style={{
                padding: "10px 20px",
                background: "#3b82f6",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              + Connect Your First Bank
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
            {connections.map((conn) => (
              <div
                key={conn.id}
                style={{
                  background: "rgba(15, 23, 42, 0.7)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #0033aa, #001f66)",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontWeight: "900",
                        fontSize: "13px",
                      }}
                    >
                      SBG
                    </div>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                        {conn.accountName}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{conn.institution}</span>
                        <span>•</span>
                        <span style={{ fontFamily: "monospace" }}>{conn.accountNumberMasked}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: conn.consentStatus === "ACTIVE" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      color: conn.consentStatus === "ACTIVE" ? "#34d399" : "#f87171",
                      border: `1px solid ${conn.consentStatus === "ACTIVE" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                    }}
                  >
                    {conn.consentStatus === "ACTIVE" ? "Live Feed" : conn.consentStatus}
                  </span>
                </div>

                <div style={{ margin: "14px 0", padding: "12px", background: "rgba(0, 0, 0, 0.25)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>Current Tracked Balance</span>
                    <span style={{ fontSize: "18px", fontWeight: "800", color: conn.currentBalance >= 0 ? "#f8fafc" : "#f87171", fontFamily: "monospace" }}>
                      {formatZAR(conn.currentBalance)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#64748b" }}>
                    <span>Last Synced: {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleString("en-ZA") : "Just now"}</span>
                    <span>{conn.totalSyncedTransactions} Transactions</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <button
                    onClick={() => handleSyncSingle(conn.id, conn.accountName)}
                    disabled={syncingId === conn.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      background: "rgba(59, 130, 246, 0.12)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      borderRadius: "8px",
                      color: "#60a5fa",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: syncingId === conn.id ? "not-allowed" : "pointer",
                    }}
                  >
                    <RefreshCw size={13} className={syncingId === conn.id ? "animate-spin" : ""} />
                    {syncingId === conn.id ? "Syncing..." : "Sync Feed"}
                  </button>

                  <button
                    onClick={() => handleDisconnect(conn.id, conn.accountName)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: "8px",
                      color: "#f87171",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={13} />
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: South African Bank Connectors Directory */}
      <div style={{ marginBottom: "36px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#f1f5f9", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
          <Building2 size={18} style={{ color: "#38bdf8" }} />
          Supported South African Commercial Banks (8)
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          {connectors.map((c) => (
            <div
              key={c.id}
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: c.primaryColor || "#1e293b",
                    color: "#ffffff",
                    fontWeight: "900",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {c.logoText}
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc" }}>
                    {c.displayName}
                  </div>
                  <div style={{ fontSize: "11px", color: c.status === "ACTIVE" ? "#34d399" : "#94a3b8" }}>
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
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "rgba(255, 255, 255, 0.04)",
                      color: "#94a3b8",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>

              <button
                onClick={() => handleOpenLinkModal(c)}
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  background: c.isRecommended ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "rgba(255, 255, 255, 0.06)",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                Connect {c.displayName} <ArrowUpRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Inbound Email Statement Scanner Hub */}
      <div style={{ marginTop: "36px" }}>
        <EmailScannerHub />
      </div>

      {/* Connect Bank Modal */}
      {isLinkModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              borderRadius: "20px",
              padding: "28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Landmark size={22} style={{ color: "#38bdf8" }} />
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                  Link {selectedConnector?.displayName || "Bank Account"}
                </h3>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmLink}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "8px" }}>
                  Select Existing Internal Account to Pair
                </label>
                {unlinkedAccounts.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "#94a3b8", padding: "12px", background: "rgba(0, 0, 0, 0.2)", borderRadius: "8px" }}>
                    All accounts are already linked or no accounts exist.
                  </div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      color: "#f8fafc",
                      fontSize: "14px",
                      outline: "none",
                    }}
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

              <div style={{ padding: "14px", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "10px", marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>
                  <ShieldCheck size={16} /> Stitch Open Banking Authorization
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5 }}>
                  You will be connected via Stitch financial API with read-only transaction consent. Your credentials are never stored.
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  style={{
                    padding: "10px 18px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#cbd5e1",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLinking || unlinkedAccounts.length === 0}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: isLinking ? "not-allowed" : "pointer",
                  }}
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

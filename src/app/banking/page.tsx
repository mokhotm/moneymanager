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

export default function BankingHubPage() {
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
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 24px 80px" }}>
      {/* Header Title Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.2))",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Landmark size={20} style={{ color: "#38bdf8" }} />
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", margin: 0, letterSpacing: "-0.02em" }}>
              Bank & Account Sync Hub
            </h1>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                padding: "3px 8px",
                borderRadius: "20px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              OPTION C • HYBRID OPEN BANKING
            </span>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
            Automated real-time bank feeds for South African banks via Stitch Open Finance, paired with multi-agent OCR document fallback.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll || connections.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: isSyncingAll || connections.length === 0 ? "not-allowed" : "pointer",
              opacity: isSyncingAll || connections.length === 0 ? 0.6 : 1,
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            <RefreshCw size={16} className={isSyncingAll ? "animate-spin" : ""} />
            {isSyncingAll ? "Syncing All Feeds..." : "Sync All Feeds"}
          </button>

          <button
            onClick={() => handleOpenLinkModal()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            <Plus size={16} />
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "32px" }}>
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
            Standard Bank Prestige, MyMo & Titanium Card
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
            Live bank transactions + PDF OCR for municipal & tax
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
            {isSandboxMode ? "⚡ Sandbox & Live Simulator Active" : "🔒 Production Stitch OAuth"}
          </div>
        </div>
      </div>

      {/* Section 1: Active Connected Bank Accounts */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#f1f5f9", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={20} style={{ color: "#10b981" }} />
            Connected Bank Feeds ({connections.length})
          </h2>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "16px" }}>
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
                        fontWeight: "800",
                        color: "#ffffff",
                        fontSize: "13px",
                      }}
                    >
                      {conn.institution.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc" }}>{conn.accountName}</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                        {conn.institution} • {conn.accountNumberMasked}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#34d399",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }}></span>
                    LIVE SYNC
                  </span>
                </div>

                <div style={{ background: "rgba(7, 11, 20, 0.6)", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>Current Cleared Balance</span>
                    <span style={{ fontSize: "16px", fontWeight: "800", color: conn.currentBalance < 0 ? "#f87171" : "#34d399" }}>
                      {formatZAR(conn.currentBalance)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#64748b" }}>
                    <span>Synced Transactions: <strong style={{ color: "#cbd5e1" }}>{conn.totalSyncedTransactions}</strong></span>
                    <span>Last sync: {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleTimeString() : "Pending"}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={() => handleSyncSingle(conn.id, conn.accountName)}
                    disabled={syncingId === conn.id}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "8px 12px",
                      background: "rgba(59, 130, 246, 0.15)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      color: "#38bdf8",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: syncingId === conn.id ? "not-allowed" : "pointer",
                    }}
                  >
                    <RefreshCw size={14} className={syncingId === conn.id ? "animate-spin" : ""} />
                    {syncingId === conn.id ? "Syncing..." : "Sync Feed"}
                  </button>

                  <button
                    onClick={() => handleDisconnect(conn.id, conn.accountName)}
                    title="Disconnect Bank Feed"
                    style={{
                      padding: "8px 12px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#f87171",
                      borderRadius: "8px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: South African Bank Directory & Connectors */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#f1f5f9", margin: 0, marginBottom: "4px" }}>
            Supported South African Bank Connectors
          </h2>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
            Direct Open Banking connectors powered by Stitch GraphQL protocol.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {connectors.map((bank) => (
            <div
              key={bank.id}
              style={{
                background: "rgba(15, 23, 42, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: bank.primaryColor,
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: "800",
                      }}
                    >
                      {bank.logoText}
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc" }}>{bank.displayName}</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "14px" }}>
                  {bank.supportedProducts.map((p, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "#94a3b8",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleOpenLinkModal(bank)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.2s ease",
                }}
              >
                <Plus size={14} />
                Link {bank.institution}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: E-Statement Email Scanner & Ingestion */}
      <div style={{ marginBottom: "40px" }}>
        <EmailScannerHub />
      </div>

      {/* Link Account Modal */}
      {isLinkModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#0b1220",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "480px",
              padding: "28px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                Link {selectedConnector?.institution || "Bank"} via Stitch
              </h3>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmLink}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Select Internal Account to Connect
                </label>
                {unlinkedAccounts.length > 0 ? (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "rgba(7, 11, 20, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      color: "#f8fafc",
                      fontSize: "14px",
                      outline: "none",
                    }}
                    required
                  >
                    {unlinkedAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id} style={{ background: "#0f172a" }}>
                        {acc.name} ({acc.institution} • {acc.accountNumberMasked || "No mask"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: "13px", color: "#f87171", padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>
                    All existing accounts are already connected! Create a new account in Accounts & Cards first if needed.
                  </div>
                )}
              </div>

              <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "10px", padding: "12px 14px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", color: "#93c5fd", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldCheck size={16} />
                  Secure Tokenized Handshake
                </div>
                <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
                  Connection is secured with AES-256 encryption. Read-only balance and transaction access only.
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    color: "#cbd5e1",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLinking || unlinkedAccounts.length === 0}
                  style={{
                    flex: 2,
                    padding: "12px",
                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: isLinking || unlinkedAccounts.length === 0 ? "not-allowed" : "pointer",
                    opacity: isLinking || unlinkedAccounts.length === 0 ? 0.6 : 1,
                  }}
                >
                  {isLinking ? "Connecting..." : "Confirm & Connect Feed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

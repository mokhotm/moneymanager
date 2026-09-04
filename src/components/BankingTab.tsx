"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Activity,
  Trash2,
  Lock,
  Radio,
  Sliders,
  Check,
  AlertCircle,
  HelpCircle,
  Clock,
  Zap,
  KeyRound,
  Eye,
  EyeOff,
  ArrowUpRight,
  Landmark,
  Search,
} from "lucide-react";
import { SABankConnector } from "@/services/stitchOpenBankingService";

export interface BankConnectionDTO {
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

export function BankingTab() {
  const [connections, setConnections] = useState<BankConnectionDTO[]>([]);
  const [connectors, setConnectors] = useState<SABankConnector[]>([]);
  const [isGatewayConfigured, setIsGatewayConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [userRole, setUserRole] = useState<string>("user");

  // Live connecting state
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Bank Picker Modal state
  const [isBankPickerOpen, setIsBankPickerOpen] = useState<boolean>(false);
  const [bankSearchQuery, setBankSearchQuery] = useState<string>("");

  const loadBankingData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/banking");
      if (!res.ok) throw new Error("Failed to fetch live banking connections");
      const data = await res.json();
      setConnections(data.connections || []);
      setConnectors(data.availableConnectors || []);
      setIsGatewayConfigured(Boolean(data.isGatewayConfigured));
      if (data.userRole) setUserRole(data.userRole);
    } catch (err: any) {
      console.error(err);
      setFeedback({ ok: false, message: err.message || "Failed to load live bank connections." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBankingData();

    // Check URL search params for OAuth feedback
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const successMsg = urlParams.get("success");
      const errorMsg = urlParams.get("error");
      if (successMsg) {
        setFeedback({ ok: true, message: successMsg });
        window.history.replaceState({}, document.title, window.location.pathname + "?tab=banking");
      } else if (errorMsg) {
        setFeedback({ ok: false, message: errorMsg });
        window.history.replaceState({}, document.title, window.location.pathname + "?tab=banking");
      }
    }
  }, []);

  const triggerFeedback = (fb: { ok: boolean; message: string }) => {
    setFeedback(fb);
    setTimeout(() => setFeedback(null), 6000);
  };

  // Launch live OAuth connection to selected bank
  const handleConnectBank = async (institutionId?: string) => {
    setIsConnecting(true);
    setIsBankPickerOpen(false);
    try {
      const res = await fetch("/api/banking/auth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.isConfigured === false) {
          if (userRole === "admin") {
            throw new Error("Stitch Open Finance gateway not configured. Please configure your API keys in Settings > Admin Gateway.");
          } else {
            throw new Error("Live bank feed is awaiting administrator gateway activation. Please contact your system administrator.");
          }
        }
        throw new Error(data.error || "Failed to initiate live bank connection");
      }

      if (data.authUrl) {
        const selectedBank = institutionId ? connectors.find((c) => c.id === institutionId) : null;
        const bankName = selectedBank ? selectedBank.institution : "your bank";
        triggerFeedback({
          ok: true,
          message: `Redirecting to ${bankName}'s official authentication portal...`,
        });
        window.location.href = data.authUrl;
      }
    } catch (err: any) {
      triggerFeedback({ ok: false, message: err.message });
    } finally {
      setIsConnecting(false);
    }
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
        message: data.message || "All live bank accounts synchronized successfully!",
      });
      await loadBankingData();
    } catch (err: any) {
      triggerFeedback({ ok: false, message: err.message || "Error syncing live bank feeds." });
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Action Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.4px" }}>
              Live Open Banking Feeds
            </h2>
            <span className="badge blue">Stitch FSCA Open Finance</span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", margin: "4px 0 0 0" }}>
            Real-time API feeds directly from South African financial institutions. Zero mock data, zero statement fallbacks.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncingAll || connections.length === 0}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={isSyncingAll ? "animate-spin" : ""} />
            <span>{isSyncingAll ? "Syncing Feeds..." : "Sync All Feeds"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBankPickerOpen(true)}
            disabled={isConnecting}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} />
            <span>{isConnecting ? "Connecting..." : "Connect Bank Account"}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background: feedback.ok ? "var(--green-dim)" : "var(--red-dim)",
            border: `1px solid ${feedback.ok ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: feedback.ok ? "var(--green)" : "var(--red)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13.5px",
            fontWeight: "600",
          }}
        >
          {feedback.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Live Gateway Security Notice */}
      <div
        className="card"
        style={{
          padding: "18px 22px",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(13, 20, 36, 0.95) 100%)",
          borderColor: "rgba(16, 185, 129, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={20} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              Ground-Truth Live Open Banking Protocol
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>
              MoneyManager strictly communicates with FSCA-licensed Open Finance APIs (OAuth 2.0). Raw online banking credentials and passwords are never intercepted or stored.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 99,
              background: isGatewayConfigured ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
              color: isGatewayConfigured ? "#34d399" : "#fbbf24",
              border: isGatewayConfigured ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isGatewayConfigured ? "#10b981" : "#f59e0b",
              }}
            />
            {isGatewayConfigured ? "Gateway Ready" : "Awaiting Credentials"}
          </span>
        </div>
      </div>

      {/* Section 1: Active Connected Bank Feeds */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={18} style={{ color: "var(--green)" }} />
            Active Live Bank Feeds ({connections.length})
          </h3>
          <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
            Real-time balance &amp; transaction synchronization
          </span>
        </div>

        {isLoading ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px", color: "var(--gold)" }} />
            <p style={{ margin: 0, fontSize: "14px" }}>Loading live bank connections...</p>
          </div>
        ) : connections.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "44px 24px",
              textAlign: "center",
              background: "var(--bg-card)",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <Building2 size={40} style={{ color: "var(--text-muted)", margin: "0 auto 14px", opacity: 0.6 }} />
            <h4 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)", margin: "0 0 8px 0" }}>
              No Live Bank Feeds Connected
            </h4>
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", maxWidth: "520px", margin: "0 auto 20px", lineHeight: 1.6 }}>
              In accordance with our strict zero-mock policy, this page only displays genuine accounts connected via the live Open Banking API. Uploaded PDF statements remain securely isolated in your Document Vault.
            </p>
            <button
              type="button"
              onClick={() => setIsBankPickerOpen(true)}
              className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Plus size={16} />
              <span>Connect Bank Account (Live OAuth)</span>
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="card"
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "14.5px", fontWeight: "800", color: "var(--text-primary)" }}>
                        {conn.accountName}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {conn.institution} &middot; {conn.accountNumberMasked}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "800",
                        padding: "2px 8px",
                        borderRadius: "99px",
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "#34d399",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      LIVE ACTIVE
                    </span>
                  </div>

                  <div style={{ marginTop: "14px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                      Live Balance
                    </div>
                    <div
                      style={{
                        fontSize: "22px",
                        fontWeight: "800",
                        fontFamily: "var(--font-mono)",
                        color: conn.currentBalance < 0 ? "var(--red)" : "var(--green)",
                        marginTop: "4px",
                      }}
                    >
                      R {conn.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "10px" }}>
                    Last Synced: {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleString() : "Never"}
                    <br />
                    Live Transactions Ingested: <strong>{conn.totalSyncedTransactions}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: "1px solid var(--border-light)" }}>
                  <button
                    type="button"
                    onClick={() => handleSyncSingle(conn.id, conn.accountName)}
                    disabled={syncingId === conn.id}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <RefreshCw size={12} className={syncingId === conn.id ? "animate-spin" : ""} />
                    <span>{syncingId === conn.id ? "Syncing..." : "Sync Now"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDisconnect(conn.id, conn.accountName)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: "var(--red)", borderColor: "rgba(239, 68, 68, 0.3)" }}
                    title="Disconnect bank feed"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Supported South African Bank Connectors */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Landmark size={18} color="#f59e0b" />
            Supported South African Bank Connectors
          </h3>
          <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
            Direct Open Finance API Integrations
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
          {connectors.map((bank) => (
            <div
              key={bank.id}
              className="card"
              style={{
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "14px",
                background: "var(--bg-card)",
                border: bank.isRecommended ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid var(--border)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "var(--radius-sm)",
                        background: bank.primaryColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: 11,
                      }}
                    >
                      {bank.logoText}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>
                        {bank.institution}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {bank.displayName}
                      </div>
                    </div>
                  </div>

                  {bank.isRecommended && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "rgba(245, 158, 11, 0.15)",
                        color: "#fbbf24",
                      }}
                    >
                      Recommended
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {bank.supportedProducts.slice(0, 3).map((prod: string) => (
                    <span
                      key={prod}
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        background: "rgba(255, 255, 255, 0.03)",
                        padding: "2px 6px",
                        borderRadius: 3,
                        border: "1px solid var(--border-light)",
                      }}
                    >
                      {prod}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleConnectBank(bank.id)}
                disabled={isConnecting}
                className="btn btn-secondary btn-sm"
                style={{ width: "100%", justifyContent: "space-between" }}
              >
                <span>Connect Live Feed</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Universal Bank Selection Modal ──────────────────────────── */}
      {isBankPickerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 640,
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <Landmark size={20} color="#f59e0b" />
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                    Select Financial Institution
                  </h3>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                  Choose your bank to initiate a secure, direct Open Banking authentication session.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBankPickerOpen(false);
                  setBankSearchQuery("");
                }}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Search Input */}
            <div style={{ padding: "16px 28px 12px", borderBottom: "1px solid var(--border-light)" }}>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search bank name (e.g. Capitec, FNB, Standard Bank, Investec)..."
                  value={bankSearchQuery}
                  onChange={(e) => setBankSearchQuery(e.target.value)}
                  style={{ paddingLeft: 40 }}
                  autoFocus
                />
              </div>
            </div>

            {/* Bank List */}
            <div style={{ padding: "16px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, maxHeight: "420px" }}>
              {connectors.filter((b) => {
                const q = bankSearchQuery.toLowerCase();
                return (
                  b.institution.toLowerCase().includes(q) ||
                  b.displayName.toLowerCase().includes(q) ||
                  b.id.toLowerCase().includes(q)
                );
              }).length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--text-muted)", fontSize: 13.5 }}>
                  No banking institutions match &ldquo;{bankSearchQuery}&rdquo;
                </div>
              ) : (
                connectors
                  .filter((b) => {
                    const q = bankSearchQuery.toLowerCase();
                    return (
                      b.institution.toLowerCase().includes(q) ||
                      b.displayName.toLowerCase().includes(q) ||
                      b.id.toLowerCase().includes(q)
                    );
                  })
                  .map((bank) => (
                    <div
                      key={bank.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderRadius: "var(--radius-md)",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--border-light)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "var(--radius-sm)",
                            background: bank.primaryColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: 12,
                            flexShrink: 0,
                          }}
                        >
                          {bank.logoText}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                            {bank.institution}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {bank.displayName}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConnectBank(bank.id)}
                        disabled={isConnecting}
                        className="btn btn-secondary btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        <span>Connect</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  ))
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 28px",
                borderTop: "1px solid var(--border)",
                background: "rgba(0, 0, 0, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={14} color="#10b981" />
                FSCA-Regulated Open Finance • OAuth 2.0
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsBankPickerOpen(false);
                  setBankSearchQuery("");
                }}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

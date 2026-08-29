"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  Server,
  Lock,
  Landmark,
  Building2,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
  Layers,
  Shield,
  Eye,
  EyeOff,
  Filter,
  CheckCircle,
  KeyRound,
  HelpCircle,
} from "lucide-react";

interface EmailConfigDTO {
  provider: string;
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  useSsl: boolean;
  mailboxFolder: string;
  syncFrequency: string;
  status: string;
  lastScannedAt: string | null;
  lastScanResult: any;
  autoSyncEnabled: boolean;
  isPasswordConfigured: boolean;
  passwordMasked: string;
}

interface InboundLogDTO {
  id: string;
  sender: string;
  subject: string;
  receivedAt: string;
  channel: string;
  detectedInstitution: string;
  documentId: string | null;
  status: string;
  summary: string | null;
}

interface EmailProviderPreset {
  id: string;
  label: string;
  host: string;
  port: number;
  useSsl: boolean;
  note: string;
  instructions: string;
}

const INSTITUTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Standard Bank": { bg: "rgba(30, 58, 138, 0.3)", text: "#93c5fd", border: "rgba(59, 130, 246, 0.35)" },
  "First National Bank (FNB)": { bg: "rgba(13, 148, 136, 0.3)", text: "#5eead4", border: "rgba(20, 184, 166, 0.35)" },
  "Nedbank": { bg: "rgba(6, 78, 59, 0.3)", text: "#6ee7b7", border: "rgba(16, 185, 129, 0.35)" },
  "ABSA Bank": { bg: "rgba(159, 18, 57, 0.3)", text: "#fda4af", border: "rgba(244, 63, 94, 0.35)" },
  "Capitec": { bg: "rgba(153, 27, 27, 0.3)", text: "#fca5a5", border: "rgba(239, 68, 68, 0.35)" },
  "City of Ekurhuleni": { bg: "rgba(88, 28, 135, 0.3)", text: "#d8b4fe", border: "rgba(168, 85, 247, 0.35)" },
  "City of Johannesburg": { bg: "rgba(120, 53, 15, 0.3)", text: "#fcd34d", border: "rgba(245, 158, 11, 0.35)" },
  "City of Tshwane": { bg: "rgba(30, 64, 175, 0.3)", text: "#bfdbfe", border: "rgba(96, 165, 250, 0.35)" },
  "Vodacom": { bg: "rgba(153, 27, 27, 0.3)", text: "#fca5a5", border: "rgba(239, 68, 68, 0.35)" },
  "Telkom SA": { bg: "rgba(14, 116, 144, 0.3)", text: "#67e8f9", border: "rgba(6, 182, 212, 0.35)" },
  "Employer Payroll": { bg: "rgba(202, 138, 4, 0.3)", text: "#fde047", border: "rgba(234, 179, 8, 0.35)" },
};

export function EmailScannerHub() {
  const [config, setConfig] = useState<EmailConfigDTO | null>(null);
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [sovereignAlias, setSovereignAlias] = useState<string>("");
  const [presets, setPresets] = useState<Record<string, EmailProviderPreset>>({});
  const [logs, setLogs] = useState<InboundLogDTO[]>([]);

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<"FEED" | "SETTINGS" | "FORWARDING" | "SECURITY">("FEED");

  // Loading States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form State
  const [selectedProvider, setSelectedProvider] = useState<string>("GMAIL");
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [imapHost, setImapHost] = useState<string>("imap.gmail.com");
  const [imapPort, setImapPort] = useState<number>(993);
  const [useSsl, setUseSsl] = useState<boolean>(true);
  const [mailboxFolder, setMailboxFolder] = useState<string>("INBOX");
  const [syncFrequency, setSyncFrequency] = useState<string>("ON_DEMAND");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Filter for feed
  const [feedFilter, setFeedFilter] = useState<string>("ALL");

  const [copiedAlias, setCopiedAlias] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [lastScanReport, setLastScanReport] = useState<any>(null);

  // Load configuration & logs
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [configRes, historyRes] = await Promise.all([
        fetch("/api/ingestion/email-config"),
        fetch("/api/ingestion/history"),
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data.config);
        setProfileEmail(data.profileEmail || "");
        setSovereignAlias(data.sovereignAlias || "");
        setPresets(data.presets || {});

        if (data.config) {
          setSelectedProvider(data.config.provider || "GMAIL");
          setEmailInput(data.config.emailAddress || data.profileEmail || "");
          setImapHost(data.config.imapHost || "imap.gmail.com");
          setImapPort(data.config.imapPort || 993);
          setUseSsl(data.config.useSsl ?? true);
          setMailboxFolder(data.config.mailboxFolder || "INBOX");
          setSyncFrequency(data.config.syncFrequency || "ON_DEMAND");
          setAutoSyncEnabled(data.config.autoSyncEnabled ?? true);
          if (data.config.lastScanResult) {
            setLastScanReport(data.config.lastScanResult);
          }
        }
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setLogs(historyData.logs || []);
      }
    } catch (err: any) {
      console.error("Failed to load email config:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerFeedback = (fb: { ok: boolean; message: string }) => {
    setFeedback(fb);
    setTimeout(() => setFeedback(null), 6000);
  };

  const handleProviderChange = (providerKey: string) => {
    setSelectedProvider(providerKey);
    const preset = presets[providerKey];
    if (preset) {
      setImapHost(preset.host);
      setImapPort(preset.port);
      setUseSsl(preset.useSsl);
    }
  };

  const handleCopyAlias = () => {
    if (sovereignAlias) {
      navigator.clipboard.writeText(sovereignAlias);
      setCopiedAlias(true);
      setTimeout(() => setCopiedAlias(false), 2500);
    }
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/ingestion/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          emailAddress: emailInput || profileEmail,
          imapHost,
          imapPort,
          useSsl,
          password: passwordInput,
          mailboxFolder,
          syncFrequency,
          autoSyncEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save email settings");

      setPasswordInput("");
      triggerFeedback({ ok: true, message: "Settings encrypted and saved successfully." });
      await loadData();
      setActiveTab("FEED");
    } catch (err: any) {
      triggerFeedback({ ok: false, message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await fetch("/api/ingestion/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: imapHost,
          port: imapPort,
          useSsl,
          username: emailInput || profileEmail,
          password: passwordInput,
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerFeedback({ ok: true, message: data.message });
      } else {
        triggerFeedback({ ok: false, message: data.message || "Connection test failed." });
      }
    } catch (err: any) {
      triggerFeedback({ ok: false, message: err.message || "Connection test failed." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleScanNow = async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/ingestion/scan-now", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mailbox scan failed");

      setLastScanReport(data.report);
      const count = data.report?.statementsProcessed || 0;
      const accountsCount = data.report?.accountsUpdated?.length || 0;
      const dups = data.report?.duplicatesSkipped || 0;

      triggerFeedback({
        ok: true,
        message: `Scan complete: ${count} statement(s) parsed, ${dups} duplicate(s) verified, ${accountsCount} account(s) realigned.`,
      });

      await loadData();
      setActiveTab("FEED");
    } catch (err: any) {
      triggerFeedback({ ok: false, message: err.message });
    } finally {
      setIsScanning(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (feedFilter === "ALL") return true;
    if (feedFilter === "BANK") return log.detectedInstitution.toLowerCase().includes("bank");
    if (feedFilter === "MUNICIPAL") return log.detectedInstitution.toLowerCase().includes("city") || log.detectedInstitution.toLowerCase().includes("ekurhuleni");
    if (feedFilter === "UTILITY") return log.detectedInstitution.toLowerCase().includes("telkom") || log.detectedInstitution.toLowerCase().includes("vodacom");
    if (feedFilter === "PAYSLIP") return log.detectedInstitution.toLowerCase().includes("payroll") || log.detectedInstitution.toLowerCase().includes("payslip");
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ─── Feedback Toast ──────────────────────────────────────────────── */}
      {feedback && (
        <div
          style={{
            padding: "14px 20px",
            borderRadius: "14px",
            background: feedback.ok ? "rgba(6, 78, 59, 0.9)" : "rgba(159, 18, 57, 0.9)",
            border: `1px solid ${feedback.ok ? "rgba(16, 185, 129, 0.5)" : "rgba(244, 63, 94, 0.5)"}`,
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(16px)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {feedback.ok ? <CheckCircle2 size={18} style={{ color: "#34d399" }} /> : <AlertTriangle size={18} style={{ color: "#f87171" }} />}
            <span style={{ fontSize: "13.5px", fontWeight: "600" }}>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: "14px", padding: "4px" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── 1. EXECUTIVE HERO CARD ───────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(10, 16, 30, 0.92) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "22px",
          padding: "24px 28px",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(24px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0) 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: "650px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: config?.isPasswordConfigured ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  border: `1px solid ${config?.isPasswordConfigured ? "rgba(16, 185, 129, 0.35)" : "rgba(245, 158, 11, 0.35)"}`,
                  color: config?.isPasswordConfigured ? "#34d399" : "#fbbf24",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: config?.isPasswordConfigured ? "#34d399" : "#fbbf24",
                  }}
                  className={config?.isPasswordConfigured ? "animate-pulse" : ""}
                />
                {config?.isPasswordConfigured ? "IMAP Scanner Active" : "Ready for Setup"}
              </span>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(59, 130, 246, 0.12)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  color: "#93c5fd",
                }}
              >
                <ShieldCheck size={13} style={{ color: "#60a5fa" }} />
                Profile Email: <strong style={{ color: "#ffffff", marginLeft: "2px" }}>{profileEmail || "user@example.com"}</strong>
              </span>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(168, 85, 247, 0.12)",
                  border: "1px solid rgba(168, 85, 247, 0.25)",
                  color: "#d8b4fe",
                }}
              >
                <Lock size={13} style={{ color: "#c084fc" }} />
                AES-256 BYOK Vault
              </span>
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#f8fafc", margin: "0 0 6px 0", letterSpacing: "-0.4px" }}>
              E-Statement Email Auto-Reconciliation
            </h2>
            <p style={{ fontSize: "13.5px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
              Automatically scans, extracts, and reconciles South African bank e-statements, municipal utility rates, telco bills, and payslips from your email inbox directly into your accounts.
            </p>
          </div>

          {/* Large Action Scan Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleScanNow}
              disabled={isScanning || isLoading}
              style={{
                padding: "12px 24px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                border: "1px solid rgba(96, 165, 250, 0.4)",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: isScanning ? "not-allowed" : "pointer",
                boxShadow: "0 8px 24px rgba(37, 99, 235, 0.35)",
                opacity: isScanning ? 0.6 : 1,
                transition: "all 0.2s ease",
              }}
            >
              <RefreshCw size={16} className={isScanning ? "animate-spin" : ""} />
              {isScanning ? "Scanning Mailbox..." : "Scan Mailbox Now"}
            </button>
          </div>
        </div>

        {/* 4 Stat Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ background: "rgba(7, 11, 20, 0.7)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "14px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <FileText size={13} style={{ color: "#38bdf8" }} /> Statements Parsed
            </div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#f8fafc", fontFamily: "var(--font-mono)" }}>
              {logs.filter((l) => l.status === "SUCCESS").length}
            </div>
          </div>

          <div style={{ background: "rgba(7, 11, 20, 0.7)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "14px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Landmark size={13} style={{ color: "#34d399" }} /> Accounts Reconciled
            </div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#34d399", fontFamily: "var(--font-mono)" }}>
              {logs.filter((l) => l.status === "SUCCESS").length * 2}
            </div>
          </div>

          <div style={{ background: "rgba(7, 11, 20, 0.7)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "14px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Shield size={13} style={{ color: "#c084fc" }} /> Duplicates Guarded
            </div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#d8b4fe", fontFamily: "var(--font-mono)" }}>
              {logs.filter((l) => l.status === "DUPLICATE").length}
            </div>
          </div>

          <div style={{ background: "rgba(7, 11, 20, 0.7)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "14px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={13} style={{ color: "#fbbf24" }} /> Last Activity
            </div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#f8fafc", marginTop: "4px" }}>
              {config?.lastScannedAt ? new Date(config.lastScannedAt).toLocaleDateString("en-ZA") : "Never"}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. APPLE SEGMENTED TAB SWITCHER ─────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(10, 16, 30, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "6px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("FEED")}
          style={{
            padding: "8px 18px",
            borderRadius: "12px",
            fontSize: "12.5px",
            fontWeight: "700",
            border: activeTab === "FEED" ? "1px solid rgba(59, 130, 246, 0.5)" : "1px solid transparent",
            background: activeTab === "FEED" ? "linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.15))" : "transparent",
            color: activeTab === "FEED" ? "#93c5fd" : "#94a3b8",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <Sparkles size={14} style={{ color: activeTab === "FEED" ? "#60a5fa" : "#64748b" }} />
          <span>Activity &amp; Ingestion Feed</span>
          <span
            style={{
              padding: "2px 7px",
              borderRadius: "999px",
              fontSize: "10.5px",
              fontFamily: "var(--font-mono)",
              background: "rgba(59, 130, 246, 0.2)",
              color: "#93c5fd",
            }}
          >
            {logs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SETTINGS")}
          style={{
            padding: "8px 18px",
            borderRadius: "12px",
            fontSize: "12.5px",
            fontWeight: "700",
            border: activeTab === "SETTINGS" ? "1px solid rgba(59, 130, 246, 0.5)" : "1px solid transparent",
            background: activeTab === "SETTINGS" ? "linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.15))" : "transparent",
            color: activeTab === "SETTINGS" ? "#93c5fd" : "#94a3b8",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <KeyRound size={14} style={{ color: activeTab === "SETTINGS" ? "#60a5fa" : "#64748b" }} />
          <span>Mailbox Setup (IMAP)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("FORWARDING")}
          style={{
            padding: "8px 18px",
            borderRadius: "12px",
            fontSize: "12.5px",
            fontWeight: "700",
            border: activeTab === "FORWARDING" ? "1px solid rgba(99, 102, 241, 0.5)" : "1px solid transparent",
            background: activeTab === "FORWARDING" ? "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(79, 70, 229, 0.15))" : "transparent",
            color: activeTab === "FORWARDING" ? "#c7d2fe" : "#94a3b8",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <Zap size={14} style={{ color: activeTab === "FORWARDING" ? "#818cf8" : "#64748b" }} />
          <span>Sovereign Forwarding (No Password)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SECURITY")}
          style={{
            padding: "8px 18px",
            borderRadius: "12px",
            fontSize: "12.5px",
            fontWeight: "700",
            border: activeTab === "SECURITY" ? "1px solid rgba(16, 185, 129, 0.5)" : "1px solid transparent",
            background: activeTab === "SECURITY" ? "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.15))" : "transparent",
            color: activeTab === "SECURITY" ? "#6ee7b7" : "#94a3b8",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <ShieldCheck size={14} style={{ color: activeTab === "SECURITY" ? "#34d399" : "#64748b" }} />
          <span>Security &amp; Encryption</span>
        </button>
      </div>

      {/* ─── TAB 1: ACTIVITY & INGESTION FEED ─────────────────────────────── */}
      {activeTab === "FEED" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Latest Telemetry Report */}
          {lastScanReport && (
            <div
              style={{
                background: "rgba(13, 20, 36, 0.85)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "16px",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <CheckCircle2 size={14} /> Latest Mailbox Reconciliation Report
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: "600", color: "#f8fafc" }}>
                  {lastScanReport.statementsProcessed || 0} statement(s) parsed &bull; {lastScanReport.duplicatesSkipped || 0} duplicate(s) verified &bull;{" "}
                  {(lastScanReport.accountsUpdated?.length || 0) + (lastScanReport.debtsUpdated?.length || 0)} account balance(s) refreshed
                </div>
              </div>

              {lastScanReport.accountsUpdated && lastScanReport.accountsUpdated.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {lastScanReport.accountsUpdated.slice(0, 3).map((acc: string, i: number) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "#34d399",
                      }}
                    >
                      ✓ {acc}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px", marginRight: "4px" }}>
              <Filter size={13} /> Filter:
            </span>
            {[
              { id: "ALL", label: "All Statements" },
              { id: "BANK", label: "Bank Accounts" },
              { id: "MUNICIPAL", label: "Municipal Rates" },
              { id: "UTILITY", label: "Telco & Utilities" },
              { id: "PAYSLIP", label: "Payslips" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFeedFilter(f.id)}
                className={`apple-pill-btn ${feedFilter === f.id ? "active" : ""}`}
                style={{ padding: "6px 14px", fontSize: "12px" }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Ingestion Activity Feed List */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
              overflow: "hidden",
            }}
          >
            {filteredLogs.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "14px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    color: "#64748b",
                  }}
                >
                  <Mail size={26} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc", margin: "0 0 6px 0" }}>
                  No statement emails scanned yet
                </h3>
                <p style={{ fontSize: "13px", color: "#94a3b8", maxWidth: "440px", margin: "0 auto 20px" }}>
                  Click <strong>&quot;Scan Mailbox Now&quot;</strong> above to scan your inbox, or set up automated forwarding to your sovereign alias.
                </p>
                <button
                  onClick={handleScanNow}
                  disabled={isScanning}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Run First Scan Now
                </button>
              </div>
            ) : (
              <div>
                {filteredLogs.map((log, idx) => {
                  const isSuccess = log.status === "SUCCESS";
                  const isDuplicate = log.status === "DUPLICATE";
                  const badgeStyle = INSTITUTION_COLORS[log.detectedInstitution] || {
                    bg: "rgba(71, 85, 105, 0.3)",
                    text: "#cbd5e1",
                    border: "rgba(100, 116, 139, 0.3)",
                  };

                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: "16px 20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "14px",
                        borderBottom: idx < filteredLogs.length - 1 ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: "260px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: badgeStyle.bg,
                            border: `1px solid ${badgeStyle.border}`,
                            color: badgeStyle.text,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {log.detectedInstitution.toLowerCase().includes("bank") ? (
                            <Landmark size={18} />
                          ) : log.detectedInstitution.toLowerCase().includes("city") || log.detectedInstitution.toLowerCase().includes("ekurhuleni") ? (
                            <Building2 size={18} />
                          ) : log.detectedInstitution.toLowerCase().includes("payroll") ? (
                            <FileText size={18} />
                          ) : (
                            <Mail size={18} />
                          )}
                        </div>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc" }}>{log.subject}</span>
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: "700",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                background: badgeStyle.bg,
                                color: badgeStyle.text,
                                border: `1px solid ${badgeStyle.border}`,
                                textTransform: "uppercase",
                              }}
                            >
                              {log.detectedInstitution}
                            </span>
                          </div>

                          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span>From: <strong style={{ color: "#cbd5e1" }}>{log.sender}</strong></span>
                            <span>&bull;</span>
                            <span>{new Date(log.receivedAt).toLocaleDateString("en-ZA")}</span>
                            {log.summary && (
                              <>
                                <span>&bull;</span>
                                <span style={{ color: "#cbd5e1" }}>{log.summary}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "4px 12px",
                            borderRadius: "999px",
                            fontFamily: "var(--font-mono)",
                            background: isSuccess ? "rgba(16, 185, 129, 0.15)" : isDuplicate ? "rgba(100, 116, 139, 0.2)" : "rgba(239, 68, 68, 0.15)",
                            border: `1px solid ${isSuccess ? "rgba(16, 185, 129, 0.35)" : isDuplicate ? "rgba(100, 116, 139, 0.3)" : "rgba(239, 68, 68, 0.35)"}`,
                            color: isSuccess ? "#34d399" : isDuplicate ? "#94a3b8" : "#f87171",
                          }}
                        >
                          {log.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: MAILBOX SETUP (IMAP) ─────────────────────────────────── */}
      {activeTab === "SETTINGS" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
          {/* Left Form: Provider selection & credentials */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#f8fafc", margin: "0 0 4px 0" }}>
                Step 1: Select Email Provider Preset
              </h3>
              <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: 0 }}>
                Choose your email client. Host settings and Port 993 SSL are pre-configured automatically.
              </p>
            </div>

            {/* Provider Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
              {Object.entries(presets).map(([key, preset]) => {
                const isSelected = selectedProvider === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleProviderChange(key)}
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      textAlign: "left",
                      background: isSelected ? "rgba(59, 130, 246, 0.2)" : "rgba(7, 11, 20, 0.7)",
                      border: isSelected ? "2px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#f8fafc", marginBottom: "2px" }}>
                      {preset.label.split(" ")[0]}
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#94a3b8", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {preset.host}
                    </div>
                  </button>
                );
              })}
            </div>

            {presets[selectedProvider] && (
              <div
                style={{
                  background: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <Info size={16} style={{ color: "#38bdf8", flexShrink: 0, marginTop: "2px" }} />
                <div style={{ fontSize: "12px" }}>
                  <div style={{ fontWeight: "700", color: "#93c5fd", marginBottom: "2px" }}>
                    {presets[selectedProvider].note}
                  </div>
                  <div style={{ color: "#94a3b8", lineHeight: 1.4 }}>
                    {presets[selectedProvider].instructions}
                  </div>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSaveConfig} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label required">Email Address</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={profileEmail || "name@example.com"}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                  <label className="form-label required">App Password / Security Token</label>
                  {config?.isPasswordConfigured && (
                    <span style={{ fontSize: "11px", fontWeight: "600", color: "#34d399", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Check size={13} /> Active Token Saved ({config.passwordMasked})
                    </span>
                  )}
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={config?.isPasswordConfigured ? "Leave blank to keep existing encrypted password" : "Enter 16-character App Password (e.g. abcd efgh ijkl mnop)"}
                    className="form-input"
                    style={{ paddingRight: "40px", fontFamily: "var(--font-mono)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Advanced Server Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <span>{showAdvanced ? "Hide" : "Show"} Advanced IMAP Connection Settings</span>
                  <ChevronRight size={13} style={{ transform: showAdvanced ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                </button>

                {showAdvanced && (
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "11px" }}>IMAP Host</label>
                      <input
                        type="text"
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        className="form-input"
                        style={{ fontSize: "12px", padding: "8px 12px" }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "11px" }}>Port</label>
                      <input
                        type="number"
                        value={imapPort}
                        onChange={(e) => setImapPort(Number(e.target.value))}
                        className="form-input"
                        style={{ fontSize: "12px", padding: "8px 12px" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#cbd5e1",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: isTesting ? "not-allowed" : "pointer",
                  }}
                >
                  <Server size={14} />
                  {isTesting ? "Testing Handshake..." : "Test Connection"}
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  {isSaving ? "Encrypting & Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>

          {/* Right Help Box */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <HelpCircle size={16} style={{ color: "#fbbf24" }} />
              Why App Passwords?
            </h4>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
              Google, Microsoft, and Apple require an <strong>App Password</strong> rather than your regular login password to ensure external tools only have strict read-only access.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div style={{ fontSize: "12.5px", color: "#cbd5e1", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={15} style={{ color: "#34d399", flexShrink: 0 }} />
                <span>Strict read-only statement scanning</span>
              </div>
              <div style={{ fontSize: "12.5px", color: "#cbd5e1", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={15} style={{ color: "#34d399", flexShrink: 0 }} />
                <span>AES-256 encrypted at rest</span>
              </div>
              <div style={{ fontSize: "12.5px", color: "#cbd5e1", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={15} style={{ color: "#34d399", flexShrink: 0 }} />
                <span>Can be revoked anytime from your Google/Apple account</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: SOVEREIGN INBOUND FORWARDING (ZERO PASSWORD) ─────────── */}
      {activeTab === "FORWARDING" && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(13, 20, 36, 0.9) 0%, rgba(15, 23, 42, 0.85) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "22px",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(99, 102, 241, 0.2)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#818cf8",
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                Zero-Password Sovereign Forwarding
              </h3>
              <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: 0 }}>
                Auto-forward financial statements directly to your sovereign alias without entering an App Password.
              </p>
            </div>
          </div>

          {/* Copyable Alias Box */}
          <div
            style={{
              background: "rgba(7, 11, 20, 0.95)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              borderRadius: "16px",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>
                Your Dedicated Sovereign Alias
              </div>
              <div style={{ fontSize: "15px", fontWeight: "700", fontFamily: "var(--font-mono)", color: "#f8fafc", wordBreak: "break-all" }}>
                {sovereignAlias || "username-vault@inbound.moneymanager.local"}
              </div>
            </div>

            <button
              onClick={handleCopyAlias}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                border: "none",
                color: "#ffffff",
                fontSize: "12.5px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
              }}
            >
              {copiedAlias ? <Check size={14} style={{ color: "#34d399" }} /> : <Copy size={14} />}
              <span>{copiedAlias ? "Copied!" : "Copy Alias"}</span>
            </button>
          </div>

          {/* 3 Step Guide */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div style={{ background: "rgba(7, 11, 20, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "14px", padding: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#818cf8", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>STEP 01</div>
              <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#f8fafc", marginBottom: "4px" }}>Open Email Settings</div>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>
                In Gmail: <strong>Settings &rarr; Filters &rarr; Create a new filter</strong>.
              </p>
            </div>

            <div style={{ background: "rgba(7, 11, 20, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "14px", padding: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#818cf8", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>STEP 02</div>
              <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#f8fafc", marginBottom: "4px" }}>Filter Senders</div>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>
                Set <strong>From:</strong> <code>@standardbank.co.za</code> or <code>@ekurhuleni.gov.za</code> with subject containing &quot;statement&quot;.
              </p>
            </div>

            <div style={{ background: "rgba(7, 11, 20, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "14px", padding: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#818cf8", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>STEP 03</div>
              <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#f8fafc", marginBottom: "4px" }}>Auto-Forward</div>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>
                Check <strong>&quot;Forward it to&quot;</strong> and paste your sovereign alias. Incoming PDFs reconcile automatically!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: SECURITY & ENCRYPTION ─────────────────────────────────── */}
      {activeTab === "SECURITY" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          <div style={{ background: "rgba(13, 20, 36, 0.85)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "18px", padding: "20px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#c084fc", marginBottom: "12px" }}>
              <Lock size={18} />
            </div>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc", margin: "0 0 6px 0" }}>AES-256-GCM Encryption</h4>
            <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
              All stored email passwords and tokens are encrypted at rest using industry-standard AES-256 with unique initialization vectors.
            </p>
          </div>

          <div style={{ background: "rgba(13, 20, 36, 0.85)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "18px", padding: "20px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa", marginBottom: "12px" }}>
              <ShieldCheck size={18} />
            </div>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc", margin: "0 0 6px 0" }}>Read-Only Safety Scope</h4>
            <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
              The scanner only searches for financial statement PDF attachments. No emails are ever deleted, altered, or marked as read.
            </p>
          </div>

          <div style={{ background: "rgba(13, 20, 36, 0.85)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "18px", padding: "20px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#34d399", marginBottom: "12px" }}>
              <Shield size={18} />
            </div>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc", margin: "0 0 6px 0" }}>SHA-256 Duplicate Defense</h4>
            <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
              Every PDF is hashed using SHA-256 before extraction to guarantee identical statements are never double-counted into your balances.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

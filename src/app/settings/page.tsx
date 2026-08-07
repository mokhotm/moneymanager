"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import ThemeSelector from "@/components/ThemeSwitcher";
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Cpu,
  Key,
  ShieldCheck,
  Building,
  Sparkles,
  Bot,
  Plus,
  RefreshCw,
} from "lucide-react";

interface ProviderConfig {
  id: string;
  provider: string;
  displayName: string;
  apiKeyMasked: string;
  baseUrl: string | null;
  modelName: string;
  supportsVision: boolean;
  status: string;
  lastValidatedAt: string | null;
}

interface AgentAssignment {
  id: string;
  agent: string;
  configId: string;
  provider: string;
  displayName: string;
  modelName: string;
  supportsVision: boolean;
  status: string;
}

const PROVIDER_METADATA: Record<string, { label: string; color: string }> = {
  ANTHROPIC: { label: "Anthropic (Claude 3.7)", color: "#a855f7" },
  OPENAI: { label: "OpenAI (GPT-4o)", color: "#10b981" },
  GOOGLE: { label: "Google (Gemini 1.5 Pro)", color: "#f59e0b" },
  AZURE_OPENAI: { label: "Azure OpenAI", color: "#3b82f6" },
  CUSTOM: { label: "Custom Endpoint", color: "#64748b" },
};

const AGENT_LABELS: Record<string, { label: string; desc: string; iconColor: string }> = {
  DOCUMENT_AGENT: {
    label: "DOCUMENT_AGENT",
    desc: "Scans statement & payslip PDFs with Multi-Agent OCR and extracts line items. (Vision model recommended)",
    iconColor: "#3b82f6",
  },
  BUDGET_AGENT: {
    label: "BUDGET_AGENT",
    desc: "Arbitrates surplus cashflow allocations between debt payoff waterfalls and fixed household expenses.",
    iconColor: "#10b981",
  },
  DEBT_AGENT: {
    label: "DEBT_AGENT",
    desc: "Computes snowball & avalanche payoff timelines, shift narrations, and interest cost savings.",
    iconColor: "#f59e0b",
  },
  GOALS_AGENT: {
    label: "GOALS_AGENT",
    desc: "Tracks emergency reserves, house deposit targets, and high-yield ETF wealth accumulation.",
    iconColor: "#a855f7",
  },
};

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [assignments, setAssignments] = useState<AgentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Property data services state
  const [propCfg, setPropCfg] = useState<{
    windeedUsername: string;
    windeedPasswordMasked: string;
    windeedStatus: string;
    lightstoneKeyMasked: string;
    lightstoneStatus: string;
  } | null>(null);
  const [windeedForm, setWindeedForm] = useState({ username: "", password: "", showPw: false });
  const [lightstoneForm, setLightstoneForm] = useState({ apiKey: "", showKey: false });
  const [propSaving, setPropSaving] = useState<string | null>(null);
  const [propMsg, setPropMsg] = useState<{ provider: string; ok: boolean; text: string } | null>(null);

  const [form, setForm] = useState({
    provider: "GOOGLE",
    displayName: "",
    apiKey: "",
    baseUrl: "",
    modelName: "gemini-1.5-pro",
  });

  const loadSettings = async () => {
    try {
      // 1. Check Auth Status
      const authRes = await fetch("/api/auth/me").then((r) => r.json());
      const authed = authRes.authenticated === true;
      setIsAuthenticated(authed);

      if (authed) {
        const [cRes, aRes, pRes] = await Promise.all([
          fetch("/api/settings/llm-providers").then((r) => r.json()),
          fetch("/api/settings/agent-models").then((r) => r.json()),
          fetch("/api/settings/property-data").then((r) => r.json()),
        ]);
        setConfigs(Array.isArray(cRes) ? cRes : []);
        setAssignments(Array.isArray(aRes) ? aRes : []);
        if (pRes && !pRes.error) setPropCfg(pRes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const [testFeedback, setTestFeedback] = useState<{ id: string; ok: boolean; message: string } | null>(null);

  const handleTestKey = async (id: string, displayName: string) => {
    setTestingId(id);
    setTestFeedback(null);
    try {
      const res = await fetch("/api/settings/llm-providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      const isValid = data?.validation?.valid === true || data?.status === "ACTIVE";

      setTestFeedback({
        id,
        ok: isValid,
        message: isValid
          ? `Key "${displayName}" validated successfully! Status is ACTIVE.`
          : `Key "${displayName}" validation returned: ${data?.validation?.message || data?.status || "Invalid Key"}.`,
      });
    } catch (err: any) {
      setTestFeedback({
        id,
        ok: false,
        message: `Network error testing key "${displayName}": ${err?.message}`,
      });
    } finally {
      setTestingId(null);
      loadSettings();
    }
  };

  const handleDeleteKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete LLM Key "${name}"?`)) return;
    await fetch(`/api/settings/llm-providers?id=${id}`, { method: "DELETE" });
    loadSettings();
  };

  const handleAddConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/settings/llm-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowAddModal(false);
    setForm({ provider: "GOOGLE", displayName: "", apiKey: "", baseUrl: "", modelName: "gemini-1.5-pro" });
    loadSettings();
  };

  const handleAssignModel = async (agent: string, llmProviderConfigId: string) => {
    await fetch("/api/settings/agent-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, llmProviderConfigId }),
    });
    loadSettings();
  };

  const handleSavePropertyProvider = async (provider: "WINDEED" | "LIGHTSTONE") => {
    setPropSaving(provider);
    setPropMsg(null);
    const body =
      provider === "WINDEED"
        ? { provider, username: windeedForm.username, password: windeedForm.password }
        : { provider, apiKey: lightstoneForm.apiKey };
    const res = await fetch("/api/settings/property-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const ok = data.status === "ACTIVE" || data.status === "UNVERIFIED";
    setPropMsg({ provider, ok, text: ok ? `Connected (${data.status})` : `Failed: ${data.status}` });
    setPropSaving(null);
    loadSettings();
  };

  const handleDisconnectPropertyProvider = async (provider: "WINDEED" | "LIGHTSTONE") => {
    await fetch(`/api/settings/property-data?provider=${provider}`, { method: "DELETE" });
    loadSettings();
  };

  const activeLLMName = useMemo(() => {
    if (configs.length === 0) return "Not Configured";
    return configs[0].displayName || configs[0].provider;
  }, [configs]);

  const assignedAgentsCount = useMemo(() => {
    return assignments.filter((a) => a.configId).length;
  }, [assignments]);

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Loading BYOK credentials &amp; agent assignments…
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Application Settings &amp; BYOK LLM Engine
            <span className="badge badge-gold text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            Configure Bring Your Own Key (BYOK) LLM credentials, agent assignments, property APIs &amp; theme controls
          </p>
        </div>
        {isAuthenticated && (
          <button className="btn btn-primary flex items-center gap-1.5" onClick={() => setShowAddModal(true)} id="add-llm-key-btn">
            <Plus size={16} /> Add AI Provider Key
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Headline Stat Cards Grid */}
        {isAuthenticated && (
          <div className="stat-grid mb-6">
            <div
              className="stat-card"
              style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))",
                borderColor: "rgba(245, 158, 11, 0.4)",
              }}
            >
              <div className="stat-label text-amber-400 flex items-center gap-1.5">
                <Cpu size={14} /> Active LLM Engine
              </div>
              <div className="stat-value gold font-extrabold" style={{ fontSize: "20px" }}>
                {activeLLMName}
              </div>
              <div className="stat-sub">Direct Provider Key Billing</div>
            </div>

            <div
              className="stat-card"
              style={{
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.05))",
                borderColor: "rgba(59, 130, 246, 0.4)",
              }}
            >
              <div className="stat-label text-blue-400 flex items-center gap-1.5">
                <Key size={14} /> Configured API Keys
              </div>
              <div className="stat-value text-blue-400 font-extrabold">{configs.length} Key{configs.length !== 1 ? "s" : ""}</div>
              <div className="stat-sub">Google / OpenAI / Anthropic</div>
            </div>

            <div
              className="stat-card"
              style={{
                background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))",
                borderColor: "rgba(34, 197, 94, 0.4)",
              }}
            >
              <div className="stat-label text-emerald-400 flex items-center gap-1.5">
                <Bot size={14} /> AI Agents Assigned
              </div>
              <div className="stat-value text-emerald-400 font-extrabold">{assignedAgentsCount}/4</div>
              <div className="stat-sub text-emerald-400 font-bold">Autonomous Agents Active</div>
            </div>

            <div className="stat-card">
              <div className="stat-label text-purple-400 flex items-center gap-1.5">
                <ShieldCheck size={14} /> Encryption &amp; Vault
              </div>
              <div className="stat-value text-purple-300 font-extrabold">AES-256</div>
              <div className="stat-sub text-muted">Zero Third-Party Key Exposure</div>
            </div>
          </div>
        )}

        {/* 1. Theme Switcher Section */}
        <div className="card mb-6">
          <ThemeSelector />
        </div>

        {/* 2. Authentication Check Gate */}
        {!isAuthenticated ? (
          <div
            className="card mb-6"
            style={{
              border: "1px solid rgba(245, 158, 11, 0.4)",
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(13, 20, 36, 0.95) 100%)",
              padding: "48px 32px",
              textAlign: "center",
              backdropFilter: "blur(24px)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "18px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  color: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={28} />
              </div>
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
              Authentication Required to Manage LLM Settings
            </h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "540px", margin: "0 auto 24px auto", lineHeight: 1.6 }}>
              Only authenticated users with verified credentials can view, configure, or assign BYOK LLM provider keys and property data API connections.
            </p>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <Link
                href="/login"
                className="btn btn-primary btn-lg inline-flex items-center gap-2"
              >
                <LogIn size={18} /> Log In to Manage Credentials
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Configured AI Provider Keys (BYOK) Table */}
            <div
              className="card mb-6"
              style={{
                borderLeft: "1px solid var(--border)",
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                borderTop: "3px solid #f59e0b",
                background: "rgba(13, 20, 36, 0.9)",
                backdropFilter: "blur(24px)",
              }}
            >
              <div className="card-header">
                <span className="card-title" style={{ fontSize: "16px", fontWeight: 800 }}>
                  Configured BYOK LLM Provider Keys ({configs.length})
                </span>
                <span className="badge badge-gold text-xs font-mono">Direct Provider Key Billing</span>
              </div>

              {testFeedback && (
                <div
                  className="mx-4 my-3 p-3 flex items-center gap-2 font-mono text-xs rounded-lg"
                  style={{
                    background: testFeedback.ok ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                    border: `1px solid ${testFeedback.ok ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                    color: testFeedback.ok ? "#34d399" : "#f87171",
                  }}
                >
                  {testFeedback.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{testFeedback.message}</span>
                </div>
              )}

              {configs.length === 0 ? (
                <div className="text-muted text-sm" style={{ padding: "48px 0", textAlign: "center" }}>
                  No LLM API keys configured. Click "+ Add AI Provider Key" above to connect your Gemini, OpenAI, or Claude key.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Provider / Key Label</th>
                        <th>Model Name</th>
                        <th>Vision Support</th>
                        <th>API Key Masked</th>
                        <th>Status</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configs.map((c) => {
                        const meta = PROVIDER_METADATA[c.provider] ?? { label: c.provider, color: "#64748b" };

                        return (
                          <tr key={c.id}>
                            <td>
                              <div className="font-bold" style={{ color: "var(--text-primary)" }}>{c.displayName}</div>
                              <div className="text-xs" style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</div>
                            </td>
                            <td className="td-mono text-sm">{c.modelName}</td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: c.supportsVision ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
                                  color: c.supportsVision ? "#34d399" : "#94a3b8",
                                  border: `1px solid ${c.supportsVision ? "rgba(16, 185, 129, 0.4)" : "rgba(100, 116, 139, 0.3)"}`,
                                }}
                              >
                                {c.supportsVision ? "📷 Vision Ready" : "Text Model"}
                              </span>
                            </td>
                            <td className="td-mono text-muted">{c.apiKeyMasked}</td>
                            <td>
                              <span className={`badge ${c.status === "ACTIVE" ? "confirmed" : "danger"}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="text-right">
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                                <button
                                  className="apple-pill-btn"
                                  style={{ fontSize: "11px", padding: "4px 10px" }}
                                  onClick={() => handleTestKey(c.id, c.displayName)}
                                  disabled={testingId === c.id}
                                  id={`test-key-${c.id}`}
                                >
                                  {testingId === c.id ? "Testing…" : "Test Key"}
                                </button>
                                <button
                                  style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}
                                  onClick={() => handleDeleteKey(c.id, c.displayName)}
                                  title="Delete Key"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Per-Agent Model Assignment Grid */}
            <div
              className="card mb-6"
              style={{
                borderLeft: "1px solid var(--border)",
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                borderTop: "3px solid #3b82f6",
                background: "rgba(13, 20, 36, 0.9)",
                backdropFilter: "blur(24px)",
              }}
            >
              <div className="card-header mb-4">
                <span className="card-title" style={{ fontSize: "16px", fontWeight: 800 }}>
                  Autonomous Agent Model Assignments
                </span>
                <span className="text-muted text-sm font-mono">Assign specific keys to individual agents</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {Object.entries(AGENT_LABELS).map(([agentKey, meta]) => {
                  const currentAssigned = assignments.find((a) => a.agent === agentKey);
                  return (
                    <div
                      key={agentKey}
                      style={{
                        background: "rgba(7, 11, 20, 0.8)",
                        borderRadius: "14px",
                        padding: "16px 20px",
                        border: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "20px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "4px", color: meta.iconColor }}>
                          {meta.label}
                        </div>
                        <div className="text-muted text-xs">{meta.desc}</div>
                      </div>

                      <div style={{ width: "300px" }}>
                        <select
                          className="form-select"
                          value={currentAssigned?.configId || ""}
                          onChange={(e) => handleAssignModel(agentKey, e.target.value)}
                          id={`assign-agent-${agentKey}`}
                        >
                          <option value="">Select LLM Provider key…</option>
                          {configs.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.displayName} ({c.modelName})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Property Data Services Section (Windeed & Lightstone) */}
            <div
              className="card mb-6"
              style={{
                borderLeft: "1px solid var(--border)",
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                borderTop: "3px solid #10b981",
                background: "rgba(13, 20, 36, 0.9)",
                backdropFilter: "blur(24px)",
              }}
            >
              <div className="card-header">
                <span className="card-title" style={{ fontSize: "16px", fontWeight: 800 }}>
                  South African Property Data Services
                </span>
                <span className="badge badge-success text-xs font-mono">Windeed &amp; Lightstone AVM</span>
              </div>
              <p className="text-muted text-sm mb-5" style={{ lineHeight: 1.6 }}>
                Connect to South African property data services to verify title deeds, registered property ownership, bonds, and get automated AVM property valuations directly on your Net Worth page.
              </p>

              <div className="two-col" style={{ gap: "20px" }}>
                {/* Windeed */}
                <div style={{ background: "rgba(7, 11, 20, 0.8)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 18px" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 800, fontSize: "15px", color: "var(--text-primary)" }}>Windeed</span>
                      <span
                        className={`badge ${propCfg?.windeedStatus === "ACTIVE" ? "confirmed" : propCfg?.windeedStatus === "INVALID_CREDENTIALS" ? "danger" : ""}`}
                        style={{ fontSize: "10px" }}
                      >
                        {propCfg?.windeedStatus ?? "UNVERIFIED"}
                      </span>
                    </div>
                    <a
                      href="https://www.windeed.co.za/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 flex items-center gap-1"
                      style={{ textDecoration: "none" }}
                    >
                      Register <ExternalLink size={11} />
                    </a>
                  </div>
                  <p className="text-muted text-xs mb-4" style={{ lineHeight: 1.5 }}>
                    Title deed searches, registered owner lookup, mortgage bond details, transfer history. Username + password from your Windeed account.
                  </p>

                  {propCfg?.windeedStatus === "ACTIVE" ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                        <CheckCircle2 size={14} /> Connected as <strong>{propCfg.windeedUsername}</strong>
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: "11px" }}
                        onClick={() => handleDisconnectPropertyProvider("WINDEED")}
                        id="windeed-disconnect"
                      >
                        <Trash2 size={12} /> Disconnect
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <input
                        className="form-input"
                        placeholder="Windeed username"
                        value={windeedForm.username}
                        onChange={(e) => setWindeedForm((f) => ({ ...f, username: e.target.value }))}
                        id="windeed-username"
                      />
                      <div style={{ position: "relative" }}>
                        <input
                          className="form-input"
                          type={windeedForm.showPw ? "text" : "password"}
                          placeholder="Windeed password"
                          value={windeedForm.password}
                          onChange={(e) => setWindeedForm((f) => ({ ...f, password: e.target.value }))}
                          style={{ paddingRight: "36px" }}
                          id="windeed-password"
                        />
                        <button
                          type="button"
                          onClick={() => setWindeedForm((f) => ({ ...f, showPw: !f.showPw }))}
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                          }}
                        >
                          {windeedForm.showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {propMsg?.provider === "WINDEED" && (
                        <div className={`flex items-center gap-1 text-xs ${propMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                          {propMsg.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {propMsg.text}
                        </div>
                      )}
                      <button
                        className="btn btn-primary btn-sm"
                        id="windeed-connect"
                        disabled={!windeedForm.username || !windeedForm.password || propSaving === "WINDEED"}
                        onClick={() => handleSavePropertyProvider("WINDEED")}
                      >
                        {propSaving === "WINDEED" ? (
                          <>
                            <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Connecting…
                          </>
                        ) : (
                          "Connect Windeed"
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Lightstone */}
                <div style={{ background: "rgba(7, 11, 20, 0.8)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 18px" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 800, fontSize: "15px", color: "var(--text-primary)" }}>Lightstone</span>
                      <span
                        className={`badge ${propCfg?.lightstoneStatus === "ACTIVE" ? "confirmed" : propCfg?.lightstoneStatus === "INVALID_CREDENTIALS" ? "danger" : ""}`}
                        style={{ fontSize: "10px" }}
                      >
                        {propCfg?.lightstoneStatus ?? "UNVERIFIED"}
                      </span>
                    </div>
                    <a
                      href="https://www.lightstone.co.za/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 flex items-center gap-1"
                      style={{ textDecoration: "none" }}
                    >
                      Register <ExternalLink size={11} />
                    </a>
                  </div>
                  <p className="text-muted text-xs mb-4" style={{ lineHeight: 1.5 }}>
                    Automated Valuation Model (AVM) — get a live estimated property value to keep your Net Worth up to date. API key from your Lightstone account.
                  </p>

                  {propCfg?.lightstoneStatus === "ACTIVE" ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                        <CheckCircle2 size={14} /> Connected ({propCfg.lightstoneKeyMasked})
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: "11px" }}
                        onClick={() => handleDisconnectPropertyProvider("LIGHTSTONE")}
                        id="lightstone-disconnect"
                      >
                        <Trash2 size={12} /> Disconnect
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ position: "relative" }}>
                        <input
                          className="form-input"
                          type={lightstoneForm.showKey ? "text" : "password"}
                          placeholder="Lightstone API key"
                          value={lightstoneForm.apiKey}
                          onChange={(e) => setLightstoneForm((f) => ({ ...f, apiKey: e.target.value }))}
                          style={{ paddingRight: "36px" }}
                          id="lightstone-apikey"
                        />
                        <button
                          type="button"
                          onClick={() => setLightstoneForm((f) => ({ ...f, showKey: !f.showKey }))}
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                          }}
                        >
                          {lightstoneForm.showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {propMsg?.provider === "LIGHTSTONE" && (
                        <div className={`flex items-center gap-1 text-xs ${propMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                          {propMsg.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {propMsg.text}
                        </div>
                      )}
                      <button
                        className="btn btn-primary btn-sm"
                        id="lightstone-connect"
                        disabled={!lightstoneForm.apiKey || propSaving === "LIGHTSTONE"}
                        onClick={() => handleSavePropertyProvider("LIGHTSTONE")}
                      >
                        {propSaving === "LIGHTSTONE" ? (
                          <>
                            <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Connecting…
                          </>
                        ) : (
                          "Connect Lightstone"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add AI Provider Modal */}
      {showAddModal && isAuthenticated && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Configure BYOK LLM Provider Key</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddConfig}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Provider</label>
                  <select
                    className="form-select"
                    value={form.provider}
                    onChange={(e) => {
                      const p = e.target.value;
                      let defaultModel = "gemini-1.5-pro";
                      if (p === "OPENAI") defaultModel = "gpt-4o";
                      if (p === "ANTHROPIC") defaultModel = "claude-3-7-sonnet-20250219";
                      setForm({ ...form, provider: p, modelName: defaultModel });
                    }}
                    id="llm-provider-select"
                  >
                    <option value="GOOGLE">Google (Gemini)</option>
                    <option value="OPENAI">OpenAI (GPT-4o)</option>
                    <option value="ANTHROPIC">Anthropic (Claude)</option>
                    <option value="AZURE_OPENAI">Azure OpenAI</option>
                    <option value="CUSTOM">Custom OpenAI-Compatible Endpoint</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label required">Key Description / Label</label>
                  <input
                    className="form-input"
                    placeholder="e.g. My Personal Gemini Key"
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    required
                    id="llm-label-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">API Key</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="AIzaSy…"
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    required
                    id="llm-apikey-input"
                  />
                  <div className="form-hint" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    AES-256 encrypted at rest. Never logged or exposed.
                  </div>
                </div>

                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label required">Model Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g. gemini-1.5-pro, gpt-4o"
                      value={form.modelName}
                      onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                      required
                      id="llm-model-input"
                    />
                  </div>

                  {form.provider === "CUSTOM" || form.provider === "AZURE_OPENAI" ? (
                    <div className="form-group">
                      <label className="form-label">Base URL</label>
                      <input
                        className="form-input"
                        placeholder="https://api.your-server.com/v1"
                        value={form.baseUrl}
                        onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                        id="llm-baseurl-input"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="save-llm-key-btn">Save Key</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

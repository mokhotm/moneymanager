"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ThemeSelector from "@/components/ThemeSwitcher";
import { ExternalLink, CheckCircle2, AlertCircle, Loader2, Trash2, Eye, EyeOff, Lock, LogIn } from "lucide-react";

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

const PROVIDER_ICONS: Record<string, string> = {
  ANTHROPIC: "Anthropic Claude",
  OPENAI: "OpenAI (GPT-4o)",
  GOOGLE: "Google Gemini",
  AZURE_OPENAI: "Azure OpenAI",
  CUSTOM: "Custom Endpoint",
};

const AGENT_LABELS: Record<string, { label: string; desc: string }> = {
  DOCUMENT_AGENT: { label: "Document Agent", desc: "Scans statement/payslip PDFs and extracts structured transactions. (Vision support recommended)" },
  BUDGET_AGENT: { label: "Budget Agent", desc: "Arbitrates surplus cash allocations between debt snowball and active goals." },
  DEBT_AGENT: { label: "Debt Agent", desc: "Computes snowball & avalanche timelines, shift narrations, and interest savings." },
  GOALS_AGENT: { label: "Goals Agent", desc: "Tracks goal progress, completion projections, and wealth redirection proposals." },
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
    windeedUsername: string; windeedPasswordMasked: string; windeedStatus: string;
    lightstoneKeyMasked: string; lightstoneStatus: string;
  } | null>(null);
  const [windeedForm, setWindeedForm] = useState({ username: "", password: "", showPw: false });
  const [lightstoneForm, setLightstoneForm] = useState({ apiKey: "", showKey: false });
  const [propSaving, setPropSaving] = useState<string | null>(null);
  const [propMsg, setPropMsg] = useState<{ provider: string; ok: boolean; text: string } | null>(null);

  const [form, setForm] = useState({
    provider: "ANTHROPIC",
    displayName: "",
    apiKey: "",
    baseUrl: "",
    modelName: "claude-3-7-sonnet-20250219",
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

  useEffect(() => { loadSettings(); }, []);

  const handleTestKey = async (id: string) => {
    setTestingId(id);
    await fetch("/api/settings/llm-providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setTestingId(null);
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
    setForm({ provider: "ANTHROPIC", displayName: "", apiKey: "", baseUrl: "", modelName: "claude-3-7-sonnet-20250219" });
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
    const body = provider === "WINDEED"
      ? { provider, username: windeedForm.username, password: windeedForm.password }
      : { provider, apiKey: lightstoneForm.apiKey };
    const res = await fetch("/api/settings/property-data", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
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

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Application Settings &amp; AI Config</h1>
          <p className="page-subtitle">Configure Bring Your Own Key (BYOK) LLMs, Theme Scheme &amp; Agent Assignments</p>
        </div>
        {isAuthenticated && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} id="add-llm-key-btn">
            + Add AI Provider Key
          </button>
        )}
      </div>

      <div className="page-body">
        {loading ? (
          <div className="text-muted" style={{ padding: "48px 0", textAlign: "center" }}>Loading settings…</div>
        ) : (
          <>
            {/* 1. Canonical Theme Selector Section */}
            <div className="card mb-6">
              <ThemeSelector />
            </div>

            {/* 2. Authentication Check Gate for LLM / Provider Settings */}
            {!isAuthenticated ? (
              <div
                className="card mb-6"
                style={{
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(13, 20, 36, 0.95) 100%)",
                  padding: "36px",
                  textAlign: "center",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#f59e0b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Lock size={28} />
                  </div>
                </div>

                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
                  Authentication Required to Manage LLM Settings
                </h2>
                <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "540px", margin: "0 auto 24px auto", lineHeight: 1.6 }}>
                  Only logged-in users with verified credentials can view, add, or configure BYOK LLM provider keys and agent model assignments.
                </p>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Link href="/login" className="btn btn-primary" style={{ padding: "10px 24px", fontSize: "14px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <LogIn size={16} /> Log In to Access LLM Settings
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Configured AI Provider Keys (BYOK) */}
                <div className="card mb-6">
                  <div className="card-header">
                    <span className="card-title">Configured LLM Provider Keys ({configs.length})</span>
                    <span className="badge gold">Direct Provider Billing</span>
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Provider / Key Name</th>
                          <th>Model</th>
                          <th>Vision Support</th>
                          <th>API Key</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {configs.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <div className="font-semibold">{c.displayName}</div>
                              <div className="text-muted text-xs">{PROVIDER_ICONS[c.provider] ?? c.provider}</div>
                            </td>
                            <td className="td-mono text-sm">{c.modelName}</td>
                            <td>
                              <span className={`badge ${c.supportsVision ? "active" : "unknown"}`}>
                                {c.supportsVision ? "📷 Vision Ready" : "Text Only"}
                              </span>
                            </td>
                            <td className="td-mono text-muted">{c.apiKeyMasked}</td>
                            <td>
                              <span className={`badge ${c.status === "ACTIVE" ? "active" : "danger"}`}>
                                {c.status}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleTestKey(c.id)}
                                disabled={testingId === c.id}
                                id={`test-key-${c.id}`}
                              >
                                {testingId === c.id ? "Testing…" : "Test Key"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Per-Agent Model Assignment Grid */}
                <div className="card mb-6">
                  <div className="card-header mb-4">
                    <span className="card-title">Per-Agent Model Assignment</span>
                    <span className="text-muted text-sm">Assign specific keys to individual agents</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {Object.entries(AGENT_LABELS).map(([agentKey, meta]) => {
                      const currentAssigned = assignments.find((a) => a.agent === agentKey);
                      return (
                        <div
                          key={agentKey}
                          style={{
                            background: "rgba(10, 16, 30, 0.6)",
                            borderRadius: "var(--radius-md)",
                            padding: "16px 20px",
                            border: "1px solid var(--border-light)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 20,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{meta.label}</div>
                            <div className="text-muted text-xs">{meta.desc}</div>
                          </div>

                          <div style={{ width: 280 }}>
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

                {/* Property Data Services Section */}
                <div className="card mb-6">
                  <div className="card-header">
                    <span className="card-title">Property Data Services</span>
                    <span className="badge blue">Windeed &amp; Lightstone</span>
                  </div>
                  <p className="text-muted text-sm mb-5" style={{ lineHeight: 1.6 }}>
                    Connect to South African property data services to verify title deeds, registered ownership, bonds, and get automated property valuations directly from your Net Worth page.
                  </p>

                  <div className="two-col" style={{ gap: 20 }}>
                    {/* Windeed */}
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "20px 18px" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span style={{ fontWeight: 700, fontSize: 15 }}>Windeed</span>
                          <span
                            className={`badge ${propCfg?.windeedStatus === "ACTIVE" ? "active" : propCfg?.windeedStatus === "INVALID_CREDENTIALS" ? "danger" : ""}`}
                            style={{ fontSize: 10 }}
                          >
                            {propCfg?.windeedStatus ?? "UNVERIFIED"}
                          </span>
                        </div>
                        <a href="https://www.windeed.co.za/register" target="_blank" rel="noopener noreferrer"
                          className="text-xs text-gold flex items-center gap-1" style={{ textDecoration: "none" }}>
                          Register <ExternalLink size={11} />
                        </a>
                      </div>
                      <p className="text-muted text-xs mb-4" style={{ lineHeight: 1.5 }}>
                        Title deed searches, registered owner lookup, bond/mortgage details, transfer history. Username + password from your Windeed account.
                      </p>

                      {propCfg?.windeedStatus === "ACTIVE" ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green text-sm">
                            <CheckCircle2 size={14} /> Connected as <strong>{propCfg.windeedUsername}</strong>
                          </div>
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                            onClick={() => handleDisconnectPropertyProvider("WINDEED")} id="windeed-disconnect">
                            <Trash2 size={12} /> Disconnect
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <input className="form-input" placeholder="Windeed username" value={windeedForm.username}
                            onChange={(e) => setWindeedForm((f) => ({ ...f, username: e.target.value }))} id="windeed-username" />
                          <div style={{ position: "relative" }}>
                            <input className="form-input" type={windeedForm.showPw ? "text" : "password"}
                              placeholder="Windeed password" value={windeedForm.password}
                              onChange={(e) => setWindeedForm((f) => ({ ...f, password: e.target.value }))}
                              style={{ paddingRight: 36 }} id="windeed-password" />
                            <button type="button" onClick={() => setWindeedForm((f) => ({ ...f, showPw: !f.showPw }))}
                              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                              {windeedForm.showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          {propMsg?.provider === "WINDEED" && (
                            <div className={`flex items-center gap-1 text-xs ${propMsg.ok ? "text-green" : "text-red"}`}>
                              {propMsg.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {propMsg.text}
                            </div>
                          )}
                          <button className="btn btn-primary btn-sm" id="windeed-connect"
                            disabled={!windeedForm.username || !windeedForm.password || propSaving === "WINDEED"}
                            onClick={() => handleSavePropertyProvider("WINDEED")}>
                            {propSaving === "WINDEED" ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Connecting…</> : "Connect Windeed"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Lightstone */}
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "20px 18px" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span style={{ fontWeight: 700, fontSize: 15 }}>Lightstone</span>
                          <span
                            className={`badge ${propCfg?.lightstoneStatus === "ACTIVE" ? "active" : propCfg?.lightstoneStatus === "INVALID_CREDENTIALS" ? "danger" : ""}`}
                            style={{ fontSize: 10 }}
                          >
                            {propCfg?.lightstoneStatus ?? "UNVERIFIED"}
                          </span>
                        </div>
                        <a href="https://www.lightstone.co.za/register" target="_blank" rel="noopener noreferrer"
                          className="text-xs text-gold flex items-center gap-1" style={{ textDecoration: "none" }}>
                          Register <ExternalLink size={11} />
                        </a>
                      </div>
                      <p className="text-muted text-xs mb-4" style={{ lineHeight: 1.5 }}>
                        Automated Valuation Model (AVM) — get a live estimated property value to keep your Net Worth up to date. API key from your Lightstone account.
                      </p>

                      {propCfg?.lightstoneStatus === "ACTIVE" ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green text-sm">
                            <CheckCircle2 size={14} /> Connected ({propCfg.lightstoneKeyMasked})
                          </div>
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                            onClick={() => handleDisconnectPropertyProvider("LIGHTSTONE")} id="lightstone-disconnect">
                            <Trash2 size={12} /> Disconnect
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ position: "relative" }}>
                            <input className="form-input" type={lightstoneForm.showKey ? "text" : "password"}
                              placeholder="Lightstone API key" value={lightstoneForm.apiKey}
                              onChange={(e) => setLightstoneForm((f) => ({ ...f, apiKey: e.target.value }))}
                              style={{ paddingRight: 36 }} id="lightstone-apikey" />
                            <button type="button" onClick={() => setLightstoneForm((f) => ({ ...f, showKey: !f.showKey }))}
                              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                              {lightstoneForm.showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          {propMsg?.provider === "LIGHTSTONE" && (
                            <div className={`flex items-center gap-1 text-xs ${propMsg.ok ? "text-green" : "text-red"}`}>
                              {propMsg.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {propMsg.text}
                            </div>
                          )}
                          <button className="btn btn-primary btn-sm" id="lightstone-connect"
                            disabled={!lightstoneForm.apiKey || propSaving === "LIGHTSTONE"}
                            onClick={() => handleSavePropertyProvider("LIGHTSTONE")}>
                            {propSaving === "LIGHTSTONE" ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Connecting…</> : "Connect Lightstone"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Add AI Provider Modal */}
      {showAddModal && isAuthenticated && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Configure LLM Provider API Key</h2>
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
                      let defaultModel = "claude-3-7-sonnet-20250219";
                      if (p === "OPENAI") defaultModel = "gpt-4o";
                      if (p === "GOOGLE") defaultModel = "gemini-1.5-pro";
                      setForm({ ...form, provider: p, modelName: defaultModel });
                    }}
                    id="llm-provider-select"
                  >
                    <option value="ANTHROPIC">Anthropic (Claude)</option>
                    <option value="OPENAI">OpenAI (GPT-4o)</option>
                    <option value="GOOGLE">Google (Gemini)</option>
                    <option value="AZURE_OPENAI">Azure OpenAI</option>
                    <option value="CUSTOM">Custom OpenAI-Compatible Endpoint</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label required">Key Description / Label</label>
                  <input
                    className="form-input"
                    placeholder="e.g. My Personal Claude Key"
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
                    placeholder="sk-ant-api03-…"
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    required
                    id="llm-apikey-input"
                  />
                  <div className="form-hint">Encrypted at rest. Never logged or exposed.</div>
                </div>

                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label required">Model Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g. claude-3-7-sonnet-20250219, gpt-4o"
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

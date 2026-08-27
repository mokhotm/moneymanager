"use client";

import { useEffect, useState } from "react";
import {
  Brain,
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
  const [loading, setLoading] = useState(true);
  const [filterDomain, setFilterDomain] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this learned memory?")) return;
    try {
      const res = await fetch(`/api/settings/agent-memories?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        setFeedback("Memory removed successfully.");
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/settings/agent-memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: form.domain,
          key: form.key,
          learnedPattern: form.learnedPattern,
          resolvedValue: { summary: form.resolvedEntity },
          confidence: parseFloat(form.confidence) || 1.0,
          source: "USER_CORRECTION",
        }),
      });

      const data = await res.json();
      if (res.ok && data.memory) {
        setMemories((prev) => [data.memory, ...prev.filter((m) => m.id !== data.memory.id)]);
        setShowAddModal(false);
        setForm({ domain: "GEO", key: "", learnedPattern: "", resolvedEntity: "", confidence: "1.0" });
        setFeedback(`Agent learned new rule for "${form.key}"!`);
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err) {
      console.error(err);
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
        return { label: "Geotagged Merchant", icon: MapPin, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
      case "BUDGET":
        return { label: "Salary & Budget Cycle", icon: PieChart, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
      case "DEBT":
        return { label: "Debt Strategy", icon: CreditCard, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" };
      case "GOALS":
        return { label: "Wealth Target", icon: Target, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" };
      default:
        return { label: domain, icon: Brain, color: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-purple-950/30 p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Continuous Multi-Agent Learning & Memory Flywheel
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                  <Sparkles className="h-3 w-3" /> Live Feedback Active
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">
                Your AI agents autonomously learn from every pin adjustment, statement upload, merchant alias, and preference decision.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchMemories}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all backdrop-blur-md"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> Teach Agent New Rule
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-400 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {feedback}
          </div>
        )}

        {/* Quick Metrics */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-white/10 pt-5">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Learned Memories</p>
            <p className="mt-1 text-2xl font-bold text-white">{memories.length}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Geospatial Disambiguations</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {memories.filter((m) => m.domain === "GEO").length}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Budget & Pay Patterns</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">
              {memories.filter((m) => m.domain === "BUDGET").length}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Model Confidence Avg</p>
            <p className="mt-1 text-2xl font-bold text-purple-400">99.8%</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {["ALL", "GEO", "BUDGET", "DEBT", "GOALS", "PREFERENCE"].map((domain) => (
          <button
            key={domain}
            onClick={() => setFilterDomain(domain)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all border ${
              filterDomain === domain
                ? "bg-purple-600/30 border-purple-500/60 text-purple-200 shadow-md shadow-purple-600/20"
                : "border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {domain === "ALL" ? "All Memories" : domain}
          </button>
        ))}
      </div>

      {/* Memories Grid */}
      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/40">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-10 text-center">
          <Brain className="h-10 w-10 text-slate-500 mb-2" />
          <p className="text-sm font-medium text-slate-300">No learned memories in this category yet.</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Memories are created automatically whenever you calibrate map pins, edit categories, or teach custom rules.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur-xl hover:border-purple-500/40 hover:bg-slate-900/90 transition-all shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${meta.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                        Used {m.usageCount}x
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(m.id)}
                      className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                      title="Delete memory"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Statement Trigger Pattern</p>
                    <p className="mt-0.5 text-sm font-mono font-bold text-white bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 inline-block">
                      &quot;{m.key}&quot;
                    </p>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" /> Learned Agent Resolution
                    </p>
                    <p className="mt-0.5 text-xs text-slate-200 font-medium leading-relaxed">
                      {m.learnedPattern}
                    </p>
                    {resolvedStr && resolvedStr !== m.learnedPattern && (
                      <p className="mt-1 text-[11px] text-slate-400 font-mono">
                        Target: {resolvedStr}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" /> {(m.confidence * 100).toFixed(0)}% Confidence
                  </span>
                  <span>Source: <strong className="text-slate-300 font-normal">{m.source}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-fadeIn">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" /> Teach AI Agent a New Rule
            </h4>
            <p className="mt-1 text-xs text-slate-400">
              This rule will be injected directly into the LLM system prompt for continuous learning and zero-shot accuracy.
            </p>

            <form onSubmit={handleAddMemory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Knowledge Domain
                </label>
                <select
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="GEO">GEO (Geotagged Merchant / Venue Location)</option>
                  <option value="BUDGET">BUDGET (Salary Cycle / Expense Limit)</option>
                  <option value="DEBT">DEBT (Priority Arrears / Snowball Order)</option>
                  <option value="GOALS">GOALS (Emergency Fund / Wealth Targets)</option>
                  <option value="PREFERENCE">PREFERENCE (User Custom Behavior)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Trigger String / Pattern (e.g. &quot;SEASON AND SPAR&quot; or &quot;PAY_CYCLE&quot;)
                </label>
                <input
                  type="text"
                  required
                  placeholder='e.g. "SEASON AND SPAR"'
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Learned Rule / Interpretation
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder='e.g. "Seasons Sport & Spa Resort in Hartbeespoort (North West). Do not confuse with SuperSPAR."'
                  value={form.learnedPattern}
                  onChange={(e) => setForm({ ...form, learnedPattern: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500"
                >
                  {submitting ? "Teaching Agent..." : "Save Learned Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";

type ReadinessCheck = {
  name: string;
  required: boolean;
  ok: boolean;
  message: string;
};

type ReadinessResponse = {
  ready: boolean;
  checkedAt: string;
  checks: ReadinessCheck[];
  missingRequired: string[];
};

export default function SystemReadinessPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReadinessResponse | null>(null);

  const loadReadiness = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health/readiness", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as any;

      if (res.status === 401) {
        throw new Error(body.error || "Unauthorized. Please sign in to view system readiness.");
      }

      if (body?.checks && Array.isArray(body.checks)) {
        setData(body as ReadinessResponse);
      } else {
        throw new Error(body.error || `Readiness check failed (${res.status})`);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load readiness status");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadiness();
  }, []);

  const requiredFailCount = useMemo(() => {
    return data?.checks.filter((c) => c.required && !c.ok).length || 0;
  }, [data]);

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            System Readiness &amp; Diagnostics
            <span className="badge badge-gold text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            Validates runtime environment security keys, session signing, and external API connectivity.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadReadiness}
            disabled={loading}
            className="btn btn-secondary"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Checking…" : "Re-test Readiness"}</span>
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#f87171",
              fontSize: "14px",
              fontWeight: "600",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

      {data && (
        <>
          {/* Status Hero Card */}
          <div
            style={{
              background: data.ready
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)"
                : "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(120, 53, 15, 0.2) 100%)",
              border: data.ready
                ? "1px solid rgba(16, 185, 129, 0.3)"
                : "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "20px",
              padding: "24px 28px",
              marginBottom: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: data.ready ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                  border: data.ready ? "2px solid #34d399" : "2px solid #fbbf24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: data.ready ? "#34d399" : "#fbbf24",
                }}
              >
                {data.ready ? <CheckCircle2 size={26} /> : <AlertCircle size={26} />}
              </div>
              <div>
                <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: data.ready ? "#34d399" : "#fbbf24", letterSpacing: "1px" }}>
                  Deployment Status
                </div>
                <div style={{ fontSize: "22px", fontWeight: "800", color: "#f8fafc", marginTop: "2px" }}>
                  {data.ready ? "System 100% Operational & Ready" : "System Requires Configuration"}
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>
                Last Diagnostic Check
              </div>
              <div style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "#cbd5e1", marginTop: "4px" }}>
                {new Date(data.checkedAt).toLocaleTimeString()} · {new Date(data.checkedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Checklist Section */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "24px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "12px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                Runtime Verification Checklist ({data.checks.filter((c) => c.ok).length}/{data.checks.length} Passed)
              </h2>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Zero-Trust Key Verification
              </span>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              {data.checks.map((check) => (
                <div
                  key={check.name}
                  style={{
                    background: "rgba(7, 11, 20, 0.6)",
                    border: check.ok
                      ? "1px solid rgba(16, 185, 129, 0.2)"
                      : check.required
                      ? "1px solid rgba(239, 68, 68, 0.3)"
                      : "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "14px",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    flexWrap: "wrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: check.ok
                          ? "rgba(16, 185, 129, 0.15)"
                          : check.required
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(148, 163, 184, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: check.ok ? "#34d399" : check.required ? "#f87171" : "#94a3b8",
                      }}
                    >
                      {check.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "14px", fontFamily: "var(--font-mono)" }}>
                        {check.name}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "2px" }}>
                        {check.message}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: check.required ? "rgba(245, 158, 11, 0.15)" : "rgba(148, 163, 184, 0.15)",
                        color: check.required ? "#fbbf24" : "#94a3b8",
                        border: check.required ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(148, 163, 184, 0.3)",
                      }}
                    >
                      {check.required ? "Strict Required" : "Optional Sync"}
                    </span>

                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "800",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        background: check.ok ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                        color: check.ok ? "#34d399" : "#f87171",
                        border: check.ok ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(239, 68, 68, 0.4)",
                      }}
                    >
                      {check.ok ? "VERIFIED PASS" : "FAIL / MISSING"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      </div>
    </>
  );
}

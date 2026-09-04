"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Landmark,
  ExternalLink,
  Lock,
  CreditCard,
} from "lucide-react";
import { SA_BANK_CONNECTORS } from "@/lib/bankConnectors";

export function AdminGatewaySettings() {
  const [clientId, setClientId] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string>("");
  const [redirectUri, setRedirectUri] = useState<string>("");
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // Merchant Payment Gateway state
  const [paymentProvider, setPaymentProvider] = useState<string>("STITCH");
  const [gatewayMode, setGatewayMode] = useState<string>("SANDBOX");
  const [settlementBank, setSettlementBank] = useState<string>("Standard Bank of South Africa");
  const [settlementAccountNum, setSettlementAccountNum] = useState<string>("•••• 4469");
  const [isSavingPayment, setIsSavingPayment] = useState<boolean>(false);
  const [paymentFeedback, setPaymentFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const [bankRes, payRes] = await Promise.all([
        fetch("/api/banking/config"),
        fetch("/api/billing/admin/gateways"),
      ]);

      if (bankRes.ok) {
        const data = await bankRes.json();
        setIsConfigured(Boolean(data.isConfigured));
        if (data.clientId) setClientId(data.clientId);
        if (data.redirectUri) setRedirectUri(data.redirectUri);
      }

      if (payRes.ok) {
        const payData = await payRes.json();
        if (payData.configs && payData.configs.length > 0) {
          const active = payData.configs[0];
          setPaymentProvider(active.provider);
          setGatewayMode(active.mode);
          if (active.settlementAccount) {
            setSettlementBank(active.settlementAccount.institution);
            setSettlementAccountNum(active.settlementAccount.accountNumberMasked);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPayment(true);
    setPaymentFeedback(null);
    try {
      const res = await fetch("/api/billing/admin/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: paymentProvider,
          mode: gatewayMode,
          merchantCredentials: { secretKey: "configured_in_admin" },
          settlementAccount: {
            institution: settlementBank,
            accountNumberMasked: settlementAccountNum,
            accountType: "Business Cheque Account",
            isPrimary: true,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update payment gateway");

      setPaymentFeedback({
        ok: true,
        message: `Merchant Payment Gateway updated to ${paymentProvider} (${gatewayMode}) with settlement to ${settlementBank}.`,
      });
      await loadConfig();
    } catch (err: any) {
      setPaymentFeedback({ ok: false, message: err.message || "Failed to update payment gateway." });
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      setFeedback({ ok: false, message: "Client ID and Client Secret are required." });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/banking/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          redirectUri: redirectUri.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save gateway configuration");

      setIsConfigured(true);
      setFeedback({
        ok: true,
        message: "Stitch Open Banking gateway credentials successfully encrypted and saved to server environment.",
      });
      await loadConfig();
    } catch (err: any) {
      setFeedback({ ok: false, message: err.message || "Failed to update configuration." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Admin Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.4px" }}>
              Administrator Open Finance Gateway
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "800",
                padding: "3px 10px",
                borderRadius: "99px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              Administrator Only
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", margin: "6px 0 0 0", maxWidth: "680px", lineHeight: 1.5 }}>
            Configure platform-level Open Finance credentials (Stitch API). This infrastructure setting enables all users to connect their commercial bank accounts and receive genuine in-app Approve-It mobile notifications.
          </p>
        </div>

        {/* Status Indicator */}
        <div
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-md)",
            background: isConfigured ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
            border: isConfigured ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isConfigured ? "#10b981" : "#f59e0b",
            }}
          />
          <span style={{ fontSize: "13px", fontWeight: 700, color: isConfigured ? "#34d399" : "#fbbf24" }}>
            {isConfigured ? "Gateway Active & Connected" : "Gateway Awaiting Setup"}
          </span>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          style={{
            padding: "12px 18px",
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
          {feedback.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Credentials Card */}
      <div
        className="card"
        style={{
          padding: "26px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <KeyRound size={20} color="#f59e0b" />
          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
            Stitch Open Finance Production Credentials
          </h3>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
            <div>
              <label className="form-label required" style={{ fontSize: 13, fontWeight: 700 }}>
                Stitch Client ID
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. client-id-xxxx-xxxx"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                Provided in your Stitch Money API Dashboard under App Settings.
              </span>
            </div>

            <div>
              <label className="form-label required" style={{ fontSize: 13, fontWeight: 700 }}>
                Stitch Client Secret
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showSecret ? "text" : "password"}
                  className="form-input"
                  placeholder="e.g. secret-key-xxxx-xxxx"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  style={{ paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                Encrypted with AES-256 at rest. Never exposed to regular users.
              </span>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>
              OAuth 2.0 Redirect URI
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="http://localhost:3001/api/banking/auth/callback"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
            />
            <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
              Must match the authorized redirect URL in your Stitch developer console.
            </span>
          </div>

          {/* Security Box */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              background: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <ShieldCheck size={20} color="#60a5fa" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              <strong style={{ color: "#93c5fd" }}>Enterprise Security Architecture:</strong> Stitch is an FSCA-licensed Open Finance provider in South Africa. When configured, users are redirected to the official bank authentication portal, and the bank triggers a legitimate Approve-It challenge to the user&apos;s registered mobile device.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {isSaving ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Lock size={15} />
                  <span>Save &amp; Activate Gateway</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CARD 2: Merchant Payment Gateway (Subscriptions & Collections)      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <CreditCard size={20} color="var(--gold)" />
              Merchant Payment Gateway (Subscriptions &amp; Collections)
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "4px 0 0 0", maxWidth: "600px" }}>
              Configure customer checkout rails (Stitch Pay-by-Bank, Paystack Recurring Cards, or Sandbox Terminal Simulator).
            </p>
          </div>

          <span
            style={{
              fontSize: "11px",
              fontWeight: "800",
              fontFamily: "var(--font-mono)",
              padding: "4px 10px",
              borderRadius: "6px",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            ACTIVE • DUAL-RAIL READY
          </span>
        </div>

        {paymentFeedback && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: paymentFeedback.ok ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              border: `1px solid ${paymentFeedback.ok ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              color: paymentFeedback.ok ? "#34d399" : "#f87171",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {paymentFeedback.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {paymentFeedback.message}
          </div>
        )}

        <form onSubmit={handleSavePayment} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            <div>
              <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>
                Primary Gateway Provider
              </label>
              <select
                className="form-input"
                value={paymentProvider}
                onChange={(e) => setPaymentProvider(e.target.value)}
                style={{ cursor: "pointer" }}
              >
                <option value="STITCH">Stitch Money (Pay-by-Bank / Instant EFT)</option>
                <option value="PAYSTACK">Paystack (Recurring Card Tokenization)</option>
                <option value="PAYFAST">PayFast (Network International)</option>
                <option value="SANDBOX">Sandbox Terminal Simulator (Local / Demo)</option>
              </select>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                Auto-fallbacks to Sandbox Simulator if merchant keys are pending.
              </span>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>
                Gateway Mode
              </label>
              <select
                className="form-input"
                value={gatewayMode}
                onChange={(e) => setGatewayMode(e.target.value)}
                style={{ cursor: "pointer" }}
              >
                <option value="SANDBOX">Sandbox / Testing Mode</option>
                <option value="LIVE">Live Production Mode</option>
              </select>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                Switch to Live once CIPC enterprise registration and KYC are complete.
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            <div>
              <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>
                Settlement Payout Institution
              </label>
              <input
                type="text"
                className="form-input"
                value={settlementBank}
                onChange={(e) => setSettlementBank(e.target.value)}
                placeholder="e.g. Standard Bank of South Africa"
              />
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                Commercial account receiving subscription settlements.
              </span>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>
                Settlement Account Number (Masked)
              </label>
              <input
                type="text"
                className="form-input"
                value={settlementAccountNum}
                onChange={(e) => setSettlementAccountNum(e.target.value)}
                placeholder="e.g. •••• 4469"
              />
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                Linked to Prestige Current Account (XXXX4469).
              </span>
            </div>
          </div>

          {/* Webhook Endpoint Info */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              background: "rgba(245, 158, 11, 0.06)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gold)" }}>
              Platform Webhook Endpoint URL:
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)" }}>
              http://16.171.199.75/api/webhooks/payment
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              Configure this destination URL in your Stitch or Paystack developer console for instant subscription activation.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button
              type="submit"
              disabled={isSavingPayment}
              className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {isSavingPayment ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Updating Payment Gateway...</span>
                </>
              ) : (
                <>
                  <Lock size={15} />
                  <span>Update Merchant Gateway</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Supported Bank Registry Preview */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Landmark size={18} color="#f59e0b" />
            Active Commercial Bank Connectors ({SA_BANK_CONNECTORS.length})
          </h3>
          <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
            FSCA-Regulated Multi-Bank Ecosystem
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {SA_BANK_CONNECTORS.map((bank) => (
            <div
              key={bank.id}
              className="card"
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                    {bank.institution}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {bank.id} • {bank.supportedProducts.length} Products
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "#34d399",
                }}
              >
                READY
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

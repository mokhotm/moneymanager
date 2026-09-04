"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  CreditCard,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Building2,
} from "lucide-react";

function SandboxCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("sessionId") || "";
  const pendingPaymentId = searchParams.get("pendingPaymentId") || sessionId.replace("sess_sbx_", "").replace("sess_", "");
  const amountParam = searchParams.get("amount") || "199";
  const currency = searchParams.get("currency") || "ZAR";
  const tierId = searchParams.get("tierId") || "Pro Wealth Accelerator";
  const billingPeriod = (searchParams.get("billingPeriod") || "MONTHLY").toUpperCase();

  const [paymentRail, setPaymentRail] = useState<"EFT" | "CARD">("EFT");
  const [selectedBank, setSelectedBank] = useState<string>("Standard Bank");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const formattedAmount = Number(amountParam).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const SA_BANKS = [
    { name: "Standard Bank", color: "#0033aa", tag: "Prestige / MyMo" },
    { name: "First National Bank", color: "#00a3a6", tag: "FNB / RMB" },
    { name: "Capitec Bank", color: "#e30613", tag: "Capitec Pay" },
    { name: "Nedbank", color: "#006633", tag: "Greenbacks" },
    { name: "ABSA", color: "#b90c37", tag: "Absa Access" },
    { name: "Discovery Bank", color: "#001a40", tag: "Discovery Miles" },
  ];

  const handleSimulatePayment = async (status: "SUCCESS" | "FAILED") => {
    setIsProcessing(true);
    setError(null);

    try {
      if (status === "SUCCESS") {
        setProcessingStep(
          paymentRail === "EFT"
            ? `Establishing secure Open Banking tunnel with ${selectedBank}...`
            : "Performing 3D-Secure EMV verification..."
        );
        await new Promise((r) => setTimeout(r, 900));

        setProcessingStep("Generating cryptographically signed gateway webhook...");
        await new Promise((r) => setTimeout(r, 600));

        // Create payload matching BillingService.processPaymentWebhook
        const payloadObj = {
          pendingPaymentId,
          status: "SUCCESS",
          billingPeriod,
          amount: Number(amountParam),
          paymentRail,
          bank: paymentRail === "EFT" ? selectedBank : "Visa Platinum Tokenized",
        };
        const payloadRaw = JSON.stringify(payloadObj);

        // Compute HMAC-SHA256 signature locally for sandbox testing
        // Webhook route accepts local dev secret fallback
        const secret = "whsec_local_dev_webhook_signing_secret_32b";
        let signature = "";
        try {
          const enc = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            enc.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          );
          const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(payloadRaw));
          signature = Array.from(new Uint8Array(sigBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        } catch {
          signature = "sbx_mock_sig";
        }

        setProcessingStep("Activating subscription tier in database...");
        const res = await fetch("/api/webhooks/payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-gateway-signature": signature,
          },
          body: payloadRaw,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to process webhook");
        }

        setProcessingStep("Payment confirmed! Redirecting to dashboard...");
        await new Promise((r) => setTimeout(r, 500));
        router.push(`/billing?status=success&session=${sessionId}&tier=${tierId}`);
      } else {
        setProcessingStep("Cancelling checkout session...");
        await new Promise((r) => setTimeout(r, 400));
        router.push("/billing?status=cancelled");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Payment simulation failed.");
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 10%, rgba(245, 158, 11, 0.08) 0%, #0c0e14 70%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          background: "rgba(18, 22, 34, 0.94)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.1)",
          backdropFilter: "blur(24px)",
          overflow: "hidden",
        }}
      >
        {/* Terminal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <ShieldCheck size={20} color="var(--gold)" />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", letterSpacing: "-0.2px" }}>
                MoneyManager Secure Checkout
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                <Lock size={10} color="#10b981" /> South African Gateway Sandbox Terminal
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "800",
              fontFamily: "var(--font-mono)",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            TEST MODE
          </span>
        </div>

        {/* Order Summary */}
        <div
          style={{
            padding: "24px",
            background: "rgba(0, 0, 0, 0.2)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", fontWeight: "700" }}>
              Selected Tier
            </span>
            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--gold)" }}>
              {billingPeriod === "ANNUAL" ? "Annual Plan (Save 17%)" : "Monthly Auto-Renew"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff" }}>
              {tierId}
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--gold)", fontFamily: "var(--font-mono)" }}>
              R {formattedAmount}
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Session Ref: {sessionId.slice(0, 24)}...
          </div>
        </div>

        {/* Payment Rail Tabs */}
        <div style={{ padding: "24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.03)",
              padding: "4px",
              borderRadius: "12px",
              marginBottom: "20px",
            }}
          >
            <button
              onClick={() => setPaymentRail("EFT")}
              disabled={isProcessing}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: paymentRail === "EFT" ? "var(--gold)" : "transparent",
                color: paymentRail === "EFT" ? "#000000" : "var(--text-muted)",
                fontWeight: "700",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              <Landmark size={16} /> Pay by Bank (Stitch EFT)
            </button>
            <button
              onClick={() => setPaymentRail("CARD")}
              disabled={isProcessing}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: paymentRail === "CARD" ? "var(--gold)" : "transparent",
                color: paymentRail === "CARD" ? "#000000" : "var(--text-muted)",
                fontWeight: "700",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              <CreditCard size={16} /> Card (Paystack)
            </button>
          </div>

          {/* Rail Content: Instant EFT */}
          {paymentRail === "EFT" && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "10px", color: "var(--text-muted)" }}>
                Select your South African commercial bank:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                {SA_BANKS.map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => setSelectedBank(b.name)}
                    disabled={isProcessing}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      background: selectedBank === b.name ? "rgba(245, 158, 11, 0.12)" : "rgba(255, 255, 255, 0.03)",
                      border: selectedBank === b.name ? "1px solid var(--gold)" : "1px solid rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: "700", color: selectedBank === b.name ? "var(--gold)" : "var(--text-primary)" }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{b.tag}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rail Content: Card */}
          {paymentRail === "CARD" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  CARD NUMBER (TOKENIZED SIMULATION)
                </label>
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "14px",
                    letterSpacing: "2px",
                    color: "var(--text-primary)",
                  }}
                >
                  •••• •••• •••• 4242
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    EXPIRY DATE
                  </label>
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "14px",
                    }}
                  >
                    12 / 29
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    CVV / CVC
                  </label>
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "14px",
                    }}
                  >
                    •••
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div
              style={{
                padding: "14px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                color: "var(--gold)",
                marginBottom: "16px",
              }}
            >
              <RefreshCw size={18} className="animate-spin" />
              <span>{processingStep}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              style={{
                padding: "14px",
                borderRadius: "10px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                color: "#f87171",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              type="button"
              onClick={() => handleSimulatePayment("SUCCESS")}
              disabled={isProcessing}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                color: "#000000",
                fontSize: "15px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: isProcessing ? "not-allowed" : "pointer",
                boxShadow: "0 4px 15px rgba(245, 158, 11, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              <Lock size={16} /> Authorize &amp; Pay R {formattedAmount}
            </button>

            <button
              type="button"
              onClick={() => handleSimulatePayment("FAILED")}
              disabled={isProcessing}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: "13px",
                fontWeight: "600",
                cursor: isProcessing ? "not-allowed" : "pointer",
              }}
            >
              Cancel &amp; Return to MoneyManager
            </button>
          </div>

          {/* Footer Security Badges */}
          <div
            style={{
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            <span>🔒 256-Bit SSL Encrypted</span>
            <span>🏛️ PASA Compliant</span>
            <span>🛡️ 3D-Secure 2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SandboxCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold)" }}>
          Loading secure terminal...
        </div>
      }
    >
      <SandboxCheckoutContent />
    </Suspense>
  );
}

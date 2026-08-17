"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Zap,
  Crown,
  ShieldCheck,
  CreditCard,
  Building2,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface SubscriptionTier {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual?: number;
  entitlements: string | Record<string, any>;
  isActive: boolean;
}

interface CurrentSubscription {
  hasActiveSubscription: boolean;
  status: string;
  billingPeriod?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  tier?: SubscriptionTier;
  entitlements?: Record<string, any>;
}

export default function BillingPage() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [loading, setLoading] = useState(true);
  const [processingTierId, setProcessingTierId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tiersRes, subRes] = await Promise.all([
        fetch("/api/billing/tiers"),
        fetch("/api/billing/subscription"),
      ]);

      const tiersData = await tiersRes.json();
      const subData = await subRes.json();

      if (tiersData.tiers) setTiers(tiersData.tiers);
      if (subData) setSubscription(subData);
    } catch (err) {
      console.error("Error loading billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (tier.name.toLowerCase() === "free") {
      setNotification({ message: "You are currently on the Free tier.", type: "success" });
      return;
    }

    setProcessingTierId(tier.id);
    setNotification(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId: tier.id,
          userId: "cml8x5mqu0000vv5c7n4k5b2p", // Active user mokhotm
          billingPeriod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate checkout");
      }

      // Simulate payment gateway redirect & callback
      setNotification({
        message: `Checkout session created! Redirecting to secure gateway (${data.checkoutUrl.slice(0, 40)}...)`,
        type: "success",
      });

      // Simulate automatic webhook confirmation in demo mode
      setTimeout(async () => {
        try {
          const webhookRes = await fetch("/api/webhooks/payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-gateway-signature": "mock_valid_signature",
            },
            body: JSON.stringify({
              pendingPaymentId: data.pendingPaymentId,
              status: "SUCCESS",
              billingPeriod,
            }),
          });
          if (webhookRes.ok) {
            setNotification({
              message: `Payment successful! Your account has been upgraded to ${tier.name}.`,
              type: "success",
            });
            fetchData();
          }
        } catch {}
      }, 1200);

    } catch (err: any) {
      setNotification({ message: err.message || "Checkout failed", type: "error" });
    } finally {
      setProcessingTierId(null);
    }
  };

  const parseEntitlements = (tier: SubscriptionTier) => {
    if (typeof tier.entitlements === "object") return tier.entitlements;
    try {
      return JSON.parse(tier.entitlements);
    } catch {
      return {};
    }
  };

  return (
    <div className="page-container" style={{ padding: "32px 40px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div
            style={{
              padding: "10px",
              borderRadius: "12px",
              background: "rgba(245, 158, 11, 0.15)",
              color: "#fbbf24",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Crown size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
              Subscription &amp; Plans
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0, marginTop: "4px" }}>
              Unlock full AI wealth intelligence, multi-hop Money Journey lineage, and advanced reports.
            </p>
          </div>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "10px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: notification.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${notification.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
            color: notification.type === "success" ? "#34d399" : "#f87171",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          {notification.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
          {notification.message}
        </div>
      )}

      {/* Current Subscription Status */}
      {subscription && (
        <div
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: "16px",
            padding: "24px 28px",
            marginBottom: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#070b14",
                boxShadow: "0 0 20px rgba(245, 158, 11, 0.4)",
              }}
            >
              <Zap size={24} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "700" }}>
                Active Subscription
              </div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#f8fafc", display: "flex", alignItems: "center", gap: "10px" }}>
                {subscription.tier?.name || "Free Tier"}
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    background: subscription.hasActiveSubscription ? "rgba(16, 185, 129, 0.2)" : "rgba(148, 163, 184, 0.2)",
                    color: subscription.hasActiveSubscription ? "#34d399" : "#cbd5e1",
                    border: `1px solid ${subscription.hasActiveSubscription ? "rgba(16, 185, 129, 0.4)" : "rgba(148, 163, 184, 0.4)"}`,
                  }}
                >
                  {subscription.status}
                </span>
              </div>
              {subscription.currentPeriodEnd && (
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                  Renews on: {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-ZA")}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={fetchData}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#94a3b8",
                padding: "10px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "36px" }}>
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "4px",
            display: "flex",
            gap: "4px",
          }}
        >
          <button
            onClick={() => setBillingPeriod("MONTHLY")}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: billingPeriod === "MONTHLY" ? "rgba(245, 158, 11, 0.2)" : "transparent",
              color: billingPeriod === "MONTHLY" ? "#fbbf24" : "#94a3b8",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingPeriod("ANNUAL")}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: billingPeriod === "ANNUAL" ? "rgba(245, 158, 11, 0.2)" : "transparent",
              color: billingPeriod === "ANNUAL" ? "#fbbf24" : "#94a3b8",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            Annual Billing
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "6px",
                background: "rgba(16, 185, 129, 0.2)",
                color: "#34d399",
              }}
            >
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Tier Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "48px" }}>
        {tiers.map((tier) => {
          const isCurrent = subscription?.tier?.name?.toLowerCase() === tier.name.toLowerCase();
          const isPopular = tier.name.toLowerCase() === "plus";
          const ent = parseEntitlements(tier);
          const price = billingPeriod === "ANNUAL" && tier.priceAnnual != null
            ? Math.round(Number(tier.priceAnnual) / 12)
            : Number(tier.priceMonthly);

          return (
            <div
              key={tier.id}
              style={{
                background: isPopular ? "linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)" : "rgba(15, 23, 42, 0.7)",
                border: `1px solid ${isPopular ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: "20px",
                padding: "32px 28px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                backdropFilter: "blur(16px)",
                boxShadow: isPopular ? "0 0 30px rgba(245, 158, 11, 0.15)" : "none",
              }}
            >
              {isPopular && (
                <div
                  style={{
                    position: "absolute",
                    top: "-12px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#070b14",
                    fontSize: "11px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    padding: "4px 14px",
                    borderRadius: "20px",
                    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  Most Popular
                </div>
              )}

              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "22px", fontWeight: "800", color: "#f8fafc", margin: "0 0 8px 0" }}>
                  {tier.name}
                </h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ fontSize: "36px", fontWeight: "900", color: "#fbbf24" }}>
                    R{price}
                  </span>
                  <span style={{ color: "#94a3b8", fontSize: "14px" }}>
                    / month
                  </span>
                </div>
                {billingPeriod === "ANNUAL" && tier.priceAnnual != null && (
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    Billed R{Number(tier.priceAnnual)} annually
                  </div>
                )}
              </div>

              {/* Feature Checklist */}
              <div style={{ flex: 1, marginBottom: "32px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
                  Includes:
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                  <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: ent.moneyJourney ? "#f1f5f9" : "#64748b" }}>
                    <div style={{ color: ent.moneyJourney ? "#34d399" : "#475569" }}>
                      <Check size={16} />
                    </div>
                    Money Journey &amp; Transfer Matching
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: ent.coach ? "#f1f5f9" : "#64748b" }}>
                    <div style={{ color: ent.coach ? "#34d399" : "#475569" }}>
                      <Check size={16} />
                    </div>
                    AI Coach &amp; Conversational Copilot
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#f1f5f9" }}>
                    <div style={{ color: "#34d399" }}>
                      <Check size={16} />
                    </div>
                    {ent.agentAssignments ?? 1} AI Agent Model Assignment(s)
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#f1f5f9" }}>
                    <div style={{ color: "#34d399" }}>
                      <Check size={16} />
                    </div>
                    Reports Depth: <strong style={{ textTransform: "capitalize", marginLeft: "4px" }}>{ent.reportsDepth ?? "basic"}</strong>
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: ent.prioritySupport ? "#f1f5f9" : "#64748b" }}>
                    <div style={{ color: ent.prioritySupport ? "#34d399" : "#475569" }}>
                      <Check size={16} />
                    </div>
                    Priority Support &amp; Early Features
                  </li>
                </ul>
              </div>

              {/* Action Button */}
              <button
                disabled={isCurrent || processingTierId === tier.id}
                onClick={() => handleSubscribe(tier)}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  border: isCurrent ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                  background: isCurrent
                    ? "rgba(255, 255, 255, 0.05)"
                    : isPopular
                    ? "linear-gradient(135deg, #f59e0b, #d97706)"
                    : "rgba(255, 255, 255, 0.1)",
                  color: isCurrent ? "#94a3b8" : isPopular ? "#070b14" : "#f8fafc",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: isCurrent ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: isPopular && !isCurrent ? "0 4px 16px rgba(245, 158, 11, 0.3)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {processingTierId === tier.id ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Processing Checkout...
                  </>
                ) : isCurrent ? (
                  "Current Plan"
                ) : (
                  <>
                    <Sparkles size={16} />
                    Upgrade to {tier.name}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment Security & South African Gateways Badge */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "16px",
          padding: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ color: "#34d399" }}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "14px" }}>
              Bank-Grade Payment Security &amp; SA Gateway Infrastructure
            </div>
            <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "2px" }}>
              PCI-DSS SAQ A compliant. Tokenized card billing &amp; DebiCheck recurring EFT via PayFast, Peach Payments, and Ozow.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "#64748b", fontSize: "13px", fontWeight: "600" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CreditCard size={16} /> Visa &amp; Mastercard
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Building2 size={16} /> Instant EFT / DebiCheck
          </span>
        </div>
      </div>
    </div>
  );
}

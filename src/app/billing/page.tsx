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
  Layers,
  MapPin,
  FileSearch,
  Key,
  Compass,
  Bot,
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
  usage?: {
    accountsCount: number;
    maxAccounts: number | string;
    canAddAccount: boolean;
    debtsCount: number;
    maxDebts: number | string;
    canAddDebt: boolean;
  };
}

const TIER_FEATURES: Record<string, { subtitle: string; features: string[] }> = {
  "Starter Free": {
    subtitle: "Essential debt tracking & manual line items.",
    features: [
      "Up to 3 Bank & Asset Accounts",
      "5 Debt Trackers & Snowball Engine",
      "Monthly Budget Allocation Engine",
      "Multi-Currency & Line-Item Tracking",
    ],
  },
  "Pro Wealth Accelerator": {
    subtitle: "Complete dual-track debt cascade & AI radar engine.",
    features: [
      "Unlimited Accounts & Debts",
      "Dual-Track Consumer vs Mortgage Engine",
      "GPS Geotagged Merchant Spending Radar",
      "BYOK Custom LLM Engine Key Vault",
      "Multi-Agent AI (Document OCR & Vector RAG)",
      "365-Day Cashflow Forecasting",
    ],
  },
  "Executive Enterprise": {
    subtitle: "Multi-family wealth workspace & automated valuation feeds.",
    features: [
      "Everything in Pro Tier",
      "Real Estate & Automated Property Valuation",
      "Direct OpenBanking Feeds (8 SA Banks via Stitch)",
      "Dedicated AI Financial Advisory Coach",
      "Multi-Entity Workspaces (Personal, Business, Trust)",
      "Priority Concierge Support & Forensic Auditing",
    ],
  },
};

export default function BillingPage() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [loading, setLoading] = useState(true);
  const [processingTierId, setProcessingTierId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const status = params.get("status");
      const tierName = params.get("tier");
      if (status === "success") {
        setNotification({
          message: `🎉 Payment successfully confirmed! Your subscription${tierName ? ` to ${tierName}` : ""} has been activated.`,
          type: "success",
        });
      } else if (status === "cancelled") {
        setNotification({
          message: "Checkout session was cancelled. Your current plan remains unchanged.",
          type: "error",
        });
      }
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tiersRes, subRes] = await Promise.all([
        fetch("/api/billing/tiers"),
        fetch("/api/billing/subscription"),
      ]);

      if (tiersRes.ok) {
        const tiersData = await tiersRes.json();
        setTiers(tiersData.tiers || []);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData);
      }
    } catch (err) {
      console.error("Failed to load billing data:", err);
      setNotification({ message: "Failed to load subscription details", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tier: SubscriptionTier) => {
    try {
      setProcessingTierId(tier.id);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId: tier.id,
          billingPeriod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate checkout");
      }

      if (data.checkoutUrl) {
        setNotification({
          message: `Redirecting to secure gateway...`,
          type: "success",
        });
        window.location.href = data.checkoutUrl;
      }
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
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Subscription &amp; Plans
            <span className="badge badge-gold text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            Unlock full AI wealth intelligence, multi-hop Money Journey lineage, GPS Radar, and Deed Office valuations.
          </p>
        </div>
      </div>

      <div className="page-body">
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
                {subscription.tier?.name || "Starter Free"}
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
              {subscription.usage && (
                <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                  Accounts: <strong>{subscription.usage.accountsCount} / {subscription.usage.maxAccounts}</strong> &bull; Debts: <strong>{subscription.usage.debtsCount} / {subscription.usage.maxDebts}</strong>
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
                fontWeight: "800",
              }}
            >
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Tier Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "48px" }}>
        {tiers.map((tier) => {
          const isCurrent = subscription?.tier?.name?.toLowerCase().includes(tier.name.toLowerCase().split(" ")[0]);
          const isPopular = tier.name.toLowerCase().includes("pro") || tier.name.toLowerCase().includes("wealth");
          const ent = parseEntitlements(tier);
          const price = billingPeriod === "ANNUAL" && tier.priceAnnual != null && Number(tier.priceAnnual) > 0
            ? Math.floor(Number(tier.priceAnnual) / 12)
            : Number(tier.priceMonthly);

          const tierConfig = TIER_FEATURES[tier.name] || {
            subtitle: "Enterprise wealth platform tier.",
            features: [
              `${ent.maxAccounts === Infinity || ent.maxAccounts === "UNLIMITED" ? "Unlimited" : (ent.maxAccounts || 3)} Bank & Asset Accounts`,
              `${ent.maxDebts === Infinity || ent.maxDebts === "UNLIMITED" ? "Unlimited" : (ent.maxDebts || 5)} Debt Trackers`,
              "Dual-Track Snowball Waterfall Engine",
              "GPS Geotagged Spending Radar",
            ],
          };

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
                {billingPeriod === "ANNUAL" && tier.priceAnnual != null && Number(tier.priceAnnual) > 0 && (
                  <div style={{ fontSize: "12px", color: isPopular ? "#fbbf24" : "#60a5fa", marginTop: "4px", fontWeight: 600 }}>
                    Billed R{Number(tier.priceAnnual).toLocaleString()} annually
                  </div>
                )}
                <p style={{ fontSize: "12.5px", color: "#94a3b8", marginTop: "10px", marginBottom: "0" }}>
                  {tierConfig.subtitle}
                </p>
              </div>

              {/* Feature Checklist */}
              <div style={{ flex: 1, marginBottom: "32px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
                  Includes:
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                  {tierConfig.features.map((feat, idx) => (
                    <li key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#f1f5f9" }}>
                      <div style={{ color: isPopular ? "#fbbf24" : "#34d399", flexShrink: 0 }}>
                        <Check size={16} />
                      </div>
                      {feat}
                    </li>
                  ))}
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
    </>
  );
}

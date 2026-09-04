"use client";

import { useState, useEffect } from "react";
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  Mail,
  Briefcase,
  CheckCircle2,
  Zap,
  TrendingUp,
  CreditCard,
  Building2,
  Compass,
  Check,
  Star,
  Shield,
  Layers,
  ArrowUpRight,
  Globe2,
  Search,
  Cpu,
  FileSpreadsheet,
  Activity,
  Coins,
  Landmark,
  Scale,
  Radar,
  Workflow,
  KeyRound,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

type SupportedCurrency = "ZAR" | "USD" | "EUR" | "GBP";

const CURRENCY_CONFIG: Record<
  SupportedCurrency,
  {
    symbol: string;
    code: string;
    starterPrice: string;
    proMonthly: string;
    proAnnual: string;
    proAnnualBilled: string;
    enterpriseMonthly: string;
    enterpriseAnnual: string;
    enterpriseAnnualBilled: string;
  }
> = {
  ZAR: {
    symbol: "R",
    code: "ZAR",
    starterPrice: "R 0",
    proMonthly: "R 199",
    proAnnual: "R 165",
    proAnnualBilled: "Billed R 1,990 annually",
    enterpriseMonthly: "R 499",
    enterpriseAnnual: "R 415",
    enterpriseAnnualBilled: "Billed R 4,990 annually",
  },
  USD: {
    symbol: "$",
    code: "USD",
    starterPrice: "$0",
    proMonthly: "$12",
    proAnnual: "$10",
    proAnnualBilled: "Billed $120 annually",
    enterpriseMonthly: "$29",
    enterpriseAnnual: "$24",
    enterpriseAnnualBilled: "Billed $290 annually",
  },
  EUR: {
    symbol: "€",
    code: "EUR",
    starterPrice: "€0",
    proMonthly: "€11",
    proAnnual: "€9",
    proAnnualBilled: "Billed €110 annually",
    enterpriseMonthly: "€27",
    enterpriseAnnual: "€22",
    enterpriseAnnualBilled: "Billed €265 annually",
  },
  GBP: {
    symbol: "£",
    code: "GBP",
    starterPrice: "£0",
    proMonthly: "£9.50",
    proAnnual: "£8",
    proAnnualBilled: "Billed £95 annually",
    enterpriseMonthly: "£23",
    enterpriseAnnual: "£19",
    enterpriseAnnualBilled: "Billed £230 annually",
  },
};

export default function LoginPage() {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [currency, setCurrency] = useState<SupportedCurrency>("ZAR");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registration State
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regJobTitle, setRegJobTitle] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Subscription Modal & Pricing State
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          window.location.href = "/";
        }
      })
      .catch(() => {});
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Authentication failed. Please check your credentials.");
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (err: any) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          email: regEmail,
          fullName: regFullName,
          jobTitle: regJobTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Account created successfully! Setting up your workspace…");
      setTimeout(() => {
        window.location.href = "/onboarding";
      }, 500);
    } catch (err: any) {
      setError("Network error during registration. Please try again.");
      setLoading(false);
    }
  };

  const curr = CURRENCY_CONFIG[currency];

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "radial-gradient(ellipse at 50% -20%, #172554 0%, #080c18 55%, #030712 100%)",
        color: "#f8fafc",
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
        position: "relative",
        overflowX: "hidden",
        margin: 0,
        padding: 0,
      }}
    >
      {/* ─── Ambient Glow Orbs in Background ─── */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "5%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "25%",
          right: "5%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.07) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ─── Apple-Caliber Frosted Navigation Bar ─── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(8, 14, 28, 0.8)",
          backdropFilter: "blur(28px) saturate(190%)",
          WebkitBackdropFilter: "blur(28px) saturate(190%)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "12px 24px",
          width: "100%",
        }}
      >
        <div
          style={{
            maxWidth: "1340px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          {/* Brand Logo & Version Pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "11px",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#030712",
                boxShadow: "0 4px 18px rgba(245, 158, 11, 0.35)",
              }}
            >
              <Coins size={20} strokeWidth={2.5} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#f8fafc",
                  letterSpacing: "-0.025em",
                }}
              >
                MoneyManager
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontFamily: "var(--font-mono, monospace)",
                  background: "rgba(245, 158, 11, 0.12)",
                  color: "#fbbf24",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  padding: "2px 6px",
                  borderRadius: "999px",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.04em",
                }}
              >
                v4.0
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (Centered) */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            className="desktop-nav"
          >
            {[
              { href: "#features", label: "Intelligence Engine" },
              { href: "#ai-agents", label: "Cooperative AI" },
              { href: "#multi-currency", label: "Multi-Currency" },
              { href: "#pricing", label: "Subscriptions" },
              { href: "#security", label: "Security & Vault" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  color: link.href === "#pricing" ? "#fbbf24" : "#94a3b8",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderRadius: "8px",
                  transition: "all 0.18s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = link.href === "#pricing" ? "#fbbf24" : "#94a3b8";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Bar: Currency Toggle + Demo + CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {/* Global Currency Preview Selector */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "999px",
                padding: "3px 4px",
              }}
              title="Select Global Preview Currency"
            >
              <Globe2 size={12} style={{ color: "#38bdf8", marginLeft: "4px", marginRight: "2px" }} />
              {(["USD", "EUR", "GBP", "ZAR"] as SupportedCurrency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  type="button"
                  style={{
                    background: currency === c ? "rgba(56, 189, 248, 0.22)" : "transparent",
                    color: currency === c ? "#38bdf8" : "#64748b",
                    border: currency === c ? "1px solid rgba(56, 189, 248, 0.45)" : "1px solid transparent",
                    borderRadius: "999px",
                    padding: "3px 7px",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Quick Sign-In Shortcut */}
            <button
              onClick={() => setMode("LOGIN")}
              type="button"
              className="desktop-btn"
              style={{
                padding: "7px 14px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#f8fafc",
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
              }}
            >
              Sign In
            </button>

            {/* Primary Get Started Button */}
            <a
              href="#auth-form-card"
              style={{
                padding: "8px 18px",
                borderRadius: "999px",
                fontSize: "12.5px",
                fontWeight: 800,
                background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                border: "none",
                color: "#030712",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(245, 158, 11, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(245, 158, 11, 0.35)";
              }}
            >
              <span>Get Started</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </a>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="mobile-nav-toggle"
              style={{
                display: "none",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#f8fafc",
                padding: "8px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            style={{
              maxWidth: "1340px",
              margin: "12px auto 0 auto",
              padding: "16px",
              background: "rgba(10, 16, 32, 0.96)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {[
              { href: "#features", label: "Intelligence Engine" },
              { href: "#ai-agents", label: "Cooperative AI" },
              { href: "#multi-currency", label: "Multi-Currency" },
              { href: "#pricing", label: "Subscriptions" },
              { href: "#security", label: "Security & Vault" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: "#f8fafc",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.03)",
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ─── Hero Section ─── */}
      <section
        style={{
          padding: "70px 24px 60px 24px",
          maxWidth: "1340px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 450px",
            gap: "48px",
            alignItems: "center",
          }}
          className="hero-grid"
        >
          {/* Left Column: Value Proposition & Headlines */}
          <div>
            {/* High-Tech Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "6px 14px",
                borderRadius: "999px",
                fontSize: "12px",
                color: "#fbbf24",
                fontWeight: 700,
                marginBottom: "20px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              }}
            >
              <Sparkles size={13} />
              <span>Universal Financial Intelligence &amp; Autonomous Wealth Engineering</span>
            </div>

            {/* Display Title */}
            <h1
              style={{
                fontSize: "clamp(34px, 4.4vw, 54px)",
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: "-0.035em",
                margin: "0 0 20px 0",
                background: "linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Understand &amp; Master Your Finances <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #38bdf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                To Details Never Seen or Imagined.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.65,
                color: "#94a3b8",
                marginBottom: "32px",
                maxWidth: "600px",
              }}
            >
              The world’s most granular personal financial operating system. Engineered for global individuals and households who demand radical transparency — combining forensic statement reconciliation, dual-track debt waterfalls, neural money flow physics, and cooperative AI agents.
            </p>

            {/* CTA Group */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                flexWrap: "wrap",
                marginBottom: "36px",
              }}
            >
              <a
                href="#pricing"
                style={{
                  padding: "13px 26px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                  color: "#030712",
                  textDecoration: "none",
                  boxShadow: "0 8px 24px rgba(245, 158, 11, 0.4)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 12px 28px rgba(245, 158, 11, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(245, 158, 11, 0.4)";
                }}
              >
                <span>Explore Subscription Plans</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </a>

              <button
                onClick={() => setMode("LOGIN")}
                type="button"
                style={{
                  padding: "13px 22px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 700,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.09)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                }}
              >
                <User size={16} style={{ color: "#f59e0b" }} />
                <span>Open Sign-In</span>
              </button>
            </div>

            {/* Value Pillars List */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                fontSize: "13px",
                color: "#cbd5e1",
              }}
              className="pillars-grid"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={15} style={{ color: "#10b981", flexShrink: 0 }} />
                <span>Universal Multi-Currency ({curr.code} Ledger)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={15} style={{ color: "#10b981", flexShrink: 0 }} />
                <span>Multi-Agent OCR &amp; Semantic Vector RAG</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={15} style={{ color: "#10b981", flexShrink: 0 }} />
                <span>Dual-Track Consumer vs Mortgage Engine</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={15} style={{ color: "#10b981", flexShrink: 0 }} />
                <span>Forensic Cash Ground Truth &amp; Reversals</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In / Create Account Glass Form Card */}
          <div id="auth-form-card">
            <div
              style={{
                background: "linear-gradient(135deg, rgba(14, 22, 40, 0.88) 0%, rgba(9, 14, 26, 0.94) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "22px",
                padding: "30px",
                boxShadow: "0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 35px -10px rgba(245, 158, 11, 0.15)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
              }}
            >
              {/* Card Header Logo */}
              <div style={{ textAlign: "center", marginBottom: "18px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 10px auto",
                    color: "#f59e0b",
                  }}
                >
                  <Lock size={20} />
                </div>
                <h2 style={{ fontSize: "19px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                  Access Your Financial Workspace
                </h2>
                <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                  Sign in or register to launch your personal wealth engine
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div
                style={{
                  display: "flex",
                  background: "rgba(6, 10, 18, 0.8)",
                  padding: "3px",
                  borderRadius: "10px",
                  marginBottom: "18px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode("LOGIN");
                    setError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: "8px",
                    border: "none",
                    background: mode === "LOGIN" ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" : "transparent",
                    color: mode === "LOGIN" ? "#030712" : "#94a3b8",
                    fontWeight: 800,
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("REGISTER");
                    setError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: "8px",
                    border: "none",
                    background: mode === "REGISTER" ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" : "transparent",
                    color: mode === "REGISTER" ? "#030712" : "#94a3b8",
                    fontWeight: 800,
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  Create Account
                </button>
              </div>

              {mode === "LOGIN" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(56, 189, 248, 0.10)",
                    border: "1px solid rgba(56, 189, 248, 0.28)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldCheck size={14} style={{ color: "#38bdf8" }} />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#cbd5e1" }}>
                      Secure sign-in uses your real account credentials.
                    </span>
                  </div>
                </div>
              )}

              {/* Alerts */}
              {error && (
                <div
                  style={{
                    background: "rgba(244,63,94,0.12)",
                    border: "1px solid rgba(244,63,94,0.35)",
                    color: "#f87171",
                    padding: "9px 12px",
                    borderRadius: "9px",
                    fontSize: "12px",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.35)",
                    color: "#34d399",
                    padding: "9px 12px",
                    borderRadius: "9px",
                    fontSize: "12px",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Sparkles size={14} style={{ flexShrink: 0 }} />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Login Form */}
              {mode === "LOGIN" ? (
                <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label className="form-label" style={{ fontSize: "12px", fontWeight: 600, color: "#cbd5e1" }}>
                      Username
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. testuser01"
                      required
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: "rgba(7, 11, 20, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#f8fafc",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: "12px", fontWeight: 600, color: "#cbd5e1" }}>
                      Password
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        style={{
                          width: "100%",
                          padding: "10px 38px 10px 12px",
                          borderRadius: "10px",
                          background: "rgba(7, 11, 20, 0.8)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#f8fafc",
                          fontSize: "13px",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "#94a3b8",
                          cursor: "pointer",
                          display: "flex",
                        }}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "11px",
                      fontSize: "13.5px",
                      fontWeight: 800,
                      marginTop: "6px",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                      color: "#030712",
                      cursor: loading ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 16px rgba(245, 158, 11, 0.35)",
                      transition: "all 0.18s ease",
                    }}
                  >
                    {loading ? "Authenticating…" : <>Sign In <ArrowRight size={15} strokeWidth={2.5} /></>}
                  </button>
                </form>
              ) : (
                /* Registration Form */
                <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label className="form-label required" style={{ fontSize: "11.5px", fontWeight: 600, color: "#cbd5e1" }}>
                      Desired Username
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g. johndoe"
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "9px",
                        background: "rgba(7, 11, 20, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#f8fafc",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: "11.5px", fontWeight: 600, color: "#cbd5e1" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="john@example.com"
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "9px",
                        background: "rgba(7, 11, 20, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#f8fafc",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div>
                    <label className="form-label required" style={{ fontSize: "11.5px", fontWeight: 600, color: "#cbd5e1" }}>
                      Password
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "9px",
                        background: "rgba(7, 11, 20, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#f8fafc",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div>
                    <label className="form-label required" style={{ fontSize: "11.5px", fontWeight: 600, color: "#cbd5e1" }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "9px",
                        background: "rgba(7, 11, 20, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#f8fafc",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "11px",
                      fontSize: "13.5px",
                      fontWeight: 800,
                      marginTop: "6px",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                      color: "#030712",
                      cursor: loading ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 16px rgba(245, 158, 11, 0.35)",
                    }}
                  >
                    {loading ? "Creating Account…" : <><UserPlus size={15} /> Create Account &amp; Sign In</>}
                  </button>
                </form>
              )}

              <div style={{ textAlign: "center", marginTop: "14px", fontSize: "11px", color: "#64748b" }}>
                Protected by AES-256 BYOK encryption &amp; PostgreSQL Tenant Auth
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Revolutionary Features Showcase ─── */}
      <section id="features" style={{ padding: "80px 24px", maxWidth: "1340px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(56, 189, 248, 0.12)",
              color: "#38bdf8",
              padding: "4px 14px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              marginBottom: "12px",
              border: "1px solid rgba(56, 189, 248, 0.25)",
            }}
          >
            <Cpu size={13} /> Unprecedented Financial Fidelity
          </div>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 900, color: "#f8fafc", margin: "0 0 12px 0", letterSpacing: "-0.025em" }}>
            Six Core Engines of Unmatched Financial Intelligence
          </h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", maxWidth: "660px", margin: "0 auto" }}>
            Every component is purpose-built to eliminate financial blind spots, audit statement ground truth, and execute multi-year wealth acceleration.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
          {/* Card 1: Multi-Agent OCR & Vector Vault */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "30px",
              backdropFilter: "blur(20px)",
              transition: "transform 0.2s ease, border-color 0.2s ease",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f59e0b",
                marginBottom: "18px",
              }}
            >
              <Search size={22} />
            </div>
            <h3 style={{ fontSize: "17.5px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
              Document Vault &amp; Semantic Vector RAG
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "13.5px", lineHeight: 1.6, margin: 0 }}>
              Ingest statements, payslips, tax returns, municipal bills, and invoices from any bank worldwide. Vector chunking and Cosine RAG search allow you to query your raw financial records in natural language.
            </p>
          </div>

          {/* Card 2: Forensic Ground Truth Engine */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.75)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "20px",
              padding: "30px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
                marginBottom: "18px",
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: "17.5px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
              Forensic Ground Truth &amp; Reversal Netting
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "13.5px", lineHeight: 1.6, margin: 0 }}>
              Eliminates artificial spend inflation by automatically netting NSF, ACH, and returned direct debit orders. Isolates escalating retry arrears and cross-account duplicates into verified net cash flow.
            </p>
          </div>

          {/* Card 3: Dual-Track Debt Waterfall */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "30px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(244, 63, 94, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f43f5e",
                marginBottom: "18px",
              }}
            >
              <Scale size={22} />
            </div>
            <h3 style={{ fontSize: "17.5px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
              Dual-Track Debt Avalanche &amp; Waterfall
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "13.5px", lineHeight: 1.6, margin: 0 }}>
              Segregates high-interest revolving credit from long-term mortgage obligations. Simulates mathematical Snowball vs. Avalanche trajectories, calculates exact interest preserved, and generates countdown milestones.
            </p>
          </div>

          {/* Card 4: Neural Money Flow Physics */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "30px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38bdf8",
                marginBottom: "18px",
              }}
            >
              <Workflow size={22} />
            </div>
            <h3 style={{ fontSize: "17.5px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
              Neural Money Flow &amp; Lineage Canvas
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "13.5px", lineHeight: 1.6, margin: 0 }}>
              Live interactive physics-based node map tracing the full lifecycle of every dollar, pound, euro, or rand from payroll deposit through bank accounts, debt servicing, cash withdrawals, and investments.
            </p>
          </div>

          {/* Card 5: Geotagged Spending Location Radar */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "30px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(168, 85, 247, 0.15)",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c084fc",
                marginBottom: "18px",
              }}
            >
              <Radar size={22} />
            </div>
            <h3 style={{ fontSize: "17.5px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
              Geotagged Merchant Radar &amp; Leakage
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "13.5px", lineHeight: 1.6, margin: 0 }}>
              Spatial intelligence that maps where physical cash and card spend actually occurs. Flags hidden friction, micro-ATM fees, and recurring subscription leakage before they compound.
            </p>
          </div>

          {/* Card 6: Autonomous AI Financial Coach (BYOK) */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "30px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fbbf24",
                marginBottom: "18px",
              }}
            >
              <Zap size={22} />
            </div>
            <h3 style={{ fontSize: "17.5px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
              Autonomous Cooperative AI Coach
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "13.5px", lineHeight: 1.6, margin: 0 }}>
              Bring Your Own Key (Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro) with contextual memory. Generates explainable, audited recommendations to optimize tax, debt payoff, and savings margins.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Cooperative AI Agents Architecture ─── */}
      <section
        id="ai-agents"
        style={{
          padding: "80px 24px",
          background: "rgba(6, 10, 20, 0.65)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: "1340px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(26px, 3.2vw, 36px)", fontWeight: 900, color: "#f8fafc", marginBottom: "12px" }}>
              Autonomous Multi-Agent Architecture
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "15px", maxWidth: "680px", margin: "0 auto" }}>
              Four specialized AI agents collaborate asynchronously to monitor, reconcile, and optimize your wealth portfolio 24/7.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
            <div style={{ background: "rgba(13, 20, 36, 0.8)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#f59e0b", marginBottom: "6px", letterSpacing: "0.05em" }}>01 · INGESTION</div>
              <h4 style={{ fontSize: "15.5px", fontWeight: 800, color: "#f8fafc", margin: "0 0 8px 0" }}>DOCUMENT_AGENT</h4>
              <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                High-precision OCR parsing of bank statements, payslips, and tax forms with vector chunk embedding.
              </p>
            </div>

            <div style={{ background: "rgba(13, 20, 36, 0.8)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#10b981", marginBottom: "6px", letterSpacing: "0.05em" }}>02 · FORENSICS</div>
              <h4 style={{ fontSize: "15.5px", fontWeight: 800, color: "#f8fafc", margin: "0 0 8px 0" }}>FORENSIC_AGENT</h4>
              <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                Reconciles raw statement debit orders, nets reverse transactions, and hashes multi-account duplicate entries.
              </p>
            </div>

            <div style={{ background: "rgba(13, 20, 36, 0.8)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#38bdf8", marginBottom: "6px", letterSpacing: "0.05em" }}>03 · CASCADE</div>
              <h4 style={{ fontSize: "15.5px", fontWeight: 800, color: "#f8fafc", margin: "0 0 8px 0" }}>CASCADE_AGENT</h4>
              <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                Computes optimal debt payoff velocity, adjusts surplus allocations, and measures interest preserved.
              </p>
            </div>

            <div style={{ background: "rgba(13, 20, 36, 0.8)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#c084fc", marginBottom: "6px", letterSpacing: "0.05em" }}>04 · REASONING</div>
              <h4 style={{ fontSize: "15.5px", fontWeight: 800, color: "#f8fafc", margin: "0 0 8px 0" }}>COACH_AGENT</h4>
              <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                Interactive natural language financial reasoning grounded in live database money flow ground truth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Global Multi-Currency Feature Highlight ─── */}
      <section id="multi-currency" style={{ padding: "80px 24px", maxWidth: "1340px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(18, 28, 52, 0.9) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "24px",
            padding: "40px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            alignItems: "center",
          }}
          className="multi-currency-card"
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38bdf8",
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 800,
                marginBottom: "14px",
                border: "1px solid rgba(56, 189, 248, 0.25)",
              }}
            >
              <Globe2 size={13} /> Global by Design
            </div>
            <h3 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "#f8fafc", margin: "0 0 14px 0", lineHeight: 1.15 }}>
              Universal Multi-Currency &amp; Global Banking Support
            </h3>
            <p style={{ fontSize: "14.5px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 22px 0" }}>
              Whether tracking accounts in US Dollars ($), Euros (€), British Pounds (£), South African Rand (R), or offshore holdings, MoneyManager seamlessly denominates and unifies your net worth into a single coherent financial narrative.
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {(
                [
                  { code: "ZAR" as SupportedCurrency, label: "ZAR (R)" },
                  { code: "USD" as SupportedCurrency, label: "USD ($)" },
                  { code: "EUR" as SupportedCurrency, label: "EUR (€)" },
                  { code: "GBP" as SupportedCurrency, label: "GBP (£)" },
                ] as const
              ).map((cur) => {
                const isSelected = currency === cur.code;
                return (
                  <button
                    key={cur.code}
                    type="button"
                    onClick={() => setCurrency(cur.code)}
                    style={{
                      background: isSelected ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.05)",
                      border: `1px solid ${isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.1)"}`,
                      color: isSelected ? "#38bdf8" : "#94a3b8",
                      padding: "5px 14px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cur.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              background: "rgba(6, 10, 18, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
              padding: "24px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#38bdf8", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Coins size={16} /> Live Denomination Preview ({curr.code})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "10px" }}>
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>Starter Tier</span>
                <span style={{ color: "#f8fafc", fontWeight: 800, fontSize: "13px", fontFamily: "var(--font-mono, monospace)" }}>{curr.starterPrice}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "10px" }}>
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>Pro Tier Monthly</span>
                <span style={{ color: "#10b981", fontWeight: 800, fontSize: "13px", fontFamily: "var(--font-mono, monospace)" }}>{curr.proMonthly}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "10px" }}>
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>Enterprise Monthly</span>
                <span style={{ color: "#f43f5e", fontWeight: 800, fontSize: "13px", fontFamily: "var(--font-mono, monospace)" }}>{curr.enterpriseMonthly}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing & Subscription Tiers Section ─── */}
      <section
        id="pricing"
        style={{
          padding: "80px 24px",
          background: "rgba(6, 10, 20, 0.65)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: "1340px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(245,158,11,0.12)",
                color: "#fbbf24",
                padding: "4px 14px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 800,
                marginBottom: "12px",
                border: "1px solid rgba(245,158,11,0.25)",
              }}
            >
              <CreditCard size={13} /> Transparent Pricing &amp; Subscriptions
            </div>
            <h2 style={{ fontSize: "clamp(28px, 3.5vw, 38px)", fontWeight: 900, color: "#f8fafc", margin: "0 0 12px 0", letterSpacing: "-0.025em" }}>
              Choose Your Wealth Acceleration Tier
            </h2>
            <p style={{ fontSize: "15px", color: "#94a3b8", maxWidth: "600px", margin: "0 auto 22px auto" }}>
              Unlock live statement reconciliation, dual-track debt cascade engines, and multi-agent AI assistants.
            </p>

            {/* Billing Cycle & Currency Switchers */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              {/* Billing Cycle Pill Switcher */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(8, 14, 28, 0.9)",
                  padding: "4px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  gap: "4px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setBillingCycle("MONTHLY")}
                  style={{
                    padding: "7px 18px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 700,
                    border: "none",
                    background: billingCycle === "MONTHLY" ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" : "transparent",
                    color: billingCycle === "MONTHLY" ? "#030712" : "#94a3b8",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("ANNUAL")}
                  style={{
                    padding: "7px 18px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 700,
                    border: "none",
                    background: billingCycle === "ANNUAL" ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" : "transparent",
                    color: billingCycle === "ANNUAL" ? "#030712" : "#94a3b8",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  Annual Billing{" "}
                  <span
                    style={{
                      fontSize: "10px",
                      background: billingCycle === "ANNUAL" ? "rgba(0,0,0,0.2)" : "rgba(16,185,129,0.2)",
                      color: billingCycle === "ANNUAL" ? "#030712" : "#10b981",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      marginLeft: "4px",
                      fontWeight: 800,
                    }}
                  >
                    Save 17%
                  </span>
                </button>
              </div>

              {/* Currency Quick-Switcher Pill */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(8, 14, 28, 0.9)",
                  padding: "4px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  gap: "2px",
                }}
              >
                {(["ZAR", "USD", "EUR", "GBP"] as SupportedCurrency[]).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setCurrency(cur)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 700,
                      border: "none",
                      background: currency === cur ? "rgba(56, 189, 248, 0.2)" : "transparent",
                      color: currency === cur ? "#38bdf8" : "#64748b",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cur} ({CURRENCY_CONFIG[cur].symbol})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px" }}>
            {/* Plan 1: Starter Free */}
            <div
              style={{
                background: "rgba(10, 16, 30, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "22px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backdropFilter: "blur(20px)",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em" }}>STARTER FREE</div>
                <div style={{ fontSize: "36px", fontWeight: 900, color: "#f8fafc", margin: "12px 0 4px 0", fontFamily: "var(--font-mono, monospace)" }}>
                  {curr.starterPrice} <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>/ month</span>
                </div>
                <p style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "22px" }}>Essential debt tracking &amp; manual line items.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#cbd5e1", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#10b981" }} /> Up to 3 Bank &amp; Asset Accounts</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#10b981" }} /> 5 Debt Trackers &amp; Snowball Engine</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#10b981" }} /> Monthly Budget Allocation Engine</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#10b981" }} /> Multi-Currency &amp; Line-Item Tracking</div>
                </div>
              </div>

              <button
                onClick={() => setMode("REGISTER")}
                type="button"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "11px",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  marginTop: "30px",
                }}
              >
                Create Starter Account
              </button>
            </div>

            {/* Plan 2: Pro Wealth Tier (MOST POPULAR) */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(22, 34, 58, 0.92) 0%, rgba(12, 18, 32, 0.98) 100%)",
                border: "2px solid rgba(245, 158, 11, 0.65)",
                borderRadius: "22px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                boxShadow: "0 18px 40px rgba(245, 158, 11, 0.18)",
                backdropFilter: "blur(24px)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                  color: "#030712",
                  fontSize: "9.5px",
                  fontWeight: 900,
                  padding: "3px 12px",
                  borderRadius: "999px",
                  letterSpacing: "0.06em",
                }}
              >
                MOST POPULAR
              </div>

              <div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#fbbf24", letterSpacing: "0.05em" }}>PRO WEALTH ACCELERATOR</div>
                <div style={{ fontSize: "36px", fontWeight: 900, color: "#f8fafc", margin: "12px 0 4px 0", fontFamily: "var(--font-mono, monospace)" }}>
                  {billingCycle === "MONTHLY" ? curr.proMonthly : curr.proAnnual}{" "}
                  <span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: 500 }}>/ month</span>
                </div>
                {billingCycle === "ANNUAL" && (
                  <div style={{ fontSize: "12px", color: "#fbbf24", marginBottom: "8px", fontWeight: 600 }}>
                    {curr.proAnnualBilled}
                  </div>
                )}
                <p style={{ fontSize: "12.5px", color: "#94a3b8", marginBottom: "22px" }}>Complete dual-track debt cascade &amp; AI radar engine.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#f8fafc", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#fbbf24" }} /> Unlimited Accounts &amp; Debts</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#fbbf24" }} /> Dual-Track Consumer vs Mortgage Engine</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#fbbf24" }} /> GPS Geotagged Merchant Spending Radar</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#fbbf24" }} /> BYOK Custom LLM Engine Key Vault</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#fbbf24" }} /> Multi-Agent AI (Document OCR &amp; Vector RAG)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#fbbf24" }} /> 365-Day Cashflow Forecasting</div>
                </div>
              </div>

              <button
                onClick={() => setMode("REGISTER")}
                type="button"
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: "11px",
                  fontSize: "13.5px",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                  border: "none",
                  color: "#030712",
                  cursor: "pointer",
                  marginTop: "30px",
                  boxShadow: "0 6px 18px rgba(245, 158, 11, 0.35)",
                }}
              >
                Start Pro Trial
              </button>
            </div>

            {/* Plan 3: Executive Enterprise */}
            <div
              style={{
                background: "rgba(10, 16, 30, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "22px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backdropFilter: "blur(20px)",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa", letterSpacing: "0.05em" }}>EXECUTIVE ENTERPRISE</div>
                <div style={{ fontSize: "36px", fontWeight: 900, color: "#f8fafc", margin: "12px 0 4px 0", fontFamily: "var(--font-mono, monospace)" }}>
                  {billingCycle === "MONTHLY" ? curr.enterpriseMonthly : curr.enterpriseAnnual}{" "}
                  <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>/ month</span>
                </div>
                {billingCycle === "ANNUAL" && (
                  <div style={{ fontSize: "12px", color: "#60a5fa", marginBottom: "8px", fontWeight: 600 }}>
                    {curr.enterpriseAnnualBilled}
                  </div>
                )}
                <p style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "22px" }}>Multi-family wealth workspace &amp; automated valuation feeds.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#cbd5e1", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#60a5fa" }} /> Everything in Pro Tier</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#60a5fa" }} /> Real Estate &amp; Automated Property Valuation</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#60a5fa" }} /> Direct OpenBanking Feeds (8 SA Banks via Stitch)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#60a5fa" }} /> Dedicated AI Financial Advisory Coach</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#60a5fa" }} /> Multi-Entity Workspaces (Personal, Business, Trust)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={15} style={{ color: "#60a5fa" }} /> Priority Concierge Support &amp; Forensic Auditing</div>
                </div>
              </div>

              <button
                onClick={() => setMode("REGISTER")}
                type="button"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "11px",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: "rgba(59, 130, 246, 0.12)",
                  border: "1px solid rgba(59, 130, 246, 0.35)",
                  color: "#60a5fa",
                  cursor: "pointer",
                  marginTop: "30px",
                }}
              >
                Contact Sales / Start Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Security & Cryptographic Integrity ─── */}
      <section id="security" style={{ padding: "80px 24px", maxWidth: "1340px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            background: "rgba(168, 85, 247, 0.12)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px auto",
            color: "#c084fc",
          }}
        >
          <KeyRound size={26} />
        </div>
        <h2 style={{ fontSize: "clamp(26px, 3.2vw, 36px)", fontWeight: 900, color: "#f8fafc", marginBottom: "12px" }}>
          Zero-Knowledge &amp; Bank-Grade Privacy
        </h2>
        <p style={{ color: "#94a3b8", fontSize: "14.5px", maxWidth: "680px", margin: "0 auto 32px auto", lineHeight: 1.6 }}>
          Your financial privacy is non-negotiable. MoneyManager utilizes AES-256 encryption at rest, cryptographic SHA-256 document hashing, strict PostgreSQL tenant schema isolation, and a Bring-Your-Own-Key (BYOK) architecture so third parties never access your unencrypted finances.
        </p>

        <div style={{ display: "inline-flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", fontSize: "13px", color: "#cbd5e1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}><ShieldCheck size={15} color="#10b981" /> 256-Bit TLS &amp; AES-256</div>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}><ShieldCheck size={15} color="#10b981" /> Tenant Data Partitioning</div>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}><ShieldCheck size={15} color="#10b981" /> BYOK Model Encryption</div>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}><ShieldCheck size={15} color="#10b981" /> SHA-256 Document Verification</div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "36px 24px",
          background: "rgba(3, 6, 12, 0.95)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: "1340px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#030712",
              }}
            >
              <Coins size={16} />
            </div>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>MoneyManager Intelligence</span>
          </div>

          <div style={{ fontSize: "12px", color: "#64748b" }}>
            © {new Date().getFullYear()} MoneyManager. Precision personal financial operating system. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ─── Responsive Media Queries ─── */}
      <style jsx global>{`
        @media (max-width: 1024px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-nav-toggle {
            display: block !important;
          }
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .multi-currency-card {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .desktop-btn {
            display: none !important;
          }
          .pillars-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

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
} from "lucide-react";

type SupportedCurrency = "USD" | "EUR" | "GBP" | "ZAR";

const CURRENCY_CONFIG: Record<
  SupportedCurrency,
  {
    symbol: string;
    code: string;
    starterPrice: string;
    proMonthly: string;
    proAnnual: string;
    enterpriseMonthly: string;
    enterpriseAnnual: string;
  }
> = {
  USD: {
    symbol: "$",
    code: "USD",
    starterPrice: "$0",
    proMonthly: "$12",
    proAnnual: "$9.99",
    enterpriseMonthly: "$29",
    enterpriseAnnual: "$24",
  },
  EUR: {
    symbol: "€",
    code: "EUR",
    starterPrice: "€0",
    proMonthly: "€11",
    proAnnual: "€8.99",
    enterpriseMonthly: "€27",
    enterpriseAnnual: "€22",
  },
  GBP: {
    symbol: "£",
    code: "GBP",
    starterPrice: "£0",
    proMonthly: "£9.50",
    proAnnual: "£7.99",
    enterpriseMonthly: "£23",
    enterpriseAnnual: "£19",
  },
  ZAR: {
    symbol: "R",
    code: "ZAR",
    starterPrice: "R 0",
    proMonthly: "R 199",
    proAnnual: "R 159",
    enterpriseMonthly: "R 499",
    enterpriseAnnual: "R 399",
  },
};

export default function LoginPage() {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [currency, setCurrency] = useState<SupportedCurrency>("USD");

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

  const fillDemoCredentials = () => {
    setMode("LOGIN");
    setUsername("testuser01");
    setPassword("");
    setError(null);
    const formEl = document.getElementById("auth-form-card");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth" });
    }
  };

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
        background: "radial-gradient(circle at 50% 5%, #0f1c38 0%, #060913 65%, #020408 100%)",
        color: "#f8fafc",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* ─── Pristine Glass Header Bar ─── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(8, 14, 28, 0.88)",
          backdropFilter: "blur(24px) saturate(180%)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "14px 32px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000000",
                boxShadow: "0 4px 20px rgba(245, 158, 11, 0.4)",
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <span style={{ fontSize: "19px", fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.02em" }}>
                MoneyManager
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-mono, monospace)",
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#fbbf24",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  padding: "2px 8px",
                  borderRadius: "99px",
                  marginLeft: "8px",
                  fontWeight: 800,
                }}
              >
                v4.0 OBSIDIAN
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", alignItems: "center", gap: "24px", fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>
            <a href="#features" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }}>Intelligence Engine</a>
            <a href="#ai-agents" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }}>Cooperative AI</a>
            <a href="#forensic-audit" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }}>Forensic Ground Truth</a>
            <a href="#pricing" style={{ color: "#fbbf24", textDecoration: "none", transition: "color 0.2s" }}>Subscriptions</a>
            <a href="#security" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }}>Zero-Knowledge Security</a>
          </nav>

          {/* Currency Switcher & Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Global Currency Preview Selector */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "99px",
                padding: "2px 6px",
              }}
            >
              <Globe2 size={13} style={{ color: "#38bdf8", marginLeft: "4px" }} />
              {(["USD", "EUR", "GBP", "ZAR"] as SupportedCurrency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  style={{
                    background: currency === c ? "rgba(56, 189, 248, 0.2)" : "transparent",
                    color: currency === c ? "#38bdf8" : "#64748b",
                    border: currency === c ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid transparent",
                    borderRadius: "99px",
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              onClick={fillDemoCredentials}
              style={{
                padding: "8px 16px",
                borderRadius: "99px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#f8fafc",
                cursor: "pointer",
              }}
            >
              Demo Access
            </button>

            <a
              href="#pricing"
              style={{
                padding: "8px 18px",
                borderRadius: "99px",
                fontSize: "12px",
                fontWeight: 800,
                background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                border: "none",
                color: "#000000",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
                textDecoration: "none",
              }}
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section style={{ padding: "80px 24px 60px 24px", maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", gap: "48px", alignItems: "center" }}>
          {/* Left Column: Value Proposition & Headlines */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                padding: "6px 16px",
                borderRadius: "99px",
                fontSize: "12px",
                color: "#fbbf24",
                fontWeight: 800,
                marginBottom: "24px",
              }}
            >
              <Sparkles size={14} />
              <span>Universal Financial Intelligence &amp; Autonomous Wealth Engineering</span>
            </div>

            <h1
              style={{
                fontSize: "52px",
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
              <span style={{ background: "linear-gradient(135deg, #f59e0b 0%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                To Details Never Seen or Imagined.
              </span>
            </h1>

            <p style={{ fontSize: "16px", lineHeight: 1.65, color: "#94a3b8", marginBottom: "32px", maxWidth: "620px" }}>
              The world’s most granular personal financial operating system. Engineered for global individuals and households who demand radical transparency — combining forensic statement reconciliation, dual-track debt waterfalls, neural money flow physics, and cooperative AI agents.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "40px" }}>
              <a
                href="#pricing"
                style={{
                  padding: "14px 28px",
                  borderRadius: "14px",
                  fontSize: "14px",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                  color: "#000000",
                  textDecoration: "none",
                  boxShadow: "0 10px 30px rgba(245, 158, 11, 0.4)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>Explore Subscription Plans</span>
                <ArrowRight size={16} />
              </a>

              <button
                onClick={fillDemoCredentials}
                style={{
                  padding: "14px 24px",
                  borderRadius: "14px",
                  fontSize: "14px",
                  fontWeight: 700,
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <User size={16} style={{ color: "#f59e0b" }} />
                <span>Launch Interactive Demo</span>
              </button>
            </div>

            {/* Feature Checkmarks List */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "13px", color: "#cbd5e1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                <span>Universal Multi-Currency Ledger (USD, EUR, GBP, ZAR)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                <span>Multi-Agent OCR &amp; Semantic Vector RAG Search</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                <span>Dual-Track Consumer vs Mortgage Debt Engine</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                <span>Forensic Cash Ground Truth &amp; Reversal Netting</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In / Create Account Glass Form Card */}
          <div id="auth-form-card">
            <div
              style={{
                background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(10, 16, 30, 0.98) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "24px",
                padding: "32px",
                boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8)",
                backdropFilter: "blur(24px)",
              }}
            >
              {/* Card Header Logo */}
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px auto",
                    color: "#f59e0b",
                  }}
                >
                  <Lock size={22} />
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
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
                  background: "rgba(7, 11, 20, 0.8)",
                  padding: "4px",
                  borderRadius: "12px",
                  marginBottom: "20px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <button
                  type="button"
                  onClick={() => { setMode("LOGIN"); setError(null); }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: "8px",
                    border: "none",
                    background: mode === "LOGIN" ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" : "transparent",
                    color: mode === "LOGIN" ? "#000000" : "#94a3b8",
                    fontWeight: 800,
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("REGISTER"); setError(null); }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: "8px",
                    border: "none",
                    background: mode === "REGISTER" ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" : "transparent",
                    color: mode === "REGISTER" ? "#000000" : "#94a3b8",
                    fontWeight: 800,
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  Create Account
                </button>
              </div>

              {/* Alerts */}
              {error && (
                <div style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.4)", color: "#f87171", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#34d399", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={14} />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Login Form */}
              {mode === "LOGIN" ? (
                <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label className="form-label" style={{ fontSize: "12px" }}>Username</label>
                    <input
                      type="text"
                      className="form-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. johndoe"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: "12px" }}>Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        style={{ paddingRight: "40px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: 800, marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  >
                    {loading ? "Authenticating…" : <>Sign In <ArrowRight size={16} /></>}
                  </button>
                </form>
              ) : (
                /* Registration Form */
                <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label className="form-label required" style={{ fontSize: "12px" }}>Desired Username</label>
                    <input
                      type="text"
                      className="form-input"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g. johndoe"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: "12px" }}>Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="form-label required" style={{ fontSize: "12px" }}>Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label required" style={{ fontSize: "12px" }}>Confirm Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: 800, marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  >
                    {loading ? "Creating Account…" : <><UserPlus size={16} /> Create Account &amp; Sign In</>}
                  </button>
                </form>
              )}

              <div style={{ textAlign: "center", marginTop: "16px", fontSize: "11px", color: "#64748b" }}>
                Protected by AES-256 BYOK encryption &amp; PostgreSQL Tenant Auth
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Revolutionary Features Showcase ─── */}
      <section id="features" style={{ padding: "80px 24px", maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "4px 14px", borderRadius: "99px", fontSize: "11px", fontWeight: 700, marginBottom: "12px" }}>
            <Cpu size={13} /> Unprecedented Financial Fidelity
          </div>
          <h2 style={{ fontSize: "38px", fontWeight: 900, color: "#f8fafc", margin: "0 0 14px 0", letterSpacing: "-0.02em" }}>
            Six Core Engines of Unmatched Financial Intelligence
          </h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", maxWidth: "660px", margin: "0 auto" }}>
            Every component is purpose-built to eliminate financial blind spots, audit statement ground truth, and execute multi-year wealth acceleration.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
          {/* Card 1: Multi-Agent OCR & Vector Vault */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "32px",
              backdropFilter: "blur(20px)",
              transition: "transform 0.2s ease, border-color 0.2s ease",
            }}
          >
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b", marginBottom: "20px" }}>
              <Search size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
              Document Vault &amp; Semantic Vector RAG
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              Ingest statements, payslips, tax returns, municipal bills, and invoices from any bank worldwide. Vector chunking and Cosine RAG search allow you to query your raw financial records in natural language.
            </p>
          </div>

          {/* Card 2: Forensic Ground Truth Engine */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.75)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "20px",
              padding: "32px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", marginBottom: "20px" }}>
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
              Forensic Ground Truth &amp; Reversal Netting
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              Eliminates artificial spend inflation by automatically netting NSF, ACH, and returned direct debit orders. Isolates escalating retry arrears and cross-account duplicates into verified net cash flow.
            </p>
          </div>

          {/* Card 3: Dual-Track Debt Waterfall */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "32px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f43f5e", marginBottom: "20px" }}>
              <Scale size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
              Dual-Track Debt Avalanche &amp; Waterfall
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              Segregates high-interest revolving credit from long-term mortgage obligations. Simulates mathematical Snowball vs. Avalanche trajectories, calculates exact interest preserved, and generates countdown milestones.
            </p>
          </div>

          {/* Card 4: Neural Money Flow Physics */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "32px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", marginBottom: "20px" }}>
              <Workflow size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
              Neural Money Flow &amp; Lineage Canvas
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              Live interactive physics-based node map tracing the full lifecycle of every dollar, pound, euro, or rand from payroll deposit through bank accounts, debt servicing, cash withdrawals, and investments.
            </p>
          </div>

          {/* Card 5: Geotagged Spending Location Radar */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "32px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#c084fc", marginBottom: "20px" }}>
              <Radar size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
              Geotagged Merchant Radar &amp; Leakage
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              Spatial intelligence that maps where physical cash and card spend actually occurs. Flags hidden friction, micro-ATM fees, and recurring subscription leakage before they compound.
            </p>
          </div>

          {/* Card 6: Autonomous AI Financial Coach (BYOK) */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "32px",
              backdropFilter: "blur(20px)",
            }}
          >
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24", marginBottom: "20px" }}>
              <Zap size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
              Autonomous Cooperative AI Coach
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              Bring Your Own Key (Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro) with contextual memory. Generates explainable, audited recommendations to optimize tax, debt payoff, and savings margins.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Cooperative AI Agents Architecture ─── */}
      <section id="ai-agents" style={{ padding: "80px 24px", background: "rgba(7, 11, 20, 0.7)", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "36px", fontWeight: 900, color: "#f8fafc", marginBottom: "12px" }}>
              Autonomous Multi-Agent Architecture
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "16px", maxWidth: "680px", margin: "0 auto" }}>
              Four specialized AI agents collaborate asynchronously to monitor, reconcile, and optimize your wealth portfolio 24/7.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            <div style={{ background: "rgba(13, 20, 36, 0.8)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#f59e0b", marginBottom: "6px" }}>01 · INGESTION</div>
              <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: "0 0 8px 0" }}>DOCUMENT_AGENT</h4>
              <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                High-precision OCR parsing of bank statements, payslips, and tax forms with vector chunk embedding.
              </p>
            </div>

            <div style={{ background: "rgba(13, 20, 36, 0.8)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#10b981", marginBottom: "6px" }}>02 · FORENSICS</div>
              <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: "0 0 8px 0" }}>FORENSIC_AGENT</h4>
              <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                Reconciles raw statement debit orders, nets reverse transactions, and hashes multi-account duplicate entries.
              </p>
            </div>

            <div style={{ background: "rgba(13, 20, 36, 0.8)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#38bdf8", marginBottom: "6px" }}>03 · CASCADE</div>
              <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: "0 0 8px 0" }}>CASCADE_AGENT</h4>
              <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                Computes optimal debt payoff velocity, adjusts surplus allocations, and measures interest preserved.
              </p>
            </div>

            <div style={{ background: "rgba(13, 20, 36, 0.8)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#c084fc", marginBottom: "6px" }}>04 · REASONING</div>
              <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: "0 0 8px 0" }}>COACH_AGENT</h4>
              <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                Interactive natural language financial reasoning grounded in live database money flow ground truth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Global Multi-Currency Feature Highlight ─── */}
      <section style={{ padding: "80px 24px", maxWidth: "1280px", margin: "0 auto" }}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(20, 32, 58, 0.85) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "28px",
            padding: "48px 40px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "4px 12px", borderRadius: "99px", fontSize: "11px", fontWeight: 800, marginBottom: "16px" }}>
              <Globe2 size={13} /> Global by Design
            </div>
            <h3 style={{ fontSize: "32px", fontWeight: 900, color: "#f8fafc", margin: "0 0 16px 0", lineHeight: 1.15 }}>
              Universal Multi-Currency &amp; Global Banking Support
            </h3>
            <p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 24px 0" }}>
              Whether tracking accounts in US Dollars ($), Euros (€), British Pounds (£), South African Rand (R), or offshore holdings, MoneyManager seamlessly denominates and unifies your net worth into a single coherent financial narrative.
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "6px 14px", borderRadius: "99px", fontSize: "12px", fontWeight: 700 }}>USD ($)</span>
              <span style={{ background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "6px 14px", borderRadius: "99px", fontSize: "12px", fontWeight: 700 }}>EUR (€)</span>
              <span style={{ background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "6px 14px", borderRadius: "99px", fontSize: "12px", fontWeight: 700 }}>GBP (£)</span>
              <span style={{ background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "6px 14px", borderRadius: "99px", fontSize: "12px", fontWeight: 700 }}>ZAR (R)</span>
              <span style={{ background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "6px 14px", borderRadius: "99px", fontSize: "12px", fontWeight: 700 }}>CAD (C$)</span>
              <span style={{ background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "6px 14px", borderRadius: "99px", fontSize: "12px", fontWeight: 700 }}>AUD (A$)</span>
            </div>
          </div>

          <div
            style={{
              background: "rgba(7, 11, 20, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "24px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#38bdf8", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Coins size={16} /> Dynamic Net Worth Engine
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "10px" }}>
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>Global Ingestion Compatibility</span>
                <span style={{ color: "#10b981", fontWeight: 700, fontSize: "13px" }}>Universal OCR</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "10px" }}>
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>Payroll Cycle Flexibility</span>
                <span style={{ color: "#10b981", fontWeight: 700, fontSize: "13px" }}>Monthly • Bi-Weekly • Custom</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "10px" }}>
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>Debit Bounce Reconciliations</span>
                <span style={{ color: "#10b981", fontWeight: 700, fontSize: "13px" }}>ACH • SEPA • RTD Reversals</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing & Subscription Tiers Section ─── */}
      <section id="pricing" style={{ padding: "80px 24px", background: "rgba(7, 11, 20, 0.6)", borderTop: "1px solid rgba(255, 255, 255, 0.08)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(245,158,11,0.15)", color: "#fbbf24", padding: "4px 14px", borderRadius: "99px", fontSize: "11px", fontWeight: 800, marginBottom: "12px" }}>
              <CreditCard size={13} /> Transparent Pricing &amp; Subscriptions
            </div>
            <h2 style={{ fontSize: "38px", fontWeight: 900, color: "#f8fafc", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>
              Choose Your Wealth Acceleration Tier
            </h2>
            <p style={{ fontSize: "15px", color: "#94a3b8", maxWidth: "600px", margin: "0 auto 24px auto" }}>
              Unlock live statement reconciliation, dual-track debt cascade engines, and multi-agent AI assistants.
            </p>

            {/* Billing Cycle Pill Switcher */}
            <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(10, 16, 30, 0.9)", padding: "4px", borderRadius: "99px", border: "1px solid rgba(255, 255, 255, 0.1)", gap: "4px" }}>
              <button
                onClick={() => setBillingCycle("MONTHLY")}
                style={{
                  padding: "8px 20px",
                  borderRadius: "99px",
                  fontSize: "12px",
                  fontWeight: 700,
                  border: "none",
                  background: billingCycle === "MONTHLY" ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" : "transparent",
                  color: billingCycle === "MONTHLY" ? "#000000" : "#94a3b8",
                  cursor: "pointer",
                }}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle("ANNUAL")}
                style={{
                  padding: "8px 20px",
                  borderRadius: "99px",
                  fontSize: "12px",
                  fontWeight: 700,
                  border: "none",
                  background: billingCycle === "ANNUAL" ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" : "transparent",
                  color: billingCycle === "ANNUAL" ? "#000000" : "#94a3b8",
                  cursor: "pointer",
                }}
              >
                Annual Billing <span style={{ fontSize: "10px", background: "rgba(16,185,129,0.2)", color: "#10b981", padding: "2px 6px", borderRadius: "6px", marginLeft: "4px" }}>Save 20%</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "28px" }}>
            {/* Plan 1: Starter Free */}
            <div
              style={{
                background: "rgba(10, 16, 30, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "24px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backdropFilter: "blur(20px)",
              }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#94a3b8" }}>STARTER FREE</div>
                <div style={{ fontSize: "36px", fontWeight: 900, color: "#f8fafc", margin: "12px 0 4px 0", fontFamily: "var(--font-mono, monospace)" }}>
                  {curr.starterPrice} <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>/ month</span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "24px" }}>Essential debt tracking &amp; manual line items.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#cbd5e1", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#10b981" }} /> Up to 3 Linked Accounts</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#10b981" }} /> Standard Snowball Debt Engine</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#10b981" }} /> Monthly Budget Allocation</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#10b981" }} /> Multi-Currency Support</div>
                </div>
              </div>

              <button
                onClick={fillDemoCredentials}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  marginTop: "32px",
                }}
              >
                Get Started Free
              </button>
            </div>

            {/* Plan 2: Pro Wealth Tier (MOST POPULAR) */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(25, 38, 66, 0.9) 0%, rgba(13, 20, 36, 0.98) 100%)",
                border: "2px solid rgba(245, 158, 11, 0.6)",
                borderRadius: "24px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                boxShadow: "0 20px 40px rgba(245, 158, 11, 0.15)",
                backdropFilter: "blur(24px)",
              }}
            >
              <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)", color: "#000000", fontSize: "10px", fontWeight: 800, padding: "3px 12px", borderRadius: "99px", letterSpacing: "0.05em" }}>
                MOST POPULAR
              </div>

              <div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#fbbf24" }}>PRO WEALTH ACCELERATOR</div>
                <div style={{ fontSize: "36px", fontWeight: 900, color: "#f8fafc", margin: "12px 0 4px 0", fontFamily: "var(--font-mono, monospace)" }}>
                  {billingCycle === "MONTHLY" ? curr.proMonthly : curr.proAnnual}{" "}
                  <span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: 500 }}>/ month</span>
                </div>
                <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "24px" }}>Complete dual-track debt cascade &amp; AI radar engine.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#f8fafc", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#fbbf24" }} /> Unlimited Linked Accounts &amp; Debts</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#fbbf24" }} /> Dual-Track Consumer vs Mortgage Engine</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#fbbf24" }} /> Multi-Agent AI (Document OCR &amp; RAG)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#fbbf24" }} /> Forensic Statement Ground Truth &amp; Reversal Netting</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#fbbf24" }} /> Geotagged Merchant Spending Radar</div>
                </div>
              </div>

              <button
                onClick={fillDemoCredentials}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                  border: "none",
                  color: "#000000",
                  cursor: "pointer",
                  marginTop: "32px",
                  boxShadow: "0 8px 20px rgba(245, 158, 11, 0.35)",
                }}
              >
                Launch Pro Workspace
              </button>
            </div>

            {/* Plan 3: Executive Enterprise */}
            <div
              style={{
                background: "rgba(10, 16, 30, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "24px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backdropFilter: "blur(20px)",
              }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#60a5fa" }}>EXECUTIVE ENTERPRISE</div>
                <div style={{ fontSize: "36px", fontWeight: 900, color: "#f8fafc", margin: "12px 0 4px 0", fontFamily: "var(--font-mono, monospace)" }}>
                  {billingCycle === "MONTHLY" ? curr.enterpriseMonthly : curr.enterpriseAnnual}{" "}
                  <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>/ month</span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "24px" }}>Multi-family wealth workspace &amp; automated valuation feeds.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#cbd5e1", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#60a5fa" }} /> Everything in Pro Tier</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#60a5fa" }} /> Real Estate &amp; Automated Property Valuation</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#60a5fa" }} /> Direct OpenBanking Feeds</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#60a5fa" }} /> Dedicated AI Financial Advisory Coach</div>
                </div>
              </div>

              <button
                onClick={fillDemoCredentials}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.4)",
                  color: "#60a5fa",
                  cursor: "pointer",
                  marginTop: "32px",
                }}
              >
                Launch Enterprise Workspace
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Security & Cryptographic Integrity ─── */}
      <section id="security" style={{ padding: "80px 24px", maxWidth: "1280px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto", color: "#c084fc" }}>
          <KeyRound size={28} />
        </div>
        <h2 style={{ fontSize: "36px", fontWeight: 900, color: "#f8fafc", marginBottom: "14px" }}>
          Zero-Knowledge &amp; Bank-Grade Privacy
        </h2>
        <p style={{ color: "#94a3b8", fontSize: "15px", maxWidth: "680px", margin: "0 auto 36px auto", lineHeight: 1.6 }}>
          Your financial privacy is non-negotiable. MoneyManager utilizes AES-256 encryption at rest, cryptographic SHA-256 document hashing, strict PostgreSQL tenant schema isolation, and a Bring-Your-Own-Key (BYOK) architecture so third parties never access your unencrypted finances.
        </p>

        <div style={{ display: "inline-flex", gap: "24px", flexWrap: "wrap", justifyContent: "center", fontSize: "13px", color: "#cbd5e1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><ShieldCheck size={16} color="#10b981" /> 256-Bit TLS &amp; AES-256</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><ShieldCheck size={16} color="#10b981" /> Tenant Data Partitioning</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><ShieldCheck size={16} color="#10b981" /> BYOK Model Encryption</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><ShieldCheck size={16} color="#10b981" /> SHA-256 Document Verification</div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", padding: "40px 32px", background: "rgba(3, 6, 12, 0.95)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", color: "#000" }}>
              <ShieldCheck size={16} />
            </div>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>MoneyManager Intelligence</span>
          </div>

          <div style={{ fontSize: "12px", color: "#64748b" }}>
            © {new Date().getFullYear()} MoneyManager. Precision personal financial operating system. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

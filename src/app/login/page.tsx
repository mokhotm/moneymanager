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
} from "lucide-react";
import { formatZAR } from "@/lib/formatters";

export default function LoginPage() {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");

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
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    priceMonthly: number;
    priceAnnual: number;
  } | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "EFT" | "APPLE_PAY">("CARD");
  const [cardForm, setCardForm] = useState({
    name: "Mokgadi Khotso",
    cardNumber: "4000 •••• •••• 9821",
    expiry: "12/28",
    cvv: "391",
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

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

  const openSubscriptionModal = (planName: string, monthly: number, annual: number) => {
    setError("Please sign in or create an account to select a subscription tier.");
    setMode("REGISTER");
    const formEl = document.getElementById("auth-form-card");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPayment(true);

    try {
      const tierEnum = selectedPlan?.name.includes("PRO")
        ? "PRO_WEALTH"
        : selectedPlan?.name.includes("ENTERPRISE")
        ? "EXECUTIVE_ENTERPRISE"
        : "STARTER_FREE";

      const amount = billingCycle === "MONTHLY" ? selectedPlan?.priceMonthly : selectedPlan?.priceAnnual;

      await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tierEnum,
          billingCycle,
          paymentGateway: paymentMethod,
          amount,
        }),
      });

      setIsProcessingPayment(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        setIsCheckoutModalOpen(false);
        fillDemoCredentials();
      }, 1500);
    } catch (err) {
      setIsProcessingPayment(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        setIsCheckoutModalOpen(false);
        fillDemoCredentials();
      }, 1500);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 10%, #0d1629 0%, #050811 75%)",
        color: "#f8fafc",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Pristine Glass Header Bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(10, 16, 30, 0.85)",
          backdropFilter: "blur(24px) saturate(180%)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "16px 32px",
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
              <span style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>
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
                  fontWeight: 700,
                }}
              >
                PRO WEALTH
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", alignItems: "center", gap: "28px", fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>
            <a href="#features" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }}>Features</a>
            <a href="#ai-agents" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }}>AI Multi-Agent</a>
            <a href="#pricing" style={{ color: "#fbbf24", textDecoration: "none", transition: "color 0.2s" }}>Subscription Plans</a>
            <a href="#security" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }}>Security</a>
          </nav>

          {/* Header Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={fillDemoCredentials}
              style={{
                padding: "8px 18px",
                borderRadius: "99px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#f8fafc",
                cursor: "pointer",
              }}
            >
              Sign In
            </button>
            <a
              href="#pricing"
              style={{
                padding: "8px 20px",
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
              Upgrade to Pro
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: "80px 24px 60px 24px", maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", gap: "48px", alignItems: "center" }}>
          {/* Left Column: Value Proposition & Headlines */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "6px 14px",
                borderRadius: "99px",
                fontSize: "12px",
                color: "#fbbf24",
                fontWeight: 700,
                marginBottom: "24px",
              }}
            >
              <Sparkles size={14} />
              <span>Next-Gen Enterprise Wealth &amp; Debt Waterfall Platform</span>
            </div>

            <h1
              style={{
                fontSize: "52px",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                margin: "0 0 20px 0",
                background: "linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Master Your Net Worth. <br />
              <span style={{ background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Accelerate Debt Payoff.
              </span>
            </h1>

            <p style={{ fontSize: "16px", lineHeight: 1.6, color: "#94a3b8", marginBottom: "32px", maxWidth: "620px" }}>
              The all-in-one personal financial engine engineered for South Africa. Combines dual-track waterfall debt acceleration, OpenBanking line-item reconciliation, geotagged merchant radar, and cooperative AI agents.
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
                <span>View Subscription Plans</span>
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
                <span>Test Demo Account</span>
              </button>
            </div>

            {/* Feature Checkmarks List */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "13px", color: "#cbd5e1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                <span>Dual-Track Consumer vs Mortgage Engine</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                <span>Geotagged RSA Spending Location Radar</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                <span>BYOK Multi-Agent AI (Claude, GPT-4o, Gemini)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                <span>AES-256 Encrypted &amp; OpenBanking Synced</span>
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
                      placeholder="e.g. mokhotm"
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

      {/* Features Section */}
      <section id="features" style={{ padding: "60px 24px", maxWidth: "1280px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#f8fafc", marginBottom: "40px" }}>Core Features</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", textAlign: "left" }}>
          <div style={{ background: "rgba(10,16,30,0.6)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ color: "#fbbf24", fontWeight: 700, marginBottom: "8px" }}>Dual-Track Debt Waterfall</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.5 }}>Automatically allocate extra cash to debts to accelerate payoff, considering both snowball and avalanche strategies.</p>
          </div>
          <div style={{ background: "rgba(10,16,30,0.6)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ color: "#fbbf24", fontWeight: 700, marginBottom: "8px" }}>Money Flow & Reconciliation</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.5 }}>Track every Rand with our "Money Journey Explorer". Understand exactly where your money comes from and goes.</p>
          </div>
          <div style={{ background: "rgba(10,16,30,0.6)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ color: "#fbbf24", fontWeight: 700, marginBottom: "8px" }}>Goal Planning</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.5 }}>Set financial goals (emergency funds, holidays, home deposits) and track completion accurately against your budget.</p>
          </div>
        </div>
      </section>

      {/* AI Agents Section */}
      <section id="ai-agents" style={{ padding: "60px 24px", background: "rgba(7, 11, 20, 0.6)", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#f8fafc", marginBottom: "20px" }}>Cooperative AI Agents</h2>
          <p style={{ color: "#94a3b8", fontSize: "16px", maxWidth: "700px", margin: "0 auto 40px auto" }}>Our platform runs on four cooperative AI agents that actively manage your finances and provide explainable recommendations, instead of acting as a passive calculator.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px", textAlign: "left" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "12px" }}>
              <strong style={{ color: "#f8fafc" }}>Document Agent:</strong> Ingests bank statements and automatically categorizes line items.
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "12px" }}>
              <strong style={{ color: "#f8fafc" }}>Budget Agent:</strong> Balances your recurring and one-off expenses dynamically.
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "12px" }}>
              <strong style={{ color: "#f8fafc" }}>Debt Agent:</strong> Calculates optimal payoff paths based on your true margin.
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "12px" }}>
              <strong style={{ color: "#f8fafc" }}>Goals Agent:</strong> Allocates surplus cash to your wealth-building goals.
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" style={{ padding: "60px 24px", maxWidth: "1280px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#f8fafc", marginBottom: "20px" }}>Bank-Grade Security</h2>
        <p style={{ color: "#94a3b8", fontSize: "16px", maxWidth: "600px", margin: "0 auto" }}>
          We utilize AES-256 encryption at rest, PostgreSQL tenant isolation, and a BYOK (Bring Your Own Key) model for LLM integrations to ensure your financial data is completely secure.
        </p>
      </section>

      {/* Terms Section (dummy for the footer link) */}
      <div id="terms" style={{ height: "1px" }}></div>

      {/* Pricing & Subscription Tiers Section */}
      <section id="pricing" style={{ padding: "80px 24px", background: "rgba(7, 11, 20, 0.6)", borderTop: "1px solid rgba(255, 255, 255, 0.08)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(245,158,11,0.15)", color: "#fbbf24", padding: "4px 12px", borderRadius: "99px", fontSize: "11px", fontWeight: 700, marginBottom: "12px" }}>
              <CreditCard size={13} /> Transparent Pricing &amp; Subscriptions
            </div>
            <h2 style={{ fontSize: "36px", fontWeight: 900, color: "#f8fafc", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>
              Choose Your Wealth Acceleration Tier
            </h2>
            <p style={{ fontSize: "15px", color: "#94a3b8", maxWidth: "600px", margin: "0 auto 24px auto" }}>
              Unlock live bank synchronization, dual-track debt cascade engines, and multi-agent AI assistants.
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
                  R 0 <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>/ month</span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "24px" }}>Perfect for basic debt tracking &amp; manual line items.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#cbd5e1", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#10b981" }} /> Up to 3 Linked Bank Accounts</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#10b981" }} /> Standard Snowball Debt Engine</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#10b981" }} /> Monthly Budget Allocation</div>
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
                  {billingCycle === "MONTHLY" ? "R 199" : "R 159"}{" "}
                  <span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: 500 }}>/ month</span>
                </div>
                <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "24px" }}>Complete dual-track debt cascade &amp; AI radar engine.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#f8fafc", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#fbbf24" }} /> Unlimited Accounts &amp; Debt Accounts</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#fbbf24" }} /> Dual-Track Consumer vs Mortgage Engine</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#fbbf24" }} /> Geotagged RSA Spending Location Radar</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#fbbf24" }} /> Multi-Agent AI (Document OCR &amp; Rationale)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#fbbf24" }} /> BYOK Custom LLM Encryption</div>
                </div>
              </div>

              <button
                onClick={() => openSubscriptionModal("PRO WEALTH ACCELERATOR", 199, 159)}
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
                Subscribe to Pro Tier
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
                  {billingCycle === "MONTHLY" ? "R 499" : "R 399"}{" "}
                  <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>/ month</span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "24px" }}>Multi-family wealth workspace &amp; Windeed valuation feeds.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#cbd5e1", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#60a5fa" }} /> Everything in Pro Tier</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#60a5fa" }} /> Windeed &amp; Lightstone Property Valuation</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#60a5fa" }} /> Direct OpenBanking Direct API Connection</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} style={{ color: "#60a5fa" }} /> Dedicated AI Wealth Coach</div>
                </div>
              </div>

              <button
                onClick={() => openSubscriptionModal("EXECUTIVE ENTERPRISE", 499, 399)}
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
                Subscribe to Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Payment Checkout Modal */}
      {isCheckoutModalOpen && selectedPlan && (
        <div className="modal-overlay" onClick={() => setIsCheckoutModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Complete Your Subscription</h2>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                  Plan: <strong style={{ color: "#fbbf24" }}>{selectedPlan.name}</strong>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsCheckoutModalOpen(false)}>✕</button>
            </div>

            {paymentSuccess ? (
              <div style={{ padding: "40px 24px", textAlign: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", border: "2px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto", color: "#10b981" }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#f8fafc", margin: "0 0 6px 0" }}>Subscription Activated!</h3>
                <p style={{ fontSize: "13px", color: "#94a3b8" }}>Welcome to {selectedPlan.name}. Launching your workspace…</p>
              </div>
            ) : (
              <form onSubmit={handleProcessPayment}>
                <div className="modal-body">
                  {/* Summary Box */}
                  <div
                    style={{
                      background: "rgba(10, 16, 30, 0.8)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      borderRadius: "14px",
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "20px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc" }}>{selectedPlan.name}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        Billed {billingCycle.toLowerCase()} • Auto-renewing cancel anytime
                      </div>
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 900, color: "#fbbf24", fontFamily: "var(--font-mono, monospace)" }}>
                      {formatZAR(billingCycle === "MONTHLY" ? selectedPlan.priceMonthly : selectedPlan.priceAnnual)}
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("CARD")}
                        style={{
                          padding: "10px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          border: paymentMethod === "CARD" ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.08)",
                          background: paymentMethod === "CARD" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                          color: paymentMethod === "CARD" ? "#fbbf24" : "#94a3b8",
                          cursor: "pointer",
                        }}
                      >
                        Credit Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("EFT")}
                        style={{
                          padding: "10px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          border: paymentMethod === "EFT" ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.08)",
                          background: paymentMethod === "EFT" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                          color: paymentMethod === "EFT" ? "#fbbf24" : "#94a3b8",
                          cursor: "pointer",
                        }}
                      >
                        Instant EFT
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("APPLE_PAY")}
                        style={{
                          padding: "10px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          border: paymentMethod === "APPLE_PAY" ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.08)",
                          background: paymentMethod === "APPLE_PAY" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                          color: paymentMethod === "APPLE_PAY" ? "#fbbf24" : "#94a3b8",
                          cursor: "pointer",
                        }}
                      >
                        Apple Pay
                      </button>
                    </div>
                  </div>

                  {/* Card Details Form */}
                  <div className="form-group">
                    <label className="form-label required">Cardholder Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={cardForm.name}
                      onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Card Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={cardForm.cardNumber}
                      onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className="two-col">
                    <div className="form-group">
                      <label className="form-label required">Expiry Date</label>
                      <input
                        type="text"
                        className="form-input"
                        value={cardForm.expiry}
                        onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })}
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label required">CVV</label>
                      <input
                        type="password"
                        className="form-input"
                        value={cardForm.cvv}
                        onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })}
                        placeholder="123"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsCheckoutModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex items-center gap-1.5" disabled={isProcessingPayment}>
                    <ShieldCheck size={16} />
                    <span>{isProcessingPayment ? "Authorizing Payment…" : `Pay ${formatZAR(billingCycle === "MONTHLY" ? selectedPlan.priceMonthly : selectedPlan.priceAnnual)}`}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "12px", color: "#64748b", textAlign: "center" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>© 2026 MoneyManager Enterprise Wealth Platform. All rights reserved.</div>
          <div style={{ display: "flex", gap: "20px" }}>
            <a href="#security" style={{ color: "#64748b", textDecoration: "none" }}>Security &amp; Encryption</a>
            <a href="#pricing" style={{ color: "#64748b", textDecoration: "none" }}>Subscriptions</a>
            <a href="#terms" style={{ color: "#64748b", textDecoration: "none" }}>Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

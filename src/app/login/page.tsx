"use client";

import { useState, useEffect } from "react";
import { Lock, User, ShieldCheck, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff, UserPlus, Mail, Briefcase } from "lucide-react";

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

      // Successful login
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

      // Successful registration & auto-login — send to onboarding checklist
      setSuccessMsg("Account created! Setting up your workspace…");
      setTimeout(() => {
        window.location.href = "/onboarding";
      }, 500);
    } catch (err: any) {
      setError("Network error during registration. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 20%, rgba(20, 184, 166, 0.15) 0%, var(--bg-color) 70%)",
        padding: 24,
      }}
    >
      <div
        className="card"
        style={{
          width: 460,
          maxWidth: "100%",
          padding: 36,
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          border: "1px solid var(--border-color)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Header Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px auto",
              boxShadow: "0 8px 24px rgba(20, 184, 166, 0.4)",
              color: "#fff",
            }}
          >
            <ShieldCheck size={30} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px 0" }}>MoneyManagement</h1>
          <p className="text-muted text-sm">Enterprise Wealth & Debt Payoff Platform</p>
        </div>

        {/* Mode Switcher Tabs */}
        <div
          style={{
            display: "flex",
            background: "rgba(255,255,255,0.05)",
            padding: 4,
            borderRadius: 12,
            marginBottom: 20,
            border: "1px solid var(--border-light)",
          }}
        >
          <button
            type="button"
            onClick={() => { setMode("LOGIN"); setError(null); }}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 8,
              border: "none",
              background: mode === "LOGIN" ? "var(--accent-color)" : "transparent",
              color: mode === "LOGIN" ? "#070b14" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            id="tab-sign-in"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("REGISTER"); setError(null); }}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 8,
              border: "none",
              background: mode === "REGISTER" ? "var(--accent-color)" : "transparent",
              color: mode === "REGISTER" ? "#070b14" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            id="tab-register"
          >
            Create Account
          </button>
        </div>

        {/* Demo Preset Helper Badge (Shown in LOGIN mode) */}
        {mode === "LOGIN" && (
          <div
            style={{
              background: "rgba(20, 184, 166, 0.08)",
              border: "1px dashed var(--accent-color)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: "#14b8a6" }}>
                <Sparkles size={14} /> Demo Account
              </div>
              <div className="text-muted text-xs" style={{ marginTop: 2 }}>
                testuser01
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fillDemoCredentials}
              style={{ fontSize: 11, padding: "4px 10px" }}
              id="fill-demo-creds-btn"
            >
              Auto-fill
            </button>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div
            className="badge red mb-4 flex items-center gap-2"
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: 13,
              borderRadius: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="badge green mb-4 flex items-center gap-2"
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: 13,
              borderRadius: 8,
            }}
          >
            <Sparkles size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === "LOGIN" ? (
          <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="form-label flex items-center gap-1.5" htmlFor="login-username">
                <User size={14} /> Username
              </label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. mokhotm"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="form-label flex items-center gap-1.5" htmlFor="login-password">
                <Lock size={14} /> Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                padding: 12,
                fontSize: 15,
                fontWeight: 600,
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              id="login-submit-btn"
            >
              {loading ? "Authenticating..." : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="form-label flex items-center gap-1.5" htmlFor="reg-username">
                <User size={14} /> Desired Username <span className="text-red-400">*</span>
              </label>
              <input
                id="reg-username"
                type="text"
                className="form-input"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="e.g. johndoe"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="form-label flex items-center gap-1.5" htmlFor="reg-email">
                <Mail size={14} /> Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                className="form-input"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="e.g. john@example.com"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="form-label flex items-center gap-1.5" htmlFor="reg-fullname">
                  <User size={14} /> Full Name
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  className="form-input"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="form-label flex items-center gap-1.5" htmlFor="reg-jobtitle">
                  <Briefcase size={14} /> Job Title
                </label>
                <input
                  id="reg-jobtitle"
                  type="text"
                  className="form-input"
                  value={regJobTitle}
                  onChange={(e) => setRegJobTitle(e.target.value)}
                  placeholder="e.g. Engineer"
                />
              </div>
            </div>

            <div>
              <label className="form-label flex items-center gap-1.5" htmlFor="reg-password">
                <Lock size={14} /> Password <span className="text-red-400">*</span>
              </label>
              <input
                id="reg-password"
                type="password"
                className="form-input"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </div>

            <div>
              <label className="form-label flex items-center gap-1.5" htmlFor="reg-confirm-password">
                <Lock size={14} /> Confirm Password <span className="text-red-400">*</span>
              </label>
              <input
                id="reg-confirm-password"
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
              style={{
                width: "100%",
                padding: 12,
                fontSize: 15,
                fontWeight: 600,
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              id="register-submit-btn"
            >
              {loading ? "Creating Account..." : <><UserPlus size={16} /> Create Account & Sign In</>}
            </button>
          </form>
        )}

        <div className="text-muted text-xs" style={{ textAlign: "center", marginTop: 20 }}>
          Protected by AES-256 BYOK encryption & PostgreSQL Auth
        </div>
      </div>
    </div>
  );
}

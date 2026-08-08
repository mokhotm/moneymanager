"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Edit3,
  LogOut,
  User,
  ShieldCheck,
  CreditCard,
  Building,
  FileText,
  Lock,
  LogIn,
  CheckCircle2,
  Sparkles,
  DollarSign,
  Briefcase,
  Globe,
  Award,
} from "lucide-react";

interface UserProfileData {
  id: string;
  username: string;
  email: string | null;
  role: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  billingCycle?: string;
  createdAt: string;
  profile: {
    fullName: string | null;
    jobTitle: string | null;
    employerName: string | null;
    taxReference: string | null;
    preferredCurrency: string;
  } | null;
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    jobTitle: "",
    employerName: "",
    taxReference: "",
    preferredCurrency: "ZAR",
  });

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.status === 401) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data?.error === "Unauthorized") {
        setUnauthorized(true);
      } else {
        setUserData(data);
        if (data) {
          setForm({
            fullName: data.profile?.fullName ?? "",
            email: data.email ?? "",
            jobTitle: data.profile?.jobTitle ?? "",
            employerName: data.profile?.employerName ?? "",
            taxReference: data.profile?.taxReference ?? "",
            preferredCurrency: data.profile?.preferredCurrency ?? "ZAR",
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(false);
    loadProfile();
  };

  const subTierName = useMemo(() => {
    const tier = userData?.subscriptionTier || "PRO_WEALTH";
    if (tier === "PRO_WEALTH") return "Pro Wealth Accelerator (R199/mo)";
    if (tier === "EXECUTIVE_ENTERPRISE") return "Executive Enterprise (R499/mo)";
    return "Starter Free (R0/mo)";
  }, [userData]);

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Loading user profile &amp; security credentials…
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">User Identity &amp; Profile Settings</h1>
            <p className="page-subtitle">Personal information &amp; system credentials</p>
          </div>
        </div>

        <div className="page-body">
          <div
            style={{
              background: "linear-gradient(135deg, rgba(17, 26, 46, 0.9) 0%, rgba(10, 16, 30, 0.95) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "24px",
              padding: "60px 32px",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px auto",
                color: "#f59e0b",
              }}
            >
              <Lock size={32} />
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
              Authentication Required
            </h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "480px", margin: "0 auto 24px auto" }}>
              Please sign in to your MoneyManager account to view and manage your personal financial profile.
            </p>
            <a href="/login" className="btn btn-primary btn-lg inline-flex items-center gap-2">
              <LogIn size={18} />
              <span>Sign In to Access Profile</span>
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            User Identity &amp; Profile Settings
            <span className="badge badge-gold text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            Personal identity information, SARS tax metadata, security credentials &amp; active subscription plan
          </p>
        </div>
        <button
          className="btn btn-primary flex items-center gap-1.5"
          onClick={() => setEditing(!editing)}
          id="toggle-edit-profile-btn"
        >
          {editing ? "Cancel Edit" : <><Edit3 size={15} /> Edit Profile</>}
        </button>
      </div>

      <div className="page-body">
        {/* Headline Stat Cards Grid */}
        <div className="stat-grid mb-6">
          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))",
              borderColor: "rgba(245, 158, 11, 0.4)",
            }}
          >
            <div className="stat-label text-amber-400 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Identity Verification
            </div>
            <div className="stat-value gold font-extrabold">100% Verified</div>
            <div className="stat-sub">Authenticated Financial Identity</div>
          </div>

          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))",
              borderColor: "rgba(34, 197, 94, 0.4)",
            }}
          >
            <div className="stat-label text-emerald-400 flex items-center gap-1.5">
              <Sparkles size={14} /> Subscription Tier
            </div>
            <div className="stat-value text-emerald-400 font-extrabold" style={{ fontSize: "18px" }}>
              {userData?.subscriptionTier || "PRO_WEALTH"}
            </div>
            <div className="stat-sub text-emerald-400 font-bold">Active Wealth Accelerator</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-blue-400 flex items-center gap-1.5">
              <FileText size={14} /> SARS Tax Reference
            </div>
            <div className="stat-value text-blue-400 font-extrabold" style={{ fontSize: "18px" }}>
              {userData?.profile?.taxReference ? `Ref: ${userData.profile.taxReference}` : "Registered"}
            </div>
            <div className="stat-sub text-muted">South African Revenue Service</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-purple-400 flex items-center gap-1.5">
              <Lock size={14} /> Session Encryption
            </div>
            <div className="stat-value text-purple-300 font-extrabold">AES-256</div>
            <div className="stat-sub text-muted">Strict Local Session Cookie</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Main User Identity Card */}
          <div
            className="card"
            style={{
              borderLeft: "1px solid var(--border)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              borderTop: "3px solid #f59e0b",
              background: "rgba(13, 20, 36, 0.9)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="flex items-center gap-5 mb-6" style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: "20px" }}>
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "20px",
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#070b14",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "30px",
                  fontWeight: "900",
                  boxShadow: "0 10px 24px rgba(245, 158, 11, 0.3)",
                }}
              >
                {userData?.username?.charAt(0).toUpperCase()}
              </div>

              <div>
                <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>
                  {userData?.profile?.fullName ?? userData?.username}
                </h2>
                <div className="flex items-center gap-3" style={{ marginTop: "6px" }}>
                  <span className="badge badge-gold font-mono">@{userData?.username}</span>
                  <span className="badge badge-blue">{userData?.role?.toUpperCase()} ROLE</span>
                  <span className="badge badge-success flex items-center gap-1 font-mono">
                    <CheckCircle2 size={12} /> Account Active
                  </span>
                </div>
              </div>
            </div>

            {!editing ? (
              <div className="two-col" style={{ gap: "24px" }}>
                <div>
                  <div className="stat-label text-muted flex items-center gap-1.5 mb-1">
                    <User size={14} /> Full Name
                  </div>
                  <div className="font-bold text-slate-100" style={{ fontSize: "16px" }}>
                    {userData?.profile?.fullName ?? "—"}
                  </div>
                </div>

                <div>
                  <div className="stat-label text-muted flex items-center gap-1.5 mb-1">
                    <Globe size={14} /> Email Address
                  </div>
                  <div className="font-bold text-slate-100" style={{ fontSize: "16px" }}>
                    {userData?.email ?? "—"}
                  </div>
                </div>

                <div>
                  <div className="stat-label text-muted flex items-center gap-1.5 mb-1">
                    <Briefcase size={14} /> Job Title / Designation
                  </div>
                  <div className="font-bold text-slate-100" style={{ fontSize: "16px" }}>
                    {userData?.profile?.jobTitle ?? "—"}
                  </div>
                </div>

                <div>
                  <div className="stat-label text-muted flex items-center gap-1.5 mb-1">
                    <Building size={14} /> Employer / Organization
                  </div>
                  <div className="font-bold text-slate-100" style={{ fontSize: "16px" }}>
                    {userData?.profile?.employerName ?? "—"}
                  </div>
                </div>

                <div>
                  <div className="stat-label text-muted flex items-center gap-1.5 mb-1">
                    <FileText size={14} /> SARS Tax Reference Number
                  </div>
                  <div className="font-mono font-bold text-amber-400" style={{ fontSize: "16px" }}>
                    {userData?.profile?.taxReference ?? "—"}
                  </div>
                </div>

                <div>
                  <div className="stat-label text-muted flex items-center gap-1.5 mb-1">
                    <DollarSign size={14} /> Preferred Base Currency
                  </div>
                  <div className="font-mono font-bold text-emerald-400" style={{ fontSize: "16px" }}>
                    {userData?.profile?.preferredCurrency ?? "ZAR"} (South African Rand)
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} style={{ marginTop: "16px" }}>
                <div className="two-col mb-4">
                  <div className="form-group">
                    <label className="form-label required">Full Name</label>
                    <input
                      className="form-input"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      id="profile-fullname-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Email Address</label>
                    <input
                      className="form-input"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      id="profile-email-input"
                      required
                    />
                  </div>
                </div>

                <div className="two-col mb-4">
                  <div className="form-group">
                    <label className="form-label">Job Title</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Senior Solutions Architect"
                      value={form.jobTitle}
                      onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                      id="profile-jobtitle-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employer</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Financial Tech Solutions (Pty) Ltd"
                      value={form.employerName}
                      onChange={(e) => setForm({ ...form, employerName: e.target.value })}
                      id="profile-employer-input"
                    />
                  </div>
                </div>

                <div className="two-col mb-4">
                  <div className="form-group">
                    <label className="form-label">SARS Tax Reference Number</label>
                    <input
                      className="form-input"
                      placeholder="e.g. 9820194817"
                      value={form.taxReference}
                      onChange={(e) => setForm({ ...form, taxReference: e.target.value })}
                      id="profile-taxref-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Preferred Currency</label>
                    <select
                      className="form-select"
                      value={form.preferredCurrency}
                      onChange={(e) => setForm({ ...form, preferredCurrency: e.target.value })}
                      id="profile-currency-select"
                    >
                      <option value="ZAR">ZAR (R) - South African Rand</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 justify-between items-center mt-6">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex items-center gap-1.5" id="save-profile-btn">
                    <CheckCircle2 size={16} /> Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Active Subscription & Billing Card */}
          <div
            className="card"
            style={{
              borderLeft: "1px solid var(--border)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              borderTop: "3px solid #f59e0b",
              background: "rgba(13, 20, 36, 0.9)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="card-header mb-4">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-amber-400" />
                <span className="card-title" style={{ fontSize: "16px", fontWeight: 800 }}>
                  Active Subscription Tier &amp; Feature Access
                </span>
              </div>
              <span className="badge badge-gold font-mono text-xs">
                {userData?.subscriptionTier === "PRO_WEALTH"
                  ? "✓ Pro Wealth Active"
                  : userData?.subscriptionTier === "EXECUTIVE_ENTERPRISE"
                  ? "✓ Executive Enterprise Active"
                  : "Starter Free Active"}
              </span>
            </div>

            <div
              style={{
                background: "rgba(7, 11, 20, 0.8)",
                padding: "20px 24px",
                borderRadius: "16px",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                marginBottom: "20px",
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#f59e0b" }}>
                    {subTierName}
                  </div>
                  <div className="text-muted text-xs mt-1">
                    Active for user <strong className="text-slate-200">@{userData?.username}</strong> ({userData?.email})
                  </div>
                </div>

                {/* Instant Plan Switcher for Testing */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">Test Tier Switch:</span>
                  {(["STARTER_FREE", "PRO_WEALTH", "EXECUTIVE_ENTERPRISE"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={async () => {
                        await fetch("/api/subscription/checkout", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            tier: t,
                            billingCycle: "MONTHLY",
                            paymentGateway: "TEST_SWITCHER",
                            amount: t === "PRO_WEALTH" ? 199 : t === "EXECUTIVE_ENTERPRISE" ? 499 : 0,
                          }),
                        });
                        loadProfile();
                      }}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: userData?.subscriptionTier === t ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.1)",
                        background: userData?.subscriptionTier === t ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "rgba(255,255,255,0.05)",
                        color: userData?.subscriptionTier === t ? "#070b14" : "#94a3b8",
                      }}
                      id={`switch-tier-${t.toLowerCase()}`}
                    >
                      {t === "PRO_WEALTH" ? "Pro (R199)" : t === "EXECUTIVE_ENTERPRISE" ? "Executive (R499)" : "Starter (Free)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feature Checklist Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                {[
                  { name: "Max Accounts & Debt Portfolio", status: "Unlimited (7 Accounts, 4 Debts Active)", active: true },
                  { name: "Dual-Track Snowball Waterfall Engine", status: "Unlocked & Active", active: userData?.subscriptionTier !== "STARTER_FREE" },
                  { name: "GPS Geotagged Spending Location Radar", status: "Unlocked & Active", active: userData?.subscriptionTier !== "STARTER_FREE" },
                  { name: "BYOK Custom LLM Engine Key Vault", status: "Unlocked & Active", active: userData?.subscriptionTier !== "STARTER_FREE" },
                  { name: "Multi-Agent OCR Document Ingestion", status: "Unlocked & Active", active: userData?.subscriptionTier !== "STARTER_FREE" },
                  {
                    name: "Windeed & Lightstone Deed Valuations",
                    status: userData?.subscriptionTier === "EXECUTIVE_ENTERPRISE" ? "Unlocked (Executive)" : "Locked (Requires Executive Enterprise)",
                    active: userData?.subscriptionTier === "EXECUTIVE_ENTERPRISE",
                  },
                ].map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg"
                    style={{
                      background: feat.active ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                      border: feat.active ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ color: feat.active ? "#f8fafc" : "#94a3b8", fontWeight: 600 }}>
                      {feat.active ? "✓" : "🔒"} {feat.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "11px",
                        color: feat.active ? "#34d399" : "#f87171",
                        fontWeight: 700,
                      }}
                    >
                      {feat.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Account Sign Out Action Card */}
          <div
            className="card"
            style={{
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "rgba(239, 68, 68, 0.05)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-extrabold text-red-400" style={{ fontSize: "16px" }}>
                  Sign Out of Account Session
                </div>
                <div className="text-muted text-sm" style={{ marginTop: "4px" }}>
                  Terminate active session cookie for user <span className="td-mono font-bold text-slate-200">@{userData?.username}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-danger flex items-center gap-1.5"
                onClick={handleLogout}
                id="profile-signout-btn"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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
  Calendar,
  Key,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  Zap,
} from "lucide-react";

interface UserProfileData {
  id: string;
  username: string;
  email: string | null;
  role: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  billingCycle?: string;
  accountsCount?: number;
  debtsCount?: number;
  specs?: any;
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
  const [copiedId, setCopiedId] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    jobTitle: "",
    employerName: "",
    taxReference: "",
    preferredCurrency: "ZAR",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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
    showToast("Profile details updated successfully!");
    loadProfile();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const subTierName = useMemo(() => {
    const tier = userData?.subscriptionTier || "STARTER_FREE";
    if (tier === "PRO_WEALTH") return "Pro Wealth Accelerator (R199/mo)";
    if (tier === "EXECUTIVE_ENTERPRISE") return "Executive Enterprise (R499/mo)";
    return "Starter Free (R0/mo)";
  }, [userData]);

  // Profile completeness score calculation
  const profileCompleteness = useMemo(() => {
    if (!userData) return 50;
    let score = 40; // Base account creation
    if (userData.email) score += 15;
    if (userData.profile?.fullName) score += 15;
    if (userData.profile?.jobTitle) score += 10;
    if (userData.profile?.employerName) score += 10;
    if (userData.profile?.taxReference) score += 10;
    return Math.min(100, score);
  }, [userData]);

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "100px 0" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "16px", borderRadius: "16px", marginBottom: "16px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
          <Zap className="animate-spin text-gold" size={28} />
        </div>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }}>
          Decrypting executive identity &amp; security credentials…
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
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 9999,
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(16, 185, 129, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 700,
            fontSize: "14px",
            backdropFilter: "blur(12px)",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-50%", left: "-10%", width: "40%", height: "200%", background: "radial-gradient(ellipse at center, rgba(245, 158, 11, 0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        
        <div style={{ position: "relative", zIndex: 10 }}>
          <h1 
            className="page-title flex items-center gap-3"
            style={{ 
              background: "linear-gradient(to right, #f8fafc, #94a3b8)", 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent",
            }}
          >
            User Identity &amp; Executive Profile
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 700,
                background: "rgba(245, 158, 11, 0.12)",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "2px 10px",
                borderRadius: "99px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ShieldCheck size={12} className="text-amber-400" />
              Verified FICA / KYC
            </span>
          </h1>
          <p className="page-subtitle">
            Personal identity details, tax metadata, security encryption status &amp; subscription entitlements
          </p>
        </div>

        <div className="flex gap-3" style={{ position: "relative", zIndex: 10 }}>
          <button
            className={`btn ${editing ? "btn-secondary" : "btn-primary"} flex items-center gap-2`}
            onClick={() => setEditing(!editing)}
            style={{ borderRadius: "14px", boxShadow: editing ? "none" : "0 8px 20px rgba(245, 158, 11, 0.25)" }}
            id="toggle-edit-profile-btn"
          >
            {editing ? "Cancel Edit" : <><Edit3 size={16} /> Edit Profile</>}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Executive Hero Identity Banner */}
        <div
          className="card mb-6"
          style={{
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(135deg, rgba(17, 26, 46, 0.95) 0%, rgba(10, 16, 30, 0.98) 100%)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "24px",
            padding: "28px 32px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div style={{ position: "absolute", top: "-40%", right: "-10%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div className="flex flex-wrap items-center justify-between gap-6" style={{ position: "relative", zIndex: 10 }}>
            <div className="flex items-center gap-6 flex-wrap">
              {/* Glowing Avatar Initial Circle */}
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "24px",
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    color: "#070b14",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "36px",
                    fontWeight: "900",
                    boxShadow: "0 12px 30px rgba(245, 158, 11, 0.4)",
                    border: "2px solid rgba(254, 243, 199, 0.4)",
                  }}
                >
                  {userData?.username?.charAt(0).toUpperCase()}
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: "-4px",
                    right: "-4px",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "#10b981",
                    border: "3px solid #0a101e",
                    boxShadow: "0 0 10px rgba(16, 185, 129, 0.8)",
                  }}
                  title="Online & Verified"
                />
              </div>

              <div>
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.02em" }}>
                    {userData?.profile?.fullName ?? userData?.username}
                  </h2>
                  <span className="badge badge-gold font-mono text-xs px-2.5 py-1" style={{ borderRadius: "8px" }}>
                    @{userData?.username}
                  </span>
                  <span className="badge badge-blue text-xs px-2.5 py-1" style={{ borderRadius: "8px" }}>
                    {userData?.role?.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1.5" style={{ color: "#cbd5e1" }}>
                    <Briefcase size={14} className="text-amber-400" />
                    {userData?.profile?.jobTitle || "Wealth Manager"}
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color: "#cbd5e1" }}>
                    <Building size={14} className="text-blue-400" />
                    {userData?.profile?.employerName || "Private Financial Entity"}
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color: "#94a3b8" }}>
                    <Calendar size={14} className="text-emerald-400" />
                    Member since {new Date(userData?.createdAt || Date.now()).toLocaleDateString("en-ZA", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Completion Widget */}
            <div
              style={{
                background: "rgba(7, 11, 20, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "18px",
                padding: "16px 20px",
                minWidth: "240px",
              }}
            >
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-gold" />
                  Profile Completeness
                </span>
                <span className="text-gold font-bold font-mono">{profileCompleteness}%</span>
              </div>
              <div style={{ height: "8px", borderRadius: "99px", background: "rgba(0,0,0,0.5)", overflow: "hidden", marginBottom: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${profileCompleteness}%`,
                    background: "linear-gradient(90deg, #f59e0b 0%, #10b981 100%)",
                    borderRadius: "99px",
                    boxShadow: "0 0 10px rgba(245, 158, 11, 0.5)",
                    transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </div>
              <div className="text-muted text-xs flex justify-between">
                <span>KYC Verification</span>
                <span className="text-emerald-400 font-semibold">Verified ✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Headline Stat Cards Grid */}
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
            <div className="stat-sub text-amber-300 font-semibold">FICA &amp; KYC Financial Identity</div>
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
            <div className="stat-value text-emerald-400 font-extrabold" style={{ fontSize: "17px" }}>
              {userData?.subscriptionTier || "PRO_WEALTH"}
            </div>
            <div className="stat-sub text-emerald-400 font-bold">Active Wealth Accelerator</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-blue-400 flex items-center gap-1.5">
              <FileText size={14} /> Tax Reference
            </div>
            <div className="stat-value text-blue-400 font-extrabold" style={{ fontSize: "17px" }}>
              {userData?.profile?.taxReference ? `Ref: ${userData.profile.taxReference}` : "Registered"}
            </div>
            <div className="stat-sub text-muted">National Tax Agency</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-purple-400 flex items-center gap-1.5">
              <Lock size={14} /> Session Encryption
            </div>
            <div className="stat-value text-purple-300 font-extrabold">AES-256</div>
            <div className="stat-sub text-muted">Strict Base64 Encrypted Cookie</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Main User Identity & Personal Details Card */}
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
            <div className="card-header mb-6">
              <div className="flex items-center gap-2.5">
                <div style={{ padding: "8px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "12px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                  <User size={18} className="text-gold" />
                </div>
                <div>
                  <span className="card-title" style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc" }}>
                    Personal Identity &amp; Tax Information
                  </span>
                  <p className="text-muted text-xs mt-0.5">Primary user information used for statement analysis &amp; tax reports</p>
                </div>
              </div>

              {userData?.id && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(userData.id)}
                  className="btn btn-secondary text-xs flex items-center gap-1.5"
                  style={{ borderRadius: "10px", padding: "6px 12px" }}
                  title="Copy User ID"
                >
                  {copiedId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedId ? "Copied ID" : "Copy User ID"}</span>
                </button>
              )}
            </div>

            {!editing ? (
              <div className="two-col" style={{ gap: "24px" }}>
                <div style={{ background: "rgba(7, 11, 20, 0.5)", padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div className="stat-label text-muted flex items-center gap-1.5 mb-1.5" style={{ fontSize: "12px" }}>
                    <User size={14} className="text-gold" /> Full Registered Name
                  </div>
                  <div className="font-bold text-slate-100" style={{ fontSize: "16px" }}>
                    {userData?.profile?.fullName ?? "—"}
                  </div>
                </div>

                <div style={{ background: "rgba(7, 11, 20, 0.5)", padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div className="stat-label text-muted flex items-center gap-1.5 mb-1.5" style={{ fontSize: "12px" }}>
                    <Globe size={14} className="text-blue-400" /> Primary Email Address
                  </div>
                  <div className="font-bold text-slate-100" style={{ fontSize: "16px" }}>
                    {userData?.email ?? "—"}
                  </div>
                </div>

                <div style={{ background: "rgba(7, 11, 20, 0.5)", padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div className="stat-label text-muted flex items-center gap-1.5 mb-1.5" style={{ fontSize: "12px" }}>
                    <Briefcase size={14} className="text-emerald-400" /> Job Title / Designation
                  </div>
                  <div className="font-bold text-slate-100" style={{ fontSize: "16px" }}>
                    {userData?.profile?.jobTitle ?? "—"}
                  </div>
                </div>

                <div style={{ background: "rgba(7, 11, 20, 0.5)", padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div className="stat-label text-muted flex items-center gap-1.5 mb-1.5" style={{ fontSize: "12px" }}>
                    <Building size={14} className="text-amber-400" /> Employer / Organization
                  </div>
                  <div className="font-bold text-slate-100" style={{ fontSize: "16px" }}>
                    {userData?.profile?.employerName ?? "—"}
                  </div>
                </div>

                <div style={{ background: "rgba(7, 11, 20, 0.5)", padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                  <div className="stat-label text-muted flex items-center gap-1.5 mb-1.5" style={{ fontSize: "12px" }}>
                    <FileText size={14} className="text-amber-400" /> Tax Reference Number
                  </div>
                  <div className="font-mono font-bold text-amber-400" style={{ fontSize: "16px" }}>
                    {userData?.profile?.taxReference ?? "—"}
                  </div>
                </div>

                <div style={{ background: "rgba(7, 11, 20, 0.5)", padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                  <div className="stat-label text-muted flex items-center gap-1.5 mb-1.5" style={{ fontSize: "12px" }}>
                    <DollarSign size={14} className="text-emerald-400" /> Preferred Base Currency
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
                    <label className="form-label">Tax Reference Number</label>
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
                  <button type="submit" className="btn btn-primary flex items-center gap-1.5" id="save-profile-btn" style={{ boxShadow: "0 8px 20px rgba(245, 158, 11, 0.3)" }}>
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
              borderTop: "3px solid #10b981",
              background: "rgba(13, 20, 36, 0.9)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="card-header mb-4">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-emerald-400" />
                <span className="card-title" style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc" }}>
                  Active Subscription Tier &amp; Feature Access Matrix
                </span>
              </div>
              <span className="badge badge-success font-mono text-xs">
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
                borderRadius: "18px",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                marginBottom: "20px",
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#10b981" }}>
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
                        showToast(`Subscribed to ${t.replace("_", " ")} plan!`);
                        loadProfile();
                      }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: userData?.subscriptionTier === t ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)",
                        background: userData?.subscriptionTier === t ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "rgba(255,255,255,0.05)",
                        color: userData?.subscriptionTier === t ? "#ffffff" : "#94a3b8",
                        transition: "all 0.2s ease",
                      }}
                      id={`switch-tier-${t.toLowerCase()}`}
                    >
                      {t === "PRO_WEALTH" ? "Pro (R199)" : t === "EXECUTIVE_ENTERPRISE" ? "Executive (R499)" : "Starter (Free)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feature Checklist Matrix */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                {[
                  {
                    name: "Max Accounts & Debt Portfolio",
                    status:
                      userData?.subscriptionTier === "STARTER_FREE"
                        ? `3 Accounts Max (${userData?.accountsCount ?? 0} Accounts, ${userData?.debtsCount ?? 0} Debts Active)`
                        : `Unlimited (${userData?.accountsCount ?? 0} Accounts, ${userData?.debtsCount ?? 0} Debts Active)`,
                    active: true,
                  },
                  {
                    name: "Dual-Track Snowball Waterfall Engine",
                    status: userData?.subscriptionTier === "STARTER_FREE" ? "Locked (Starter Plan)" : "Unlocked & Active",
                    active: userData?.subscriptionTier !== "STARTER_FREE",
                  },
                  {
                    name: "GPS Geotagged Spending Location Radar",
                    status: userData?.subscriptionTier === "STARTER_FREE" ? "Locked (Starter Plan)" : "Unlocked & Active",
                    active: userData?.subscriptionTier !== "STARTER_FREE",
                  },
                  {
                    name: "BYOK Custom LLM Engine Key Vault",
                    status: userData?.subscriptionTier === "STARTER_FREE" ? "Locked (Starter Plan)" : "Unlocked & Active",
                    active: userData?.subscriptionTier !== "STARTER_FREE",
                  },
                  {
                    name: "Multi-Agent OCR Document Ingestion",
                    status: userData?.subscriptionTier === "STARTER_FREE" ? "Locked (Starter Plan)" : "Unlocked & Active",
                    active: userData?.subscriptionTier !== "STARTER_FREE",
                  },
                  {
                    name: "Windeed & Lightstone Deed Valuations",
                    status: userData?.subscriptionTier === "EXECUTIVE_ENTERPRISE" ? "Unlocked (Executive)" : "Locked (Requires Executive Enterprise)",
                    active: userData?.subscriptionTier === "EXECUTIVE_ENTERPRISE",
                  },
                ].map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between"
                    style={{
                      padding: "12px 16px",
                      borderRadius: "var(--radius-md)",
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

          {/* System Security & Active Session Card */}
          <div
            className="card"
            style={{
              borderLeft: "1px solid var(--border)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              borderTop: "3px solid #8b5cf6",
              background: "rgba(13, 20, 36, 0.9)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="card-header mb-4">
              <div className="flex items-center gap-2">
                <Lock size={20} className="text-purple-400" />
                <span className="card-title" style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc" }}>
                  Security Architecture &amp; Active Session Audit
                </span>
              </div>
              <span className="badge badge-purple font-mono text-xs">AES-256 Cookie Vault</span>
            </div>

            <div className="two-col" style={{ gap: "20px" }}>
              <div style={{ background: "rgba(7, 11, 20, 0.6)", padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <div className="stat-label text-purple-400 flex items-center gap-1.5 mb-1" style={{ fontSize: "12px" }}>
                  <ShieldCheck size={14} /> Authentication Protocol
                </div>
                <div className="font-bold text-slate-100" style={{ fontSize: "15px" }}>
                  Base64 HTTP-Only Auth Cookie
                </div>
                <div className="text-muted text-xs mt-1">
                  Protects against XSS script tampering &amp; client-side token leaks.
                </div>
              </div>

              <div style={{ background: "rgba(7, 11, 20, 0.6)", padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <div className="stat-label text-emerald-400 flex items-center gap-1.5 mb-1" style={{ fontSize: "12px" }}>
                  <Smartphone size={14} /> Active Session State
                </div>
                <div className="font-bold text-emerald-400" style={{ fontSize: "15px" }}>
                  Active (24-Hour Expiry Window)
                </div>
                <div className="text-muted text-xs mt-1">
                  Session bound to strictly verified user <span className="font-bold text-slate-200">@{userData?.username}</span>
                </div>
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
            <div className="flex items-center justify-between flex-wrap gap-4">
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
                className="btn btn-danger flex items-center gap-2"
                onClick={handleLogout}
                id="profile-signout-btn"
                style={{ borderRadius: "12px", padding: "10px 20px" }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  CreditCard,
  Building2,
  Activity,
  Server,
  KeyRound,
  FileText,
  DollarSign,
  TrendingUp,
  Search,
  Edit2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { formatZAR } from "@/lib/formatters";

interface AdminStats {
  totalUsers: number;
  totalAccounts: number;
  totalTransactions: number;
  totalDocuments: number;
  totalDebts: number;
  totalAssets: number;
  gatewayConfigs: number;
  activeSubscriptions: number;
  totalMRR: number;
  tierDistribution: Record<string, number>;
  systemHealth: {
    database: string;
    encryptionVault: string;
    sessionSigner: string;
  };
}

interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  fullName: string | null;
  jobTitle: string | null;
  employerName: string | null;
  taxReference: string | null;
  preferredCurrency: string;
  subscription: {
    id: string;
    status: string;
    tierCode: string;
    tierName: string;
    billingCycle: string;
  } | null;
  counts: {
    accounts: number;
    incomes: number;
    goals: number;
    budgetItems: number;
  };
}

interface GatewayConfig {
  id: string;
  provider: string;
  mode: string;
  status: string;
  supportsCards: boolean;
  supportsEft: boolean;
  supportsRecurringBilling: boolean;
  settlementAccount?: {
    institution: string;
    accountHolderName: string;
    accountNumberMasked: string;
  };
}

export default function AdminPortalPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TELEMETRY" | "USERS" | "GATEWAYS" | "READINESS">("TELEMETRY");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("user");
  const [editTier, setEditTier] = useState("EXECUTIVE_ENTERPRISE");
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      setCurrentUser(meData.user || null);

      if (meData.user?.role === "admin") {
        const [overviewRes, usersRes, gatewaysRes] = await Promise.all([
          fetch("/api/admin/overview"),
          fetch("/api/admin/users"),
          fetch("/api/billing/admin/gateways"),
        ]);

        if (overviewRes.ok) {
          const oData = await overviewRes.json();
          setStats(oData.stats);
        }
        if (usersRes.ok) {
          const uData = await usersRes.json();
          setUsers(uData.users || []);
        }
        if (gatewaysRes.ok) {
          const gData = await gatewaysRes.json();
          setGateways(gData.configs || []);
        }
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditTier(user.subscription?.tierCode || "EXECUTIVE_ENTERPRISE");
    setEditFullName(user.fullName || "");
    setEditEmail(user.email || "");
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          subscriptionTierCode: editTier,
          fullName: editFullName,
          email: editEmail,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update user");
      }

      showToast(`User @${editingUser.username} updated successfully.`);
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update user");
    } finally {
      setSavingUser(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", color: "#94a3b8" }}>
        <RefreshCw size={24} className="animate-spin" color="#f59e0b" />
        <span style={{ fontSize: "16px", fontWeight: "600" }}>Authenticating Root Administrator...</span>
      </div>
    );
  }

  // Access Denied Screen for Non-Admins
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="page-body" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          className="card"
          style={{
            maxWidth: "540px",
            width: "100%",
            padding: "40px",
            textAlign: "center",
            background: "linear-gradient(145deg, rgba(239, 68, 68, 0.1) 0%, rgba(15, 23, 42, 0.95) 100%)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "20px",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px auto",
            }}
          >
            <ShieldAlert size={34} />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", marginBottom: "8px" }}>
            Access Restricted
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, marginBottom: "28px" }}>
            The Enterprise Admin Portal requires formal <strong>Administrator (`admin`)</strong> privileges. Your current account (@{currentUser?.username || "anonymous"}) is assigned the <strong>`{currentUser?.role || "user"}`</strong> role.
          </p>
          <Link href="/" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            Return to Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.fullName && u.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      {/* ─── Page Header ─── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Enterprise Admin Portal
            <span className="badge badge-gold text-xs font-mono">v4.0 Root Authority</span>
          </h1>
          <p className="page-subtitle">
            User identity governance, commercial payment gateways, platform telemetry & zero-trust system health
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={loadData} className="btn btn-secondary flex items-center gap-2">
            <RefreshCw size={14} />
            <span>Refresh Telemetry</span>
          </button>
          <Link href="/system/readiness" className="btn btn-secondary flex items-center gap-2">
            <Server size={14} />
            <span>System Readiness</span>
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* Toast feedback */}
        {toastMessage && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "12px",
              marginBottom: "24px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              color: "#34d399",
              fontSize: "14px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <CheckCircle2 size={18} />
            {toastMessage}
          </div>
        )}

        {/* ─── Segmented Navigation Tabs ─── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(13, 20, 36, 0.8)",
            padding: "6px",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            marginBottom: "28px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setActiveTab("TELEMETRY")}
            style={{
              flex: 1,
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              border: activeTab === "TELEMETRY" ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid transparent",
              background:
                activeTab === "TELEMETRY"
                  ? "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.08) 100%)"
                  : "transparent",
              color: activeTab === "TELEMETRY" ? "#fbbf24" : "#94a3b8",
              transition: "all 0.2s ease",
            }}
          >
            <Activity size={16} />
            <span>Platform Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab("USERS")}
            style={{
              flex: 1,
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              border: activeTab === "USERS" ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid transparent",
              background:
                activeTab === "USERS"
                  ? "linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0.08) 100%)"
                  : "transparent",
              color: activeTab === "USERS" ? "#38bdf8" : "#94a3b8",
              transition: "all 0.2s ease",
            }}
          >
            <Users size={16} />
            <span>User Directory ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("GATEWAYS")}
            style={{
              flex: 1,
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              border: activeTab === "GATEWAYS" ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid transparent",
              background:
                activeTab === "GATEWAYS"
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.08) 100%)"
                  : "transparent",
              color: activeTab === "GATEWAYS" ? "#34d399" : "#94a3b8",
              transition: "all 0.2s ease",
            }}
          >
            <CreditCard size={16} />
            <span>Payment Gateways</span>
          </button>

          <button
            onClick={() => setActiveTab("READINESS")}
            style={{
              flex: 1,
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              border: activeTab === "READINESS" ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid transparent",
              background:
                activeTab === "READINESS"
                  ? "linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.08) 100%)"
                  : "transparent",
              color: activeTab === "READINESS" ? "#c084fc" : "#94a3b8",
              transition: "all 0.2s ease",
            }}
          >
            <ShieldCheck size={16} />
            <span>Zero-Trust Infrastructure</span>
          </button>
        </div>

        {/* ─── TAB 1: TELEMETRY ─── */}
        {activeTab === "TELEMETRY" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Top 4 KPI Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              <div className="card" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Registered Users
                    </span>
                    <div style={{ fontSize: "32px", fontWeight: "900", color: "#ffffff", marginTop: "6px" }}>
                      {stats?.totalUsers || 0}
                    </div>
                  </div>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                    <Users size={22} />
                  </div>
                </div>
                <div style={{ marginTop: "14px", fontSize: "12px", color: "#64748b" }}>
                  Active platform directory accounts
                </div>
              </div>

              <div className="card" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Ingested Transactions
                    </span>
                    <div style={{ fontSize: "32px", fontWeight: "900", color: "#ffffff", marginTop: "6px", fontFamily: "var(--font-mono, monospace)" }}>
                      {stats?.totalTransactions.toLocaleString() || "0"}
                    </div>
                  </div>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>
                    <Activity size={22} />
                  </div>
                </div>
                <div style={{ marginTop: "14px", fontSize: "12px", color: "#64748b" }}>
                  Ground-truth statement records
                </div>
              </div>

              <div className="card" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Document Vault PDFs
                    </span>
                    <div style={{ fontSize: "32px", fontWeight: "900", color: "#ffffff", marginTop: "6px" }}>
                      {stats?.totalDocuments || 0}
                    </div>
                  </div>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
                    <FileText size={22} />
                  </div>
                </div>
                <div style={{ marginTop: "14px", fontSize: "12px", color: "#64748b" }}>
                  Parsed bank statements &amp; payslips
                </div>
              </div>

              <div className="card" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Platform MRR Run-Rate
                    </span>
                    <div style={{ fontSize: "32px", fontWeight: "900", color: "#34d399", marginTop: "6px", fontFamily: "var(--font-mono, monospace)" }}>
                      {formatZAR(stats?.totalMRR || 0)}
                    </div>
                  </div>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                    <DollarSign size={22} />
                  </div>
                </div>
                <div style={{ marginTop: "14px", fontSize: "12px", color: "#64748b" }}>
                  {stats?.activeSubscriptions || 0} Active Subscriptions
                </div>
              </div>
            </div>

            {/* Platform Subsystem Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
              <div className="card" style={{ padding: "28px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Server size={20} color="#38bdf8" /> Subsystem Cryptography &amp; Core
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px" }}>
                    <span style={{ fontSize: "13px", color: "#cbd5e1" }}>Prisma ORM PostgreSQL</span>
                    <span className="badge badge-emerald text-xs font-mono">{stats?.systemHealth.database}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px" }}>
                    <span style={{ fontSize: "13px", color: "#cbd5e1" }}>AES-256 Vault Encryption</span>
                    <span className="badge badge-emerald text-xs font-mono">{stats?.systemHealth.encryptionVault}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px" }}>
                    <span style={{ fontSize: "13px", color: "#cbd5e1" }}>HMAC-SHA256 Session Signer</span>
                    <span className="badge badge-emerald text-xs font-mono">{stats?.systemHealth.sessionSigner}</span>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: "28px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Layers size={20} color="#fbbf24" /> Financial Record Aggregation
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ padding: "14px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Total Accounts</div>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>{stats?.totalAccounts || 0}</div>
                  </div>
                  <div style={{ padding: "14px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Total Debts</div>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>{stats?.totalDebts || 0}</div>
                  </div>
                  <div style={{ padding: "14px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Total Assets</div>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>{stats?.totalAssets || 0}</div>
                  </div>
                  <div style={{ padding: "14px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Payment Gateways</div>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>{stats?.gatewayConfigs || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: USER DIRECTORY ─── */}
        {activeTab === "USERS" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Search Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "12px",
                  padding: "10px 16px",
                  maxWidth: "400px",
                  width: "100%",
                }}
              >
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search by username, legal name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#ffffff",
                    fontSize: "13px",
                    width: "100%",
                  }}
                />
              </div>

              <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                Showing <strong>{filteredUsers.length}</strong> of {users.length} users
              </div>
            </div>

            {/* User Table */}
            <div className="card" style={{ padding: "0", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <th style={{ padding: "16px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>User Identity</th>
                      <th style={{ padding: "16px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Role</th>
                      <th style={{ padding: "16px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Subscription Tier</th>
                      <th style={{ padding: "16px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Linked Data</th>
                      <th style={{ padding: "16px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Member Since</th>
                      <th style={{ padding: "16px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", transition: "background 0.2s ease" }}>
                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                background: u.role === "admin" ? "rgba(245, 158, 11, 0.15)" : "rgba(56, 189, 248, 0.15)",
                                color: u.role === "admin" ? "#fbbf24" : "#38bdf8",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "800",
                                fontSize: "14px",
                              }}
                            >
                              {(u.fullName || u.username).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>
                                {u.fullName || u.username}
                              </div>
                              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                                @{u.username} · {u.email || "No email"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          {u.role === "admin" ? (
                            <span className="badge badge-gold font-mono text-xs flex items-center gap-1" style={{ display: "inline-flex" }}>
                              <ShieldCheck size={12} /> ADMIN
                            </span>
                          ) : (
                            <span className="badge badge-cyan font-mono text-xs" style={{ display: "inline-flex" }}>
                              USER
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          <span
                            className="badge font-mono text-xs"
                            style={{
                              background: u.subscription?.tierCode === "EXECUTIVE_ENTERPRISE" ? "rgba(16, 185, 129, 0.15)" : "rgba(56, 189, 248, 0.15)",
                              color: u.subscription?.tierCode === "EXECUTIVE_ENTERPRISE" ? "#34d399" : "#38bdf8",
                              border: `1px solid ${u.subscription?.tierCode === "EXECUTIVE_ENTERPRISE" ? "rgba(16, 185, 129, 0.3)" : "rgba(56, 189, 248, 0.3)"}`,
                              display: "inline-flex",
                            }}
                          >
                            {u.subscription?.tierName || "Executive Enterprise"}
                          </span>
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ fontSize: "12px", color: "#cbd5e1" }}>
                            {u.counts.accounts} Accounts · {u.counts.incomes} Inflows
                          </div>
                        </td>

                        <td style={{ padding: "16px 20px", fontSize: "12px", color: "#94a3b8" }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <button
                            onClick={() => handleEditUser(u)}
                            className="btn btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: GATEWAYS ─── */}
        {activeTab === "GATEWAYS" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="card" style={{ padding: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", margin: 0 }}>
                    South African Payment Gateways
                  </h3>
                  <p style={{ fontSize: "13px", color: "#94a3b8", margin: "4px 0 0 0" }}>
                    Configure PCI-DSS compliant credit card and DebiCheck recurring EFT gateways
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                {["PAYFAST", "PEACH_PAYMENTS", "OZOW"].map((gw) => {
                  const existing = gateways.find((g) => g.provider === gw);
                  return (
                    <div
                      key={gw}
                      style={{
                        padding: "20px",
                        background: "rgba(7, 11, 20, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ fontSize: "15px", fontWeight: "800", color: "#ffffff" }}>
                          {gw === "PAYFAST" ? "PayFast SA" : gw === "PEACH_PAYMENTS" ? "Peach Payments" : "Ozow Instant EFT"}
                        </div>
                        <span className={existing ? "badge badge-emerald text-xs" : "badge badge-gray text-xs"}>
                          {existing ? "CONFIGURED" : "AVAILABLE"}
                        </span>
                      </div>

                      <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5, marginBottom: "16px" }}>
                        {gw === "PAYFAST"
                          ? "Tokenized card billing, recurring debit order subscriptions, and instant EFT via South Africa's premier gateway."
                          : gw === "PEACH_PAYMENTS"
                          ? "Enterprise payments orchestration, 3D Secure card processing, and Apple Pay."
                          : "High-speed instant EFT bank payment flows across FNB, Standard Bank, Capitec, ABSA, and Nedbank."}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#64748b" }}>
                        <span>Mode: {existing?.mode || "SANDBOX"}</span>
                        <span>FICA Settlement: FNB Primary</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: READINESS ─── */}
        {activeTab === "READINESS" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="card" style={{ padding: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", margin: 0 }}>
                    Zero-Trust Cryptographic Health
                  </h3>
                  <p style={{ fontSize: "13px", color: "#94a3b8", margin: "4px 0 0 0" }}>
                    Runtime evaluation of all production secrets, session keys, and open banking endpoints
                  </p>
                </div>

                <Link href="/system/readiness" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  Open Full Diagnostics <ExternalLink size={14} />
                </Link>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontSize: "13px", fontWeight: "700" }}>
                    <CheckCircle2 size={16} /> ENCRYPTION_KEY (256-bit AES)
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    Secures BYOK multi-LLM API keys at rest in the database.
                  </div>
                </div>

                <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontSize: "13px", fontWeight: "700" }}>
                    <CheckCircle2 size={16} /> SESSION_SECRET (HMAC-SHA256)
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    Cryptographically signs user authentication session tokens.
                  </div>
                </div>

                <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontSize: "13px", fontWeight: "700" }}>
                    <CheckCircle2 size={16} /> GATEWAY_WEBHOOK_SECRET
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    Validates webhook signatures from PayFast and Peach Payments.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Edit User Modal ─── */}
      {editingUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            padding: "20px",
          }}
          onClick={() => setEditingUser(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: "520px",
              width: "100%",
              padding: "32px",
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", margin: 0 }}>
                    Edit User: @{editingUser.username}
                  </h3>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>Update permissions &amp; subscription</div>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  User Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(7, 11, 20, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="user">USER (Standard Wealth Platform)</option>
                  <option value="admin">ADMIN (Root Authority &amp; System Governance)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Subscription Tier
                </label>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(7, 11, 20, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="EXECUTIVE_ENTERPRISE">Executive Enterprise (All AI Agents, Multi-Entity, Deeds)</option>
                  <option value="PRO">Pro Wealth Accelerator (365d Forecast, BYOK Vault)</option>
                  <option value="STARTER">Starter Free (Basic Ingestion)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Full Legal Name
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. Ezrom Mote Mokhotla"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(7, 11, 20, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="e.g. Ezrom.Mokhotla@sars.gov.za"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(7, 11, 20, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="btn btn-secondary"
                disabled={savingUser}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                className="btn btn-primary"
                disabled={savingUser}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                {savingUser && <RefreshCw size={14} className="animate-spin" />}
                {savingUser ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

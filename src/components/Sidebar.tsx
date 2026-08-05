"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Gem,
  Target,
  Landmark,
  CreditCard,
  LineChart,
  Receipt,
  Inbox,
  FolderOpen,
  FlaskConical,
  Settings,
  User,
  Coins,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/net-worth", icon: Gem, label: "Net Worth" },
  { href: "/goals", icon: Target, label: "Goals & Wealth" },
  { href: "/accounts", icon: Landmark, label: "Accounts" },
  { href: "/debts", icon: CreditCard, label: "Debt Register" },
  { href: "/timeline", icon: LineChart, label: "Payoff Timeline" },
  { href: "/budget", icon: Receipt, label: "Monthly Budget" },
  { href: "/recommendations", icon: Inbox, label: "Agent Inbox" },
  { href: "/documents", icon: FolderOpen, label: "Documents" },
  { href: "/scenario", icon: FlaskConical, label: "Scenario Planner" },
  { href: "/settings", icon: Settings, label: "Settings & BYOK" },
  { href: "/profile", icon: User, label: "Profile" },
];

interface UserSession {
  username: string;
  fullName?: string;
  jobTitle?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        return { authenticated: false };
      })
      .then((data) => {
        if (data && data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null));
  }, [pathname]);

  // Hide sidebar completely on login page for clean full-screen login card
  if (pathname === "/login") {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Coins size={22} className="text-dark" style={{ color: "#070b14" }} />
        </div>
        <div>
          <div className="sidebar-logo-text">MoneyManager</div>
          <div className="sidebar-logo-sub">Wealth &amp; Finance</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
              id={`nav-${item.href.replace("/", "") || "dashboard"}`}
            >
              <span className="nav-item-icon">
                <Icon size={19} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Badge Footer — Only display when user is authenticated */}
      {currentUser && (
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border-light)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "var(--gold-gradient)",
              color: "#070b14",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "800",
              fontSize: "14px",
              boxShadow: "var(--gold-glow)",
            }}
          >
            {currentUser.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: "700", fontSize: "13.5px", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentUser.username}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentUser.jobTitle || "User"}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            id="sidebar-logout-btn"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}

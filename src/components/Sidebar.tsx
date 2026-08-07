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
  GitCommit,
  Wallet,
  Sparkles,
  ArrowLeftRight,
  Bot,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/net-worth", icon: Gem, label: "Net Worth" },
  { href: "/money-journey", icon: GitCommit, label: "Money Journey" },
  { href: "/cash-wallet", icon: Wallet, label: "Cash Wallet" },
  { href: "/goals", icon: Target, label: "Goals & Wealth" },
  { href: "/accounts", icon: Landmark, label: "Accounts" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/debts", icon: CreditCard, label: "Debt Register" },
  { href: "/timeline", icon: LineChart, label: "Payoff Timeline" },
  { href: "/budget", icon: Receipt, label: "Monthly Budget" },
  { href: "/recommendations", icon: Inbox, label: "Agent Inbox" },
  { href: "/chatbot", icon: Bot, label: "ChatBot AI" },
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
      .then((res) => res.json())
      .then((data) => {
        if (data && data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null));
  }, []);

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
          <Coins size={22} style={{ color: "#070b14" }} />
        </div>
        <div>
          <div className="sidebar-logo-text">MoneyManager</div>
          <div className="sidebar-logo-sub">Wealth &amp; Finance</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main Navigation</div>
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

      {/* User Session Footer */}
      {currentUser && (
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border-light)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "rgba(7, 11, 20, 0.6)",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "var(--gold-gradient)",
              color: "#070b14",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "800",
              fontSize: "14px",
              boxShadow: "var(--gold-glow)",
              flexShrink: 0,
            }}
          >
            {currentUser.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: "700",
                fontSize: "13.5px",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentUser.username}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--gold-light)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontWeight: 600,
              }}
            >
              {currentUser.jobTitle || "Wealth Manager"}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f87171";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
            }}
            id="sidebar-logout-btn"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}

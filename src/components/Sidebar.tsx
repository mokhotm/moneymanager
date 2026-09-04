"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import EntitySwitcher from "@/components/EntitySwitcher";
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
  BarChart3,
  Activity,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Mail,
  Calculator,
  ChevronDown,
} from "lucide-react";

interface NavGroup {
  sectionTitle: string;
  items: {
    href: string;
    icon: any;
    label: string;
    badge?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    sectionTitle: "Overview & Wealth",
    items: [
      { href: "/", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/net-worth", icon: Gem, label: "Net Worth" },
      { href: "/goals", icon: Target, label: "Goals & Wealth" },
      { href: "/money-journey", icon: GitCommit, label: "Money Journey" },
      { href: "/forecast", icon: Activity, label: "365d Forecast", badge: "100x" },
    ],
  },
  {
    sectionTitle: "Cashflow & Banking",
    items: [
      { href: "/accounts", icon: Landmark, label: "Accounts" },
      { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
      { href: "/cash-wallet", icon: Wallet, label: "Cash Wallet", badge: "Split" },
      { href: "/budget", icon: Receipt, label: "Monthly Budget" },
      { href: "/salary-calculator", icon: Calculator, label: "Salary & Increase", badge: "Global" },
    ],
  },
  {
    sectionTitle: "Debt & Freedom Engine",
    items: [
      { href: "/debts", icon: CreditCard, label: "Debt Register" },
      { href: "/timeline", icon: LineChart, label: "Payoff Timeline" },
      { href: "/scenario", icon: FlaskConical, label: "Scenario Planner" },
    ],
  },
  {
    sectionTitle: "Intelligence & Document Vault",
    items: [
      { href: "/documents", icon: FolderOpen, label: "Document Vault & Ingestion" },
      { href: "/recommendations", icon: Inbox, label: "Agent Inbox" },
      { href: "/chatbot", icon: Bot, label: "ChatBot AI" },
      { href: "/reports", icon: BarChart3, label: "Reports & Leakages" },
      { href: "/reports/tax", icon: FileText, label: "Tax HUD", badge: "100x" },
    ],
  },
  {
    sectionTitle: "System & Settings",
    items: [
      { href: "/settings?tab=banking", icon: Building2, label: "Bank Feeds & Sync", badge: "API" },
      { href: "/settings?tab=ai-models", icon: Settings, label: "Settings & BYOK" },
      { href: "/system/readiness", icon: ShieldCheck, label: "System Readiness" },
      { href: "/billing", icon: Sparkles, label: "Billing & Plans" },
      { href: "/profile", icon: User, label: "Profile" },
    ],
  },
];

const SIDEBAR_MIN_W = 200;
const SIDEBAR_MAX_W = 480;
const SIDEBAR_DEFAULT_W = 260;

interface UserSession {
  username: string;
  fullName?: string;
  jobTitle?: string;
  role?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get("tab") : null;
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const widthRef = useRef(SIDEBAR_DEFAULT_W);

  // Load persisted width, collapsed groups, and apply CSS variable
  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebar-width");
    if (savedWidth) {
      const w = parseInt(savedWidth, 10);
      if (w >= SIDEBAR_MIN_W && w <= SIDEBAR_MAX_W) {
        widthRef.current = w;
        document.documentElement.style.setProperty("--sidebar-w", `${w}px`);
      }
    }

    try {
      const savedCollapsed = localStorage.getItem("sidebar-collapsed-groups");
      if (savedCollapsed) {
        setCollapsedGroups(JSON.parse(savedCollapsed));
      }
    } catch {}
  }, []);

  const toggleGroup = useCallback((sectionTitle: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [sectionTitle]: !prev[sectionTitle] };
      try {
        localStorage.setItem("sidebar-collapsed-groups", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const isItemActive = useCallback(
    (href: string) => {
      const [itemBase, itemQuery] = href.split("?");
      const targetTab = itemQuery ? new URLSearchParams(itemQuery).get("tab") : null;
      return targetTab
        ? pathname === itemBase && currentTab === targetTab
        : pathname === href || (pathname === itemBase && !currentTab);
    },
    [pathname, currentTab]
  );

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.min(SIDEBAR_MAX_W, Math.max(SIDEBAR_MIN_W, ev.clientX));
      widthRef.current = newWidth;
      document.documentElement.style.setProperty("--sidebar-w", `${newWidth}px`);
    };

    const onMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("sidebar-width", String(widthRef.current));
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
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
    <aside className="sidebar" style={{ position: "fixed" }}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Coins size={22} style={{ color: "#070b14" }} />
        </div>
        <div>
          <div className="sidebar-logo-text">MoneyManager</div>
          <div className="sidebar-logo-sub">Wealth &amp; Finance</div>
        </div>
      </div>

      {/* Multi-Entity & Family Office Workspace Switcher */}
      <div style={{ padding: "0 12px 14px" }}>
        <EntitySwitcher />
      </div>

      {(() => {
        const effectiveNavGroups = [...navGroups];
        if (currentUser?.role === "admin") {
          effectiveNavGroups.push({
            sectionTitle: "Administration",
            items: [
              { href: "/admin", icon: ShieldAlert, label: "Admin Portal", badge: "Root" },
            ],
          });
        }
        return (
          <nav className="sidebar-nav" style={{ padding: "0 12px 14px", gap: "2px" }}>
            {effectiveNavGroups.map((group, groupIdx) => {
              const isCollapsed = !!collapsedGroups[group.sectionTitle];
              const hasActiveChild = group.items.some((item) => isItemActive(item.href));

              return (
                <div
                  key={group.sectionTitle}
                  style={{
                    marginBottom: groupIdx === effectiveNavGroups.length - 1 ? 0 : isCollapsed ? "4px" : "12px",
                    transition: "margin-bottom 0.2s ease",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.sectionTitle)}
                    className={`sidebar-section-header ${isCollapsed ? "is-collapsed" : ""}`}
                    aria-expanded={!isCollapsed}
                    aria-controls={`sidebar-group-${groupIdx}`}
                    title={`${isCollapsed ? "Expand" : "Collapse"} ${group.sectionTitle}`}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: hasActiveChild && isCollapsed ? "var(--gold-light)" : undefined,
                        fontWeight: hasActiveChild && isCollapsed ? 800 : 700,
                      }}
                    >
                      {group.sectionTitle}
                      {hasActiveChild && isCollapsed && (
                        <span
                          style={{
                            width: "5px",
                            height: "5px",
                            borderRadius: "50%",
                            background: "var(--gold)",
                            boxShadow: "0 0 8px var(--gold)",
                            display: "inline-block",
                          }}
                          title="Active page in this section"
                        />
                      )}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {isCollapsed && (
                        <span
                          style={{
                            fontSize: "9.5px",
                            fontWeight: 700,
                            color: "var(--text-muted)",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: "rgba(255, 255, 255, 0.04)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {group.items.length}
                        </span>
                      )}
                      <span className="sidebar-section-chevron">
                        <ChevronDown size={13} />
                      </span>
                    </div>
                  </button>

                  <div
                    id={`sidebar-group-${groupIdx}`}
                    className={`sidebar-group-content ${isCollapsed ? "collapsed" : "expanded"}`}
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isItemActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`nav-item ${isActive ? "active" : ""}`}
                          id={`nav-${item.href.replace("/", "") || "dashboard"}`}
                          style={{
                            padding: "8px 12px",
                            fontSize: "13.5px",
                            gap: "10px",
                          }}
                        >
                          <span className="nav-item-icon" style={{ display: "flex", alignItems: "center" }}>
                            <Icon size={17} />
                          </span>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {item.badge && (
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "2px 6px",
                                borderRadius: "999px",
                                background: item.badge === "Root" ? "rgba(245, 158, 11, 0.2)" : "var(--gold-dim)",
                                color: item.badge === "Root" ? "#fbbf24" : "var(--gold)",
                                border: item.badge === "Root" ? "1px solid rgba(245, 158, 11, 0.4)" : "none",
                                fontWeight: 700,
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        );
      })()}

      {/* User Session Footer */}
      {currentUser && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            minHeight: "52px",
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
              fontSize: "13px",
              boxShadow: "var(--gold-glow)",
              flexShrink: 0,
            }}
          >
            {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: "700",
                fontSize: "13px",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentUser?.username || "Authenticated"}
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
              {currentUser?.jobTitle || "Personal Wealth"}
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
              padding: "7px",
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
            <LogOut size={15} />
          </button>
        </div>
      )}
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        title="Drag to resize"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "5px",
          height: "100%",
          cursor: "ew-resize",
          zIndex: 101,
          background: "transparent",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,158,11,0.25)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      />
    </aside>
  );
}

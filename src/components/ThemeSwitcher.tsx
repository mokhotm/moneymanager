import { useEffect, useState } from "react";
import { Moon, Leaf, Zap, Sun, Snowflake } from "lucide-react";

export type ThemeName =
  | "obsidian-gold"
  | "emerald-wealth"
  | "cyberpunk-neon"
  | "alpine-light"
  | "nordic-light";

export interface ThemeOption {
  id: ThemeName;
  name: string;
  mode: "dark" | "light";
  icon: any;
  accent: string;
  bgPreview: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: "obsidian-gold",
    name: "Obsidian Gold",
    mode: "dark",
    icon: Moon,
    accent: "#f59e0b",
    bgPreview: "#070b14",
  },
  {
    id: "emerald-wealth",
    name: "Emerald Wealth",
    mode: "dark",
    icon: Leaf,
    accent: "#10b981",
    bgPreview: "#04120e",
  },
  {
    id: "cyberpunk-neon",
    name: "Cyberpunk Neon",
    mode: "dark",
    icon: Zap,
    accent: "#06b6d4",
    bgPreview: "#090514",
  },
  {
    id: "alpine-light",
    name: "Alpine Amber",
    mode: "light",
    icon: Sun,
    accent: "#d97706",
    bgPreview: "#f8fafc",
  },
  {
    id: "nordic-light",
    name: "Nordic Cobalt",
    mode: "light",
    icon: Snowflake,
    accent: "#2563eb",
    bgPreview: "#f1f5f9",
  },
];

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>("obsidian-gold");

  useEffect(() => {
    const saved = (localStorage.getItem("theme_preference") as ThemeName) || "obsidian-gold";
    setCurrentTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const changeTheme = (themeId: ThemeName) => {
    setCurrentTheme(themeId);
    localStorage.setItem("theme_preference", themeId);
    document.documentElement.setAttribute("data-theme", themeId);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700 }}>UX Theme &amp; Color Scheme</h3>
          <p className="text-muted text-xs">Switch between Premium Dark Mode and High-Contrast Light Mode themes</p>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        {THEMES.map((t) => {
          const isSelected = currentTheme === t.id;
          const IconC = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => changeTheme(t.id)}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                padding: "16px",
                border: isSelected ? `2px solid ${t.accent}` : "1px solid var(--border)",
                background: isSelected ? "var(--gold-dim)" : "var(--bg-card)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                position: "relative",
              }}
              id={`theme-select-${t.id}`}
            >
              <div className="flex items-center justify-between w-full">
                <IconC size={20} style={{ color: t.accent }} />
                <span
                  className="badge"
                  style={{
                    background: t.mode === "light" ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.1)",
                    color: t.mode === "light" ? "#d97706" : "#94a3b8",
                  }}
                >
                  {t.mode.toUpperCase()}
                </span>
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{t.name}</div>
                <div className="text-muted text-xs mt-1 flex items-center gap-2">
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: t.accent,
                      display: "inline-block",
                    }}
                  />
                  <span>Accent color</span>
                </div>
              </div>

              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    fontSize: "12px",
                    color: t.accent,
                    fontWeight: "800",
                  }}
                >
                  ✓ Active
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

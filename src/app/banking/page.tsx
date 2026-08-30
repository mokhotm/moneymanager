"use client";

import React from "react";
import Link from "next/link";
import { Settings, ArrowLeft } from "lucide-react";
import { BankingTab } from "@/components/BankingTab";

export default function BankingHubPage() {
  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 24px 80px" }}>
      {/* Quick Breadcrumb to Settings */}
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link
          href="/settings?tab=banking"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            color: "#60a5fa",
            textDecoration: "none",
            fontWeight: "700",
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            padding: "6px 12px",
            borderRadius: "8px",
          }}
        >
          <Settings size={14} />
          <span>Open in Settings Tab</span>
        </Link>
      </div>

      <BankingTab />
    </div>
  );
}

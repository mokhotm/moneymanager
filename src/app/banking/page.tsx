"use client";

import React from "react";
import Link from "next/link";
import { Settings, Landmark } from "lucide-react";
import { BankingTab } from "@/components/BankingTab";

export default function BankingHubPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Bank Feeds &amp; Open Banking
            <span className="badge blue font-mono">Stitch API</span>
          </h1>
          <p className="page-subtitle">
            Automated real-time bank statement feeds for South African banks paired with multi-agent document ingestion.
          </p>
        </div>

        <div>
          <Link
            href="/settings?tab=banking"
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <Settings size={14} />
            <span>Manage in Settings</span>
          </Link>
        </div>
      </div>

      <div className="page-body">
        <BankingTab />
      </div>
    </>
  );
}

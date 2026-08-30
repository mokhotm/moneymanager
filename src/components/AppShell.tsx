"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatWidget from "@/components/ChatWidget";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthOrPublic = pathname === "/login" || pathname === "/onboarding";

  if (isAuthOrPublic) {
    return (
      <div className="auth-layout" style={{ minHeight: "100vh", width: "100%", margin: 0, padding: 0 }}>
        <main style={{ width: "100%", minHeight: "100vh", margin: 0, padding: 0 }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Suspense fallback={<aside className="sidebar" style={{ width: "260px" }} />}>
        <Sidebar />
      </Suspense>
      <main className="main-content">{children}</main>
      <ChatWidget />
    </div>
  );
}

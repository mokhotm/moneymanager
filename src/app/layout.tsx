import type { Metadata } from "next";
import "@/styles/globals.css";
import Sidebar from "@/components/Sidebar";
import ChatWidget from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: "MoneyManager — Personal Finance Dashboard",
  description:
    "Track debts, run a debt snowball simulation, and manage your monthly budget in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
        <ChatWidget />
      </body>
    </html>
  );
}

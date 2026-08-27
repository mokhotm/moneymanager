import type { Metadata } from "next";
import "@/styles/globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "MoneyManager — Personal Finance Dashboard",
  description:
    "Track debts, run a debt snowball simulation, and manage your monthly budget in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}


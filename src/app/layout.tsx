import type { Metadata } from "next";
import Link from "next/link";
import { HealthBanner } from "@/components/health-banner";
import { SyncAgentsButton } from "@/components/sync-agents-button";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClawDashboard — OpenClaw Task Manager",
  description: "Assign and run OpenClaw agent tasks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-[var(--border)] bg-[var(--card)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-semibold">
                ClawDashboard
              </Link>
              <nav className="flex gap-4 text-sm text-[var(--muted-foreground)]">
                <Link href="/tasks" className="hover:text-[var(--foreground)]">
                  Tasks
                </Link>
                <Link href="/tasks/new" className="hover:text-[var(--foreground)]">
                  New task
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <SyncAgentsButton />
              <HealthBanner />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

import Link from "next/link";
import { AgentStats } from "@/components/agent-stats";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { getAgentStats } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [taskCount, runningCount, stats] = await Promise.all([
    prisma.task.count(),
    prisma.task.count({ where: { status: "running" } }),
    getAgentStats(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">OpenClaw Task Manager</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Assign tasks to OpenClaw agents, run manually or on a schedule, and reset repeatable work
          automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total tasks" value={taskCount} />
        <StatCard label="Running" value={runningCount} />
        <StatCard label="Agents" value={stats.length} />
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center">
          <Link href="/tasks/new">
            <Button>New task</Button>
          </Link>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Agent overview</h2>
        <AgentStats stats={stats} />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

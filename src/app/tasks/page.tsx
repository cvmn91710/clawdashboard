import Link from "next/link";
import { TaskTable } from "@/components/task-table";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { listTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, agents] = await Promise.all([
    listTasks(),
    prisma.agent.findMany({ orderBy: { id: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage OpenClaw agent assignments and runs
          </p>
        </div>
        <Link href="/tasks/new">
          <Button>New task</Button>
        </Link>
      </div>
      <TaskTable tasks={tasks} agents={agents} />
    </div>
  );
}

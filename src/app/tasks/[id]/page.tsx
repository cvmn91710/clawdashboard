import Link from "next/link";
import { notFound } from "next/navigation";
import { RunHistory } from "@/components/run-history";
import { RunNowButton } from "@/components/run-now-button";
import { TaskForm } from "@/components/task-form";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { getTask } from "@/lib/tasks";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [task, agents] = await Promise.all([
    getTask(id),
    prisma.agent.findMany({ orderBy: { id: "asc" } }),
  ]);

  if (!task) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/tasks" className="text-sm text-[var(--muted-foreground)] hover:underline">
            ← Back to tasks
          </Link>
          <h1 className="text-2xl font-bold mt-2">{task.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge status={task.status} />
            <span className="text-sm text-[var(--muted-foreground)]">{task.agent.label}</span>
          </div>
        </div>
        <RunNowButton taskId={task.id} disabled={task.status === "running"} />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Edit task</h2>
        <TaskForm
          agents={agents}
          initial={{
            id: task.id,
            name: task.name,
            description: task.description,
            prompt: task.prompt,
            agentId: task.agentId,
            workspacePath: task.workspacePath,
            repeatable: task.repeatable,
            scheduleEnabled: task.scheduleEnabled,
            scheduleType: task.scheduleType,
            scheduleExpr: task.scheduleExpr,
            model: task.model,
            thinking: task.thinking,
            timeoutSeconds: task.timeoutSeconds,
          }}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Run history</h2>
        <RunHistory runs={task.runs} />
      </section>
    </div>
  );
}

import { RunTrigger, type Task } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildCronJobSpec, createOrUpdateCronJob, deleteCronJob, forceRunCronJob } from "@/lib/openclaw/cron-sync";
import { markTaskRunning } from "@/lib/task-lifecycle";
import { validateWorkspacePath } from "@/lib/task-lifecycle";

export async function listTasks(agentId?: string) {
  return prisma.task.findMany({
    where: agentId ? { agentId } : undefined,
    include: {
      agent: { select: { id: true, label: true } },
      runs: {
        orderBy: { startedAt: "desc" },
        take: 5,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getTask(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      agent: { select: { id: true, label: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 20 },
    },
  });
}

export async function createTask(data: {
  name: string;
  description?: string;
  prompt: string;
  agentId: string;
  workspacePath?: string | null;
  repeatable?: boolean;
  scheduleEnabled?: boolean;
  scheduleType?: Task["scheduleType"];
  scheduleExpr?: string | null;
  model?: string | null;
  thinking?: string | null;
  timeoutSeconds?: number | null;
}) {
  const workspacePath = validateWorkspacePath(data.workspacePath);

  const task = await prisma.task.create({
    data: {
      name: data.name,
      description: data.description,
      prompt: data.prompt,
      agentId: data.agentId,
      workspacePath,
      repeatable: data.repeatable ?? true,
      scheduleEnabled: data.scheduleEnabled ?? false,
      scheduleType: data.scheduleType ?? null,
      scheduleExpr: data.scheduleExpr ?? null,
      model: data.model ?? null,
      thinking: data.thinking ?? null,
      timeoutSeconds: data.timeoutSeconds ?? null,
    },
  });

  const cronResult = await createOrUpdateCronJob(buildCronJobSpec(task));
  return prisma.task.update({
    where: { id: task.id },
    data: { openclawCronJobId: cronResult.jobId },
    include: { agent: { select: { id: true, label: true } }, runs: true },
  });
}

export async function updateTask(
  id: string,
  data: Partial<{
    name: string;
    description?: string;
    prompt: string;
    agentId: string;
    workspacePath?: string | null;
    repeatable?: boolean;
    scheduleEnabled?: boolean;
    scheduleType?: Task["scheduleType"];
    scheduleExpr?: string | null;
    model?: string | null;
    thinking?: string | null;
    timeoutSeconds?: number | null;
  }>,
) {
  const existing = await prisma.task.findUniqueOrThrow({ where: { id } });
  const workspacePath =
    data.workspacePath !== undefined ? validateWorkspacePath(data.workspacePath) : undefined;

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...data,
      workspacePath,
    },
  });

  const cronResult = await createOrUpdateCronJob(buildCronJobSpec(task), existing.openclawCronJobId);
  return prisma.task.update({
    where: { id },
    data: { openclawCronJobId: cronResult.jobId },
    include: {
      agent: { select: { id: true, label: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 20 },
    },
  });
}

export async function deleteTask(id: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id } });
  if (task.openclawCronJobId) {
    await deleteCronJob(task.openclawCronJobId);
  }
  await prisma.task.delete({ where: { id } });
}

export async function runTask(id: string, trigger: RunTrigger = RunTrigger.manual) {
  const task = await prisma.task.findUniqueOrThrow({
    where: { id },
    include: { agent: true },
  });

  if (!task.openclawCronJobId) {
    const cronResult = await createOrUpdateCronJob(buildCronJobSpec(task));
    await prisma.task.update({
      where: { id },
      data: { openclawCronJobId: cronResult.jobId },
    });
    task.openclawCronJobId = cronResult.jobId;
  }

  const run = await prisma.taskRun.create({
    data: { taskId: task.id, trigger, status: "queued" },
  });

  await markTaskRunning(task.id, run.id);

  const result = await forceRunCronJob(task.openclawCronJobId);
  if (!result.ok) {
    const { completeTaskRun } = await import("@/lib/task-lifecycle");
    await completeTaskRun({
      taskId: task.id,
      runId: run.id,
      success: false,
      error: result.message,
    });
    throw new Error(result.message);
  }

  return { task, run, message: result.message };
}

export async function getAgentStats() {
  const agents = await prisma.agent.findMany({
    include: {
      tasks: {
        include: {
          runs: {
            where: { completedAt: { not: null } },
            orderBy: { completedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  return agents.map((agent) => {
    const allRuns = agent.tasks.flatMap((t) => t.runs);
    const succeeded = allRuns.filter((r) => r.status === "succeeded").length;
    const failed = allRuns.filter((r) => r.status === "failed").length;
    const total = succeeded + failed;
    return {
      id: agent.id,
      label: agent.label,
      taskCount: agent.tasks.length,
      successRate: total > 0 ? Math.round((succeeded / total) * 100) : null,
      lastRunAt: allRuns[0]?.completedAt ?? null,
    };
  });
}

import { RunStatus, TaskStatus, type Task } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function markTaskRunning(taskId: string, runId: string) {
  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.running, lastRunAt: new Date() },
    }),
    prisma.taskRun.update({
      where: { id: runId },
      data: { status: RunStatus.running },
    }),
  ]);
}

export async function completeTaskRun(params: {
  taskId: string;
  runId: string;
  success: boolean;
  summary?: string;
  error?: string;
  openclawTaskId?: string;
  openclawRunId?: string;
}) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: params.taskId } });
  const runStatus = params.success ? RunStatus.succeeded : RunStatus.failed;
  const taskStatus = params.success ? TaskStatus.completed : TaskStatus.failed;
  const finalTaskStatus = task.repeatable ? TaskStatus.ready : taskStatus;

  await prisma.$transaction([
    prisma.taskRun.update({
      where: { id: params.runId },
      data: {
        status: runStatus,
        summary: params.summary,
        error: params.error,
        openclawTaskId: params.openclawTaskId,
        openclawRunId: params.openclawRunId,
        completedAt: new Date(),
      },
    }),
    prisma.task.update({
      where: { id: params.taskId },
      data: { status: finalTaskStatus },
    }),
  ]);
}

export async function cancelTaskRun(taskId: string, runId: string, reason?: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });

  await prisma.$transaction([
    prisma.taskRun.update({
      where: { id: runId },
      data: {
        status: RunStatus.cancelled,
        error: reason ?? "Cancelled by user",
        completedAt: new Date(),
      },
    }),
    prisma.task.update({
      where: { id: taskId },
      data: { status: task.repeatable ? TaskStatus.ready : TaskStatus.failed },
    }),
  ]);
}

export function isTerminalRunStatus(status: RunStatus): boolean {
  return ["succeeded", "failed", "timed_out", "cancelled"].includes(status);
}

export function validateWorkspacePath(path: string | null | undefined): string | null {
  if (!path) return null;
  const normalized = path.replace(/\\/g, "/");
  if (normalized.includes("..")) {
    throw new Error("Workspace path cannot contain '..'");
  }
  if (!normalized.startsWith("/data/workspaces")) {
    throw new Error("Workspace path must be under /data/workspaces");
  }
  return normalized;
}

export type TaskWithRelations = Task & {
  agent: { id: string; label: string };
  runs: Array<{
    id: string;
    status: RunStatus;
    trigger: string;
    summary: string | null;
    error: string | null;
    startedAt: Date;
    completedAt: Date | null;
  }>;
};

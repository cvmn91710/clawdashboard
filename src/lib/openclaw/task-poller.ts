import { RunStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { completeTaskRun, isTerminalRunStatus } from "@/lib/task-lifecycle";

export interface PolledTaskStatus {
  status: RunStatus;
  summary?: string;
  error?: string;
  openclawTaskId?: string;
  openclawRunId?: string;
}

export async function pollOpenClawTask(lookup: string): Promise<PolledTaskStatus | null> {
  if (process.env.OPENCLAW_USE_CLI_BRIDGE !== "true") {
    return null;
  }

  try {
    const container = process.env.OPENCLAW_GATEWAY_CONTAINER ?? "openclaw-gateway";
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const { stdout } = await execAsync(
      `docker exec ${container} node dist/index.js tasks show "${lookup}" --json`,
    );
    const data = JSON.parse(stdout) as {
      status?: string;
      summary?: string;
      error?: string;
      taskId?: string;
      runId?: string;
    };

    const status = mapOpenClawStatus(data.status);
    if (!status) return null;

    return {
      status,
      summary: data.summary,
      error: data.error,
      openclawTaskId: data.taskId,
      openclawRunId: data.runId,
    };
  } catch {
    return null;
  }
}

function mapOpenClawStatus(status?: string): RunStatus | null {
  switch (status) {
    case "queued":
      return RunStatus.queued;
    case "running":
      return RunStatus.running;
    case "succeeded":
      return RunStatus.succeeded;
    case "failed":
      return RunStatus.failed;
    case "timed_out":
      return RunStatus.timed_out;
    case "cancelled":
      return RunStatus.cancelled;
    default:
      return null;
  }
}

export async function reconcileStuckRuns(): Promise<number> {
  const timeoutMs = 30 * 60 * 1000;
  const cutoff = new Date(Date.now() - timeoutMs);

  const stuckRuns = await prisma.taskRun.findMany({
    where: {
      status: RunStatus.running,
      startedAt: { lt: cutoff },
    },
    include: { task: true },
  });

  let reconciled = 0;

  for (const run of stuckRuns) {
    const lookup = run.openclawTaskId ?? run.openclawRunId ?? run.id;
    const polled = await pollOpenClawTask(lookup);

    if (polled && isTerminalRunStatus(polled.status)) {
      await completeTaskRun({
        taskId: run.taskId,
        runId: run.id,
        success: polled.status === RunStatus.succeeded,
        summary: polled.summary,
        error: polled.error,
        openclawTaskId: polled.openclawTaskId,
        openclawRunId: polled.openclawRunId,
      });
      reconciled++;
      continue;
    }

    const taskTimeout = (run.task.timeoutSeconds ?? 1800) * 1000;
    if (Date.now() - run.startedAt.getTime() > taskTimeout) {
      await completeTaskRun({
        taskId: run.taskId,
        runId: run.id,
        success: false,
        error: "Run timed out (reconciliation)",
      });
      reconciled++;
    }
  }

  return reconciled;
}

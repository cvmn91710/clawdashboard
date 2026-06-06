import { ScheduleType, type Task } from "@prisma/client";
import { getEnv } from "@/lib/utils";

export interface CronJobSpec {
  name: string;
  message: string;
  agentId: string;
  taskId: string;
  scheduleEnabled: boolean;
  scheduleType: ScheduleType | null;
  scheduleExpr: string | null;
  model?: string | null;
  thinking?: string | null;
  timeoutSeconds?: number | null;
  webhookUrl: string;
}

export interface CronJobResult {
  jobId: string;
  created: boolean;
}

const PLACEHOLDER_SCHEDULE = "0 0 1 1 *";

function gatewayUrl(): string {
  return process.env.OPENCLAW_GATEWAY_URL ?? "http://openclaw-gateway:18789";
}

function hooksToken(): string {
  return getEnv("OPENCLAW_HOOKS_TOKEN", "dev-hooks-token");
}

function webhookUrl(): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}/api/webhooks/openclaw`;
}

export function buildCronJobSpec(task: Task): CronJobSpec {
  return {
    name: `clawdashboard:${task.id}`,
    message: task.prompt,
    agentId: task.agentId,
    taskId: task.id,
    scheduleEnabled: task.scheduleEnabled,
    scheduleType: task.scheduleType,
    scheduleExpr: task.scheduleExpr,
    model: task.model,
    thinking: task.thinking,
    timeoutSeconds: task.timeoutSeconds,
    webhookUrl: webhookUrl(),
  };
}

function scheduleArgs(spec: CronJobSpec): { scheduleFlag: string; scheduleValue: string } {
  if (!spec.scheduleEnabled || !spec.scheduleExpr) {
    return { scheduleFlag: "--cron", scheduleValue: PLACEHOLDER_SCHEDULE };
  }
  if (spec.scheduleType === ScheduleType.interval) {
    return { scheduleFlag: "--every", scheduleValue: spec.scheduleExpr };
  }
  return { scheduleFlag: "--cron", scheduleValue: spec.scheduleExpr };
}

/**
 * In-memory cron registry used when OpenClaw CLI bridge is unavailable (local dev).
 * Production worker uses docker exec against openclaw-gateway.
 */
const inMemoryCronJobs = new Map<string, CronJobSpec>();

export async function createOrUpdateCronJob(
  spec: CronJobSpec,
  existingJobId?: string | null,
): Promise<CronJobResult> {
  const jobId = existingJobId ?? `cron_${spec.taskId}`;

  if (process.env.OPENCLAW_USE_CLI_BRIDGE === "true") {
    return execCronCli("sync", spec, jobId);
  }

  inMemoryCronJobs.set(jobId, spec);
  return { jobId, created: !existingJobId };
}

export async function deleteCronJob(jobId: string): Promise<void> {
  if (process.env.OPENCLAW_USE_CLI_BRIDGE === "true") {
    await execCronCli("remove", undefined, jobId);
    return;
  }
  inMemoryCronJobs.delete(jobId);
}

export async function forceRunCronJob(jobId: string): Promise<{ ok: boolean; message: string }> {
  if (process.env.OPENCLAW_USE_CLI_BRIDGE === "true") {
    return execCronRun(jobId);
  }

  const spec = inMemoryCronJobs.get(jobId);
  if (!spec) {
    return { ok: false, message: `Cron job ${jobId} not found` };
  }

  // Dev fallback: trigger via hooks API directly
  const res = await fetch(`${gatewayUrl()}/hooks/agent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hooksToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: spec.message,
      name: spec.name,
      agentId: spec.agentId,
      model: spec.model ?? undefined,
      thinking: spec.thinking ?? undefined,
      timeoutSeconds: spec.timeoutSeconds ?? undefined,
      deliver: false,
    }),
    signal: AbortSignal.timeout(30000),
  });

  return {
    ok: res.status === 202 || res.ok,
    message: res.ok || res.status === 202 ? "Run triggered" : `Gateway returned ${res.status}`,
  };
}

async function execCronCli(
  action: "sync" | "remove",
  spec?: CronJobSpec,
  jobId?: string,
): Promise<CronJobResult> {
  const container = process.env.OPENCLAW_GATEWAY_CONTAINER ?? "openclaw-gateway";
  const { scheduleFlag, scheduleValue } = spec ? scheduleArgs(spec) : { scheduleFlag: "", scheduleValue: "" };

  if (action === "remove" && jobId) {
    await dockerExec(container, ["node", "dist/index.js", "cron", "remove", jobId]);
    return { jobId, created: false };
  }

  if (!spec) throw new Error("spec required for sync");

  const args = [
    "node",
    "dist/index.js",
    "cron",
    spec.scheduleEnabled ? "add" : "add",
    scheduleValue,
    "--name",
    spec.name,
    "--session",
    "isolated",
    "--message",
    spec.message,
    "--agent",
    spec.agentId,
    "--webhook",
    spec.webhookUrl,
    "--no-deliver",
    scheduleFlag.replace("--", "--"),
  ].filter(Boolean);

  if (spec.model) args.push("--model", spec.model);
  if (spec.thinking) args.push("--thinking", spec.thinking);
  if (spec.timeoutSeconds) args.push("--timeout-seconds", String(spec.timeoutSeconds));

  if (jobId && action === "sync") {
    await dockerExec(container, ["node", "dist/index.js", "cron", "edit", jobId, ...args.slice(4)]);
    return { jobId, created: false };
  }

  const output = await dockerExec(container, args);
  const parsedJobId = parseJobId(output) ?? `cron_${spec.taskId}`;
  return { jobId: parsedJobId, created: true };
}

async function execCronRun(jobId: string): Promise<{ ok: boolean; message: string }> {
  const container = process.env.OPENCLAW_GATEWAY_CONTAINER ?? "openclaw-gateway";
  try {
    await dockerExec(container, ["node", "dist/index.js", "cron", "run", jobId]);
    return { ok: true, message: "Cron run triggered" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Cron run failed" };
  }
}

async function dockerExec(container: string, cmd: string[]): Promise<string> {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);
  const fullCmd = `docker exec ${container} ${cmd.map((c) => `"${c.replace(/"/g, '\\"')}"`).join(" ")}`;
  const { stdout } = await execAsync(fullCmd);
  return stdout;
}

function parseJobId(output: string): string | null {
  const match = output.match(/job[_-]?id[:\s]+([a-zA-Z0-9_-]+)/i);
  return match?.[1] ?? null;
}

export function getInMemoryCronJob(jobId: string): CronJobSpec | undefined {
  return inMemoryCronJobs.get(jobId);
}

import { RunTrigger } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSecret } from "@/lib/auth";
import { completeTaskRun } from "@/lib/task-lifecycle";

interface WebhookPayload {
  taskId?: string;
  jobId?: string;
  jobName?: string;
  status?: string;
  summary?: string;
  error?: string;
  openclawTaskId?: string;
  openclawRunId?: string;
  runId?: string;
}

function extractTaskId(payload: WebhookPayload): string | null {
  if (payload.taskId) return payload.taskId;
  if (payload.jobName?.startsWith("clawdashboard:")) {
    return payload.jobName.replace("clawdashboard:", "");
  }
  return null;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-openclaw-webhook-secret");
  if (!verifyWebhookSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const taskId = extractTaskId(payload);
  if (!taskId) {
    return NextResponse.json({ error: "Could not resolve taskId" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  let run = payload.runId
    ? await prisma.taskRun.findUnique({ where: { id: payload.runId } })
    : null;

  if (!run) {
    run = await prisma.taskRun.findFirst({
      where: {
        taskId,
        status: { in: ["queued", "running"] },
      },
      orderBy: { startedAt: "desc" },
    });
  }

  if (!run) {
    run = await prisma.taskRun.create({
      data: {
        taskId,
        trigger: RunTrigger.schedule,
        status: "running",
      },
    });
  }

  const success = !payload.error && payload.status !== "failed" && payload.status !== "timed_out";

  await completeTaskRun({
    taskId,
    runId: run.id,
    success,
    summary: payload.summary,
    error: payload.error,
    openclawTaskId: payload.openclawTaskId,
    openclawRunId: payload.openclawRunId,
  });

  return NextResponse.json({ ok: true, taskId, runId: run.id });
}

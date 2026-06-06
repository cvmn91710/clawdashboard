import { RunStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cancelTaskRun } from "@/lib/task-lifecycle";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const activeRun = await prisma.taskRun.findFirst({
      where: { taskId: id, status: { in: [RunStatus.queued, RunStatus.running] } },
      orderBy: { startedAt: "desc" },
    });

    if (!activeRun) {
      return NextResponse.json({ error: "No active run to cancel" }, { status: 404 });
    }

    await cancelTaskRun(id, activeRun.id, "Cancelled via dashboard");
    return NextResponse.json({ ok: true, runId: activeRun.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to cancel run" },
      { status: 500 },
    );
  }
}

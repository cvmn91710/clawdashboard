import { RunTrigger } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { runTask } from "@/lib/tasks";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const trigger =
      body.trigger === "schedule" ? RunTrigger.schedule : RunTrigger.manual;
    const result = await runTask(id, trigger);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to run task" },
      { status: 500 },
    );
  }
}

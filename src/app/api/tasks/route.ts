import { NextRequest, NextResponse } from "next/server";
import { getDefaultAgentId } from "@/lib/openclaw/agents";
import { createTask, listTasks } from "@/lib/tasks";
import { createTaskSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agent_id") ?? undefined;
  const tasks = await listTasks(agentId);
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTaskSchema.parse(body);
    const agentId = parsed.agentId ?? (await getDefaultAgentId());

    const task = await createTask({ ...parsed, agentId });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create task" },
      { status: 400 },
    );
  }
}

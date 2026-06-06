import { NextResponse } from "next/server";
import { syncAgentsFromGateway } from "@/lib/openclaw/agents";

export async function POST() {
  try {
    const agents = await syncAgentsFromGateway();
    return NextResponse.json({ agents, syncedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent sync failed" },
      { status: 500 },
    );
  }
}

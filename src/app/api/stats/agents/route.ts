import { NextResponse } from "next/server";
import { getAgentStats } from "@/lib/tasks";

export async function GET() {
  const stats = await getAgentStats();
  return NextResponse.json({ stats });
}

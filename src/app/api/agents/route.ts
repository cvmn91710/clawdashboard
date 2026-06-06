import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const agents = await prisma.agent.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ agents });
}

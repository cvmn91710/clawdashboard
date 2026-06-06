import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkGatewayHealth } from "@/lib/openclaw/gateway";

export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const gateway = await checkGatewayHealth();

  return NextResponse.json({
    ok: dbOk && gateway.ok,
    db: dbOk,
    gateway,
    timestamp: new Date().toISOString(),
  });
}

import { prisma } from "@/lib/db";
import { fetchAgentsFromGateway } from "@/lib/openclaw/gateway";

export async function syncAgentsFromGateway() {
  const agents = await fetchAgentsFromGateway();
  const now = new Date();

  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { id: agent.id },
      update: {
        label: agent.label ?? agent.name ?? agent.id,
        workspace: agent.workspace ?? `/data/workspaces/${agent.id}`,
        isDefault: Boolean(agent.default),
        syncedAt: now,
      },
      create: {
        id: agent.id,
        label: agent.label ?? agent.name ?? agent.id,
        workspace: agent.workspace ?? `/data/workspaces/${agent.id}`,
        isDefault: Boolean(agent.default),
        syncedAt: now,
      },
    });
  }

  return prisma.agent.findMany({ orderBy: { id: "asc" } });
}

export async function getDefaultAgentId(): Promise<string> {
  const defaultAgent = await prisma.agent.findFirst({ where: { isDefault: true } });
  if (defaultAgent) return defaultAgent.id;
  const first = await prisma.agent.findFirst({ orderBy: { id: "asc" } });
  if (!first) throw new Error("No agents registered. Run POST /api/agents/sync first.");
  return first.id;
}

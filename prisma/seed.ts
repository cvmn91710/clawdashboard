import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const agents = [
    { id: "main", label: "Main Agent", workspace: "/data/workspaces/main", isDefault: true },
    { id: "dev", label: "Dev Agent", workspace: "/data/workspaces/dev", isDefault: false },
    { id: "ops", label: "Ops Agent", workspace: "/data/workspaces/ops", isDefault: false },
  ];

  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { id: agent.id },
      update: agent,
      create: agent,
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

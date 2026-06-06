import { TaskForm } from "@/components/task-form";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const agents = await prisma.agent.findMany({ orderBy: { id: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create task</h1>
      <TaskForm agents={agents} />
    </div>
  );
}

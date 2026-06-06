"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface TaskRow {
  id: string;
  name: string;
  status: string;
  repeatable: boolean;
  scheduleEnabled: boolean;
  scheduleExpr: string | null;
  agent: { id: string; label: string };
  lastRunAt: string | Date | null;
}

interface TaskTableProps {
  tasks: TaskRow[];
  agents: Array<{ id: string; label: string }>;
  initialAgentFilter?: string;
}

export function TaskTable({ tasks, agents, initialAgentFilter }: TaskTableProps) {
  const router = useRouter();
  const [agentFilter, setAgentFilter] = useState(initialAgentFilter ?? "");
  const [runningId, setRunningId] = useState<string | null>(null);

  const filtered = agentFilter ? tasks.filter((t) => t.agent.id === agentFilter) : tasks;

  const runTask = async (id: string) => {
    setRunningId(id);
    await fetch(`/api/tasks/${id}/run`, { method: "POST" });
    router.refresh();
    setRunningId(null);
  };

  const cancelTask = async (id: string) => {
    await fetch(`/api/tasks/${id}/cancel`, { method: "POST" });
    router.refresh();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-[var(--muted-foreground)]">Filter by agent</label>
        <Select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="w-48"
        >
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)] text-left text-[var(--muted-foreground)]">
            <tr>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">Last run</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                  No tasks yet. Create one to get started.
                </td>
              </tr>
            )}
            {filtered.map((task) => (
              <tr key={task.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">
                  <Link href={`/tasks/${task.id}`} className="font-medium hover:text-[var(--primary)]">
                    {task.name}
                  </Link>
                  {task.repeatable && (
                    <span className="ml-2 text-xs text-[var(--muted-foreground)]">repeatable</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-[var(--muted)] px-2 py-0.5 text-xs">{task.agent.label}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge status={task.status} />
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)]">
                  {task.scheduleEnabled ? (task.scheduleExpr ?? "enabled") : "manual"}
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)]">
                  {task.lastRunAt ? new Date(task.lastRunAt).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => runTask(task.id)}
                      disabled={runningId === task.id || task.status === "running"}
                    >
                      Run
                    </Button>
                    {task.status === "running" && (
                      <Button size="sm" variant="outline" onClick={() => cancelTask(task.id)}>
                        Cancel
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => deleteTask(task.id)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

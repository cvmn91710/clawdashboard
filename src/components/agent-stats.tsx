interface AgentStat {
  id: string;
  label: string;
  taskCount: number;
  successRate: number | null;
  lastRunAt: string | Date | null;
}

export function AgentStats({ stats }: { stats: AgentStat[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((s) => (
        <div key={s.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="font-medium">{s.label}</h3>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{s.taskCount} tasks</p>
          <p className="text-sm mt-2">
            Success rate: {s.successRate !== null ? `${s.successRate}%` : "—"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Last run: {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

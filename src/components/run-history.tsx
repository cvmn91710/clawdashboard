import { Badge } from "@/components/ui/badge";

interface Run {
  id: string;
  status: string;
  trigger: string;
  summary: string | null;
  error: string | null;
  startedAt: string | Date;
  completedAt: string | Date | null;
}

export function RunHistory({ runs }: { runs: Run[] }) {
  if (runs.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">No runs yet.</p>;
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div
          key={run.id}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <Badge status={run.status} />
            <span className="text-[var(--muted-foreground)] capitalize">{run.trigger}</span>
            <span className="text-[var(--muted-foreground)] ml-auto">
              {new Date(run.startedAt).toLocaleString()}
            </span>
          </div>
          {run.summary && <p className="text-[var(--foreground)]">{run.summary}</p>}
          {run.error && <p className="text-[var(--danger)]">{run.error}</p>}
        </div>
      ))}
    </div>
  );
}

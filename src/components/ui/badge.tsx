import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  ready: "bg-blue-500/20 text-blue-300",
  running: "bg-amber-500/20 text-amber-300",
  completed: "bg-green-500/20 text-green-300",
  failed: "bg-red-500/20 text-red-300",
  queued: "bg-slate-500/20 text-slate-300",
  succeeded: "bg-green-500/20 text-green-300",
  timed_out: "bg-orange-500/20 text-orange-300",
  cancelled: "bg-slate-500/20 text-slate-300",
};

export function Badge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] ?? "bg-[var(--muted)] text-[var(--muted-foreground)]",
        className,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

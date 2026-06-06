"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface HealthState {
  ok: boolean;
  db: boolean;
  gateway: { ok: boolean; message?: string };
}

export function HealthBanner() {
  const [health, setHealth] = useState<HealthState | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/health");
      if (res.ok) setHealth(await res.json());
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!health) return null;

  return (
    <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
      <span>DB</span>
      <Badge status={health.db ? "succeeded" : "failed"} />
      <span>Gateway</span>
      <Badge status={health.gateway.ok ? "succeeded" : "failed"} />
      {health.gateway.message && <span>{health.gateway.message}</span>}
    </div>
  );
}

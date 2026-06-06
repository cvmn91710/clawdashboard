"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SyncAgentsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const sync = async () => {
    setLoading(true);
    await fetch("/api/agents/sync", { method: "POST" });
    router.refresh();
    setLoading(false);
  };

  return (
    <Button size="sm" variant="outline" onClick={sync} disabled={loading}>
      {loading ? "Syncing..." : "Sync agents"}
    </Button>
  );
}

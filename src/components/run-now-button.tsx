"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RunNowButton({ taskId, disabled }: { taskId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    await fetch(`/api/tasks/${taskId}/run`, { method: "POST" });
    router.refresh();
    setLoading(false);
  };

  return (
    <Button onClick={run} disabled={disabled || loading}>
      {loading ? "Starting..." : "Run now"}
    </Button>
  );
}

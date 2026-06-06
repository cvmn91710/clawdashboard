"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Agent {
  id: string;
  label: string;
}

interface TaskFormData {
  id?: string;
  name: string;
  description?: string | null;
  prompt: string;
  agentId: string;
  workspacePath?: string | null;
  repeatable: boolean;
  scheduleEnabled: boolean;
  scheduleType?: "cron" | "interval" | null;
  scheduleExpr?: string | null;
  model?: string | null;
  thinking?: string | null;
  timeoutSeconds?: number | null;
}

interface TaskFormProps {
  agents: Agent[];
  initial?: TaskFormData;
}

export function TaskForm({ agents, initial }: TaskFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormData>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    prompt: initial?.prompt ?? "",
    agentId: initial?.agentId ?? agents[0]?.id ?? "main",
    workspacePath: initial?.workspacePath ?? "",
    repeatable: initial?.repeatable ?? true,
    scheduleEnabled: initial?.scheduleEnabled ?? false,
    scheduleType: initial?.scheduleType ?? "cron",
    scheduleExpr: initial?.scheduleExpr ?? "",
    model: initial?.model ?? "",
    thinking: initial?.thinking ?? "",
    timeoutSeconds: initial?.timeoutSeconds ?? 1800,
  });

  const update = <K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...form,
      description: form.description || undefined,
      workspacePath: form.workspacePath || null,
      scheduleType: form.scheduleEnabled ? form.scheduleType : null,
      scheduleExpr: form.scheduleEnabled ? form.scheduleExpr : null,
      model: form.model || null,
      thinking: form.thinking || null,
      timeoutSeconds: form.timeoutSeconds ? Number(form.timeoutSeconds) : null,
    };

    const url = initial?.id ? `/api/tasks/${initial.id}` : "/api/tasks";
    const method = initial?.id ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Save failed");
      setLoading(false);
      return;
    }

    router.push("/tasks");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-2xl">
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={form.description ?? ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea
          id="prompt"
          value={form.prompt}
          onChange={(e) => update("prompt", e.target.value)}
          required
          rows={5}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="agentId">Agent</Label>
          <Select
            id="agentId"
            value={form.agentId}
            onChange={(e) => update("agentId", e.target.value)}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="workspacePath">Workspace path</Label>
          <Input
            id="workspacePath"
            placeholder="/data/workspaces/dev/my-repo"
            value={form.workspacePath ?? ""}
            onChange={(e) => update("workspacePath", e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-6">
        <Switch
          label="Repeatable"
          checked={form.repeatable}
          onChange={(e) => update("repeatable", e.target.checked)}
        />
        <Switch
          label="Schedule enabled"
          checked={form.scheduleEnabled}
          onChange={(e) => update("scheduleEnabled", e.target.checked)}
        />
      </div>

      {form.scheduleEnabled && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="scheduleType">Schedule type</Label>
            <Select
              id="scheduleType"
              value={form.scheduleType ?? "cron"}
              onChange={(e) => update("scheduleType", e.target.value as "cron" | "interval")}
            >
              <option value="cron">Cron</option>
              <option value="interval">Interval</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="scheduleExpr">
              {form.scheduleType === "interval" ? "Interval (e.g. 1h)" : "Cron expression"}
            </Label>
            <Input
              id="scheduleExpr"
              placeholder={form.scheduleType === "interval" ? "1h" : "0 7 * * *"}
              value={form.scheduleExpr ?? ""}
              onChange={(e) => update("scheduleExpr", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="model">Model override</Label>
          <Input id="model" value={form.model ?? ""} onChange={(e) => update("model", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="thinking">Thinking</Label>
          <Input
            id="thinking"
            value={form.thinking ?? ""}
            onChange={(e) => update("thinking", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="timeoutSeconds">Timeout (sec)</Label>
          <Input
            id="timeoutSeconds"
            type="number"
            value={form.timeoutSeconds ?? ""}
            onChange={(e) => update("timeoutSeconds", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initial?.id ? "Update task" : "Create task"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

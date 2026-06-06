import { getEnv } from "@/lib/utils";

export interface AgentHookPayload {
  message: string;
  name?: string;
  agentId?: string;
  model?: string;
  thinking?: string;
  timeoutSeconds?: number;
  deliver?: boolean;
}

export interface GatewayHealth {
  ok: boolean;
  gatewayUrl: string;
  message?: string;
}

function gatewayUrl(): string {
  return process.env.OPENCLAW_GATEWAY_URL ?? "http://openclaw-gateway:18789";
}

function hooksToken(): string {
  return getEnv("OPENCLAW_HOOKS_TOKEN", "dev-hooks-token");
}

export async function checkGatewayHealth(): Promise<GatewayHealth> {
  const url = gatewayUrl();
  try {
    const res = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(5000) });
    return {
      ok: res.ok,
      gatewayUrl: url,
      message: res.ok ? "Gateway reachable" : `Gateway returned ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      gatewayUrl: url,
      message: err instanceof Error ? err.message : "Gateway unreachable",
    };
  }
}

export async function triggerAgentHook(payload: AgentHookPayload): Promise<{ accepted: boolean; status: number }> {
  const res = await fetch(`${gatewayUrl()}/hooks/agent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hooksToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      deliver: payload.deliver ?? false,
      wakeMode: "now",
    }),
    signal: AbortSignal.timeout(30000),
  });

  return { accepted: res.status === 202 || res.ok, status: res.status };
}

export interface OpenClawAgentInfo {
  id: string;
  label?: string;
  name?: string;
  workspace?: string;
  default?: boolean;
}

export async function fetchAgentsFromGateway(): Promise<OpenClawAgentInfo[]> {
  // Fallback seed agents when gateway is unavailable during local dev
  const fallback: OpenClawAgentInfo[] = [
    { id: "main", label: "Main Agent", workspace: "/data/workspaces/main", default: true },
    { id: "dev", label: "Dev Agent", workspace: "/data/workspaces/dev" },
    { id: "ops", label: "Ops Agent", workspace: "/data/workspaces/ops" },
  ];

  try {
    const res = await fetch(`${gatewayUrl()}/api/agents`, {
      headers: { Authorization: `Bearer ${process.env.OPENCLAW_GATEWAY_TOKEN ?? hooksToken()}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { agents?: OpenClawAgentInfo[] } | OpenClawAgentInfo[];
    const agents = Array.isArray(data) ? data : (data.agents ?? []);
    return agents.length > 0 ? agents : fallback;
  } catch {
    return fallback;
  }
}

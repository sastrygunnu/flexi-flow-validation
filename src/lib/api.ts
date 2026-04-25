import type { AuditLog, FlowRun } from "@/lib/audit-logs";
import type { StepKind } from "@/lib/validation-steps";
import { cacheGet, cacheSet } from "@/lib/server-cache";

export type FlowStepConfig = {
  type: StepKind;
  provider: string;
};

export type Flow = {
  id: string;
  name: string;
  steps: FlowStepConfig[];
  createdAt: string;
  updatedAt: string;
};

export type CircleStatus = {
  ok: boolean;
  arcExplorerBaseUrl?: string;
  payer?: { walletId: string; address: string } | null;
  payerBalances?: {
    usdc?: {
      tokenAddress: string | null;
      symbol: string | null;
      blockchain: string | null;
      amount: string | null;
    } | null;
    count: number;
  } | null;
  errors?: string[];
};

export type CircleTransferCreated = {
  ok: boolean;
  created?: { id: string; state: string } | null;
  error?: { message: string };
};

export type CircleTransactionResponse = {
  ok: boolean;
  transaction?: {
    id: string;
    state: string;
    txHash?: string;
    blockchain?: string;
    amounts?: string[];
    destinationAddress?: string;
    sourceAddress?: string;
    createDate?: string;
    firstConfirmDate?: string;
  } | null;
  error?: { message: string };
};

export type X402TransferResponse = {
  ok: boolean;
  transfer?: Record<string, unknown> | null;
  error?: { message: string };
};

// In production, use relative URLs (same domain as frontend)
// In development, use localhost:8787
const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8787" : "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init?.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${text || res.statusText}`);
    }
    const data = (await res.json()) as T;

    const method = String(init?.method || "GET").toUpperCase();
    if (method === "GET") cacheSet(path, data);
    return data;
  } catch (e) {
    const method = String(init?.method || "GET").toUpperCase();
    if (method === "GET") {
      const cached = cacheGet<T>(path);
      if (cached !== null) return cached;
    }
    throw e;
  }
}

export const api = {
  circle: {
    status: () => request<CircleStatus>("/api/circle/status"),
    transfer: (input?: { destinationAddress?: string; amountUsdc?: string; refId?: string }) =>
      request<CircleTransferCreated>("/api/circle/transfer", {
        method: "POST",
        body: JSON.stringify(input || {}),
      }),
    getTx: (id: string) => request<CircleTransactionResponse>(`/api/circle/tx/${id}`),
  },
  flows: {
    list: () => request<{ flows: Flow[] }>("/api/flows"),
    create: (flow: Pick<Flow, "name" | "steps">) =>
      request<{ flow: Flow }>("/api/flows", {
        method: "POST",
        body: JSON.stringify(flow),
      }),
    update: (id: string, flow: Pick<Flow, "name" | "steps">) =>
      request<{ flow: Flow }>(`/api/flows/${id}`, {
        method: "PUT",
        body: JSON.stringify(flow),
      }),
  },
  runs: {
    list: (limit = 50) => request<{ runs: FlowRun[] }>(`/api/runs?limit=${limit}`),
    get: (runId: string) => request<{ run: FlowRun }>(`/api/runs/${encodeURIComponent(runId)}`),
    create: (input: {
      flowId: string;
      userId?: string;
      user?: Record<string, unknown>;
      forceStatus?: "success" | "failed" | "timeout";
      stepOutcomes?: Array<"success" | "failed" | "timeout" | "random">;
      continueOnFailure?: boolean;
      async?: boolean;
    }) =>
      request<{ run: FlowRun }>("/api/runs", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
  x402: {
    transfer: (id: string) => request<X402TransferResponse>(`/api/x402/transfers/${encodeURIComponent(id)}`),
  },
  logs: {
    list: (params?: {
      runId?: string;
      limit?: number;
      hydrate?: boolean;
      hydrateLimit?: number;
      hydrateTimeoutMs?: number;
    }) => {
      const sp = new URLSearchParams();
      if (params?.runId) sp.set("runId", params.runId);
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.hydrate === false) sp.set("hydrate", "0");
      if (typeof params?.hydrateLimit === "number") sp.set("hydrateLimit", String(params.hydrateLimit));
      if (typeof params?.hydrateTimeoutMs === "number") sp.set("hydrateTimeoutMs", String(params.hydrateTimeoutMs));
      const qs = sp.toString();
      return request<{ logs: AuditLog[] }>(`/api/logs${qs ? `?${qs}` : ""}`);
    },
  },
};

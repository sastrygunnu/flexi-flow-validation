import { useMemo, useState } from "react";
import {
  Workflow,
  GitBranch,
  ScrollText,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Activity,
  ArrowRight,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { arcTxUrl } from "@/lib/arc";

interface OverviewProps {
  onNavigate: (tab: "builder" | "flow-logs" | "logs" | "costs") => void;
}

function shortAddress(address: string) {
  const a = address.trim();
  if (a.length <= 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function Overview({ onNavigate }: OverviewProps) {
  const qc = useQueryClient();
  const [lastCircleTxId, setLastCircleTxId] = useState<string | null>(null);

  const flowsQuery = useQuery({
    queryKey: ["flows"],
    queryFn: async () => (await api.flows.list()).flows,
  });

  const runsQuery = useQuery({
    queryKey: ["runs"],
    queryFn: async () => (await api.runs.list(50)).runs,
  });

  const circleQuery = useQuery({
    queryKey: ["circle-status"],
    queryFn: async () => api.circle.status(),
    refetchInterval: 30_000,
  });

  const circleTxQuery = useQuery({
    queryKey: ["circle-tx", lastCircleTxId],
    queryFn: async () => {
      if (!lastCircleTxId) return null;
      return api.circle.getTx(lastCircleTxId);
    },
    enabled: Boolean(lastCircleTxId),
    refetchInterval: 5_000,
  });

  const sendCircleTxMutation = useMutation({
    mutationFn: async () => api.circle.transfer({ refId: "validly_console_demo" }),
    onSuccess: async (data) => {
      const id = data.created?.id || null;
      if (id) setLastCircleTxId(id);
      await qc.invalidateQueries({ queryKey: ["circle-status"] });
    },
  });

  const runMutation = useMutation({
    mutationFn: async (vars?: { forceStatus?: "success" | "failed" | "timeout" }) => {
      const flows = flowsQuery.data || [];
      const flowId = flows[0]?.id;
      if (!flowId) throw new Error("No flows found (open Flow Builder and deploy once)");
      await api.runs.create({
        flowId,
        user: { phone: "+14155550182", email: "alex@startup.io" },
        ...(vars?.forceStatus ? { forceStatus: vars.forceStatus } : {}),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["runs"] }),
        qc.invalidateQueries({ queryKey: ["logs"] }),
        qc.invalidateQueries({ queryKey: ["logs", "analytics"] }),
      ]);
    },
  });

  const runs = runsQuery.data || [];

  const stats = useMemo(() => {
    const totalSteps = runs.reduce((s, r) => s + r.steps.length, 0);
    const success = runs.filter((r) => r.status === "success").length;
    const cost = runs.reduce((s, r) => s + r.totalCostUsd, 0);
    const avgLatency = runs.length
      ? Math.round(runs.reduce((s, r) => s + r.totalDurationMs, 0) / runs.length)
      : 0;
    return {
      runs: runs.length,
      steps: totalSteps,
      successRate: runs.length ? Math.round((success / runs.length) * 100) : 0,
      cost,
      avgLatency,
    };
  }, [runs]);

  const displayName = "there";
  const recent = runs.slice(0, 5);
  const payerAddress = circleQuery.data?.payer?.address || null;
  const payerUsdc = circleQuery.data?.payerBalances?.usdc?.amount || null;
  const latestCircleTx = circleTxQuery.data?.transaction || null;
  const circleTxUrl = latestCircleTx?.txHash ? arcTxUrl(latestCircleTx.txHash) : null;

  const quickLinks = [
    {
      key: "builder" as const,
      title: "Flow Builder",
      desc: "Compose validation steps and switch providers anytime.",
      Icon: Workflow,
    },
    {
      key: "flow-logs" as const,
      title: "Flow Logs",
      desc: "Inspect every flow execution end-to-end.",
      Icon: GitBranch,
    },
    {
      key: "logs" as const,
      title: "Audit Logs",
      desc: "Drill into per-step API calls and export to CSV/PDF.",
      Icon: ScrollText,
    },
    {
      key: "costs" as const,
      title: "Cost Analytics",
      desc: "USDC spend per flow, step & provider — settled on Arc.",
      Icon: Coins,
    },
  ];

  const statusDot = {
    running: "bg-muted-foreground",
    success: "bg-success",
    failed: "bg-destructive",
    timeout: "bg-accent",
  } as const;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="gradient-card border border-primary/30 rounded-2xl p-6 md:p-8 shadow-glow">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
          Welcome back
        </p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Hi {displayName} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Here's a snapshot of your validation flows. Jump into any tool below to
          build, test, or audit.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          Icon={Activity}
          label="Flow runs (24h)"
          value={stats.runs.toString()}
          hint={`${stats.steps} step calls`}
        />
        <StatCard
          Icon={CheckCircle2}
          label="Success rate"
          value={`${stats.successRate}%`}
          hint="across all flows"
          tone="success"
        />
        <StatCard
          Icon={TrendingUp}
          label="Avg latency"
          value={`${stats.avgLatency}ms`}
          hint="per full flow"
        />
        <StatCard
          Icon={DollarSign}
          label="Spend (24h)"
          value={`$${stats.cost.toFixed(2)}`}
          hint="provider costs"
        />
        <StatCard
          Icon={Coins}
          label="Payer balance"
          value={
            payerUsdc && Number.isFinite(Number(payerUsdc))
              ? `${Number(payerUsdc).toFixed(2)} USDC`
              : "—"
          }
          hint={
            circleQuery.isError
              ? "Circle status error"
              : payerAddress
                ? `Circle payer ${shortAddress(payerAddress)}`
                : circleQuery.isLoading
                  ? "Checking Circle config…"
                  : "Circle not configured"
          }
        />
      </div>

      <div className="gradient-card border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[240px]">
          <div className="text-xs font-semibold">Circle Console transaction</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Creates a 0.01 USDC transfer via Circle Wallets (shows up in Console → Wallets → Transactions).
          </div>
          {latestCircleTx?.id ? (
            <div className="text-[11px] text-muted-foreground font-mono mt-2">
              tx {latestCircleTx.id} · {latestCircleTx.state}
              {latestCircleTx.txHash ? ` · ${shortAddress(latestCircleTx.txHash)}` : ""}
            </div>
          ) : lastCircleTxId ? (
            <div className="text-[11px] text-muted-foreground font-mono mt-2">
              tx {lastCircleTxId} · loading…
            </div>
          ) : null}
          {circleTxUrl ? (
            <div className="mt-2">
              <Button asChild size="sm" variant="outline">
                <a
                  href={circleTxUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Arc Explorer
                </a>
              </Button>
            </div>
          ) : null}
          {sendCircleTxMutation.isError ? (
            <div className="text-[11px] text-destructive mt-2">
              {sendCircleTxMutation.error instanceof Error
                ? sendCircleTxMutation.error.message
                : "Transfer failed"}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendCircleTxMutation.mutate()}
            disabled={sendCircleTxMutation.isPending}
            title="Creates a Circle Wallets transfer transaction"
          >
            {sendCircleTxMutation.isPending ? "Sending…" : "Send 0.01 USDC"}
          </Button>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickLinks.map(({ key, title, desc, Icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className="group text-left gradient-card border border-border hover:border-primary/50 rounded-xl p-5 transition-smooth"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 group-hover:gradient-primary group-hover:border-transparent transition-smooth">
              <Icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{title}</h3>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-smooth" />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* Recent runs */}
      <div className="gradient-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold">Recent flow runs</h3>
            <p className="text-xs text-muted-foreground">
              Latest executions across all flows
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending || flowsQuery.isLoading}
            >
              {runMutation.isPending ? "Running…" : "Run sample"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => runMutation.mutate({ forceStatus: "success" })}
              disabled={runMutation.isPending || flowsQuery.isLoading}
              title="For testing billing: forces all steps to succeed"
            >
              Run paid test
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate("flow-logs")}>
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="divide-y divide-border">
          {runsQuery.isLoading ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">Loading runs…</div>
          ) : recent.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              No runs yet. Click “Run sample” to generate one.
            </div>
          ) : (
            recent.map((run) => (
              <button
                key={run.runId}
                onClick={() => onNavigate("flow-logs")}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-secondary/40 transition-smooth text-left"
              >
                <div className={`h-2 w-2 rounded-full ${statusDot[run.status]}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{run.flow}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    {run.runId} · {run.userId}
                  </div>
                </div>
                <div className="hidden sm:block text-xs text-muted-foreground tabular-nums w-20 text-right">
                  {run.steps.length} steps
                </div>
                <div className="hidden sm:block text-xs text-muted-foreground tabular-nums w-20 text-right">
                  {run.totalDurationMs}ms
                </div>
                <div className="text-xs font-mono tabular-nums w-20 text-right">
                  ${run.totalCostUsd.toFixed(3)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  Icon,
  label,
  value,
  hint,
  tone,
}: {
  Icon: typeof Activity;
  label: string;
  value: string;
  hint: string;
  tone?: "success";
}) {
  return (
    <div className="gradient-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon
          className={`h-4 w-4 ${tone === "success" ? "text-success" : "text-primary"}`}
        />
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
    </div>
  );
}

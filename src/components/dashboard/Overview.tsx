import { useMemo } from "react";
import {
  Workflow,
  FlaskConical,
  GitBranch,
  ScrollText,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateMockLogs, groupLogsByRun } from "@/lib/audit-logs";
import { useAuth } from "@/hooks/useAuth";

const RUNS = groupLogsByRun(generateMockLogs(24));

interface OverviewProps {
  onNavigate: (tab: "builder" | "simulator" | "flow-logs" | "logs") => void;
}

export function Overview({ onNavigate }: OverviewProps) {
  const { user } = useAuth();

  const stats = useMemo(() => {
    const totalSteps = RUNS.reduce((s, r) => s + r.steps.length, 0);
    const success = RUNS.filter((r) => r.status === "success").length;
    const cost = RUNS.reduce((s, r) => s + r.totalCostUsd, 0);
    const avgLatency = RUNS.length
      ? Math.round(RUNS.reduce((s, r) => s + r.totalDurationMs, 0) / RUNS.length)
      : 0;
    return {
      runs: RUNS.length,
      steps: totalSteps,
      successRate: RUNS.length ? Math.round((success / RUNS.length) * 100) : 0,
      cost,
      avgLatency,
    };
  }, []);

  const recent = RUNS.slice(0, 5);
  const displayName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  const quickLinks = [
    {
      key: "builder" as const,
      title: "Flow Builder",
      desc: "Compose validation steps and switch providers anytime.",
      Icon: Workflow,
    },
    {
      key: "simulator" as const,
      title: "Simulator",
      desc: "Test pass / fail / timeout scenarios — zero provider cost.",
      Icon: FlaskConical,
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
  ];

  const statusDot = {
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          <Button variant="outline" size="sm" onClick={() => onNavigate("flow-logs")}>
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="divide-y divide-border">
          {recent.map((run) => (
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
          ))}
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

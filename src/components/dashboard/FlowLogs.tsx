import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  Workflow,
  CircleDot,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generateMockLogs,
  groupLogsByRun,
  AuditLog,
  FlowRun,
  LogStatus,
} from "@/lib/audit-logs";

const ALL_RUNS = groupLogsByRun(generateMockLogs(24));

const statusMeta: Record<
  LogStatus,
  { label: string; className: string; dot: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    label: "Success",
    className: "bg-success/10 text-success border-success/30",
    dot: "bg-success",
    Icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    dot: "bg-destructive",
    Icon: XCircle,
  },
  timeout: {
    label: "Timeout",
    className: "bg-accent/10 text-accent border-accent/30",
    dot: "bg-accent",
    Icon: Clock,
  },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function StepDetail({ step }: { step: AuditLog }) {
  const [open, setOpen] = useState(false);
  const meta = statusMeta[step.status];
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/40 transition-smooth text-left"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 text-muted-foreground transition-smooth ${open ? "rotate-90" : ""}`}
        />
        <span className="text-[10px] font-mono text-muted-foreground w-6">
          #{step.stepIndex + 1}
        </span>
        <div className={`h-2 w-2 rounded-full ${meta.dot}`} />
        <span className="text-sm font-medium">{step.stepLabel}</span>
        <span className="text-xs text-muted-foreground">via {step.provider}</span>
        <span
          className={`ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${meta.className}`}
        >
          <meta.Icon className="h-3 w-3" />
          {meta.label}
        </span>
        <span className="text-xs font-mono text-muted-foreground tabular-nums w-16 text-right">
          {step.durationMs}ms
        </span>
        <span className="text-xs font-mono text-muted-foreground tabular-nums w-16 text-right">
          ${step.costUsd.toFixed(3)}
        </span>
      </button>
      {open && (
        <div className="bg-secondary/30 border-t border-border p-3 grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
              Input
            </div>
            <pre className="text-xs font-mono bg-background border border-border rounded-md p-3 overflow-x-auto">
              {JSON.stringify(step.input, null, 2)}
            </pre>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
              Output
            </div>
            <pre className="text-xs font-mono bg-background border border-border rounded-md p-3 overflow-x-auto">
              {JSON.stringify(step.output, null, 2)}
            </pre>
          </div>
          <div className="md:col-span-2 text-[10px] font-mono text-muted-foreground">
            {step.id} · {new Date(step.timestamp).toISOString()}
          </div>
        </div>
      )}
    </div>
  );
}

function FlowRunCard({ run }: { run: FlowRun }) {
  const [open, setOpen] = useState(false);
  const meta = statusMeta[run.status];
  const failedAt = run.steps.find((s) => s.status !== "success");

  return (
    <div className="border border-border rounded-xl gradient-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-smooth text-left"
      >
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-smooth ${open ? "" : "-rotate-90"}`}
        />
        <Workflow className="h-4 w-4 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{run.flow}</span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${meta.className}`}
            >
              <meta.Icon className="h-3 w-3" />
              {meta.label}
            </span>
            <span className="text-xs text-muted-foreground">{run.userId}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
            {run.runId} · {formatTime(run.startedAt)}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
          <div className="text-right">
            <div className="font-mono tabular-nums text-foreground">
              {run.steps.length} steps
            </div>
            <div className="text-[10px]">
              {run.steps.filter((s) => s.status === "success").length} ok
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono tabular-nums text-foreground">
              {run.totalDurationMs}ms
            </div>
            <div className="text-[10px]">latency</div>
          </div>
          <div className="text-right">
            <div className="font-mono tabular-nums text-foreground">
              ${run.totalCostUsd.toFixed(3)}
            </div>
            <div className="text-[10px]">cost</div>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-3 bg-background/40">
          {/* Step path visualizer */}
          <div className="flex items-center gap-1 flex-wrap text-xs">
            {run.steps.map((s, i) => {
              const m = statusMeta[s.status];
              return (
                <div key={s.id} className="flex items-center gap-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${m.className}`}
                  >
                    <CircleDot className="h-2.5 w-2.5" />
                    {s.stepLabel}
                  </span>
                  {i < run.steps.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              );
            })}
            {failedAt && failedAt.stepIndex < run.steps[run.steps.length - 1].stepIndex + 1 && run.status !== "success" && (
              <span className="text-[10px] text-muted-foreground italic ml-2">
                halted at step #{failedAt.stepIndex + 1}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {run.steps.map((step) => (
              <StepDetail key={step.id} step={step} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FlowLogs() {
  const [search, setSearch] = useState("");
  const [flowFilter, setFlowFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const flows = useMemo(
    () => Array.from(new Set(ALL_RUNS.map((r) => r.flow))),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_RUNS.filter((r) => {
      if (flowFilter !== "all" && r.flow !== flowFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.runId.toLowerCase().includes(q) ||
        r.userId.toLowerCase().includes(q) ||
        r.flow.toLowerCase().includes(q) ||
        r.steps.some(
          (s) =>
            s.stepLabel.toLowerCase().includes(q) ||
            s.provider.toLowerCase().includes(q),
        )
      );
    });
  }, [search, flowFilter, statusFilter]);

  const totals = useMemo(() => {
    const totalSteps = filtered.reduce((s, r) => s + r.steps.length, 0);
    const success = filtered.filter((r) => r.status === "success").length;
    const cost = filtered.reduce((s, r) => s + r.totalCostUsd, 0);
    const avgLatency = filtered.length
      ? Math.round(
          filtered.reduce((s, r) => s + r.totalDurationMs, 0) / filtered.length,
        )
      : 0;
    return { totalSteps, success, cost, avgLatency };
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="gradient-card border border-primary/30 rounded-xl p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center shrink-0 shadow-glow">
          <GitBranch className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Flow logs</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every flow execution grouped end-to-end. Drill into any step to
            inspect input / output params, latency, and cost.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gradient-card border border-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Flow runs
          </div>
          <div className="text-2xl font-bold mt-1">{filtered.length}</div>
        </div>
        <div className="gradient-card border border-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Success rate
          </div>
          <div className="text-2xl font-bold mt-1">
            {filtered.length
              ? Math.round((totals.success / filtered.length) * 100)
              : 0}
            %
          </div>
        </div>
        <div className="gradient-card border border-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Avg flow latency
          </div>
          <div className="text-2xl font-bold mt-1">{totals.avgLatency}ms</div>
        </div>
        <div className="gradient-card border border-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Total cost
          </div>
          <div className="text-2xl font-bold mt-1">
            ${totals.cost.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="gradient-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search run id, user, step, provider…"
            className="pl-9"
          />
        </div>
        <Select value={flowFilter} onValueChange={setFlowFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Flow" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All flows</SelectItem>
            {flows.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="timeout">Timeout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Runs */}
      {filtered.length === 0 ? (
        <div className="gradient-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No flow runs match your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((run) => (
            <FlowRunCard key={run.runId} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}

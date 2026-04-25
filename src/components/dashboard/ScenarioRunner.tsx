import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Square,
  RotateCcw,
  Rocket,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Coins,
  Zap,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepKind, getStep } from "@/lib/validation-steps";
import { LogStatus, PaymentStatus } from "@/lib/audit-logs";
import { api } from "@/lib/api";
import { arcTxUrl, normalizeEvmTxHash } from "@/lib/arc";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ScenarioPreset = "all_success" | "fail_step" | "timeout_step";

type RunStepStatus = "queued" | "calling" | "settling" | LogStatus;

type FlowStepConfig = { kind: StepKind; providerId: string };

interface RunStep {
  index: number;
  kind: StepKind;
  label: string;
  provider: string;
  status: RunStepStatus;
  paymentStatus?: PaymentStatus;
  durationMs?: number;
  costUsdc?: number;
  requestedAmountUsdc?: number | null;
  chargedAmountUsdc?: number | null;
  arcTxHash?: string | null;
  gatewayTransferId?: string | null;
  gatewayTransferStatus?: string | null;
  gatewayNetwork?: string | null;
  x402Asset?: string | null;
  payerWallet?: string | null;
  payeeWallet?: string | null;
  nanopaymentId?: string | null;
  settlementNs?: number | null;
  rail?: "circle_arc" | "x402";
}

const stepBadge: Record<
  RunStepStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  queued: {
    label: "Queued",
    className: "bg-muted text-muted-foreground border-border",
    Icon: Clock,
  },
  calling: {
    label: "Calling…",
    className: "bg-primary/10 text-primary border-primary/30",
    Icon: Loader2,
  },
  settling: {
    label: "Settling",
    className: "bg-accent/10 text-accent border-accent/30",
    Icon: Zap,
  },
  success: {
    label: "Success",
    className: "bg-success/10 text-success border-success/30",
    Icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    Icon: XCircle,
  },
  timeout: {
    label: "Timeout",
    className: "bg-accent/10 text-accent border-accent/30",
    Icon: Clock,
  },
};

const paymentBadge: Record<PaymentStatus, string> = {
  paid: "bg-success/10 text-success border-success/30",
  pending: "bg-accent/10 text-accent border-accent/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  skipped: "bg-muted text-muted-foreground border-border",
};

export function ScenarioRunner() {
  const qc = useQueryClient();
  const serverlessSameOrigin = import.meta.env.PROD && !import.meta.env.VITE_API_URL;
  const simulateDuringCreate = import.meta.env.PROD;
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");
  const [scenarioPreset, setScenarioPreset] =
    useState<ScenarioPreset>("all_success");
  const [scenarioStepIndex, setScenarioStepIndex] = useState<string>("0");
  const [running, setRunning] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const lastToastRunIdRef = useRef<string | null>(null);
  const simulateTimerRef = useRef<number | null>(null);

  const stopSimulation = () => {
    if (simulateTimerRef.current !== null) {
      window.clearTimeout(simulateTimerRef.current);
      simulateTimerRef.current = null;
    }
  };

  const flowsQuery = useQuery({
    queryKey: ["flows"],
    queryFn: async () => (await api.flows.list()).flows,
  });

  const selectedFlow = useMemo(() => {
    const flows = flowsQuery.data || [];
    if (selectedFlowId) return flows.find((f) => f.id === selectedFlowId) || null;
    return flows[0] || null;
  }, [flowsQuery.data, selectedFlowId]);

  const flowSteps = useMemo<FlowStepConfig[]>(() => {
    const flow = selectedFlow;
    if (!flow?.steps?.length) return [];
    return flow.steps.map((s) => ({ kind: s.type as StepKind, providerId: s.provider }));
  }, [selectedFlow]);

  const runQuery = useQuery({
    queryKey: ["run", runId],
    queryFn: async () => {
      if (!runId) return null;
      return (await api.runs.get(runId)).run;
    },
    enabled: Boolean(runId) && pollingEnabled,
    refetchInterval: (query) => {
      const run = query.state.data as { status?: string } | null | undefined;
      const shouldPoll =
        Boolean(runId) &&
        pollingEnabled &&
        (running || run?.status === "running");
      return shouldPoll ? 750 : false;
    },
  });

  const shouldPoll = Boolean(runId) && pollingEnabled;

  const logsQuery = useQuery({
    queryKey: ["logs", "scenario", runId],
    queryFn: async () => {
      if (!runId) return [];
      return (
        await api.logs.list({
          runId,
          limit: 400,
          hydrate: true,
          hydrateLimit: 25,
          hydrateTimeoutMs: 1500,
        })
      ).logs;
    },
    enabled: Boolean(runId) && pollingEnabled,
    refetchInterval: () => (shouldPoll ? 750 : false),
  });

  const startRunMutation = useMutation({
    mutationFn: async (input: {
      flowId: string;
      stepOutcomes: Array<"success" | "failed" | "timeout">;
    }) => {
      return (
        await api.runs.create({
          flowId: input.flowId,
          user: { phone: "+14155550182", email: "alex@startup.io" },
          stepOutcomes: input.stepOutcomes,
          continueOnFailure: false,
          async: !serverlessSameOrigin,
        })
      ).run;
    },
  });

  const totals = useMemo(() => {
    const completed = steps.filter(
      (s) => s.status === "success" || s.status === "failed" || s.status === "timeout",
    );
    const usdc = steps.reduce((sum, s) => sum + (s.costUsdc ?? 0), 0);
    const settledNs = completed.map((s) => s.settlementNs ?? 0).filter((n) => n > 0);
    const avgNs = settledNs.length
      ? Math.round(settledNs.reduce((a, b) => a + b, 0) / settledNs.length)
      : 0;
    const paid = steps.filter((s) => s.paymentStatus === "paid").length;
    return { usdc, avgNs, paid, total: steps.length, completed: completed.length };
  }, [steps]);

  const initSteps = (cfg: FlowStepConfig[]): RunStep[] =>
    cfg.map((s, i) => {
      const def = getStep(s.kind);
      const provider =
        def.providers.find((p) => p.id === s.providerId)?.name || s.providerId;
      return {
        index: i,
        kind: s.kind,
        label: def.label,
        provider,
        status: "queued" as RunStepStatus,
      };
    });

  const startSimulation = (cfg: FlowStepConfig[]) => {
    stopSimulation();
    if (typeof window === "undefined") return;
    const base = initSteps(cfg);
    let index = 0;
    let phase: "calling" | "settling" = "calling";

    const tick = () => {
      if (cancelRef.current) return;
      const next = base.map((s) => {
        if (s.index < index) return { ...s, status: "settling" as const };
        if (s.index === index) return { ...s, status: phase as RunStepStatus };
        return s;
      });
      setSteps(next);

      const nextPhase = phase === "calling" ? "settling" : "calling";
      if (phase === "settling") index = (index + 1) % Math.max(1, base.length);
      phase = nextPhase;
      simulateTimerRef.current = window.setTimeout(tick, phase === "calling" ? 650 : 350);
    };

    tick();
  };

  const reset = () => {
    cancelRef.current = true;
    stopSimulation();
    setSteps([]);
    setRunId(null);
    setRunning(false);
    setPollingEnabled(false);
    setError(null);
  };

  const stop = () => {
    cancelRef.current = true;
    setRunning(false);
    setPollingEnabled(false);
    toast.info("Stopped polling (run continues on server)");
  };

  const run = async () => {
    cancelRef.current = false;
    setError(null);

    if (!selectedFlow) {
      setError("No flows found. Create and Deploy a flow in Flow Builder first.");
      return;
    }
    if (flowSteps.length === 0) {
      setError("Selected flow has no steps. Add steps in Flow Builder and Deploy.");
      return;
    }

    setRunning(true);
    setPollingEnabled(!serverlessSameOrigin);
    setSteps(initSteps(flowSteps));
    setRunId(null);

    try {
      // On serverless (and sometimes cross-origin backends), starting a run can block until completion.
      // Simulate step-by-step progress while we await the server response.
      if (simulateDuringCreate) startSimulation(flowSteps);
      const stepCount = flowSteps.length;
      const stepOutcomes = Array.from({ length: stepCount }, () => "success" as const);
      if (scenarioPreset === "fail_step" || scenarioPreset === "timeout_step") {
        const idx = Math.max(0, Math.min(stepCount - 1, Number(scenarioStepIndex || 0)));
        stepOutcomes[idx] = scenarioPreset === "fail_step" ? "failed" : "timeout";
      }
      const started = await startRunMutation.mutateAsync({
        flowId: selectedFlow.id,
        stepOutcomes,
      });
      stopSimulation();
      setRunId(started.runId);
      toast.success("Run started", { description: started.runId });

      if (serverlessSameOrigin) {
        setPollingEnabled(false);
        setRunning(false);
        const logs = Array.isArray(started.steps) ? started.steps : [];
        const base = initSteps(flowSteps);
        const sorted = [...logs].sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0));
        const mapped = base.map((s) => {
          const log = sorted.find((l) => l.stepIndex === s.index);
          if (!log) return s;
          return {
            ...s,
            status: log.status,
            paymentStatus: log.payment?.status,
            durationMs: log.durationMs,
            costUsdc: log.costUsdc,
            requestedAmountUsdc: log.payment?.requestedAmountUsdc ?? null,
            chargedAmountUsdc: log.payment?.amountUsdc ?? null,
            arcTxHash: log.arcTxHash,
            gatewayTransferId: log.payment?.gatewayTransferId || null,
            gatewayTransferStatus: log.payment?.gatewayTransferStatus || null,
            gatewayNetwork: log.payment?.gatewayNetwork || null,
            x402Asset: log.payment?.x402Asset || null,
            payerWallet: log.payment?.payerWallet || null,
            payeeWallet: log.payment?.payeeWallet || null,
            nanopaymentId: log.payment?.nanopaymentId || null,
            settlementNs: log.payment?.settlementNs ?? null,
            rail: log.payment?.rail,
          } satisfies RunStep;
        });
        setSteps(mapped);
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["runs"] }),
        qc.invalidateQueries({ queryKey: ["logs"] }),
        qc.invalidateQueries({ queryKey: ["logs", "analytics"] }),
      ]);
    } catch (e) {
      stopSimulation();
      setRunning(false);
      setPollingEnabled(false);
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
      toast.error("Failed to start scenario", { description: message });
    }
  };

  // Drive UI steps from server run
  useEffect(() => {
    const serverRun = runQuery.data;
    if (!serverRun && !logsQuery.data) return;

    const base = initSteps(flowSteps);
    const logsSource =
      serverRun?.steps && serverRun.steps.length > 0
        ? serverRun.steps
        : logsQuery.data || [];
    const logs = [...logsSource].sort(
      (a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0),
    );

    const nextIndex = logs.length;
    const expectedSteps = base.length;

    const mapped = base.map((s) => {
      const log = logs.find((l) => l.stepIndex === s.index);
      if (log) {
        return {
          ...s,
          status: log.status,
          paymentStatus: log.payment?.status,
          durationMs: log.durationMs,
          costUsdc: log.costUsdc,
          requestedAmountUsdc: log.payment?.requestedAmountUsdc ?? null,
          chargedAmountUsdc: log.payment?.amountUsdc ?? null,
          arcTxHash: log.arcTxHash,
          gatewayTransferId: log.payment?.gatewayTransferId || null,
          gatewayTransferStatus: log.payment?.gatewayTransferStatus || null,
          gatewayNetwork: log.payment?.gatewayNetwork || null,
          x402Asset: log.payment?.x402Asset || null,
          payerWallet: log.payment?.payerWallet || null,
          payeeWallet: log.payment?.payeeWallet || null,
          nanopaymentId: log.payment?.nanopaymentId || null,
          settlementNs: log.payment?.settlementNs ?? null,
          rail: log.payment?.rail,
        } satisfies RunStep;
      }
      const shouldShowLiveStep =
        (serverRun?.status === "running" || (running && pollingEnabled)) &&
        s.index === Math.min(nextIndex, expectedSteps - 1);
      if (shouldShowLiveStep) {
        return { ...s, status: "calling" as const };
      }
      return s;
    });

    setSteps(mapped);

    const fallbackDone =
      !serverRun &&
      logs.length > 0 &&
      (logs.length >= expectedSteps || logs[logs.length - 1]?.status !== "success");

    if ((serverRun && serverRun.status !== "running") || fallbackDone) {
      setRunning(false);
      setPollingEnabled(false);
      const toastKey = serverRun?.runId || runId;
      if (toastKey && lastToastRunIdRef.current !== toastKey) {
        lastToastRunIdRef.current = toastKey;
        const fallbackStatus = logs[logs.length - 1]?.status;
        const isSuccess =
          serverRun?.status === "success" ||
          (fallbackDone && logs.length >= expectedSteps && fallbackStatus === "success");
        toast.success(`Run complete · ${serverRun?.flow || "flow"}`, {
          description: isSuccess
            ? "All steps succeeded."
            : `Run ended: ${serverRun?.status || fallbackStatus || "unknown"}`,
        });
      }
    }
  }, [
    runQuery.data,
    logsQuery.data,
    selectedFlow?.id,
    flowSteps,
    running,
    pollingEnabled,
    runId,
  ]);

  useEffect(() => {
    if (!runQuery.isError) return;
    const message =
      runQuery.error instanceof Error ? runQuery.error.message : "Failed to load run";
    setError(message);
  }, [runQuery.isError, runQuery.error]);

  return (
    <div className="space-y-4">
      <div className="gradient-card border border-primary/30 rounded-xl p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center shrink-0 shadow-glow">
          <Rocket className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Test your flow end-to-end</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Execute a complete validation flow and watch each API call complete with real Circle Gateway payments in real-time.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-2 py-1 rounded-md">
          Realtime
        </span>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-4">
        <div className="gradient-card border border-border rounded-xl p-5 space-y-4 h-fit">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Run Config
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Flow</label>
            <Select
              value={selectedFlow?.id || ""}
              onValueChange={(v) => {
                setSelectedFlowId(v);
                setSteps([]);
                setRunId(null);
              }}
              disabled={running}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a flow" />
              </SelectTrigger>
              <SelectContent>
                {(flowsQuery.data || []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Scenario</label>
            <Select
              value={scenarioPreset}
              onValueChange={(v) => setScenarioPreset(v as ScenarioPreset)}
              disabled={running}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_success">All success (paid demo)</SelectItem>
                <SelectItem value="fail_step">Fail at step…</SelectItem>
                <SelectItem value="timeout_step">Timeout at step…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(scenarioPreset === "fail_step" || scenarioPreset === "timeout_step") && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Fail step</label>
              <Select
                value={scenarioStepIndex}
                onValueChange={setScenarioStepIndex}
                disabled={running}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {flowSteps.map((_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      Step {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Steps in flow
            </label>
            <ol className="space-y-1.5">
              {flowSteps.map((s, i) => {
                const def = getStep(s.kind);
                const Icon = def.icon;
                const provider =
                  def.providers.find((p) => p.id === s.providerId)?.name || s.providerId;
                return (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs bg-background/40 border border-border rounded-md px-2.5 py-1.5"
                  >
                    <span className="text-[10px] font-mono text-muted-foreground w-4">
                      {i + 1}
                    </span>
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{def.label}</span>
                    <span className="ml-auto text-muted-foreground">{provider}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="flex gap-2 pt-1">
            {!running ? (
              <Button
                variant="hero"
                onClick={run}
                className="flex-1"
                disabled={startRunMutation.isPending}
              >
                <Play className="h-3.5 w-3.5" />
                {startRunMutation.isPending ? "Starting…" : "Run scenario"}
              </Button>
            ) : (
              <Button variant="outline" onClick={stop} className="flex-1">
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            )}
            <Button
              variant="outline"
              onClick={reset}
              disabled={running || steps.length === 0}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
              {error}
            </div>
          )}
        </div>

        <div className="gradient-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold">Live execution</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {runId && selectedFlow ? `${runId} · ${selectedFlow.name}` : "No run yet"}
              </p>
            </div>
            {steps.length > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-success">
                  <Coins className="h-3.5 w-3.5" />
                  <span className="font-mono tabular-nums">
                    {totals.usdc.toFixed(4)} USDC
                  </span>
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {totals.paid}/{totals.total} paid
                </span>
                {totals.avgNs > 0 && (
                  <span className="text-muted-foreground tabular-nums">
                    {totals.avgNs}ns avg
                  </span>
                )}
              </div>
            )}
          </div>

          {steps.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-12 w-12 rounded-full border-2 border-dashed border-border flex items-center justify-center mx-auto mb-3">
                <Rocket className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Choose a scenario and run it</p>
              <p className="text-xs text-muted-foreground mt-1">
                Each step charges your Circle Gateway balance in real-time as it executes.
              </p>
            </div>
          ) : (
            <div>
              <div className="px-4 py-3 border-b border-border bg-background/30">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Flow path
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {steps.map((s, idx) => {
                    const isActive = s.status === "calling" || s.status === "settling";
                    const tone =
                      s.status === "success"
                        ? "bg-success/10 text-success border-success/30"
                        : s.status === "failed"
                          ? "bg-destructive/10 text-destructive border-destructive/30"
                          : s.status === "timeout"
                            ? "bg-accent/10 text-accent border-accent/30"
                            : isActive
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-muted text-muted-foreground border-border";
                    return (
                      <div key={s.index} className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] ${tone} ${
                            isActive ? "animate-pulse" : ""
                          }`}
                          title={`${s.label} · ${s.status}`}
                        >
                          <span className="font-mono text-[10px] opacity-80">#{idx + 1}</span>
                          <span className="font-medium">{s.label}</span>
                        </span>
                        {idx < steps.length - 1 && (
                          <span className="text-muted-foreground/60 text-xs">→</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {shouldPoll && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Running… step updates stream live.
                  </div>
                )}
              </div>

              <div className="divide-y divide-border max-h-[640px] overflow-y-auto">
              {steps.map((s) => {
                const meta = stepBadge[s.status];
                const StatusIcon = meta.Icon;
                const isLive = s.status === "calling" || s.status === "settling";
                const def = getStep(s.kind);
                const StepIcon = def.icon;

                const txHash = normalizeEvmTxHash(s.arcTxHash || null);
                const txUrl = arcTxUrl(txHash);
                const transferId = s.gatewayTransferId || null;
                const apiBaseUrl =
                  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8787" : "");
                const transferUrl = transferId
                  ? `${apiBaseUrl}/api/x402/transfers/${encodeURIComponent(transferId)}`
                  : null;

                return (
                  <div key={s.index} className="p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <StepIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            #{s.index + 1}
                          </span>
                          {s.label}
                          <span className="text-xs text-muted-foreground font-normal">
                            via {s.provider}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border ${meta.className}`}
                      >
                        <StatusIcon className={`h-3 w-3 ${isLive ? "animate-spin" : ""}`} />
                        {meta.label}
                      </span>
                      {s.paymentStatus && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border ${paymentBadge[s.paymentStatus]}`}
                        >
                          <Coins className="h-3 w-3" />
                          {s.paymentStatus}
                        </span>
                      )}
                    </div>

                    {s.paymentStatus && (
                      <div className="grid sm:grid-cols-2 gap-2 bg-background/40 border border-border rounded-md p-3 text-xs">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Amount (USDC)
                          </div>
                          <div className="font-mono tabular-nums">
                            {typeof s.chargedAmountUsdc === "number"
                              ? s.chargedAmountUsdc.toFixed(6)
                              : (s.costUsdc ?? 0).toFixed(6)}{" "}
                            USDC
                          </div>
                          {typeof s.requestedAmountUsdc === "number" &&
                            typeof s.chargedAmountUsdc === "number" &&
                            s.requestedAmountUsdc !== s.chargedAmountUsdc && (
                              <div className="text-[11px] text-muted-foreground font-mono">
                                requested {s.requestedAmountUsdc.toFixed(6)} USDC
                              </div>
                            )}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Rail · Finality
                          </div>
                          <div className="font-mono">
                            {s.rail === "x402"
                              ? "Circle Gateway x402"
                              : s.rail === "circle_arc"
                                ? "Circle Arc"
                                : "—"}{" "}
                            · {s.settlementNs ?? "—"}ns
                          </div>
                          {s.gatewayNetwork && (
                            <div className="text-[11px] text-muted-foreground font-mono truncate">
                              {s.gatewayNetwork}
                            </div>
                          )}
                        </div>

                        <div className="sm:col-span-2 min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Arc tx
                          </div>
                          {txUrl ? (
                            <a
                              href={txUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-smooth font-mono truncate"
                            >
                              {txHash}
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : (
                            <div className="font-mono text-muted-foreground truncate">
                              Batched (no on-chain hash yet)
                            </div>
                          )}
                        </div>

                        {transferId && (
                          <div className="sm:col-span-2 min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Transfer ID
                            </div>
                            <div className="inline-flex items-center gap-2 min-w-0">
                              <div className="font-mono truncate">{transferId}</div>
                              {s.gatewayTransferStatus && (
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded-md">
                                  {s.gatewayTransferStatus}
                                </span>
                              )}
                              {transferUrl && (
                                <a
                                  href={transferUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border px-1.5 py-0.5 rounded-md transition-smooth"
                                  title="Open Gateway transfer JSON"
                                >
                                  JSON <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="sm:col-span-2 min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Nanopayment id
                          </div>
                          <div className="font-mono truncate">
                            {s.nanopaymentId || "—"}
                          </div>
                        </div>

                        {(s.payerWallet || s.payeeWallet) && (
                          <div className="sm:col-span-2 min-w-0 grid sm:grid-cols-2 gap-2">
                            <div className="min-w-0">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Payer
                              </div>
                              <div className="font-mono truncate">{s.payerWallet || "—"}</div>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Payee
                              </div>
                              <div className="font-mono truncate">{s.payeeWallet || "—"}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

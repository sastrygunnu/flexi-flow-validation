import { useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STEP_LIBRARY, StepKind, getStep } from "@/lib/validation-steps";
import { LogStatus, PaymentStatus } from "@/lib/audit-logs";
import { toast } from "sonner";

type ScenarioId =
  | "us_onboarding_happy"
  | "eu_onboarding_happy"
  | "high_risk_kyc"
  | "fraud_block"
  | "identity_timeout";

interface ScenarioDef {
  id: ScenarioId;
  name: string;
  flow: string;
  description: string;
  steps: StepKind[];
  failAt?: number;
  failMode?: "failed" | "timeout";
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: "us_onboarding_happy",
    name: "US Onboarding — Happy Path",
    flow: "us_onboarding",
    description: "Email → Phone → Identity → Address → Fraud, all pass. USDC settles per call on Arc.",
    steps: ["email", "phone", "identity", "address", "fraud"],
  },
  {
    id: "eu_onboarding_happy",
    name: "EU Onboarding — Happy Path",
    flow: "eu_onboarding",
    description: "GDPR-friendly EU flow with 4 steps, all green.",
    steps: ["email", "phone", "identity", "fraud"],
  },
  {
    id: "high_risk_kyc",
    name: "High-Risk KYC — Full Stack",
    flow: "high_risk_kyc",
    description: "Maximum verification: 6 steps incl. bank ownership. Higher USDC spend.",
    steps: ["email", "phone", "identity", "address", "bank", "fraud"],
  },
  {
    id: "fraud_block",
    name: "Fraud Score Blocks Signup",
    flow: "us_onboarding",
    description: "Flow halts at fraud step — earlier nanopayments still settled, fraud call refunded.",
    steps: ["email", "phone", "identity", "address", "fraud"],
    failAt: 4,
    failMode: "failed",
  },
  {
    id: "identity_timeout",
    name: "Identity Provider Timeout",
    flow: "us_onboarding",
    description: "Persona times out at step 3. Nanopayment stays pending until provider confirms.",
    steps: ["email", "phone", "identity", "address", "fraud"],
    failAt: 2,
    failMode: "timeout",
  },
];

type RunStepStatus = "queued" | "calling" | "settling" | LogStatus;

interface RunStep {
  index: number;
  kind: StepKind;
  label: string;
  provider: string;
  status: RunStepStatus;
  paymentStatus?: PaymentStatus;
  durationMs?: number;
  costUsdc?: number;
  arcTxHash?: string;
  nanopaymentId?: string;
  settlementNs?: number;
  rail?: "circle_arc" | "x402";
}

function randomHex(len: number) {
  let s = "0x";
  const chars = "0123456789abcdef";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

const stepBadge: Record<RunStepStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  queued: { label: "Queued", className: "bg-muted text-muted-foreground border-border", Icon: Clock },
  calling: { label: "Calling…", className: "bg-primary/10 text-primary border-primary/30", Icon: Loader2 },
  settling: { label: "Settling on Arc", className: "bg-accent/10 text-accent border-accent/30", Icon: Zap },
  success: { label: "Success", className: "bg-success/10 text-success border-success/30", Icon: CheckCircle2 },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/30", Icon: XCircle },
  timeout: { label: "Timeout", className: "bg-accent/10 text-accent border-accent/30", Icon: Clock },
};

const paymentBadge: Record<PaymentStatus, string> = {
  paid: "bg-success/10 text-success border-success/30",
  pending: "bg-accent/10 text-accent border-accent/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  skipped: "bg-muted text-muted-foreground border-border",
};

export function ScenarioRunner() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("us_onboarding_happy");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;

  const totals = useMemo(() => {
    const completed = steps.filter((s) => s.status === "success" || s.status === "failed" || s.status === "timeout");
    const usdc = steps.reduce((sum, s) => sum + (s.costUsdc ?? 0), 0);
    const settledNs = completed
      .map((s) => s.settlementNs ?? 0)
      .filter((n) => n > 0);
    const avgNs = settledNs.length
      ? Math.round(settledNs.reduce((a, b) => a + b, 0) / settledNs.length)
      : 0;
    const paid = steps.filter((s) => s.paymentStatus === "paid").length;
    return { usdc, avgNs, paid, total: steps.length, completed: completed.length };
  }, [steps]);

  const initSteps = (scn: ScenarioDef): RunStep[] =>
    scn.steps.map((kind, i) => {
      const def = getStep(kind);
      const provider = def.providers[0];
      return {
        index: i,
        kind,
        label: def.label,
        provider: provider.name,
        status: "queued" as RunStepStatus,
      };
    });

  const reset = () => {
    cancelRef.current = true;
    setSteps([]);
    setRunId(null);
    setRunning(false);
  };

  const stop = () => {
    cancelRef.current = true;
    toast.info("Scenario stopped");
  };

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const run = async () => {
    cancelRef.current = false;
    const initial = initSteps(scenario);
    const newRunId = `run_${Date.now().toString(36)}`;
    setSteps(initial);
    setRunId(newRunId);
    setRunning(true);

    for (let i = 0; i < initial.length; i++) {
      if (cancelRef.current) break;

      // 1. Mark calling
      setSteps((prev) =>
        prev.map((s) => (s.index === i ? { ...s, status: "calling" } : s)),
      );
      const apiLatency = 250 + Math.floor(Math.random() * 700);
      await sleep(Math.min(apiLatency, 1100));
      if (cancelRef.current) break;

      // Determine outcome
      const isFail = scenario.failAt === i;
      const status: LogStatus = isFail
        ? scenario.failMode ?? "failed"
        : "success";

      // 2. Mark settling on Arc
      setSteps((prev) =>
        prev.map((s) => (s.index === i ? { ...s, status: "settling" } : s)),
      );
      await sleep(450);
      if (cancelRef.current) break;

      // 3. Build payment receipt
      const def = getStep(initial[i].kind);
      const provider = def.providers[0];
      const baseCost = parseFloat(provider.cost.replace("$", ""));
      const paymentStatus: PaymentStatus =
        status === "success" ? "paid" : status === "timeout" ? "pending" : "failed";
      const settlementNs = 200 + Math.floor(Math.random() * 700);

      setSteps((prev) =>
        prev.map((s) =>
          s.index === i
            ? {
                ...s,
                status,
                paymentStatus,
                durationMs: apiLatency,
                costUsdc: paymentStatus === "paid" ? baseCost : 0,
                arcTxHash: randomHex(64),
                nanopaymentId: `np_${randomHex(16).slice(2)}`,
                settlementNs,
                rail: Math.random() < 0.85 ? "circle_arc" : "x402",
              }
            : s,
        ),
      );

      // Halt on failure / timeout
      if (status !== "success") break;
    }

    setRunning(false);
    if (!cancelRef.current) {
      toast.success(`Scenario complete · ${scenario.name}`, {
        description: "All nanopayments settled on Arc.",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="gradient-card border border-primary/30 rounded-xl p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center shrink-0 shadow-glow">
          <Rocket className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Run a scenario</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trigger a full end-to-end mock flow and watch each API call settle on Circle Arc in
            real time. Every step emits a nanopayment receipt in USDC.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-2 py-1 rounded-md">
          Mock · Arc testnet
        </span>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-4">
        {/* Config */}
        <div className="gradient-card border border-border rounded-xl p-5 space-y-4 h-fit">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scenario
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Preset</label>
            <Select
              value={scenarioId}
              onValueChange={(v) => {
                setScenarioId(v as ScenarioId);
                setSteps([]);
                setRunId(null);
              }}
              disabled={running}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCENARIOS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">{scenario.description}</p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Steps in flow
            </label>
            <ol className="space-y-1.5">
              {scenario.steps.map((kind, i) => {
                const def = getStep(kind);
                const Icon = def.icon;
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
                    <span className="ml-auto text-muted-foreground">
                      {def.providers[0].name}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="flex gap-2 pt-1">
            {!running ? (
              <Button variant="hero" onClick={run} className="flex-1">
                <Play className="h-3.5 w-3.5" />
                Run scenario
              </Button>
            ) : (
              <Button variant="outline" onClick={stop} className="flex-1">
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            )}
            <Button variant="outline" onClick={reset} disabled={running || steps.length === 0}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Live execution */}
        <div className="gradient-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold">Live execution</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {runId ? `${runId} · ${scenario.flow}` : "No run yet"}
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
              <p className="text-sm font-medium">Pick a scenario and hit run</p>
              <p className="text-xs text-muted-foreground mt-1">
                Each step will call the provider and settle a nanopayment on Arc.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[640px] overflow-y-auto">
              {steps.map((s) => {
                const meta = stepBadge[s.status];
                const StatusIcon = meta.Icon;
                const isLive = s.status === "calling" || s.status === "settling";
                const def = getStep(s.kind);
                const StepIcon = def.icon;
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
                            Amount
                          </div>
                          <div className="font-mono tabular-nums">
                            {(s.costUsdc ?? 0).toFixed(4)} USDC
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Rail · Latency
                          </div>
                          <div className="font-mono">
                            {s.rail} · {s.settlementNs}ns
                          </div>
                        </div>
                        <div className="sm:col-span-2 min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Arc tx
                          </div>
                          <div className="font-mono truncate text-primary">
                            {s.arcTxHash}
                          </div>
                        </div>
                        <div className="sm:col-span-2 min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Nanopayment id
                          </div>
                          <div className="font-mono truncate">{s.nanopaymentId}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

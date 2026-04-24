import { useState } from "react";
import { Play, RotateCcw, FlaskConical, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STEP_LIBRARY, StepKind, getStep } from "@/lib/validation-steps";
import { LogStatus } from "@/lib/audit-logs";
import { toast } from "sonner";

type Scenario = "pass" | "fail" | "timeout" | "random";

interface SimRun {
  id: string;
  timestamp: string;
  stepKind: StepKind;
  stepLabel: string;
  provider: string;
  scenario: Scenario;
  status: LogStatus;
  durationMs: number;
  input: unknown;
  output: unknown;
}

const SAMPLE_PAYLOADS: Record<StepKind, Record<string, unknown>> = {
  phone: { phone: "+14155550182", channel: "sms", locale: "en-US" },
  email: { email: "alex@startup.io" },
  identity: { documentType: "passport", country: "US", selfie: "base64:…" },
  address: { line1: "1 Market St", city: "San Francisco", postal: "94105", country: "US" },
  bank: { accountId: "acc_***82", routing: "021000021" },
  fraud: { ip: "73.92.14.221", deviceId: "d_92ab", email: "j.reyes@example.com" },
};

const PASS_OUTPUTS: Record<StepKind, Record<string, unknown>> = {
  phone: { verified: true, carrier: "Verizon", lineType: "mobile", attempts: 1 },
  email: { deliverable: true, disposable: false, role: false },
  identity: { match: 0.97, liveness: "passed", name: "Jordan Reyes", dob: "1991-04-12" },
  address: { normalized: "1 Market Street, San Francisco, CA 94105", confidence: 0.99 },
  bank: { ownership: "verified", balance: 4218.55, currency: "USD" },
  fraud: { riskScore: 12, decision: "allow", signals: ["new_device"] },
};

const FAIL_OUTPUTS: Record<StepKind, Record<string, unknown>> = {
  phone: { verified: false, error: "INVALID_OTP", attempts: 3 },
  email: { deliverable: false, error: "MAILBOX_NOT_FOUND" },
  identity: { match: 0.32, liveness: "failed", error: "FACE_MISMATCH" },
  address: { error: "ADDRESS_NOT_FOUND", confidence: 0.1 },
  bank: { ownership: "rejected", error: "ACCOUNT_NOT_FOUND" },
  fraud: { riskScore: 92, decision: "block", signals: ["proxy", "velocity"] },
};

const statusMeta: Record<LogStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
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

function pickStatus(scenario: Scenario): LogStatus {
  if (scenario === "pass") return "success";
  if (scenario === "fail") return "failed";
  if (scenario === "timeout") return "timeout";
  return (["success", "failed", "timeout"] as LogStatus[])[Math.floor(Math.random() * 3)];
}

export function Simulator() {
  const [stepKind, setStepKind] = useState<StepKind>("identity");
  const [providerId, setProviderId] = useState<string>(getStep("identity").providers[0].id);
  const [scenario, setScenario] = useState<Scenario>("pass");
  const [latency, setLatency] = useState<string>("auto");
  const [payload, setPayload] = useState<string>(
    JSON.stringify(SAMPLE_PAYLOADS["identity"], null, 2),
  );
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<SimRun[]>([]);

  const stepDef = getStep(stepKind);

  const handleStepChange = (kind: StepKind) => {
    setStepKind(kind);
    const def = getStep(kind);
    setProviderId(def.providers[0].id);
    setPayload(JSON.stringify(SAMPLE_PAYLOADS[kind], null, 2));
  };

  const loadSample = () => {
    setPayload(JSON.stringify(SAMPLE_PAYLOADS[stepKind], null, 2));
    toast.success("Sample payload loaded");
  };

  const runSim = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      toast.error("Invalid JSON in payload");
      return;
    }

    setRunning(true);
    const status = pickStatus(scenario);
    const provider = stepDef.providers.find((p) => p.id === providerId)!;

    const durationMs =
      latency === "auto"
        ? status === "timeout"
          ? 30000
          : Math.round(150 + Math.random() * 1800)
        : parseInt(latency, 10);

    // Simulate wait (capped for UX)
    await new Promise((r) => setTimeout(r, Math.min(durationMs, 1200)));

    const output =
      status === "timeout"
        ? { error: "UPSTREAM_TIMEOUT", retryable: true }
        : status === "failed"
        ? FAIL_OUTPUTS[stepKind]
        : PASS_OUTPUTS[stepKind];

    const run: SimRun = {
      id: `sim_${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      stepKind,
      stepLabel: stepDef.label,
      provider: provider.name,
      scenario,
      status,
      durationMs,
      input: parsed,
      output,
    };

    setRuns((prev) => [run, ...prev].slice(0, 50));
    setRunning(false);
    toast.success(`Simulated ${stepDef.label} → ${status}`, {
      description: "No provider charge — simulation only.",
    });
  };

  const clearRuns = () => setRuns([]);

  const handleReplay = (run: SimRun) => {
    setStepKind(run.stepKind);
    setProviderId(stepDef.providers.find(p => p.name === run.provider)?.id || stepDef.providers[0].id);
    setScenario(run.scenario);
    setPayload(JSON.stringify(run.input, null, 2));
    toast.info("Replay loaded — ready to run", {
      description: `${run.stepLabel} with ${run.scenario} scenario`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="gradient-card border border-primary/30 rounded-xl p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center shrink-0 shadow-glow">
          <FlaskConical className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Simulator mode</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Run any validation step with a forced outcome (pass / fail / timeout) and replay sample
            payloads. No real provider calls. No charges.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-success border border-success/30 bg-success/10 px-2 py-1 rounded-md">
          $0.000 cost
        </span>
      </div>

      <div className="grid lg:grid-cols-[420px_1fr] gap-4">
        {/* Config panel */}
        <div className="gradient-card border border-border rounded-xl p-5 space-y-4 h-fit">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scenario config
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Step</label>
            <Select value={stepKind} onValueChange={(v) => handleStepChange(v as StepKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STEP_LIBRARY.map((s) => (
                  <SelectItem key={s.kind} value={s.kind}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Provider</label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stepDef.providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {p.cost}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Outcome</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["pass", "fail", "timeout", "random"] as Scenario[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setScenario(s)}
                  className={`px-2 py-2 rounded-md text-xs font-medium border transition-smooth ${
                    scenario === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Latency</label>
            <Select value={latency} onValueChange={setLatency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (realistic)</SelectItem>
                <SelectItem value="50">Fast — 50ms</SelectItem>
                <SelectItem value="500">Normal — 500ms</SelectItem>
                <SelectItem value="2500">Slow — 2.5s</SelectItem>
                <SelectItem value="30000">Timeout — 30s</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Input payload (JSON)</label>
              <button
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={9}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="hero" onClick={runSim} disabled={running} className="flex-1">
              {running ? (
                <>
                  <Zap className="h-3.5 w-3.5 animate-pulse" />
                  Running…
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Run simulation
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearRuns} disabled={runs.length === 0}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="gradient-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold">Simulation log</h3>
              <p className="text-xs text-muted-foreground">
                {runs.length === 0 ? "No runs yet" : `${runs.length} run${runs.length === 1 ? "" : "s"} this session`}
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-1 rounded-md">
              Sandbox
            </span>
          </div>

          {runs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-12 w-12 rounded-full border-2 border-dashed border-border flex items-center justify-center mx-auto mb-3">
                <FlaskConical className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Configure a scenario and hit run</p>
              <p className="text-xs text-muted-foreground mt-1">
                Test edge cases without burning real provider credits.
              </p>
            </div>
          ) : (
            <div className="max-h-[640px] overflow-y-auto divide-y divide-border">
              {runs.map((r) => {
                const meta = statusMeta[r.status];
                return (
                  <div key={r.id} className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border ${meta.className}`}
                      >
                        <meta.Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                      <span className="text-sm font-semibold">{r.stepLabel}</span>
                      <span className="text-xs text-muted-foreground">via {r.provider}</span>
                      <span className="text-xs font-mono text-muted-foreground ml-auto">
                        {r.durationMs}ms · scenario: {r.scenario}
                      </span>
                      <button
                        onClick={() => handleReplay(r)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-smooth"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Replay
                      </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
                          Input
                        </div>
                        <pre className="text-xs font-mono bg-background border border-border rounded-md p-3 overflow-x-auto">
                          {JSON.stringify(r.input, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
                          Output
                        </div>
                        <pre className="text-xs font-mono bg-background border border-border rounded-md p-3 overflow-x-auto">
                          {JSON.stringify(r.output, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {r.id} · {new Date(r.timestamp).toISOString()}
                    </div>
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

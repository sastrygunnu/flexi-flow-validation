import { StepKind } from "./validation-steps";

export type LogStatus = "success" | "failed" | "timeout";

export type PaymentStatus = "paid" | "pending" | "failed" | "skipped";

export interface PaymentInfo {
  status: PaymentStatus; // settlement state of the per-API-call nanopayment
  rail: "circle_arc" | "x402"; // which rail carried the value
  amountUsdc: number; // amount paid for THIS api call
  payerWallet: string; // your app wallet (debited)
  payeeWallet: string; // provider wallet (credited)
  arcTxHash: string; // Arc L1 settlement tx hash
  nanopaymentId: string; // Circle Nanopayment id
  settlementNs: number; // sub-second finality on Arc, in nanoseconds
  invoiceId: string; // x402 / provider invoice reference
  settledAt: string; // ISO timestamp settlement confirmed
  gasUsdc: number; // protocol fee paid in USDC
  reason?: string; // present when status != paid
}

export interface AuditLog {
  id: string;
  runId: string; // groups steps belonging to the same flow execution
  stepIndex: number; // order within the flow run
  timestamp: string; // ISO
  flow: string;
  userId: string;
  stepKind: StepKind;
  stepLabel: string;
  provider: string;
  status: LogStatus;
  durationMs: number;
  costUsd: number;
  // Circle Arc / Nanopayment settlement metadata (mirrored on payment)
  costUsdc: number; // USDC settled on Arc (== costUsd at 1:1 peg, kept separate for clarity)
  arcTxHash: string; // Arc L1 settlement tx hash
  arcSettlementNs: number; // settlement latency in nanoseconds (Arc sub-second finality)
  nanopaymentId: string; // Circle Nanopayment id
  payment: PaymentInfo; // per-API-call payment receipt
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface FlowRun {
  runId: string;
  flow: string;
  userId: string;
  startedAt: string;
  endedAt: string;
  totalDurationMs: number;
  totalCostUsd: number;
  totalCostUsdc: number; // total USDC settled on Arc for this flow
  avgArcSettlementNs: number; // average Arc settlement latency in nanoseconds
  nanopaymentCount: number; // number of Circle Nanopayments emitted
  status: LogStatus;
  steps: AuditLog[];
}

function randomHex(len: number) {
  let s = "0x";
  const chars = "0123456789abcdef";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

const FLOWS = ["us_onboarding", "eu_onboarding", "high_risk_kyc"];
const USERS = ["usr_8f2a1", "usr_3b9c4", "usr_71ef0", "usr_22dde", "usr_9a4b3", "usr_55c2e"];

const SAMPLES: Array<Omit<AuditLog, "id" | "timestamp" | "flow" | "userId" | "runId" | "stepIndex" | "costUsdc" | "arcTxHash" | "arcSettlementNs" | "nanopaymentId">> = [
  {
    stepKind: "phone",
    stepLabel: "Phone OTP",
    provider: "Twilio",
    status: "success",
    durationMs: 412,
    costUsd: 0.008,
    input: { phone: "+14155550182", channel: "sms", locale: "en-US" },
    output: { verified: true, carrier: "Verizon", lineType: "mobile", attempts: 1 },
  },
  {
    stepKind: "identity",
    stepLabel: "Identity Check",
    provider: "Persona",
    status: "success",
    durationMs: 2340,
    costUsd: 1.25,
    input: {
      documentType: "passport",
      country: "US",
      selfie: "base64:…(truncated)",
    },
    output: {
      match: 0.97,
      liveness: "passed",
      name: "Jordan Reyes",
      dob: "1991-04-12",
      docNumber: "P********1",
    },
  },
  {
    stepKind: "address",
    stepLabel: "Address Validation",
    provider: "Google Maps",
    status: "success",
    durationMs: 187,
    costUsd: 0.017,
    input: { line1: "1 Market St", city: "San Francisco", postal: "94105", country: "US" },
    output: {
      normalized: "1 Market Street, San Francisco, CA 94105, USA",
      lat: 37.7937,
      lng: -122.3949,
      confidence: 0.99,
    },
  },
  {
    stepKind: "fraud",
    stepLabel: "Fraud Scoring",
    provider: "Sift",
    status: "success",
    durationMs: 95,
    costUsd: 0.08,
    input: { ip: "73.92.14.221", deviceId: "d_92ab", email: "j.reyes@example.com" },
    output: { riskScore: 12, decision: "allow", signals: ["new_device"] },
  },
  {
    stepKind: "phone",
    stepLabel: "Phone OTP",
    provider: "MessageBird",
    status: "failed",
    durationMs: 654,
    costUsd: 0.006,
    input: { phone: "+447700900123", channel: "sms" },
    output: { verified: false, error: "INVALID_OTP", attempts: 3 },
  },
  {
    stepKind: "identity",
    stepLabel: "Identity Check",
    provider: "Onfido",
    status: "timeout",
    durationMs: 30000,
    costUsd: 0,
    input: { documentType: "drivers_license", country: "GB" },
    output: { error: "UPSTREAM_TIMEOUT", retryable: true },
  },
  {
    stepKind: "email",
    stepLabel: "Email Verification",
    provider: "Kickbox",
    status: "success",
    durationMs: 142,
    costUsd: 0.004,
    input: { email: "alex@startup.io" },
    output: { deliverable: true, disposable: false, role: false },
  },
  {
    stepKind: "bank",
    stepLabel: "Bank Verification",
    provider: "Plaid",
    status: "success",
    durationMs: 1820,
    costUsd: 0.45,
    input: { accountId: "acc_***82", routing: "021000021" },
    output: { ownership: "verified", balance: 4218.55, currency: "USD" },
  },
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const FLOW_TEMPLATES: Record<string, StepKind[]> = {
  us_onboarding: ["email", "phone", "identity", "address", "fraud"],
  eu_onboarding: ["email", "phone", "identity", "fraud"],
  high_risk_kyc: ["email", "phone", "identity", "address", "bank", "fraud"],
};

function sampleForStep(kind: StepKind) {
  const match = SAMPLES.find((s) => s.stepKind === kind);
  return match ?? SAMPLES[0];
}

export function generateMockLogs(runCount = 18): AuditLog[] {
  const now = Date.now();
  const logs: AuditLog[] = [];
  for (let r = 0; r < runCount; r++) {
    const flow = rand(Object.keys(FLOW_TEMPLATES));
    const userId = rand(USERS);
    const runId = `run_${(now - r * 60_000).toString(36)}_${r}`;
    const steps = FLOW_TEMPLATES[flow];
    const runStart = now - r * 1000 * 60 * (2 + Math.random() * 6);
    let cursor = runStart;
    // Random chance a run fails partway through
    const failAt = Math.random() < 0.25 ? Math.floor(Math.random() * steps.length) : -1;

    for (let i = 0; i < steps.length; i++) {
      const sample = sampleForStep(steps[i]);
      const status: LogStatus =
        i === failAt ? (Math.random() < 0.5 ? "failed" : "timeout") : sample.status;
      cursor += sample.durationMs + Math.round(Math.random() * 200);
      // Circle Arc finality: typically 200ns – 900ns sub-second nanopayment settlement
      const arcSettlementNs = 200 + Math.floor(Math.random() * 700);
      logs.push({
        ...sample,
        status,
        id: `log_${runId}_${i}`,
        runId,
        stepIndex: i,
        timestamp: new Date(cursor).toISOString(),
        flow,
        userId,
        costUsdc: sample.costUsd, // 1:1 USDC peg
        arcTxHash: randomHex(64),
        arcSettlementNs,
        nanopaymentId: `np_${randomHex(16).slice(2)}`,
      });
      if (i === failAt) break; // flow halts on failure
    }
  }
  return logs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function groupLogsByRun(logs: AuditLog[]): FlowRun[] {
  const byRun = new Map<string, AuditLog[]>();
  for (const log of logs) {
    if (!byRun.has(log.runId)) byRun.set(log.runId, []);
    byRun.get(log.runId)!.push(log);
  }
  const runs: FlowRun[] = [];
  for (const [runId, entries] of byRun) {
    const sorted = [...entries].sort((a, b) => a.stepIndex - b.stepIndex);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalDurationMs = sorted.reduce((sum, s) => sum + s.durationMs, 0);
    const totalCostUsd = sorted.reduce((sum, s) => sum + s.costUsd, 0);
    const totalCostUsdc = sorted.reduce((sum, s) => sum + s.costUsdc, 0);
    const avgArcSettlementNs = Math.round(
      sorted.reduce((sum, s) => sum + s.arcSettlementNs, 0) / sorted.length,
    );
    const status: LogStatus = sorted.some((s) => s.status === "timeout")
      ? "timeout"
      : sorted.some((s) => s.status === "failed")
      ? "failed"
      : "success";
    runs.push({
      runId,
      flow: first.flow,
      userId: first.userId,
      startedAt: first.timestamp,
      endedAt: last.timestamp,
      totalDurationMs,
      totalCostUsd,
      totalCostUsdc,
      avgArcSettlementNs,
      nanopaymentCount: sorted.length,
      status,
      steps: sorted,
    });
  }
  return runs.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

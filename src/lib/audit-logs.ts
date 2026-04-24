import { StepKind } from "./validation-steps";

export type LogStatus = "success" | "failed" | "timeout";

export interface AuditLog {
  id: string;
  timestamp: string; // ISO
  flow: string;
  userId: string;
  stepKind: StepKind;
  stepLabel: string;
  provider: string;
  status: LogStatus;
  durationMs: number;
  costUsd: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

const FLOWS = ["us_onboarding", "eu_onboarding", "high_risk_kyc"];
const USERS = ["usr_8f2a1", "usr_3b9c4", "usr_71ef0", "usr_22dde", "usr_9a4b3", "usr_55c2e"];

const SAMPLES: Array<Omit<AuditLog, "id" | "timestamp" | "flow" | "userId">> = [
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

export function generateMockLogs(count = 60): AuditLog[] {
  const now = Date.now();
  const logs: AuditLog[] = [];
  for (let i = 0; i < count; i++) {
    const sample = SAMPLES[i % SAMPLES.length];
    logs.push({
      ...sample,
      id: `log_${(now - i * 1000).toString(36)}_${i}`,
      timestamp: new Date(now - i * 1000 * 60 * (1 + Math.random() * 4)).toISOString(),
      flow: rand(FLOWS),
      userId: rand(USERS),
    });
  }
  return logs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

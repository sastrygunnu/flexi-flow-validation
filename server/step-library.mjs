export const STEP_LIBRARY = [
  {
    kind: "phone",
    label: "Phone OTP",
    providers: [
      { id: "twilio", name: "Twilio", costUsd: 0.008, reliability: 99 },
      { id: "messagebird", name: "MessageBird", costUsd: 0.006, reliability: 97 },
      { id: "vonage", name: "Vonage", costUsd: 0.007, reliability: 98 },
    ],
  },
  {
    kind: "email",
    label: "Email Verification",
    providers: [
      { id: "kickbox", name: "Kickbox", costUsd: 0.004, reliability: 98 },
      { id: "zerobounce", name: "ZeroBounce", costUsd: 0.003, reliability: 96 },
    ],
  },
  {
    kind: "identity",
    label: "Identity Check",
    providers: [
      { id: "persona", name: "Persona", costUsd: 1.25, reliability: 99 },
      { id: "stripe", name: "Stripe Identity", costUsd: 1.5, reliability: 98 },
      { id: "onfido", name: "Onfido", costUsd: 1.1, reliability: 97 },
    ],
  },
  {
    kind: "address",
    label: "Address Validation",
    providers: [
      { id: "google", name: "Google Maps", costUsd: 0.017, reliability: 99 },
      { id: "loqate", name: "Loqate", costUsd: 0.012, reliability: 98 },
      { id: "smarty", name: "Smarty", costUsd: 0.009, reliability: 97 },
    ],
  },
  {
    kind: "bank",
    label: "Bank Verification",
    providers: [
      { id: "plaid", name: "Plaid", costUsd: 0.45, reliability: 99 },
      { id: "tink", name: "Tink", costUsd: 0.35, reliability: 97 },
    ],
  },
  {
    kind: "fraud",
    label: "Fraud Scoring",
    providers: [
      { id: "sift", name: "Sift", costUsd: 0.08, reliability: 98 },
      { id: "riskified", name: "Riskified", costUsd: 0.07, reliability: 97 },
      { id: "seon", name: "SEON", costUsd: 0.05, reliability: 96 },
    ],
  },
];

export function getStep(kind) {
  const step = STEP_LIBRARY.find((s) => s.kind === kind);
  if (!step) throw new Error(`Unknown step kind: ${kind}`);
  return step;
}

export function getProvider(kind, providerId) {
  const step = getStep(kind);
  const provider = step.providers.find((p) => p.id === providerId);
  if (!provider) throw new Error(`Unknown provider: ${kind}/${providerId}`);
  return provider;
}


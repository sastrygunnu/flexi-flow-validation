import { Phone, IdCard, MapPin, ShieldAlert, Mail, CreditCard, LucideIcon } from "lucide-react";

export type StepKind = "phone" | "identity" | "address" | "fraud" | "email" | "bank";

export interface ProviderOption {
  id: string;
  name: string;
  cost: string;
  reliability: number; // 0-100
}

export interface StepDefinition {
  kind: StepKind;
  label: string;
  description: string;
  icon: LucideIcon;
  unitCost: string;
  color: string; // hsl token name
  providers: ProviderOption[];
}

export const STEP_LIBRARY: StepDefinition[] = [
  {
    kind: "phone",
    label: "Phone OTP",
    description: "SMS one-time password verification",
    icon: Phone,
    unitCost: "$0.001",
    color: "primary",
    providers: [
      { id: "twilio", name: "Twilio", cost: "$0.008", reliability: 99 },
      { id: "messagebird", name: "MessageBird", cost: "$0.006", reliability: 97 },
      { id: "vonage", name: "Vonage", cost: "$0.007", reliability: 98 },
    ],
  },
  {
    kind: "email",
    label: "Email Verification",
    description: "Deliverability + disposable check",
    icon: Mail,
    unitCost: "$0.002",
    color: "primary",
    providers: [
      { id: "kickbox", name: "Kickbox", cost: "$0.004", reliability: 98 },
      { id: "zerobounce", name: "ZeroBounce", cost: "$0.003", reliability: 96 },
    ],
  },
  {
    kind: "identity",
    label: "Identity Check",
    description: "Government ID + selfie liveness",
    icon: IdCard,
    unitCost: "$0.85",
    color: "accent",
    providers: [
      { id: "persona", name: "Persona", cost: "$1.25", reliability: 99 },
      { id: "stripe", name: "Stripe Identity", cost: "$1.50", reliability: 98 },
      { id: "onfido", name: "Onfido", cost: "$1.10", reliability: 97 },
    ],
  },
  {
    kind: "address",
    label: "Address Validation",
    description: "Geocode + postal verification",
    icon: MapPin,
    unitCost: "$0.01",
    color: "primary",
    providers: [
      { id: "google", name: "Google Maps", cost: "$0.017", reliability: 99 },
      { id: "loqate", name: "Loqate", cost: "$0.012", reliability: 98 },
      { id: "smarty", name: "Smarty", cost: "$0.009", reliability: 97 },
    ],
  },
  {
    kind: "bank",
    label: "Bank Verification",
    description: "Account ownership + balance",
    icon: CreditCard,
    unitCost: "$0.30",
    color: "accent",
    providers: [
      { id: "plaid", name: "Plaid", cost: "$0.45", reliability: 99 },
      { id: "tink", name: "Tink", cost: "$0.35", reliability: 97 },
    ],
  },
  {
    kind: "fraud",
    label: "Fraud Scoring",
    description: "Device + behavior risk score",
    icon: ShieldAlert,
    unitCost: "$0.05",
    color: "accent",
    providers: [
      { id: "sift", name: "Sift", cost: "$0.08", reliability: 98 },
      { id: "riskified", name: "Riskified", cost: "$0.07", reliability: 97 },
      { id: "seon", name: "SEON", cost: "$0.05", reliability: 96 },
    ],
  },
];

export const getStep = (kind: StepKind) =>
  STEP_LIBRARY.find((s) => s.kind === kind)!;

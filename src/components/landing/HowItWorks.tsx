import { Layers, MousePointer2, Repeat, Code2 } from "lucide-react";

const steps = [
  {
    icon: Layers,
    num: "01",
    title: "Compose a flow",
    desc: "Drag steps — Phone OTP, ID Check, Address, Fraud — into a single validation flow per use case or region.",
  },
  {
    icon: MousePointer2,
    num: "02",
    title: "Pick providers",
    desc: "For every step, choose from Stripe, Persona, Plaid, Sift, Google, Loqate and more. Compare cost & reliability.",
  },
  {
    icon: Code2,
    num: "03",
    title: "One API call",
    desc: "Replace 5 SDK integrations with a single validateUser() call. Flows are referenced by name, not code.",
  },
  {
    icon: Repeat,
    num: "04",
    title: "Switch instantly",
    desc: "Provider down or too expensive? Change it in the dashboard. Next user automatically uses the new one.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how" className="py-24 md:py-32 border-t border-border relative">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center mb-20 space-y-4">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">How it works</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            From vendor sprawl to <br />
            <span className="text-gradient">one config file.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className="relative gradient-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-smooth group animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shadow-glow group-hover:scale-110 transition-spring">
                  <s.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-mono text-xs text-muted-foreground/60">{s.num}</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Code comparison */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="gradient-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-muted" />
              </div>
              <span className="text-xs text-muted-foreground ml-2">before.ts — 5 SDKs, 800 LOC</span>
            </div>
            <pre className="p-5 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed">
{`import twilio from 'twilio';
import { Persona } from '@persona/sdk';
import { Plaid } from 'plaid';
import { Sift } from '@sift/node';
import { Loqate } from 'loqate';

// 800 lines of orchestration,
// retries, error mapping,
// vendor-specific types...

await twilio.verify(...);
await persona.create(...);
await loqate.validate(...);
// ...and on, and on.`}
            </pre>
          </div>

          <div className="relative">
            <div className="absolute -inset-1 gradient-primary rounded-2xl blur-xl opacity-30" />
            <div className="relative gradient-card border border-primary/40 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-success/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-success/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-success/80" />
                </div>
                <span className="text-xs text-primary ml-2 font-medium">after.ts — Validly, 1 line</span>
              </div>
              <pre className="p-5 text-xs font-mono overflow-x-auto leading-relaxed">
<span className="text-muted-foreground">{`import { validly } from '@validly/sdk';

`}</span><span className="text-primary">{`const result = await validly.run({
  flow: "us_onboarding",
  user: userData,
});`}</span><span className="text-muted-foreground">{`

// ✓ Phone verified
// ✓ ID checked
// ✓ Address validated
// ✓ Fraud score: 12 (low)`}</span>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

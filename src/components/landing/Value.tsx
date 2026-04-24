import { Rocket, TrendingDown, Unlock, Check } from "lucide-react";

const values = [
  {
    icon: Rocket,
    title: "Ship in days, not months",
    tagline: "Skip 5 separate vendor integrations.",
    bullets: [
      "One SDK covers phone, ID, address, and fraud",
      "No contracts to negotiate per provider",
      "Go live with a single API call",
    ],
  },
  {
    icon: TrendingDown,
    title: "Cut validation costs",
    tagline: "Pay per check, not per seat.",
    bullets: [
      "Micro-pricing from $0.001 per check",
      "Auto-route to the cheapest provider",
      "No monthly minimums or hidden fees",
    ],
  },
  {
    icon: Unlock,
    title: "Zero vendor lock-in",
    tagline: "Switch providers from a dashboard.",
    bullets: [
      "Swap Stripe for Persona in one click",
      "Failover automatically if a provider goes down",
      "Region-specific routing without code changes",
    ],
  },
];

export const Value = () => {
  return (
    <section id="value" className="py-24 md:py-32 border-t border-border">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">
            Why Validly
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Faster onboarding. Lower cost. <br />
            <span className="text-gradient">Total flexibility.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Three reasons teams pick Validly over wiring up KYC vendors themselves.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {values.map((v, i) => (
            <div
              key={v.title}
              className="gradient-card border border-border rounded-2xl p-7 hover:border-primary/40 transition-smooth animate-fade-in-up flex flex-col"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow mb-5">
                <v.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-xl mb-1.5">{v.title}</h3>
              <p className="text-sm text-muted-foreground mb-5">{v.tagline}</p>
              <ul className="space-y-2.5 mt-auto">
                {v.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/90">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

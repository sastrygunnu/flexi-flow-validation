import { AlertTriangle, Clock, RefreshCw, Lock } from "lucide-react";

const pains = [
  {
    icon: Clock,
    title: "Months to integrate",
    desc: "Each provider needs contracts, SDKs, edge cases, retries. Multiply by 5.",
  },
  {
    icon: RefreshCw,
    title: "Switching = rewrite",
    desc: "Costs spike or APIs fail. Migrating means re-coding and re-testing everything.",
  },
  {
    icon: Lock,
    title: "Vendor lock-in",
    desc: "Once shipped, your team is stuck — no leverage on pricing, no regional flexibility.",
  },
  {
    icon: AlertTriangle,
    title: "Silent failures",
    desc: "Provider downtime cascades into lost signups and onboarding drop-offs.",
  },
];

export const Problem = () => {
  return (
    <section id="problem" className="py-24 md:py-32 border-t border-border">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">The Problem</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Every fintech rebuilds the <br />
            same <span className="text-gradient-accent">validation stack.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Banks, marketplaces, gig apps — all need KYC, address checks, fraud scoring, OTPs.
            All wire together the same 5 vendors. All hate it.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pains.map((p, i) => (
            <div
              key={p.title}
              className="gradient-card border border-border rounded-xl p-6 hover:border-destructive/40 transition-smooth animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="h-10 w-10 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-4">
                <p.icon className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-semibold mb-1.5">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

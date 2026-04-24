import { ScrollText, FlaskConical, Server, FlaskRound, Check } from "lucide-react";

const features = [
  {
    icon: ScrollText,
    title: "Full audit logs",
    tagline: "Every API call, traced end-to-end.",
    bullets: [
      "Per-step logs for every provider call",
      "Captures input + output params",
      "Searchable, exportable, compliance-ready",
    ],
  },
  {
    icon: FlaskConical,
    title: "Simulate any scenario",
    tagline: "Test edge cases without burning real checks.",
    bullets: [
      "Dynamic mock responses (pass, fail, timeout)",
      "Replay real production payloads",
      "No vendor charges in simulation mode",
    ],
  },
  {
    icon: FlaskRound,
    title: "Separate dev environment",
    tagline: "Build and break things safely.",
    bullets: [
      "Isolated dev mode with its own keys",
      "Sandbox providers wired in by default",
      "Promote flows from dev → prod in one click",
    ],
  },
  {
    icon: Server,
    title: "Deploy on your servers",
    tagline: "Self-host for full data control.",
    bullets: [
      "Run Validly inside your VPC",
      "Logs and PII never leave your infra",
      "Same SDK, same dashboard, your cloud",
    ],
  },
];

export const DeveloperTools = () => {
  return (
    <section id="developer-tools" className="py-24 md:py-32 border-t border-border bg-secondary/20">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">
            Built for developers
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Debug, simulate, and ship <br />
            <span className="text-gradient">with confidence.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Audit logs for every call, a dynamic simulator for edge cases, an isolated dev environment,
            and the option to deploy on your own servers.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="gradient-card border border-border rounded-2xl p-7 hover:border-primary/40 transition-smooth animate-fade-in-up flex flex-col"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow mb-5">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-xl mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground mb-5">{f.tagline}</p>
              <ul className="space-y-2.5 mt-auto">
                {f.bullets.map((b) => (
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

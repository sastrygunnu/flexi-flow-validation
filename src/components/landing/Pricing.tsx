import { STEP_LIBRARY } from "@/lib/validation-steps";

export const Pricing = () => {
  return (
    <section id="pricing" className="py-24 md:py-32 border-t border-border">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Pay only for <span className="text-gradient">what you validate.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            No seats. No monthly minimums. Each step is a micro-transaction at our negotiated rate
            — usually cheaper than going direct.
          </p>
        </div>

        <div className="max-w-3xl mx-auto gradient-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="grid grid-cols-[1fr_auto] divide-y divide-border">
            {STEP_LIBRARY.map((s) => (
              <div key={s.kind} className="contents group">
                <div className="flex items-center gap-4 p-5 group-hover:bg-secondary/40 transition-smooth">
                  <div className="h-10 w-10 rounded-lg bg-secondary border border-border flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.description}</div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 p-5 group-hover:bg-secondary/40 transition-smooth">
                  <span className="font-mono font-bold text-lg text-foreground">{s.unitCost}</span>
                  <span className="text-xs text-muted-foreground">/check</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

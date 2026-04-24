import { Wallet, CircleDollarSign, Zap, ShieldCheck } from "lucide-react";

const infra = [
  {
    icon: Zap,
    label: "Arc Settlement",
    desc: "Lightning-fast settlement layer for micro-transactions",
  },
  {
    icon: CircleDollarSign,
    label: "USDC Value",
    desc: "Stable, transparent pricing denominated in USDC",
  },
  {
    icon: Wallet,
    label: "Circle Gateway",
    desc: "Direct integration with Circle's developer infrastructure",
  },
  {
    icon: ShieldCheck,
    label: "x402 Standard",
    desc: "Web-native payment protocol for seamless transactions",
  },
];

export const Infrastructure = () => {
  return (
    <section className="py-24 md:py-32 border-t border-border relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />

      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent">
            <Wallet className="h-3.5 w-3.5" />
            Web-Native Payments
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Built on the future of <br />
            <span className="text-gradient">money infrastructure.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Validly leverages Arc settlement layer, USDC for value transfer, and Circle's 
            developer tools including Gateway, Nanopayments, and the x402 web-native payment standard.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {infra.map((item, i) => (
            <div
              key={item.label}
              className="relative group"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="absolute -inset-0.5 gradient-primary rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity" />
              <div className="relative gradient-card border border-border rounded-2xl p-6 hover:border-accent/40 transition-smooth h-full">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-spring">
                  <item.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-border bg-card/50 p-8 md:p-12">
            <div className="absolute inset-0 grid-pattern opacity-10" />
            <div className="relative grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-accent mb-2">&lt;1s</div>
                <div className="text-sm text-muted-foreground">Settlement via Arc</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent mb-2">USDC</div>
                <div className="text-sm text-muted-foreground">Stable value transfer</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent mb-2">x402</div>
                <div className="text-sm text-muted-foreground">Web-native standard</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden gradient-hero">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />

      <div className="container relative pt-20 pb-32 md:pt-28 md:pb-40">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary animate-fade-in-up">
            <Sparkles className="h-3.5 w-3.5" />
            One API. Every validation. Arc + USDC powered.
          </div>

          <h1
            className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            One API. <br />
            Any provider. <br />
            <span className="text-gradient">Instant switch.</span>
          </h1>

          <p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            Define your user validation flow once — phone, identity, address, fraud — and
            swap providers in a dashboard without touching your code.
          </p>

          <div
            className="flex flex-wrap items-center justify-center gap-3 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <Button asChild variant="hero" size="lg">
              <Link to="/dashboard">
                Try the Flow Builder <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="glow" size="lg">
              <a href="#how">See how it works</a>
            </Button>
          </div>

          <div
            className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground animate-fade-in-up"
            style={{ animationDelay: "0.4s" }}
          >
            <span>✓ No vendor lock-in</span>
            <span>✓ Pay per validation (USDC)</span>
            <span>✓ Arc settlement layer</span>
            <span>✓ &lt; 5 min integration</span>
          </div>
        </div>

      </div>
    </section>
  );
};

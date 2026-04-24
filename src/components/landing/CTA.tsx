import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const CTA = () => {
  return (
    <section className="py-24 md:py-32 border-t border-border relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero" />
      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Ship onboarding in <br />
            <span className="text-gradient">an afternoon.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Open the flow builder, drag a few steps, copy the snippet. Real users in production today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button asChild variant="hero" size="lg">
              <Link to="/dashboard">
                Open Flow Builder <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="glow" size="lg">
              <a href="#docs">Read the docs</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export const Footer = () => (
  <footer className="border-t border-border py-10">
    <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>© {new Date().getFullYear()} Validly — One validation API.</span>
      <div className="flex gap-6">
        <a href="#" className="hover:text-foreground transition-smooth">Privacy</a>
        <a href="#" className="hover:text-foreground transition-smooth">Terms</a>
        <a href="#" className="hover:text-foreground transition-smooth">Status</a>
      </div>
    </div>
  </footer>
);

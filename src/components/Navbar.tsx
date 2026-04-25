import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export const Navbar = () => {
  const { pathname } = useLocation();
  const onDashboard = pathname.startsWith("/dashboard");

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute inset-0 gradient-primary rounded-lg blur-md opacity-60 group-hover:opacity-100 transition-smooth" />
            <div className="relative gradient-primary rounded-lg p-1.5">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
          </div>
          <span className="font-bold text-lg tracking-tight">Validly</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="/#problem" className="hover:text-foreground transition-smooth">Problem</a>
          <a href="/#how" className="hover:text-foreground transition-smooth">How it works</a>
          <a href="/#pricing" className="hover:text-foreground transition-smooth">Pricing</a>
          <a href="/#docs" className="hover:text-foreground transition-smooth">Docs</a>
        </nav>

        <div className="flex items-center gap-2">
          {!onDashboard && (
            <Button asChild variant="hero" size="sm">
              <Link to="/dashboard">Open Dashboard</Link>
            </Button>
          )}
          {onDashboard && (
            <Button asChild variant="outline" size="sm">
              <Link to="/">Back to home</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Navbar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const onDashboard = pathname.startsWith("/dashboard");

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  const initial =
    user?.user_metadata?.full_name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

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
          {!onDashboard && !user && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
          {!onDashboard && (
            <Button asChild variant="hero" size="sm">
              <Link to={user ? "/dashboard" : "/login"}>Open Dashboard</Link>
            </Button>
          )}
          {onDashboard && user && (
            <>
              <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-md border border-border">
                <div className="h-6 w-6 rounded-full gradient-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground">
                  {initial}
                </div>
                <span className="text-xs text-muted-foreground max-w-[160px] truncate">
                  {user.email}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

const Login = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleGoogle = async () => {
    setSigningIn(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/dashboard`,
      });
      if (result.error) {
        toast.error("Sign in failed", { description: result.error.message });
        setSigningIn(false);
      }
    } catch (e) {
      toast.error("Sign in failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="container py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <span>Validation Hub</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="gradient-card border border-border rounded-2xl p-8 shadow-xl">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              Customer dashboard
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Sign in to continue</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Access your flow builder and audit logs.
            </p>

            <div className="mt-8">
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleGoogle}
                disabled={signingIn}
              >
                <GoogleIcon className="h-4 w-4" />
                {signingIn ? "Redirecting…" : "Continue with Google"}
                <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground mt-6 text-center">
              By continuing you agree to our terms and privacy policy.
            </p>
          </div>

          <div className="text-center mt-6">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
              ← Back to homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.96h5.55c-.24 1.44-1.68 4.2-5.55 4.2-3.34 0-6.06-2.76-6.06-6.18S8.66 5.99 12 5.99c1.9 0 3.18.81 3.91 1.5l2.66-2.55C16.95 3.36 14.7 2.4 12 2.4 6.69 2.4 2.4 6.69 2.4 12s4.29 9.6 9.6 9.6c5.55 0 9.21-3.9 9.21-9.39 0-.63-.07-1.11-.16-1.59H12z" />
    </svg>
  );
}

export default Login;

import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] === "signup" ? ("signup" as const) : ("signin" as const),
  }),
  head: () => ({
    meta: [
      { title: "Sign in | SoloOS" },
      { name: "description", content: "Sign in to your SoloOS financial command center." },
      { property: "og:title", content: "Sign in | SoloOS" },
      { property: "og:description", content: "Access your SoloOS workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function describeAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "That email and password don't match an account.";
  if (m.includes("user already registered"))
    return "An account already exists for this email. Try signing in.";
  if (m.includes("email not confirmed")) return "Confirm your email address, then sign in.";
  if (m.includes("unsupported provider"))
    return "Google sign-in isn't enabled for this workspace yet.";
  return message;
}

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  useEffect(() => {
    if (!isLoading && session) navigate({ to: "/app", replace: true });
  }, [isLoading, session, navigate]);

  const isSignup = mode === "signup";

  function switchMode(next: Mode) {
    setError(null);
    setNotice(null);
    navigate({ to: "/auth", search: { mode: next }, replace: true });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) return setError("Enter your email address.");
    if (password.length < 8 && isSignup)
      return setError("Use at least 8 characters for your password.");
    if (!password) return setError("Enter your password.");

    setPending(true);
    try {
      if (isSignup) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            ...(fullName.trim() ? { data: { full_name: fullName.trim() } } : {}),
          },
        });
        if (signUpError) throw signUpError;
        setNotice(
          "Account created. If email confirmation is required, check your inbox to finish signing in.",
        );
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(describeAuthError((err as Error).message));
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGooglePending(true);
    try {
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });
      if (oAuthError) throw oAuthError;
    } catch (err) {
      setGooglePending(false);
      setError(describeAuthError((err as Error).message));
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Enter your email address first, then request a reset link.");
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (resetError) {
      setError(describeAuthError(resetError.message));
      return;
    }
    toast.success("Password reset link sent", { description: `Check ${email.trim()}.` });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_minmax(0,500px)]">
      <aside className="hidden flex-col justify-between border-r border-border/80 bg-gradient-to-b from-primary/10 via-background to-secondary/40 p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-xs">
            S
          </span>
          <span className="text-display text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            SoloOS
          </span>
          <span className="rounded-full bg-primary/10 border border-primary/25 px-2 py-0.5 text-[10px] font-bold text-primary">
            v2.0
          </span>
        </Link>
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <span>Authoritative Financial Engine</span>
          </div>
          <h2 className="text-display max-w-md text-4xl font-bold leading-[1.15] text-foreground">
            Know what you earned. <br />
            Know what you keep. <br />
            <span className="text-primary">Know what to do next.</span>
          </h2>
          <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
            The complete financial operating system for independent operators. Multi-currency
            ledger, immutable audit trails, and algorithmic safe-to-spend clarity.
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card/60 p-4 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            PostgreSQL Multi-Tenant Isolation
          </p>
          <p>
            Your financial ledger is protected by Row Level Security and immutable append-only logs.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
              S
            </span>
            <span className="text-display text-lg font-bold">SoloOS</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold lg:mt-0">
            {isSignup ? "Create your account" : "Sign in to SoloOS"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup
              ? "Set up your workspace in a couple of minutes."
              : "Pick up where your business left off."}
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
            {isSignup ? (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  name="name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ava Mensah"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!isSignup ? (
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    className="rounded-sm text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Forgot password?
                  </button>
                ) : null}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  aria-describedby={isSignup ? "password-hint" : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              {isSignup ? (
                <p id="password-hint" className="text-xs text-muted-foreground">
                  At least 8 characters.
                </p>
              ) : null}
            </div>

            {error ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{error}</span>
              </p>
            ) : null}

            {notice ? (
              <p role="status" className="rounded-md border border-border bg-secondary p-3 text-sm">
                {notice}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleGoogle()}
            disabled={googlePending}
          >
            {googlePending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Continue with Google
          </Button>

          <p className="mt-8 text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to SoloOS?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? "signin" : "signup")}
              className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {isSignup ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

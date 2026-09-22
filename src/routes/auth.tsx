import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/solo.png";

import { recordReferralSignupServerFn } from "@/server/referrals";
import { recordCreatorSignupServerFn } from "@/server/creator";
import { validateReferralCode } from "@/domain/referrals";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    mode: Mode;
    ref?: string;
    creator?: string;
    campaign?: string;
    redirect?: string;
  } => {
    const mode: Mode = search["mode"] === "signup" ? "signup" : "signin";
    const ref =
      typeof search["ref"] === "string" && search["ref"].trim()
        ? search["ref"].trim().toUpperCase()
        : undefined;
    const creator =
      typeof search["creator"] === "string" && search["creator"].trim()
        ? search["creator"].trim().toLowerCase()
        : undefined;
    const campaign =
      typeof search["campaign"] === "string" && search["campaign"].trim()
        ? search["campaign"].trim().toLowerCase()
        : undefined;
    const redirect =
      typeof search["redirect"] === "string" && search["redirect"].trim().startsWith("/")
        ? search["redirect"].trim()
        : undefined;
    return {
      mode,
      ...(ref ? { ref } : {}),
      ...(creator ? { creator } : {}),
      ...(campaign ? { campaign } : {}),
      ...(redirect ? { redirect } : {}),
    };
  },
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
  const {
    mode,
    ref: searchRef,
    creator: searchCreator,
    campaign: searchCampaign,
    redirect: searchRedirect,
  } = Route.useSearch();
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
    if (!isLoading && session) {
      const target = searchRedirect || "/app";
      navigate({ to: target, replace: true });
    }
  }, [isLoading, session, navigate, searchRedirect]);

  const isSignup = mode === "signup";

  function switchMode(next: Mode) {
    setError(null);
    setNotice(null);
    navigate({
      to: "/auth",
      search: {
        mode: next,
        ...(searchRef ? { ref: searchRef } : {}),
        ...(searchCreator ? { creator: searchCreator } : {}),
        ...(searchCampaign ? { campaign: searchCampaign } : {}),
        ...(searchRedirect ? { redirect: searchRedirect } : {}),
      },
      replace: true,
    });
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
        // Determine active referral code: search param first, then localStorage fallback
        let activeRefCode: string | undefined = undefined;
        if (searchRef && validateReferralCode(searchRef)) {
          activeRefCode = searchRef;
        } else if (typeof localStorage !== "undefined") {
          const stored = localStorage.getItem("solos_ref_code");
          if (stored && validateReferralCode(stored)) {
            activeRefCode = stored.toUpperCase();
          }
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${searchRedirect || "/app"}`,
            data: {
              ...(fullName.trim() ? { full_name: fullName.trim() } : {}),
              ...(activeRefCode ? { referral_code: activeRefCode } : {}),
            },
          },
        });
        if (signUpError) throw signUpError;

        // Secure server-side attribution linking
        if (signUpData.user?.id) {
          let anonSessionId: string | undefined = undefined;
          let creatorId: string | undefined = undefined;
          let creatorCode: string | undefined = searchCreator;
          let campaignId: string | undefined = searchCampaign;

          try {
            anonSessionId = localStorage.getItem("solos_anon_session") || undefined;
            if (!creatorCode) {
              creatorCode = localStorage.getItem("solos_creator_code") || undefined;
            }
            creatorId = localStorage.getItem("solos_creator_id") || undefined;
            if (!campaignId) {
              campaignId = localStorage.getItem("solos_campaign_id") || undefined;
            }

            if (!creatorCode || !creatorId) {
              const cookies = document.cookie.split(";").map((c) => c.trim());
              for (const c of cookies) {
                const parts = c.split("=");
                const val = parts[1];
                if (c.startsWith("solos_c_code=") && val) creatorCode = decodeURIComponent(val);
                if (c.startsWith("solos_c_id=") && val) creatorId = decodeURIComponent(val);
              }
            }
          } catch {
            /* ignore */
          }

          // Link creator referral attribution
          if (creatorId || creatorCode) {
            try {
              await recordCreatorSignupServerFn({
                data: {
                  userId: signUpData.user.id,
                  ...(creatorId ? { creatorId } : {}),
                  ...(creatorCode ? { creatorCode } : {}),
                  ...(campaignId ? { campaignId } : {}),
                  ...(anonSessionId ? { anonymousSessionId: anonSessionId } : {}),
                },
              });
            } catch (cErr) {
              console.error("[Auth] Creator signup linking error:", cErr);
            }
          }

          // Link workspace referral attribution
          try {
            await recordReferralSignupServerFn({
              data: {
                userId: signUpData.user.id,
                referralCode: activeRefCode,
                anonymousSessionId: anonSessionId,
              },
            });
          } catch {
            /* non-blocking */
          }
        }

        setNotice("Account created. Please sign in.");
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;

        // On signin, if there is a pending creator referral in storage, ensure it is linked
        if (signInData.user?.id) {
          try {
            const creatorCode = searchCreator || localStorage.getItem("solos_creator_code") || undefined;
            const creatorId = localStorage.getItem("solos_creator_id") || undefined;
            const anonSessionId = localStorage.getItem("solos_anon_session") || undefined;

            if (creatorId || creatorCode) {
              await recordCreatorSignupServerFn({
                data: {
                  userId: signInData.user.id,
                  ...(creatorId ? { creatorId } : {}),
                  ...(creatorCode ? { creatorCode } : {}),
                  ...(anonSessionId ? { anonymousSessionId: anonSessionId } : {}),
                },
              });
            }
          } catch {
            /* non-blocking */
          }
        }
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
          redirectTo: `${window.location.origin}${searchRedirect || "/app"}`,
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
          <img src={logo} width={100} height={100} alt="Solo OS Logo" />
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
          <Link to="/" className="flex items-center gap-2.5 group mb-6 lg:hidden">
            <img src={logo} width={160} height={120} alt="SoloOS Logo" />
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

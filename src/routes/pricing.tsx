import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronRight, Crown, Shield, Zap } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logo from "@/assets/solo.png";
import {
  CANONICAL_PRICES,
  PLAN_DETAILS,
  type PlanTier,
  type PricingCurrency,
} from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing | SoloOS — The Financial Operating System for Independent Professionals" },
      {
        name: "description",
        content:
          "Simple, honest pricing for SoloOS. Free to start, MWK 14,000/mo or $8/mo for the full financial operating system. No hidden fees. Cancel anytime.",
      },
      { property: "og:title", content: "Pricing | SoloOS" },
      {
        property: "og:description",
        content:
          "Free to get started. Solo plan from MWK 14,000/month or $8/month. Full cashflow, tax reserves, AI CFO, and PDF exports.",
      },
    ],
    links: [{ rel: "canonical", href: "https://solo-finance-command.vercel.app/pricing" }],
  }),
  component: PricingPage,
});

const PLAN_ORDER: PlanTier[] = ["free", "solo", "pro"];

const PLAN_ICON: Record<PlanTier, typeof Zap> = {
  free: Shield,
  solo: Zap,
  pro: Crown,
};

const FAQ_ITEMS = [
  {
    q: "Are MWK and USD the same price converted?",
    a: "No. MWK 14,000 and $8 are independent launch prices chosen intentionally for each market. They are not a currency conversion of each other. You pay in your preferred currency.",
  },
  {
    q: "Can I start for free?",
    a: "Yes. The Free plan gives you permanent access to core bookkeeping, up to 5 clients, and up to 10 invoices per month — no credit card required, no trial expiration.",
  },
  {
    q: "What happens if I cancel a paid plan?",
    a: "Your paid plan stays active until the end of your current billing period. After that your workspace reverts cleanly to the Free tier. Your data is never deleted.",
  },
  {
    q: "What is the AI CFO?",
    a: "The AI CFO is a read-only financial intelligence layer. It reads your verified financial context — revenue, cashflow, tax position, obligations — and answers questions about your financial health. It cannot move money, modify records, or generate fake numbers.",
  },
  {
    q: "Is my financial data secure?",
    a: "All data is stored in a row-level-secured PostgreSQL database on Supabase. Your workspace data is only readable by authenticated members with the correct role. Payments are processed through PayChangu and reconciled server-side — no card data passes through our servers.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 7-day satisfaction refund if you are dissatisfied immediately after upgrading. Contact support within 7 days of your payment.",
  },
];

function PricingPage() {
  const [currency, setCurrency] = useState<PricingCurrency>("MWK");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={logo} width={44} height={44} alt="SoloOS Logo" />
            <span className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              SoloOS
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Home</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/support">Support</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth" search={{ mode: "signin" }}>
                Sign in
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/auth" search={{ mode: "signup" }}>
                Get Started <ChevronRight className="size-3.5" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-16 space-y-20">
        {/* Hero */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Crown className="size-3.5" />
            Simple, Honest Pricing
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Choose your financial command level
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Start free. Upgrade when you're ready. Prices are intentional — MWK for Malawi, USD for
            international operators.
          </p>

          {/* Currency Toggle */}
          <div className="inline-flex items-center gap-1 bg-muted p-1 rounded-xl text-sm font-medium mt-4">
            <button
              id="pricing-currency-mwk"
              type="button"
              onClick={() => setCurrency("MWK")}
              className={cn(
                "px-4 py-2 rounded-lg transition-all",
                currency === "MWK"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              🇲🇼 MWK (Malawi)
            </button>
            <button
              id="pricing-currency-usd"
              type="button"
              onClick={() => setCurrency("USD")}
              className={cn(
                "px-4 py-2 rounded-lg transition-all",
                currency === "USD"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              🌐 USD (International)
            </button>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="grid gap-8 md:grid-cols-3" aria-label="Subscription plans">
          {PLAN_ORDER.map((planId) => {
            const plan = PLAN_DETAILS[planId];
            const price = CANONICAL_PRICES[planId][currency];
            const Icon = PLAN_ICON[planId];
            const isRecommended = plan.recommended;

            return (
              <Card
                key={planId}
                id={`pricing-plan-${planId}`}
                className={cn(
                  "relative flex flex-col transition-transform hover:-translate-y-1",
                  isRecommended
                    ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/30"
                    : "border-border/80",
                )}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground shadow">
                      ✦ Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg",
                        planId === "pro"
                          ? "bg-amber-500/15 text-amber-500"
                          : planId === "solo"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">SoloOS {plan.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{plan.tagline}</CardDescription>
                    </div>
                  </div>

                  <div>
                    <span className="text-3xl font-bold tracking-tight">{price.formatted}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">{plan.description}</p>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 justify-between gap-6">
                  <ul className="space-y-2.5">
                    {plan.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check
                          className={cn(
                            "size-4 shrink-0 mt-0.5",
                            planId === "free" ? "text-muted-foreground" : "text-primary",
                          )}
                        />
                        <span
                          className={
                            planId === "free" ? "text-muted-foreground" : "text-foreground"
                          }
                        >
                          {h}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className="w-full mt-2 gap-2"
                    variant={planId === "free" ? "outline" : "default"}
                    size="lg"
                  >
                    <Link to="/auth" search={{ mode: "signup" }}>
                      {planId === "free" ? "Start for Free" : `Upgrade to ${plan.name}`}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Trust Bar */}
        <section className="rounded-2xl border border-border/60 bg-muted/30 p-8 text-center space-y-4">
          <h2 className="text-lg font-semibold">Built on trust and financial transparency</h2>
          <div className="grid gap-4 sm:grid-cols-4 text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <Check className="size-5 text-primary" />
              <span>Row-level security on every record</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Check className="size-5 text-primary" />
              <span>Immutable double-entry ledger</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Check className="size-5 text-primary" />
              <span>Server-side payment reconciliation</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Check className="size-5 text-primary" />
              <span>No card data stored on our servers</span>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold tracking-tight text-center">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-border/80 bg-card overflow-hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-sm list-none">
                  <span>{item.q}</span>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4 border-t border-border/60 pt-16">
          <h2 className="text-3xl font-bold tracking-tight">
            Start your financial command center today
          </h2>
          <p className="text-muted-foreground">
            No credit card required for the Free plan. Upgrade anytime from Settings.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Button asChild size="lg" className="gap-2">
              <Link to="/auth" search={{ mode: "signup" }}>
                Launch Your Free Workspace
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/support">Talk to Support</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 mt-16 bg-muted/20">
        <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={logo} width={28} height={28} alt="SoloOS" />
            <span className="font-semibold text-foreground">SoloOS</span>
            <span>— The Financial OS for Independent Professionals</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/support" className="hover:text-foreground transition-colors">
              Support
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

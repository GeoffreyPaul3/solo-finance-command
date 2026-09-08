import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Gauge,
  Landmark,
  Layers,
  Lock,
  PieChart,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import logo from "@/assets/solo.png"

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SoloOS — The Financial Operating System for Independent Professionals" },
      {
        name: "description",
        content:
          "SoloOS helps independent professionals know what they earned, what they keep, and what to do next. An authoritative, immutable financial operating system.",
      },
      {
        name: "keywords",
        content:
          "solo finance, freelance financial OS, immutable ledger, multi-currency cashflow, safe to spend, independent professional finance, double entry accounting, tax reserves",
      },
      {
        property: "og:title",
        content: "SoloOS — The Financial Operating System for Independent Professionals",
      },
      {
        property: "og:description",
        content:
          "Know what you earned. Know what you keep. Know what to do next. An authoritative financial cockpit built for independent professionals.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://solo-finance-command.vercel.app/" },
      { property: "og:image", content: "https://solo-finance-command.vercel.app/og-image.svg" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "SoloOS — Financial Operating System for Independent Professionals",
      },
      {
        name: "twitter:description",
        content:
          "Authoritative financial control for solo businesses. Multi-currency ledger, immutable audit trails, and algorithmic safe-to-spend clarity.",
      },
      { name: "twitter:image", content: "https://solo-finance-command.vercel.app/og-image.svg" },
    ],
    links: [{ rel: "canonical", href: "https://solo-finance-command.vercel.app/" }],
  }),
  component: Landing,
});

const PRODUCT_LOOP = [
  {
    step: "01",
    title: "Capture",
    action: "Every cent recorded",
    desc: "Multi-currency bank accounts, cash buffers, and receivables flow directly into an immutable double-entry ledger.",
    icon: Wallet,
  },
  {
    step: "02",
    title: "Understand",
    action: "True net position",
    desc: "Separate gross revenue from locked tax reserves and committed operating costs. Instantly know your real liquidity.",
    icon: PieChart,
  },
  {
    step: "03",
    title: "Decide",
    action: "Safe-to-Spend clarity",
    desc: "Stop guessing what you can withdraw. Receive exact algorithmic guardrails before paying yourself or buying gear.",
    icon: Scale,
  },
  {
    step: "04",
    title: "Act",
    action: "Frictionless execution",
    desc: "Execute atomic account transfers, reconcile balances, and issue invoices with guaranteed ledger consistency.",
    icon: Zap,
  },
  {
    step: "05",
    title: "Measure",
    action: "Authoritative history",
    desc: "Immutable transaction logs with full cryptographic reversal trails. Zero balance drift, zero accounting guesswork.",
    icon: TrendingUp,
  },
];

const FRAGMENTED_REALITY = [
  {
    problem: "Scattered Account Balances",
    detail:
      "Money split across local banks, foreign currency accounts, and mobile wallets with no unified liquidity view.",
    icon: Layers,
  },
  {
    problem: "Phantom Profitability",
    detail:
      "High gross revenue creating a dangerous illusion of health while unsegregated tax obligations quietly pile up.",
    icon: Gauge,
  },
  {
    problem: "Uncertain Spending Decisions",
    detail:
      "Chronic anxiety over whether paying yourself today will trigger a cash crunch when quarterly taxes arrive.",
    icon: CreditCard,
  },
  {
    problem: "Unverifiable Spreadsheets",
    detail:
      "Fragile Excel formulas where accidental cell overwrites or currency miscalculations silently break your books.",
    icon: FileText,
  },
];

const CAPABILITIES = [
  {
    title: "Cash & Multi-Currency Accounts",
    status: "Live in Engine",
    live: true,
    desc: "Track bank accounts, foreign currency reserves, and cash holdings with atomic balance reconciliation.",
    icon: Banknote,
  },
  {
    title: "Authoritative Transaction Ledger",
    status: "Live in Engine",
    live: true,
    desc: "Post income, expenses, and inter-account transfers with tamper-proof immutability and auditable reversals.",
    icon: ShieldCheck,
  },
  {
    title: "Multi-Tenant Workspace Security",
    status: "Live in Engine",
    live: true,
    desc: "Database-enforced Row Level Security (RLS), role-based permissions, and immutable audit logs.",
    icon: Lock,
  },
  {
    title: "Safe-to-Spend Engine",
    status: "Upcoming",
    live: false,
    desc: "Algorithmic calculation of disposable cash after auto-withholding taxes and upcoming liabilities.",
    icon: Scale,
  },
  {
    title: "Client & Project Profitability",
    status: "Upcoming",
    live: false,
    desc: "Direct link between client billables and true hourly realization to reveal your most lucrative work.",
    icon: Users,
  },
  {
    title: "Autonomous AI CFO",
    status: "Upcoming",
    live: false,
    desc: "Calm, proactive financial intelligence forecasting runway anomalies before they occur.",
    icon: Sparkles,
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Top Announcement Bar */}
      <div className="border-b border-border/60 bg-muted/40 px-4 py-2 text-center text-xs font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="font-semibold text-foreground">SoloOS 2.0</span>
          <span>— Authoritative Financial Engine & Multi-Currency Ledger now active.</span>
        </span>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center ">
              <Link to="/app" className="flex items-center gap-2.5 group">
            <img src={logo} width={60} height={60} alt="Solo OS Logo" />
            <span className="text-display text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              SoloOS
            </span>
          </Link>
          </div>

          <nav className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="font-medium">
              <Link to="/auth" search={{ mode: "signin" }}>
                Sign in
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 shadow-sm">
              <Link to="/auth" search={{ mode: "signup" }}>
                <span>Launch Workspace</span>
                <ChevronRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
            <Landmark className="size-3.5" />
            <span>The Financial Operating System for Independent Professionals</span>
          </div>

          <h1 className="text-display text-4xl font-bold tracking-tight leading-[1.08] sm:text-6xl lg:text-7xl max-w-4xl">
            Know what you earned. <br />
            Know what you keep. <br />
            <span className="text-primary">Know what to do next.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
            SoloOS gives solo entrepreneurs, consultants, and independent operators an
            authoritative, double-entry financial cockpit. Track cash across currencies, isolate
            taxes automatically, and eliminate financial uncertainty forever.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="gap-2 text-base px-6 h-12 shadow-md">
              <Link to="/auth" search={{ mode: "signup" }}>
                <span>Open Your Command Center</span>
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base px-6 h-12">
              <Link to="/auth" search={{ mode: "signin" }}>
                <span>Sign in to Workspace</span>
              </Link>
            </Button>
          </div>

          {/* Hero Command Center Preview Mockup */}
          <div className="mt-16 rounded-xl border border-border/80 bg-surface shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="size-2.5 rounded-full bg-border" />
                  <div className="size-2.5 rounded-full bg-border" />
                  <div className="size-2.5 rounded-full bg-border" />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground/80 ml-2">
                  soloos.app/app/cash — Authoritative Financial Cockpit
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-primary font-medium text-[11px]">
                <ShieldCheck className="size-3.5" />
                Live PostgreSQL Ledger
              </span>
            </div>

            <div className="p-6 sm:p-8 bg-gradient-to-b from-surface to-background/50">
              <div className="grid gap-6 md:grid-cols-3">
                {/* Metric Card 1 */}
                <div className="rounded-lg border border-border p-5 bg-card/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Liquid Cash Position
                    </span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      USD Base
                    </span>
                  </div>
                  <p className="mt-3 text-display text-3xl font-bold tracking-tight numeric text-foreground">
                    $38,450<span className="text-xl text-muted-foreground">.00</span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Reconciled across 3 multi-currency accounts
                  </p>
                </div>

                {/* Metric Card 2 */}
                <div className="rounded-lg border border-border p-5 bg-card/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Reserved for Taxes
                    </span>
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      Isolated
                    </span>
                  </div>
                  <p className="mt-3 text-display text-3xl font-bold tracking-tight numeric text-foreground">
                    $11,535<span className="text-xl text-muted-foreground">.00</span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    30% automated reserve safely quarantined
                  </p>
                </div>

                {/* Metric Card 3 */}
                <div className="rounded-lg border border-primary/30 p-5 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-primary font-semibold">
                      Safe-To-Spend Today
                    </span>
                    <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      True Clarity
                    </span>
                  </div>
                  <p className="mt-3 text-display text-3xl font-bold tracking-tight numeric text-primary">
                    $21,415<span className="text-xl opacity-80">.00</span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Free liquidity after all commitments & buffers
                  </p>
                </div>
              </div>

              {/* Mini Ledger Row Demo */}
              <div className="mt-6 rounded-lg border border-border bg-card/40 divide-y divide-border/60">
                <div className="flex items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Recent Ledger Activity</span>
                  <span>Authoritative Postings</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 font-semibold text-xs">
                      +
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Retainer Payment — Acme Labs</p>
                      <p className="text-xs text-muted-foreground">
                        Operating Account · Direct Deposit
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 numeric">
                      +$7,500.00
                    </p>
                    <p className="text-[11px] text-muted-foreground">Posted & Balanced</p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold text-xs">
                      ⇄
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Tax Reserve Transfer (30%)</p>
                      <p className="text-xs text-muted-foreground">Operating → Tax Treasury</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground numeric">$2,250.00</p>
                    <p className="text-[11px] text-muted-foreground">Inter-Account Transfer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section — The Fragmented Reality */}
        <section className="border-t border-border bg-muted/20 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                The Solo Reality
              </p>
              <h2 className="text-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Independent business finances are broken by design.
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                When you work for yourself, money isn't a single salary. It's a turbulent stream of
                varying invoice dates, foreign currency fees, and looming tax obligations.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FRAGMENTED_REALITY.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.problem}
                    className="panel p-6 bg-card flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-4">
                        <Icon className="size-5" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground">{item.problem}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Signature Product Loop: Capture → Understand → Decide → Act → Measure */}
        <section className="border-t border-border py-24 bg-surface">
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                The Financial Operating Loop
              </span>
              <h2 className="text-display mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                How SoloOS transforms your financial posture.
              </h2>
              <p className="mt-4 text-muted-foreground text-base">
                Five continuous disciplines working in tandem so you never doubt where your business
                stands.
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-5">
              {PRODUCT_LOOP.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.step} className="panel p-6 relative flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs font-bold text-primary">{step.step}</span>
                      <div className="flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="size-4" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                    <p className="text-xs font-semibold text-primary mt-0.5">{step.action}</p>
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed flex-1">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Safe-To-Spend Deep Dive */}
        <section className="border-t border-border bg-gradient-to-b from-muted/30 to-surface py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid gap-10 lg:grid-cols-2 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  Future Differentiator
                </span>
                <h2 className="text-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  "What can I safely spend today without risking my business?"
                </h2>
                <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                  Traditional accounting tells you what happened last month. SoloOS is engineered to
                  tell you what you can safely do{" "}
                  <span className="text-foreground font-medium">right now</span>.
                </p>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  By mathematically isolating estimated tax liabilities, upcoming recurring software
                  costs, and your required living runway, the engine reveals your true disposable
                  surplus.
                </p>

                <div className="mt-8 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">Automatic Tax Segregation:</span> Set your
                      rate and watch every dollar apportioned instantly.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">Fixed Cost Defense:</span> Retain minimum cash
                      reserves to cover operational overhead.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">Guilt-Free Owner Withdrawals:</span> Know
                      precisely how much profit you can take home.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-card p-6 sm:p-8 shadow-xl">
                <div className="border-b border-border/80 pb-4 mb-6">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Safe-To-Spend Mathematical Model
                  </span>
                  <p className="text-display text-2xl font-bold text-foreground mt-1">
                    Liquid Cash − Obligations = Safe To Spend
                  </p>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-border/40">
                    <span className="text-muted-foreground">Total Cash on Hand</span>
                    <span className="font-mono font-semibold text-foreground">$38,450.00</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/40 text-destructive">
                    <span>− Tax Liabilities Reserved (30%)</span>
                    <span className="font-mono font-semibold">−$11,535.00</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/40 text-destructive">
                    <span>− 60-Day Operating Buffer</span>
                    <span className="font-mono font-semibold">−$5,500.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 text-base">
                    <span className="font-bold text-foreground">Authoritative Safe-to-Spend</span>
                    <span className="text-display text-xl font-bold text-primary font-mono">
                      $21,415.00
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities Matrix: Live vs Upcoming */}
        <section className="border-t border-border py-24 bg-surface">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Platform Architecture
              </span>
              <h2 className="text-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Engineered with complete honesty.
              </h2>
              <p className="mt-4 text-muted-foreground">
                We believe financial tools must never fake metrics. Here is what is live and
                verified in our engine today, versus upcoming phases.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div key={cap.title} className="panel p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                          <Icon className="size-4.5" />
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                            cap.live
                              ? "bg-primary/15 text-primary border border-primary/25"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {cap.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-foreground">{cap.title}</h3>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                        {cap.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Security & Financial Integrity */}
        <section className="border-t border-border bg-muted/20 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
                <Shield className="size-3.5" />
                <span>Enterprise Invariant Standards</span>
              </div>
              <h2 className="text-display text-3xl font-bold tracking-tight sm:text-4xl">
                Rigorous financial integrity at the database layer.
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base">
                Client-side calculations lie. SoloOS delegates all financial invariants to
                PostgreSQL constraints, atomic stored procedures, and strict multi-tenant isolation.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="panel p-6 bg-card">
                <h3 className="font-semibold text-foreground text-base">Immutable Transactions</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Posted transactions cannot be deleted or silently modified. Any error requires a
                  fully tracked, auditable reversal entry.
                </p>
              </div>

              <div className="panel p-6 bg-card">
                <h3 className="font-semibold text-foreground text-base">
                  Atomic Multi-Currency RPCs
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  All balance movements execute in isolated PostgreSQL transactions (`numeric(18,
                  4)` precision) with automatic audit logging.
                </p>
              </div>

              <div className="panel p-6 bg-card">
                <h3 className="font-semibold text-foreground text-base">Tenant Isolation (RLS)</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Database Row-Level Security ensures workspaces never leak data across tenants or
                  allow unauthorized financial execution.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Conversion CTA */}
        <section className="border-t border-border py-20 bg-surface">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <h2 className="text-display text-3xl font-bold tracking-tight sm:text-5xl">
              Ready to command your independent finances?
            </h2>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Initialize your SoloOS workspace in seconds. Experience calm, authoritative financial
              control designed specifically for how you work.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  <span>Get Started with SoloOS</span>
                  <ArrowRight className="size-4 ml-2" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
              <img src={logo} width={100} height={100} alt="Solo OS Logo" />
            <span>— The Financial Operating System for Independent Professionals</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" search={{ mode: "signin" }} className="hover:text-foreground">
              Sign in
            </Link>
            <Link to="/auth" search={{ mode: "signup" }} className="hover:text-foreground">
              Create workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

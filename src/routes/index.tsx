import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  Bot,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  Gauge,
  HelpCircle,
  Landmark,
  Layers,
  Lock,
  PieChart,
  Receipt,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useState } from "react";

import logo from "@/assets/solo.png";
import { Button } from "@/components/ui/button";
import { CANONICAL_PRICES, type PricingCurrency } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "SoloOS — The Financial Operating System for Independent Professionals",
      },
      {
        name: "description",
        content:
          "Know what you earned. Know what you keep. Know what to do next. Multi-currency accounts, automated tax reserves, and your true Safe-to-Spend balance.",
      },
      {
        name: "keywords",
        content:
          "solo finance, freelance financial OS, multi-currency cashflow, safe to spend, independent professional finance, tax reserves, cash runway, invoice tracking, solo entrepreneur",
      },
      {
        property: "og:title",
        content: "SoloOS — The Financial Operating System for Independent Professionals",
      },
      {
        property: "og:description",
        content:
          "Know what you earned. Know what you keep. Know what to do next. An authoritative financial command center built for independent professionals.",
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
          "Authoritative financial control for solo businesses. Multi-currency cashflow, automated tax reserves, and true Safe-to-Spend clarity.",
      },
      { name: "twitter:image", content: "https://solo-finance-command.vercel.app/og-image.svg" },
    ],
    links: [{ rel: "canonical", href: "https://solo-finance-command.vercel.app/" }],
  }),
  component: LandingPage,
});

const PRODUCT_LOOP = [
  {
    step: "01",
    title: "Capture",
    action: "Every movement recorded",
    desc: "Multi-currency bank accounts, cash buffers, and client receivables recorded with clean categorization and zero clutter.",
    icon: Wallet,
  },
  {
    step: "02",
    title: "Understand",
    action: "True net position",
    desc: "Separate gross income from quarantined tax reserves and committed operating costs. See what is truly yours.",
    icon: PieChart,
  },
  {
    step: "03",
    title: "Decide",
    action: "Safe-to-Spend clarity",
    desc: "Stop guessing what you can withdraw. Receive exact algorithmic guardrails before paying yourself or investing in tools.",
    icon: Scale,
  },
  {
    step: "04",
    title: "Act",
    action: "Frictionless execution",
    desc: "Issue professional invoices, track receivables, pay obligations, and execute account transfers with database-backed integrity.",
    icon: Zap,
  },
  {
    step: "05",
    title: "Measure",
    action: "Authoritative history",
    desc: "Real-time cashflow trends, client and project profitability, and automated runway metrics to drive your next strategic step.",
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
    problem: "Phantom Liquidity",
    detail:
      "High gross revenue creating a dangerous illusion of wealth while unsegregated tax obligations quietly pile up.",
    icon: Gauge,
  },
  {
    problem: "Guesswork Withdrawals",
    detail:
      "Chronic anxiety over whether paying yourself today will trigger an unexpected cash crunch when bills come due.",
    icon: CreditCard,
  },
  {
    problem: "Fragile Spreadsheets",
    detail:
      "Fragile manual formulas where accidental edits, broken references, or currency conversions quietly corrupt your records.",
    icon: FileText,
  },
];

const LIVE_CAPABILITIES = [
  {
    title: "Cash & Multi-Currency Accounts",
    desc: "Track local bank accounts, foreign currency reserves, and cash holdings with unified base-currency conversion.",
    icon: Banknote,
  },
  {
    title: "Invoices & Client Billing",
    desc: "Issue professional invoices, track payment status, record partial settlements, and monitor overdue receivables.",
    icon: FileText,
  },
  {
    title: "Safe-to-Spend Engine",
    desc: "Algorithmic calculation of disposable cash after auto-withholding taxes and 30-day committed obligations.",
    icon: Scale,
  },
  {
    title: "Expense & Obligation Tracking",
    desc: "Schedule recurring subscriptions, track vendor payables, and defend your required operating runway.",
    icon: Receipt,
  },
  {
    title: "Client & Project Profitability",
    desc: "Direct linkage between billed revenue and direct expenses revealing your highest-margin clients and projects.",
    icon: Users,
  },
  {
    title: "AI CFO Financial Copilot",
    desc: "Calm, read-only financial intelligence answering questions directly from your verified transactional numbers.",
    icon: Bot,
  },
];

const FAQ_ITEMS = [
  {
    q: "How does Safe-to-Spend protect my business?",
    a: "Traditional bank balances lie by showing gross cash without accounting for future liabilities. Safe-to-Spend starts with your liquid cash, subtracts your isolated tax reserves, deducts scheduled obligations due in the next 30 days, and reserves your configured operating buffer. What remains is discretionary capital you can spend or withdraw with complete confidence.",
  },
  {
    q: "How are MWK and USD pricing handled?",
    a: "MWK 14,000/month and $8/month are intentional launch prices crafted specifically for their respective markets. They are completely independent and not a daily FX conversion. You select your preferred currency at checkout and pay through PayChangu.",
  },
  {
    q: "Can I track multiple currencies in one workspace?",
    a: "Yes. SoloOS natively supports multi-currency accounts and transactions. You can set a primary workspace base currency (such as MWK or USD), and record transactions and balances across accounts in their native currencies.",
  },
  {
    q: "What does the AI CFO actually do?",
    a: "The AI CFO is a strictly read-only financial assistant. It reads your verified workspace metrics — revenue trends, cashflow, tax reserves, and pending obligations — to answer natural-language questions about your financial health. It has no write permissions and cannot move money or modify your records.",
  },
  {
    q: "Is SoloOS double-entry accounting software?",
    a: "SoloOS is an authoritative financial operating system designed specifically for independent operators. Instead of burdening you with traditional debit/credit journals and cumbersome chart-of-accounts bookkeeping, SoloOS enforces database-level invariants, atomic account transfers, and explicit tax reserve segregation to provide reliable financial organization without unnecessary complexity.",
  },
  {
    q: "Can I get started for free?",
    a: "Yes. Our Free tier gives you full access to core bookkeeping, up to 5 clients, and up to 10 invoices per month. There is no trial expiration and no credit card required to get started.",
  },
  {
    q: "How does tax reserve planning work?",
    a: "You configure your target tax rate (for example, 25% or 30%). Whenever you record income, SoloOS calculates the designated tax allocation and protects it in your Safe-to-Spend formula. You can also track an actual designated tax reserve account in your ledger.",
  },
  {
    q: "Is my financial data secure and isolated?",
    a: "Every workspace is completely private and isolated. Only authenticated members with verified roles can access your financial records. Billing and card processing is handled securely through our payment provider.",
  },
];

function LandingPage() {
  const [currency, setCurrency] = useState<PricingCurrency>("MWK");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* ── Main Navigation ── */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img src={logo} width={70} height={36} alt="SoloOS" className="rounded-md" />
            </Link>
          </div>

          <nav className="flex items-center gap-2 sm:gap-4">
            <a
              href="#safe-to-spend"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:inline-flex"
            >
              Safe-to-Spend
            </a>
            <a
              href="#product-loop"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:inline-flex"
            >
              How it works
            </a>
            <Link
              to="/pricing"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-flex"
            >
              Pricing
            </Link>
            <Link
              to="/support"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-flex"
            >
              Support
            </Link>
            <Button asChild variant="ghost" size="sm" className="font-medium text-xs sm:text-sm">
              <Link to="/auth" search={{ mode: "signin" }}>
                Sign in
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 shadow-sm text-xs sm:text-sm font-medium">
              <Link to="/auth" search={{ mode: "signup" }}>
                <span>Start free</span>
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* ── Hero Section ── */}
        <section className="relative mx-auto max-w-6xl px-5 pt-16 pb-16 sm:pt-24 sm:pb-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
              <Landmark className="size-3.5" aria-hidden />
              <span>The Financial Operating System for Independent Professionals</span>
            </div>

            <h1 className="text-display text-4xl font-bold tracking-tight leading-[1.08] sm:text-6xl lg:text-7xl">
              Know what you earned. <br />
              Know what you keep. <br />
              <span className="text-primary">Know what to do next.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">
              SoloOS gives solo entrepreneurs, consultants, and independent operators real financial
              clarity. Multi-currency accounts, automatic tax reserves, and a Safe-to-Spend balance
              you can trust — built to be accurate, not approximate.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="gap-2 text-base px-6 h-12 shadow-md">
                <Link to="/auth" search={{ mode: "signup" }}>
                  <span>Start free</span>
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base px-6 h-12">
                <Link to="/auth" search={{ mode: "signin" }}>
                  <span>Sign in to Workspace</span>
                </Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" />
                Permanent free tier
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" />
                Multi-currency ready
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" />
                Your data stays private
              </span>
            </div>
          </div>

          {/* ── Abstract Product Architecture Visual (Strictly No Fake Numbers) ── */}
          <div className="mt-14 rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden">
            {/* Mock Window Header */}
            <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="size-2.5 rounded-full bg-border" />
                  <div className="size-2.5 rounded-full bg-border" />
                  <div className="size-2.5 rounded-full bg-border" />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground/80 ml-2 hidden sm:inline">
                  soloos.app/app — Command Center
                </span>
              </div>
            </div>

            {/* Architecture Concept Panel */}
            <div className="p-6 sm:p-8 bg-gradient-to-b from-card via-card to-muted/20">
              {/* Top Hero KPI Blueprint */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* Safe-to-Spend Dominant Card */}
                <div className="rounded-xl border-2 border-primary/30 bg-primary/[0.03] p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Safe-to-Spend
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      True Clarity
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      Discretionary Capital
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Liquid cash remaining after automatically isolating taxes, committed bills,
                      and runway.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-primary/20 flex items-center justify-between text-[11px] font-mono text-primary">
                    <span>Formula Verified</span>
                    <span>Zero Guesswork</span>
                  </div>
                </div>

                {/* Liquid Cash Card */}
                <div className="rounded-xl border border-border bg-card/70 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Liquid Cash
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      Total Assets
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-display text-2xl font-bold tracking-tight text-foreground">
                      Reconciled Accounts
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Real-time sum of checking accounts, mobile wallets, and foreign currency
                      reserves.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Local & Foreign</span>
                    <span>Atomic Balance</span>
                  </div>
                </div>

                {/* Committed Card */}
                <div className="rounded-xl border border-border bg-card/70 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Protected Reserves
                    </span>
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      Quarantined
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-display text-2xl font-bold tracking-tight text-foreground">
                      Taxes & Obligations
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Statutory tax withholdings, upcoming vendor payables, and recurring SaaS
                      subscriptions.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Auto-apportioned</span>
                    <span>30-day lookahead</span>
                  </div>
                </div>
              </div>

              {/* Formula Structure Strip */}
              <div className="mt-6 rounded-xl border border-border/80 bg-muted/40 p-4 sm:p-5">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Safe-to-Spend Structural Invariant
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-mono">
                  <span className="rounded-md bg-card border border-border px-3 py-1.5 font-semibold text-foreground">
                    Liquid Cash
                  </span>
                  <span className="text-muted-foreground font-bold">−</span>
                  <span className="rounded-md bg-card border border-border px-3 py-1.5 font-semibold text-amber-600 dark:text-amber-400">
                    Tax Reserve (%)
                  </span>
                  <span className="text-muted-foreground font-bold">−</span>
                  <span className="rounded-md bg-card border border-border px-3 py-1.5 font-semibold text-destructive">
                    Upcoming Obligations (30d)
                  </span>
                  <span className="text-muted-foreground font-bold">−</span>
                  <span className="rounded-md bg-card border border-border px-3 py-1.5 font-semibold text-muted-foreground">
                    Operating Buffer
                  </span>
                  <span className="text-primary font-bold">=</span>
                  <span className="rounded-md bg-primary/15 border border-primary/30 px-3 py-1.5 font-bold text-primary">
                    Safe-to-Spend
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Problem Section — The Fragmented Reality ── */}
        <section className="border-t border-border bg-muted/20 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                The Solo Reality
              </p>
              <h2 className="text-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Making money isn't the hardest part. <br />
                Knowing what you can safely keep is.
              </h2>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                When you run an independent practice, cash doesn't arrive as a predictable salary.
                Revenue flows in uneven lump sums, foreign exchange rates shift, and tax season
                lurks as an unquantified liability.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FRAGMENTED_REALITY.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.problem}
                    className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between shadow-sm hover:border-border/80 transition-colors"
                  >
                    <div>
                      <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-4">
                        <Icon className="size-5" aria-hidden />
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

        {/* ── Signature Concept: Safe-to-Spend ── */}
        <section
          id="safe-to-spend"
          className="border-t border-border py-24 bg-surface scroll-mt-14"
        >
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Signature Architecture
                </span>
                <h2 className="text-display mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  "What can I safely spend today without risking my business?"
                </h2>
                <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Traditional accounting tells you what happened last month. SoloOS is engineered to
                  tell you what you can safely do{" "}
                  <strong className="text-foreground">right now</strong>.
                </p>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  By mathematically isolating estimated tax liabilities, upcoming recurring
                  overhead, and your required operating buffer, SoloOS reveals your true
                  discretionary capital.
                </p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Automatic Tax Segregation
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Define your estimated tax percentage and watch reserves quarantined
                        automatically whenever client invoices settle.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        30-Day Obligation Defense
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Scheduled vendor bills and recurring software expenses are locked away so
                        you never face an unexpected cash crunch.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Guilt-Free Owner Withdrawals
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Draw your profits or purchase business equipment knowing your mandatory
                        commitments and taxes are already protected.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* The Mechanics Card */}
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
                <div className="border-b border-border/80 pb-4 mb-6">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                    Deterministic Calculation Model
                  </span>
                  <p className="text-display text-xl sm:text-2xl font-bold text-foreground mt-1">
                    Liquid Cash − Reserves = Safe-to-Spend
                  </p>
                </div>

                <div className="space-y-4 text-sm font-mono">
                  <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                    <span className="text-foreground font-sans font-medium">
                      Reconciled Cash on Hand
                    </span>
                    <span className="text-foreground font-bold">Total Liquid Assets</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-border/50 text-amber-600 dark:text-amber-400">
                    <span className="font-sans font-medium">− Quarantined Tax Reserve</span>
                    <span>Configured % of Revenue</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-border/50 text-destructive">
                    <span className="font-sans font-medium">− 30-Day Scheduled Obligations</span>
                    <span>Upcoming Vendor & SaaS</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-border/50 text-muted-foreground">
                    <span className="font-sans font-medium">− Operating Cash Runway Buffer</span>
                    <span>Minimum Safe Floor</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 text-base">
                    <span className="font-bold text-foreground font-sans">
                      Authoritative Safe-to-Spend
                    </span>
                    <span className="text-lg font-bold text-primary">Discretionary Capital</span>
                  </div>
                </div>

                <div className="mt-6 rounded-lg bg-muted/40 p-3.5 text-xs text-muted-foreground leading-relaxed font-sans">
                  Updated automatically every time an invoice is marked paid, an expense is logged,
                  or an account transfer is executed.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Signature Product Loop: Capture → Understand → Decide → Act → Measure ── */}
        <section
          id="product-loop"
          className="border-t border-border py-24 bg-muted/10 scroll-mt-14"
        >
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                The Financial Operating Loop
              </span>
              <h2 className="text-display mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Five continuous disciplines. Complete clarity.
              </h2>
              <p className="mt-4 text-muted-foreground text-base">
                SoloOS is organized around how solo operators make decisions, not how accountants
                file paperwork.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {PRODUCT_LOOP.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.step}
                    className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between shadow-sm relative group hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-mono text-xs font-bold text-primary">
                          {step.step}
                        </span>
                        <div className="flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                          <Icon className="size-4" aria-hidden />
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                      <p className="text-xs font-semibold text-primary mt-0.5">{step.action}</p>
                      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── For Whom Section ── */}
        <section className="border-t border-border py-20 bg-surface">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Target Audience
              </span>
              <h2 className="text-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Tailored for the reality of solo work.
              </h2>
              <p className="mt-4 text-muted-foreground text-base">
                Built specifically for independent professionals who do not have an in-house finance
                team.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Users className="size-4.5" />
                </div>
                <h3 className="font-bold text-foreground text-base">Independent Consultants</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Track client retainers, calculate true hourly realization, and know exactly what
                  is profit.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <BriefcaseIcon className="size-4.5" />
                </div>
                <h3 className="font-bold text-foreground text-base">Freelancers & Contractors</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Eliminate the fear of irregular income and surprise quarterly taxes with automated
                  segregation.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Building2 className="size-4.5" />
                </div>
                <h3 className="font-bold text-foreground text-base">Solo Agencies & Studios</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Manage multiple clients and project budgets without the overhead of corporate ERP
                  software.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Zap className="size-4.5" />
                </div>
                <h3 className="font-bold text-foreground text-base">Technical Founders</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Command your runway, server costs, and SaaS subscriptions with database-enforced
                  rigor.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── All Capabilities Live in Production ── */}
        <section className="border-t border-border py-24 bg-muted/20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Production Engine
              </span>
              <h2 className="text-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Every capability live. Verified in code.
              </h2>
              <p className="mt-4 text-muted-foreground text-base">
                No roadmap placeholders. SoloOS is already equipped with full financial
                capabilities.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {LIVE_CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.title}
                    className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between shadow-sm hover:border-primary/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center mb-4">
                        <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                          <Icon className="size-4.5" aria-hidden />
                        </div>
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

        {/* ── Security & Architectural Integrity ── */}
        <section className="border-t border-border bg-surface py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
                <Shield className="size-3.5" aria-hidden />
                <span>Security & Reliability</span>
              </div>
              <h2 className="text-display text-3xl font-bold tracking-tight sm:text-4xl">
                Your numbers are always accurate.
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base leading-relaxed">
                Spreadsheets drift. SoloOS keeps your balances correct at all times — every movement
                is recorded precisely, every workspace is fully private, and nothing can silently go
                wrong.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary mb-3">
                  <ShieldCheck className="size-4" />
                </div>
                <h3 className="font-semibold text-foreground text-base">
                  Complete Workspace Privacy
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Your workspace is fully isolated. No other user or workspace can ever see your
                  financial records, clients, or transactions.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary mb-3">
                  <Layers className="size-4" />
                </div>
                <h3 className="font-semibold text-foreground text-base">
                  Always-Accurate Balances
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Every transfer, payment, and entry is recorded precisely. Balances never drift,
                  round incorrectly, or silently lose a cent — all with a full audit trail.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary mb-3">
                  <Lock className="size-4" />
                </div>
                <h3 className="font-semibold text-foreground text-base">
                  AI That Advises, Never Acts
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Your AI CFO reads your financial context to give you insight. It cannot move
                  money, change records, or make decisions — only you can.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Embedded Pricing Section ── */}
        <section id="pricing" className="border-t border-border py-24 bg-muted/15 scroll-mt-14">
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Transparent Pricing
              </span>
              <h2 className="text-display mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Simple, predictable plans for solo operators.
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base">
                Start free forever, or upgrade for full financial intelligence and exports.
              </p>

              {/* Currency Toggle */}
              <div className="mt-8 inline-flex items-center rounded-full border border-border bg-card p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setCurrency("MWK")}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                    currency === "MWK"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Malawi Kwacha (MWK)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                    currency === "USD"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  US Dollars (USD)
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Independent pricing per market. Not an FX conversion.
              </p>
            </div>

            {/* Pricing Grid */}
            <div className="grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto items-stretch">
              {/* Free Plan */}
              <div className="rounded-2xl border border-border bg-card p-7 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-foreground">Free</h3>
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      Permanent
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Core financial tracking for getting started.
                  </p>
                  <div className="mt-6 mb-6">
                    <p className="text-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                      {CANONICAL_PRICES.free[currency].formatted}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">No credit card required</p>
                  </div>
                  <ul className="space-y-3 text-xs text-muted-foreground border-t border-border/60 pt-6">
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>Up to 5 active clients</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>Up to 10 invoices / month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>Cash & account tracking</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>Basic Safe-to-Spend indicator</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 pt-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Get Started Free
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Solo Plan — Highlighted */}
              <div className="rounded-2xl border-2 border-primary bg-card p-7 flex flex-col justify-between shadow-xl relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                  Most Popular
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-foreground">Solo</h3>
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      Full Engine
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Everything an independent operator needs.
                  </p>
                  <div className="mt-6 mb-6">
                    <p className="text-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                      {CANONICAL_PRICES.solo[currency].formatted}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed monthly · Cancel anytime
                    </p>
                  </div>
                  <ul className="space-y-3 text-xs text-foreground/90 border-t border-border/60 pt-6">
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>
                        <strong>Unlimited</strong> clients & invoices
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>Full Safe-to-Spend breakdown & reserves</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>Automated tax reserve planning</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>Recurring expenses & 30-day obligations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>Professional PDF invoice generation</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 pt-4">
                  <Button asChild className="w-full shadow-md">
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Start Solo Workspace
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="rounded-2xl border border-border bg-card p-7 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-foreground">Pro</h3>
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      AI & Margins
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Advanced intelligence and project margins.
                  </p>
                  <div className="mt-6 mb-6">
                    <p className="text-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                      {CANONICAL_PRICES.pro[currency].formatted}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed monthly · Cancel anytime
                    </p>
                  </div>
                  <ul className="space-y-3 text-xs text-muted-foreground border-t border-border/60 pt-6">
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>Everything in Solo plan</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>
                        <strong>AI CFO</strong> financial copilot
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>Client & project profitability engine</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-primary shrink-0" />
                      <span>Priority support response</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 pt-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Upgrade to Pro
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-center mt-10">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                Compare all features and details on the full pricing page
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── FAQ Section ── */}
        <section className="border-t border-border py-24 bg-surface">
          <div className="mx-auto max-w-4xl px-5">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Frequently Asked Questions
              </span>
              <h2 className="text-display mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Honest answers to common questions.
              </h2>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={faq.q}
                    className="rounded-xl border border-border bg-card overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(index)}
                      className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-muted-foreground shrink-0 transition-transform duration-200",
                          isOpen && "rotate-180 text-primary",
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Conversion Final CTA ── */}
        <section className="border-t border-border py-24 bg-gradient-to-b from-card via-card to-background">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
              <span>Get Started Today</span>
            </div>

            <h2 className="text-display text-3xl font-bold tracking-tight sm:text-5xl">
              Stop guessing what your money can do.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join independent consultants, freelancers, and operators who run their businesses with
              calm, authoritative financial certainty.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg gap-2">
                <Link to="/auth" search={{ mode: "signup" }}>
                  <span>Start free</span>
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <Link to="/pricing">View full pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Comprehensive Footer ── */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 pb-12 border-b border-border/60 text-xs">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <img src={logo} width={80} height={28} alt="SoloOS" className="rounded" />
              </div>
              <p className="text-muted-foreground leading-relaxed">
                The financial operating system for independent professionals. Know what you earned,
                what you keep, and what to do next.
              </p>
            </div>

            <div>
              <p className="font-semibold text-foreground mb-3 uppercase tracking-wider text-[11px]">
                Product
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#safe-to-spend" className="hover:text-foreground transition-colors">
                    Safe-to-Spend
                  </a>
                </li>
                <li>
                  <a href="#product-loop" className="hover:text-foreground transition-colors">
                    Operating Loop
                  </a>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-foreground transition-colors">
                    Pricing Plans
                  </Link>
                </li>
                <li>
                  <Link to="/support" className="hover:text-foreground transition-colors">
                    Help & Support
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-foreground mb-3 uppercase tracking-wider text-[11px]">
                Legal & Trust
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link to="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li className="flex items-center gap-1.5 pt-1 text-xs">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span>Your data is fully private</span>
                </li>
                <li className="flex items-center gap-1.5 text-xs">
                  <Lock className="size-3.5 text-primary" />
                  <span>AI advises — never acts</span>
                </li>
                <li className="flex items-center gap-1.5 text-xs">
                  <Check className="size-3.5 text-primary" />
                  <span>Secure payment processing</span>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-foreground mb-3 uppercase tracking-wider text-[11px]">
                Account
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link
                    to="/auth"
                    search={{ mode: "signin" }}
                    className="hover:text-foreground transition-colors"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    to="/auth"
                    search={{ mode: "signup" }}
                    className="hover:text-foreground transition-colors"
                  >
                    Create free workspace
                  </Link>
                </li>
                <li>
                  <Link to="/support" className="hover:text-foreground transition-colors">
                    Contact Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground border-t border-border/60">
            <p>© {new Date().getFullYear()} SoloOS. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link to="/pricing" className="hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link to="/support" className="hover:text-foreground transition-colors">
                Support
              </Link>
            </div>
            <p className="text-[11px] font-mono">
              Authoritative financial engine · Built for independent operators
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

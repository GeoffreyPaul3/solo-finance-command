import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  Info,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import { useWorkspace } from "@/components/app/workspace-context";
import { EntitlementGate } from "@/components/app/entitlement-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { safeToSpendQueryOptions } from "@/domain/cashflow";
import { workspaceReceivablesSummaryQueryOptions } from "@/domain/invoices";
import { obligationsListQueryOptions } from "@/domain/obligations";
import { taxSummaryQueryOptions } from "@/domain/tax-reserve";
import { workspaceCashSummaryQueryOptions } from "@/domain/financial";
import { commandCenterSummaryQueryOptions } from "@/domain/profitability";
import {
  calculateSoloOSFinancialHealth,
  FINANCIAL_HEALTH_DISCLAIMER,
  type HealthRating,
  type HealthDimension,
} from "@/domain/financial-health";
import { computeFinancialPulse, type FinancialPulse } from "@/domain/financial-pulse";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/intelligence")({
  head: () => ({
    meta: [
      { title: "Intelligence Hub | SoloOS" },
      {
        name: "description",
        content:
          "SoloOS Intelligence Hub: Financial Health Score, Financial Pulse, and actionable planning signals derived from your authoritative workspace data.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IntelligencePage,
});

function IntelligencePage() {
  const { entitlements } = useWorkspace();

  if (!entitlements.canAccessAnalytics) {
    return (
      <EntitlementGate
        title="Intelligence Hub"
        description="Deterministic financial health scoring, financial pulse indicators, and planning signals derived exclusively from your workspace records."
        requiredPlan="solo"
        features={[
          "SoloOS Financial Health Score (7 dimensions)",
          "Financial Pulse by currency",
          "Cash coverage and receivables analysis",
          "Tax reserve funding status",
          "Operating cash movement signals",
        ]}
      />
    );
  }

  return <IntelligenceContent />;
}

// ─── Rating config ─────────────────────────────────────────────────────────

const RATING_CONFIG: Record<
  HealthRating,
  { label: string; color: string; bg: string; Icon: typeof ShieldCheck; description: string }
> = {
  strong: {
    label: "Strong",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/25",
    Icon: ShieldCheck,
    description: "Robust cash coverage and funded reserves.",
  },
  stable: {
    label: "Stable",
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/25",
    Icon: Shield,
    description: "Solid foundation with minor optimization opportunities.",
  },
  needs_attention: {
    label: "Needs Attention",
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/25",
    Icon: ShieldAlert,
    description: "Near-term commitments or reserve shortfalls warrant review.",
  },
  vulnerable: {
    label: "Vulnerable",
    color: "text-rose-500",
    bg: "bg-rose-500/10 border-rose-500/25",
    Icon: ShieldX,
    description: "Heightened financial stress. Focus on collections and cash conservation.",
  },
  insufficient_data: {
    label: "Insufficient Data",
    color: "text-muted-foreground",
    bg: "bg-muted/50 border-border",
    Icon: Info,
    description: "Add financial accounts and transactions to generate your health score.",
  },
};

function DimensionBar({ dim }: { dim: HealthDimension }) {
  const pct = Math.round((dim.score / dim.maxScore) * 100);
  const barColor = dim.isPositive
    ? "bg-emerald-500"
    : dim.score > 0
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground/90">{dim.name}</span>
        <span
          className={cn(
            "tabular-nums font-semibold",
            dim.isPositive ? "text-emerald-500" : "text-amber-500",
          )}
        >
          {dim.score}/{dim.maxScore}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{dim.description}</p>
    </div>
  );
}

function PulseCard({ pulse }: { pulse: FinancialPulse }) {
  const statusConfig = {
    healthy: { color: "text-emerald-500", bg: "bg-emerald-500/10", Icon: TrendingUp },
    attention: { color: "text-amber-500", bg: "bg-amber-500/10", Icon: AlertTriangle },
    critical: { color: "text-rose-500", bg: "bg-rose-500/10", Icon: TrendingDown },
    incomplete: { color: "text-muted-foreground", bg: "bg-muted/50", Icon: Info },
  } as const;

  const cfg = statusConfig[pulse.status];
  const Icon = cfg.Icon;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">
            {pulse.currency} Position
            {pulse.isPrimaryCurrency && (
              <Badge
                variant="outline"
                className="ml-2 text-[10px] px-1.5 py-0 border-primary/40 text-primary"
              >
                Primary
              </Badge>
            )}
          </CardTitle>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
              cfg.bg,
              cfg.color,
            )}
          >
            <Icon className="size-3" />
            {pulse.statusLabel}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <p className="text-muted-foreground">Liquid Cash</p>
            <p className="font-semibold text-foreground tabular-nums">
              {formatMoney(pulse.liquidCash, pulse.currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Safe-to-Spend</p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                pulse.safeToSpend >= 0 ? "text-foreground" : "text-rose-500",
              )}
            >
              {formatMoney(pulse.safeToSpend, pulse.currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Receivables</p>
            <p className="font-semibold text-foreground tabular-nums">
              {formatMoney(pulse.outstandingReceivables, pulse.currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Obligations (30d)</p>
            <p className="font-semibold text-foreground tabular-nums">
              {formatMoney(pulse.upcomingObligations, pulse.currency)}
            </p>
          </div>
        </div>

        {pulse.cashCoverageRatio !== null && (
          <div className="pt-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Cash vs. Obligations</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  pulse.cashCoverageRatio >= 1 ? "text-emerald-500" : "text-rose-500",
                )}
              >
                {pulse.cashCoverageRatio.toFixed(1)}×
              </span>
            </div>
            <Progress
              value={Math.min(100, pulse.cashCoverageRatio * 50)}
              className="h-1 bg-muted"
            />
          </div>
        )}

        {pulse.targetTaxReserve > 0 && (
          <div className="pt-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tax Reserve Funded</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  pulse.taxReserveFundedPercent >= 100 ? "text-emerald-500" : "text-amber-500",
                )}
              >
                {pulse.taxReserveFundedPercent.toFixed(0)}%
              </span>
            </div>
            <Progress value={pulse.taxReserveFundedPercent} className="h-1 bg-muted" />
          </div>
        )}

        {pulse.statusDescription && pulse.status !== "incomplete" && (
          <p className="text-[11px] text-muted-foreground border-t border-border pt-2 mt-1">
            {pulse.statusDescription}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function IntelligenceContent() {
  const { workspace } = useWorkspace();
  const wid = workspace.id;
  const currency = workspace.currency ?? "USD";

  const cashQuery = useQuery(workspaceCashSummaryQueryOptions(wid));
  const stsQuery = useQuery(safeToSpendQueryOptions(wid));
  const receivablesQuery = useQuery(workspaceReceivablesSummaryQueryOptions(wid));
  const obligationsQuery = useQuery(obligationsListQueryOptions(wid, { status: "all_active" }));
  const taxQuery = useQuery(taxSummaryQueryOptions(wid));
  const perfQuery = useQuery(commandCenterSummaryQueryOptions(wid));

  const isLoading =
    cashQuery.isLoading ||
    stsQuery.isLoading ||
    receivablesQuery.isLoading ||
    obligationsQuery.isLoading ||
    taxQuery.isLoading;

  const pulses = useMemo<FinancialPulse[]>(() => {
    const stsList = stsQuery.data ?? [];
    if (stsList.length === 0) return [];

    const taxSummaries = taxQuery.data ?? [];
    const obligations = obligationsQuery.data ?? [];
    const cashPositions = cashQuery.data?.positions ?? [];

    const today = new Date().toISOString().slice(0, 10);
    const cutoff30d = new Date();
    cutoff30d.setDate(cutoff30d.getDate() + 30);

    return stsList.map((sts) => {
      const taxS = taxSummaries.find((t) => t.currency === sts.currency);
      const cashPos = cashPositions.find((p) => p.currency === sts.currency);

      // Upcoming obligations in this currency within 30 days
      const upcoming30d = obligations
        .filter(
          (o) =>
            o.currency === sts.currency &&
            o.due_date &&
            new Date(o.due_date) <= cutoff30d &&
            o.status !== "paid" &&
            o.status !== "cancelled",
        )
        .reduce((acc, o) => acc + Number(o.amount), 0);

      const perf = (perfQuery.data ?? []).find((p) => p.currency === sts.currency);

      return computeFinancialPulse({
        currency: sts.currency,
        liquidCash: cashPos?.totalBalance ?? 0,
        safeToSpend: sts.currentSafeToSpend,
        outstandingReceivables: Number(receivablesQuery.data?.total_outstanding ?? 0),
        upcomingObligations: upcoming30d,
        actualTaxReserve: taxS?.trackedTaxReserve ?? 0,
        targetTaxReserve: taxS?.targetTaxReserve ?? 0,
        taxShortfall: taxS?.shortfall ?? 0,
        currentPeriodIncome: perf?.total_revenue ?? 0,
        currentPeriodExpenses: perf?.total_expenses ?? 0,
        currentPeriodProfit: (perf?.total_revenue ?? 0) - (perf?.total_expenses ?? 0),
        isPrimaryCurrency: sts.currency === currency,
      });
    });
  }, [
    stsQuery.data,
    taxQuery.data,
    obligationsQuery.data,
    cashQuery.data,
    receivablesQuery.data,
    perfQuery.data,
    currency,
  ]);

  const healthScore = useMemo(() => {
    const primaryPulse = pulses.find((p) => p.isPrimaryCurrency) ?? pulses[0];
    if (!primaryPulse) {
      return calculateSoloOSFinancialHealth({
        currency,
        liquidCash: 0,
        safeToSpend: 0,
        totalReceivables: 0,
        overdueReceivables: 0,
        upcomingObligations: 0,
        operatingBuffer: 0,
        actualTaxReserve: 0,
        targetTaxReserve: 0,
        taxShortfall: 0,
        currentPeriodIncome: 0,
        currentPeriodExpenses: 0,
        hasActiveAccounts: false,
      });
    }

    const taxS = (taxQuery.data ?? []).find((t) => t.currency === primaryPulse.currency);
    const cashSummary = cashQuery.data;
    const hasActiveAccounts = (cashSummary?.totalAccounts ?? 0) > 0;
    const receivables = receivablesQuery.data;

    return calculateSoloOSFinancialHealth({
      currency: primaryPulse.currency,
      liquidCash: primaryPulse.liquidCash,
      safeToSpend: primaryPulse.safeToSpend,
      totalReceivables: Number(receivables?.total_outstanding ?? 0),
      overdueReceivables: Number(receivables?.total_overdue ?? 0),
      upcomingObligations: primaryPulse.upcomingObligations,
      operatingBuffer: 0,
      actualTaxReserve: primaryPulse.actualTaxReserve,
      targetTaxReserve: primaryPulse.targetTaxReserve,
      taxShortfall: primaryPulse.taxShortfall,
      currentPeriodIncome: primaryPulse.currentPeriodIncome,
      currentPeriodExpenses: primaryPulse.currentPeriodExpenses,
      hasActiveAccounts,
    });
  }, [pulses, taxQuery.data, cashQuery.data, receivablesQuery.data, currency]);

  const ratingConfig = RATING_CONFIG[healthScore.rating];
  const RatingIcon = ratingConfig.Icon;

  return (
    <div className="mx-auto max-w-[1100px] space-y-10 pb-20">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70 mb-2">
          <Activity className="size-3.5" />
          Intelligence Hub
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Financial Intelligence
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Deterministic planning signals derived exclusively from your authoritative workspace
          records. No external benchmarks, no fabricated figures.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Financial Health Score ────────────────────────────────── */}
          <section aria-labelledby="health-score-heading">
            <h2
              id="health-score-heading"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4"
            >
              SoloOS Financial Health
            </h2>

            <div className={cn("rounded-xl border p-6 sm:p-8", ratingConfig.bg)}>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                {/* Score circle */}
                <div className="flex-shrink-0">
                  <div
                    className={cn(
                      "flex h-24 w-24 flex-col items-center justify-center rounded-full border-4",
                      ratingConfig.color,
                      "border-current",
                    )}
                  >
                    {healthScore.isInsufficientData ? (
                      <Info className="size-8 opacity-60" />
                    ) : (
                      <>
                        <span
                          className={cn(
                            "text-3xl font-extrabold tabular-nums leading-none",
                            ratingConfig.color,
                          )}
                        >
                          {healthScore.score}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                          / 100
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Rating + summary */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <RatingIcon className={cn("size-5", ratingConfig.color)} />
                    <h3 className={cn("text-lg font-bold", ratingConfig.color)}>
                      {ratingConfig.label}
                    </h3>
                  </div>
                  <p className="text-sm text-foreground/80">{healthScore.summary}</p>

                  {/* Reason pills */}
                  {healthScore.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {healthScore.reasons.map((r, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px]",
                            r.type === "positive"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-amber-500/10 text-amber-600",
                          )}
                        >
                          {r.type === "positive" ? (
                            <CheckCircle2 className="size-3 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="size-3 flex-shrink-0" />
                          )}
                          {r.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dimension bars */}
              {!healthScore.isInsufficientData && healthScore.dimensions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-current/10">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Scoring Dimensions
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {healthScore.dimensions.map((dim) => (
                      <DimensionBar key={dim.id} dim={dim} />
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="mt-5 pt-4 border-t border-current/10">
                <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground/70">
                  <Info className="size-3 flex-shrink-0 mt-0.5" />
                  {FINANCIAL_HEALTH_DISCLAIMER}
                </p>
              </div>
            </div>
          </section>

          {/* ── Financial Pulse by Currency ───────────────────────────── */}
          {pulses.length > 0 && (
            <section aria-labelledby="pulse-heading">
              <div className="flex items-center justify-between mb-4">
                <h2
                  id="pulse-heading"
                  className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60"
                >
                  Financial Pulse
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  Per-currency position snapshot
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pulses.map((pulse) => (
                  <PulseCard key={pulse.currency} pulse={pulse} />
                ))}
              </div>
            </section>
          )}

          {/* ── Quick Links ───────────────────────────────────────────── */}
          <section aria-labelledby="quick-links-heading">
            <h2
              id="quick-links-heading"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4"
            >
              Planning Actions
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  to: "/app/follow-ups",
                  Icon: Zap,
                  label: "Invoice Follow-ups",
                  desc: "Review overdue and approaching-due invoices.",
                  color: "text-amber-500",
                  bg: "bg-amber-500/8",
                },
                {
                  to: "/app/goals",
                  Icon: BarChart2,
                  label: "Financial Goals",
                  desc: "Plan and track your financial milestones.",
                  color: "text-blue-500",
                  bg: "bg-blue-500/8",
                },
                {
                  to: "/app/taxes",
                  Icon: Wallet,
                  label: "Tax Reserve",
                  desc: "Manage your tax planning designations.",
                  color: "text-violet-500",
                  bg: "bg-violet-500/8",
                },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-primary/5 transition-all duration-150"
                >
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg flex-shrink-0",
                      link.bg,
                    )}
                  >
                    <link.Icon className={cn("size-4.5", link.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {link.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{link.desc}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary/60 flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

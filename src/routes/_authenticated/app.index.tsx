import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Calculator,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  FileText,
  Gauge,
  History,
  Lightbulb,
  Minus,
  Plus,
  Receipt,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useWorkspace } from "@/components/app/workspace-context";
import { DashboardCharts } from "@/components/app/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyValueBlock } from "@/components/ui/money-value";
import { transactionsQueryOptions, workspaceCashSummaryQueryOptions } from "@/domain/financial";
import {
  invoicesQueryOptions,
  workspaceReceivablesSummaryQueryOptions,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/domain/invoices";
import { commandCenterSummaryQueryOptions } from "@/domain/profitability";
import { insightsQueryOptions } from "@/domain/insights";
import { safeToSpendQueryOptions } from "@/domain/cashflow";
import { obligationsListQueryOptions } from "@/domain/obligations";
import { taxSummaryQueryOptions } from "@/domain/tax-reserve";
import { FinancialPulseCard } from "@/components/app/financial-pulse";
import { FinancialBriefCard } from "@/components/app/financial-brief";
import { computeFinancialPulse } from "@/domain/financial-pulse";
import { calculateSoloOSFinancialHealth } from "@/domain/financial-health";
import { generateFinancialBrief } from "@/domain/financial-brief";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Command Center | SoloOS" },
      {
        name: "description",
        content:
          "SoloOS Command Center: see your safe-to-spend, liquid cash, receivables, obligations and financial pulse at a glance.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CommandCenter,
});

/** Returns time-appropriate greeting */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Skeleton shimmer block */
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-pulse rounded", className)} />;
}

function CommandCenter() {
  const { workspace, profile, role } = useWorkspace();
  const firstName = profile?.full_name?.split(" ")[0];
  const canMutate = role === "owner" || role === "admin" || role === "finance";
  const greeting = getGreeting();

  // Authoritative queries — preserve existing data layer exactly
  const cashSummaryQuery = useQuery(workspaceCashSummaryQueryOptions(workspace.id));
  const recentTransactionsQuery = useQuery(transactionsQueryOptions(workspace.id, { limit: 8 }));
  const receivablesQuery = useQuery(workspaceReceivablesSummaryQueryOptions(workspace.id));
  const recentInvoicesQuery = useQuery(invoicesQueryOptions(workspace.id));
  const performanceQuery = useQuery(commandCenterSummaryQueryOptions(workspace.id));
  const insightsQuery = useQuery(insightsQueryOptions(workspace.id));
  const stsQuery = useQuery(safeToSpendQueryOptions(workspace.id));
  const obligationsQuery = useQuery(
    obligationsListQueryOptions(workspace.id, { status: "all_active" }),
  );
  const taxSummaryQuery = useQuery(taxSummaryQueryOptions(workspace.id));

  const cashSummary = cashSummaryQuery.data;
  const recentTransactions = recentTransactionsQuery.data ?? [];
  const receivables = receivablesQuery.data;
  const recentInvoices = (recentInvoicesQuery.data ?? []).slice(0, 6);
  const performanceMetrics = performanceQuery.data ?? [];
  const allInsights = insightsQuery.data ?? [];
  const safeToSpendList = stsQuery.data ?? [];
  const rawObligations = obligationsQuery.data;
  const activeObligations = useMemo(() => rawObligations ?? [], [rawObligations]);
  const taxSummaries = taxSummaryQuery.data ?? [];

  const attentionItems = allInsights.filter(
    (i) => i.severity === "warning" || i.severity === "attention",
  );
  const hasAccounts = (cashSummary?.totalAccounts ?? 0) > 0;

  const [expandedStsCurrency, setExpandedStsCurrency] = useState<string | null>(null);

  // Upcoming obligations within 30 days for commitments section
  const upcomingObligations = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 30);
    return activeObligations
      .filter((o) => o.due_date && new Date(o.due_date) <= cutoff)
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, 5);
  }, [activeObligations]);

  const primarySts =
    safeToSpendList.find((s) => s.currency === workspace.currency) ?? safeToSpendList[0];
  const primaryTax = taxSummaries.find(
    (t) => t.currency === (primarySts?.currency ?? workspace.currency),
  );
  const primaryCash = cashSummary?.positions.find(
    (p) => p.currency === (primarySts?.currency ?? workspace.currency),
  );
  const primaryPerf = performanceMetrics.find(
    (p) => p.currency === (primarySts?.currency ?? workspace.currency),
  );

  const primaryPulse = useMemo(() => {
    if (!primarySts) return null;
    const curr = primarySts.currency;
    const upcoming30d = activeObligations
      .filter((o) => o.currency === curr && o.status !== "paid" && o.status !== "cancelled")
      .reduce((acc, o) => acc + Number(o.amount), 0);

    return computeFinancialPulse({
      currency: curr,
      liquidCash: primaryCash?.totalBalance ?? 0,
      safeToSpend: primarySts.currentSafeToSpend,
      outstandingReceivables: Number(receivables?.total_outstanding ?? 0),
      upcomingObligations: upcoming30d,
      actualTaxReserve: primaryTax?.trackedTaxReserve ?? 0,
      targetTaxReserve: primaryTax?.targetTaxReserve ?? 0,
      taxShortfall: primaryTax?.shortfall ?? 0,
      currentPeriodIncome: primaryPerf?.total_revenue ?? 0,
      currentPeriodExpenses: primaryPerf?.total_expenses ?? 0,
      currentPeriodProfit: (primaryPerf?.total_revenue ?? 0) - (primaryPerf?.total_expenses ?? 0),
      isPrimaryCurrency: true,
    });
  }, [primarySts, primaryCash, receivables, primaryTax, primaryPerf, activeObligations]);

  const healthScore = useMemo(() => {
    if (!primaryPulse) return null;
    return calculateSoloOSFinancialHealth({
      currency: primaryPulse.currency,
      liquidCash: primaryPulse.liquidCash,
      safeToSpend: primaryPulse.safeToSpend,
      totalReceivables: Number(receivables?.total_outstanding ?? 0),
      overdueReceivables: Number(receivables?.total_overdue ?? 0),
      upcomingObligations: primaryPulse.upcomingObligations,
      operatingBuffer: primarySts?.operatingBuffer ?? 0,
      actualTaxReserve: primaryPulse.actualTaxReserve,
      targetTaxReserve: primaryPulse.targetTaxReserve,
      taxShortfall: primaryPulse.taxShortfall,
      currentPeriodIncome: primaryPulse.currentPeriodIncome,
      currentPeriodExpenses: primaryPulse.currentPeriodExpenses,
      hasActiveAccounts: hasAccounts,
    });
  }, [primaryPulse, receivables, primarySts, hasAccounts]);

  const financialBrief = useMemo(() => {
    if (!primaryPulse) return null;

    const now = new Date();
    const in7d = new Date(now);
    in7d.setDate(in7d.getDate() + 7);
    const in14d = new Date(now);
    in14d.setDate(in14d.getDate() + 14);
    const ago30d = new Date(now);
    ago30d.setDate(ago30d.getDate() - 30);

    const overdueInvoices = recentInvoices.filter((i) => i.status === "overdue");
    const dueSoonInvoices = recentInvoices.filter(
      (i) =>
        (i.status === "sent" || i.status === "partially_paid") &&
        i.due_date &&
        new Date(i.due_date) > now &&
        new Date(i.due_date) <= in14d,
    );
    const obligationsDue7d = activeObligations.filter(
      (o) =>
        o.due_date &&
        new Date(o.due_date) > now &&
        new Date(o.due_date) <= in7d &&
        o.status !== "paid" &&
        o.status !== "cancelled",
    );
    const recentPayments = recentTransactions.filter(
      (t) => t.transaction_type === "income" && t.created_at && new Date(t.created_at) >= ago30d,
    );

    return generateFinancialBrief({
      pulse: primaryPulse,
      overdueInvoicesCount: overdueInvoices.length,
      overdueInvoicesTotal: overdueInvoices.reduce((s, i) => s + Number(i.amount_due ?? 0), 0),
      dueSoonInvoicesCount: dueSoonInvoices.length,
      dueSoonInvoicesTotal: dueSoonInvoices.reduce((s, i) => s + Number(i.amount_due ?? 0), 0),
      obligationsDue7dCount: obligationsDue7d.length,
      obligationsDue7dTotal: obligationsDue7d.reduce((s, o) => s + Number(o.amount ?? 0), 0),
      recentPaymentsCount: recentPayments.length,
      recentPaymentsTotal: recentPayments.reduce((s, t) => s + Number(t.amount ?? 0), 0),
    });
  }, [primaryPulse, recentInvoices, activeObligations, recentTransactions]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-10 pb-20">
      {/* ═══════════════════════════════════════════════════════
          GREETING HEADER
      ═══════════════════════════════════════════════════════ */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
            {today}
          </p>
          <h1 className="text-display mt-1 text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            {greeting}
            {firstName ? `, ${firstName}.` : "."}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Here's where your business stands today.
          </p>
        </div>

        {canMutate && (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline" className="gap-1.5 h-9">
              <Link to="/app/invoices">
                <FileText className="size-3.5 text-primary" aria-hidden />
                Create invoice
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 h-9">
              <Link to="/app/cash">
                <Plus className="size-3.5" aria-hidden />
                Record transaction
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════
          HERO FINANCIAL PANEL
          Answers: What do I have? What can I safely spend?
      ═══════════════════════════════════════════════════════ */}
      <section aria-labelledby="hero-financial">
        <h2 id="hero-financial" className="sr-only">
          Financial position
        </h2>

        {hasAccounts && safeToSpendList.length > 0 ? (
          <div className="space-y-3">
            {safeToSpendList.map((sts) => {
              const isExpanded = expandedStsCurrency === sts.currency;
              const isHealthy = sts.currentSafeToSpend >= 0;
              // Matching cash position for this currency
              const cashPos = cashSummary?.positions.find((p) => p.currency === sts.currency);

              return (
                <div
                  key={sts.currency}
                  className="rounded-xl border border-border bg-card overflow-hidden shadow-panel"
                >
                  {/* Three-column hero row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
                    {/* ── Safe to Spend (dominant) ── */}
                    <div
                      className={cn(
                        "sm:col-span-1 p-6 sm:p-7 flex flex-col",
                        isHealthy ? "bg-primary/[0.03]" : "bg-destructive/[0.03]",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Scale
                            className={cn(
                              "size-3.5 shrink-0",
                              isHealthy ? "text-primary" : "text-destructive",
                            )}
                            aria-hidden
                          />
                          <span className="section-label">Safe to Spend</span>
                        </div>
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            isHealthy
                              ? "bg-primary/10 text-primary"
                              : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {isHealthy ? sts.currency : "Deficit"}
                        </span>
                      </div>

                      <div className="mt-4 flex-1">
                        <p
                          className={cn(
                            "text-financial-hero text-3xl sm:text-4xl font-bold numeric leading-none",
                            isHealthy ? "text-foreground" : "text-destructive",
                          )}
                          aria-label={`Safe to Spend: ${formatMoney(sts.currentSafeToSpend, sts.currency)}`}
                        >
                          <span className="text-sm font-semibold text-muted-foreground mr-1.5">
                            {sts.currency}
                          </span>
                          {Math.abs(sts.currentSafeToSpend).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed max-w-[260px]">
                          Available after tracked reserves, known obligations and operating buffer.
                        </p>
                      </div>

                      <button
                        onClick={() => setExpandedStsCurrency(isExpanded ? null : sts.currency)}
                        className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors w-fit"
                        aria-expanded={isExpanded}
                        aria-controls={`sts-breakdown-${sts.currency}`}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="size-3" aria-hidden />
                            Hide breakdown
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-3" aria-hidden />
                            View breakdown
                          </>
                        )}
                      </button>
                    </div>

                    {/* ── Liquid Cash ── */}
                    <div className="p-6 flex flex-col justify-between bg-card">
                      <div>
                        <div className="flex items-center gap-1.5 mb-4">
                          <Wallet className="size-3.5 text-muted-foreground/70" aria-hidden />
                          <span className="section-label">Liquid Cash</span>
                        </div>
                        {cashPos ? (
                          <>
                            <p className="text-financial-hero text-2xl font-bold numeric text-foreground leading-none">
                              <span className="text-xs font-semibold text-muted-foreground mr-1">
                                {sts.currency}
                              </span>
                              {sts.liquidCash.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              {cashPos.activeAccounts} active account
                              {cashPos.activeAccounts !== 1 ? "s" : ""}
                            </p>
                          </>
                        ) : (
                          <p className="text-2xl font-bold text-muted-foreground">—</p>
                        )}
                      </div>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="w-fit mt-4 text-[11px] text-primary hover:text-primary h-7 px-0"
                      >
                        <Link to="/app/cash">
                          View accounts <ArrowRight className="ml-1 size-3" aria-hidden />
                        </Link>
                      </Button>
                    </div>

                    {/* ── Committed ── */}
                    <div className="p-6 flex flex-col justify-between bg-card">
                      <div>
                        <div className="flex items-center gap-1.5 mb-4">
                          <Clock className="size-3.5 text-muted-foreground/70" aria-hidden />
                          <span className="section-label">Committed</span>
                        </div>
                        <p className="text-financial-hero text-2xl font-bold numeric text-foreground leading-none">
                          <span className="text-xs font-semibold text-muted-foreground mr-1">
                            {sts.currency}
                          </span>
                          {sts.upcomingObligations30d.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {activeObligations.length} obligation
                          {activeObligations.length !== 1 ? "s" : ""} in the next 30 days
                        </p>
                      </div>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="w-fit mt-4 text-[11px] text-primary hover:text-primary h-7 px-0"
                      >
                        <Link to="/app/obligations">
                          View obligations <ArrowRight className="ml-1 size-3" aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* ── STS Breakdown (toggled) ── */}
                  {isExpanded && (
                    <div
                      id={`sts-breakdown-${sts.currency}`}
                      className="border-t border-border/60 bg-muted/20 px-6 py-5"
                      role="region"
                      aria-label="Safe-to-Spend breakdown"
                    >
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-4">
                        How Safe-to-Spend is calculated
                      </p>
                      <div className="space-y-2 text-[13px] max-w-lg">
                        <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Plus className="size-3 text-emerald-600" aria-hidden />
                            Liquid Cash
                          </span>
                          <span className="font-mono font-semibold text-foreground numeric">
                            {formatMoney(sts.liquidCash, sts.currency)}
                          </span>
                        </div>
                        {sts.trackedTaxReserve > 0 && (
                          <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Minus className="size-3 text-amber-500" aria-hidden />
                              Tracked Tax Reserve
                            </span>
                            <span className="font-mono font-semibold text-amber-600 dark:text-amber-400 numeric">
                              {formatMoney(sts.trackedTaxReserve, sts.currency)}
                            </span>
                          </div>
                        )}
                        {sts.upcomingObligations30d > 0 && (
                          <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Minus className="size-3 text-rose-500" aria-hidden />
                              Obligations (next 30 days)
                            </span>
                            <span className="font-mono font-semibold text-rose-600 dark:text-rose-400 numeric">
                              {formatMoney(sts.upcomingObligations30d, sts.currency)}
                            </span>
                          </div>
                        )}
                        {sts.isPrimaryCurrency && sts.operatingBuffer > 0 && (
                          <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Minus className="size-3 text-muted-foreground/60" aria-hidden />
                              Operating Buffer
                            </span>
                            <span className="font-mono font-semibold text-muted-foreground numeric">
                              {formatMoney(sts.operatingBuffer, sts.currency)}
                            </span>
                          </div>
                        )}
                        {sts.expectedCollections30d > 0 && (
                          <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Plus className="size-3 text-emerald-500" aria-hidden />
                              Expected Collections (30d)
                            </span>
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 numeric">
                              {formatMoney(sts.expectedCollections30d, sts.currency)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-3">
                          <span className="font-semibold text-foreground flex items-center gap-2">
                            <Scale className="size-3.5 text-primary" aria-hidden />
                            Safe to Spend
                          </span>
                          <span
                            className={cn(
                              "font-mono font-bold text-base numeric",
                              isHealthy ? "text-primary" : "text-destructive",
                            )}
                          >
                            {formatMoney(sts.currentSafeToSpend, sts.currency)}
                          </span>
                        </div>
                        {sts.projectedSafeToSpend !== sts.currentSafeToSpend && (
                          <p className="text-[11px] text-muted-foreground pt-1">
                            Projected in 30 days:{" "}
                            <span className="font-mono font-semibold">
                              {formatMoney(sts.projectedSafeToSpend, sts.currency)}
                            </span>{" "}
                            <span className="text-muted-foreground/60">
                              (includes expected collections)
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : hasAccounts ? (
          /* Has accounts but no STS data yet — show liquid cash only */
          <div className="rounded-xl border border-border bg-card p-6 sm:p-7">
            <div className="flex items-center gap-1.5 mb-4">
              <Scale className="size-3.5 text-primary" aria-hidden />
              <span className="section-label">Financial Position</span>
            </div>
            {cashSummaryQuery.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cashSummary?.positions.map((pos) => (
                  <div key={pos.currency}>
                    <p className="section-label mb-2">{pos.currency} Cash</p>
                    <p className="text-financial-hero text-3xl font-bold numeric text-foreground">
                      {formatMoney(pos.totalBalance, pos.currency)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {pos.activeAccounts} account{pos.activeAccounts !== 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[12px] text-muted-foreground">
              Set up obligations and a tax reserve to activate Safe-to-Spend.
            </p>
          </div>
        ) : (
          /* No accounts — onboarding empty state */
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="size-7" aria-hidden />
            </div>
            <h2 className="text-display text-xl font-bold tracking-tight text-foreground">
              Your financial picture starts here.
            </h2>
            <p className="mt-3 text-[13px] text-muted-foreground max-w-md mx-auto leading-relaxed">
              Record your first financial account — a bank account, mobile money wallet, or cash
              balance — and SoloOS will begin tracking your real position.
            </p>
            <p className="mt-3 text-[12px] text-muted-foreground/70 max-w-md mx-auto">
              Once you have accounts, transactions, invoices and obligations, you'll see
              Safe-to-Spend: the one number that tells you what you can actually spend today.
            </p>
            {canMutate && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild size="sm" className="gap-1.5">
                  <Link to="/app/cash">
                    <Plus className="size-4" aria-hidden />
                    Add your first account
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to="/app/invoices">
                    <FileText className="size-4" aria-hidden />
                    Create an invoice
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          FINANCIAL PULSE & HEALTH + EXECUTIVE FINANCIAL BRIEF
          Answers: What is my SoloOS Financial Health score? What needs attention?
      ═══════════════════════════════════════════════════════ */}
      {hasAccounts && primaryPulse && healthScore && (
        <section aria-labelledby="pulse-and-brief" className="grid gap-6 lg:grid-cols-2">
          <h2 id="pulse-and-brief" className="sr-only">
            SoloOS Financial Health and Intelligence Brief
          </h2>
          <FinancialPulseCard pulse={primaryPulse} health={healthScore} />
          {financialBrief && <FinancialBriefCard brief={financialBrief} />}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          DASHBOARD VISUALIZATION & CHARTS
          Answers: How is cash moving? What is receivables posture?
      ═══════════════════════════════════════════════════════ */}
      {hasAccounts && (
        <section aria-labelledby="cashflow-visuals">
          <h2 id="cashflow-visuals" className="sr-only">
            Financial trends and receivables
          </h2>
          <DashboardCharts
            transactions={recentTransactions}
            invoices={recentInvoicesQuery.data ?? []}
            currency={workspace.currency ?? "USD"}
          />
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          MONEY IN / COMMITTED — two-column
          Answers: What is coming in? What is committed?
      ═══════════════════════════════════════════════════════ */}
      {hasAccounts && (
        <section aria-labelledby="money-flow" className="grid gap-6 lg:grid-cols-2">
          {/* Money coming in */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <h2 id="money-in" className="text-[13px] font-semibold text-foreground">
                  Money coming in
                </h2>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-[11px] text-primary h-7 px-2"
              >
                <Link to="/app/invoices">
                  View receivables <ArrowRight className="ml-1 size-3" aria-hidden />
                </Link>
              </Button>
            </div>

            {receivablesQuery.isPending ? (
              <div className="p-5 space-y-3">
                {[1, 2].map((n) => (
                  <Skeleton key={n} className="h-5 w-full" />
                ))}
              </div>
            ) : receivables ? (
              <>
                <div className="grid grid-cols-2 divide-x divide-border/50">
                  <div className="p-5">
                    <p className="section-label mb-2">Outstanding</p>
                    <MoneyValueBlock
                      value={receivables.total_outstanding}
                      currency={workspace.currency ?? "USD"}
                      size="lg"
                      className="text-foreground"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {receivables.active_invoice_count} active invoice
                      {receivables.active_invoice_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="p-5">
                    <p className="section-label mb-2 text-destructive/80">Overdue</p>
                    <MoneyValueBlock
                      value={receivables.total_overdue}
                      currency={workspace.currency ?? "USD"}
                      size="lg"
                      className={
                        receivables.total_overdue > 0 ? "text-destructive" : "text-muted-foreground"
                      }
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">Needs follow-up</p>
                  </div>
                </div>

                {/* Recent invoices */}
                {recentInvoices.length > 0 && (
                  <div className="border-t border-border/50 divide-y divide-border/40">
                    {recentInvoices.map((inv) => {
                      const colors = INVOICE_STATUS_COLORS[inv.status];
                      return (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between px-5 py-3 text-sm hover:bg-muted/30 transition-colors"
                        >
                          <div className="min-w-0">
                            <Link
                              to="/app/invoices/$invoiceId"
                              params={{ invoiceId: inv.id }}
                              className="font-mono text-[12px] font-semibold text-primary hover:underline"
                            >
                              {inv.invoice_number}
                            </Link>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {inv.client?.name ?? "Client"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 pl-3">
                            <span className="font-mono text-[12px] font-semibold text-foreground numeric">
                              {formatMoney(inv.total, inv.currency)}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] uppercase font-bold tracking-wide h-5 px-1.5",
                                colors.bg,
                                colors.text,
                                colors.border,
                              )}
                            >
                              {INVOICE_STATUS_LABELS[inv.status]}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {receivables.active_invoice_count === 0 && (
                  <div className="p-5 text-center">
                    <p className="text-[12px] text-muted-foreground">No outstanding invoices.</p>
                    {canMutate && (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-[12px] text-primary h-7"
                      >
                        <Link to="/app/invoices">
                          <FileText className="mr-1.5 size-3.5" aria-hidden />
                          Create an invoice
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="p-5 text-center">
                <FileText className="size-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden />
                <p className="text-[12px] text-muted-foreground font-medium">No invoices yet</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Invoices help you track money clients owe you.
                </p>
                {canMutate && (
                  <Button asChild size="sm" className="mt-3 gap-1.5">
                    <Link to="/app/invoices">
                      <Plus className="size-3.5" aria-hidden />
                      Create your first invoice
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Committed outflows */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <TrendingDown className="size-4 text-muted-foreground" aria-hidden />
                <h2 id="committed" className="text-[13px] font-semibold text-foreground">
                  Committed
                </h2>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-[11px] text-primary h-7 px-2"
              >
                <Link to="/app/obligations">
                  View obligations <ArrowRight className="ml-1 size-3" aria-hidden />
                </Link>
              </Button>
            </div>

            {obligationsQuery.isPending ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map((n) => (
                  <Skeleton key={n} className="h-5 w-full" />
                ))}
              </div>
            ) : upcomingObligations.length > 0 ? (
              <div className="divide-y divide-border/40">
                {upcomingObligations.map((ob) => {
                  const dueDate = ob.due_date ? new Date(ob.due_date) : null;
                  const daysUntil = dueDate
                    ? Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000)
                    : null;
                  const isOverdue = daysUntil !== null && daysUntil < 0;
                  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;

                  return (
                    <div
                      key={ob.id}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {ob.title}
                        </p>
                        {dueDate && (
                          <p
                            className={cn(
                              "text-[11px] mt-0.5",
                              isOverdue
                                ? "text-destructive font-medium"
                                : isDueSoon
                                  ? "text-amber-600 dark:text-amber-400 font-medium"
                                  : "text-muted-foreground",
                            )}
                          >
                            {isOverdue
                              ? `Overdue by ${Math.abs(daysUntil!)} day${Math.abs(daysUntil!) !== 1 ? "s" : ""}`
                              : daysUntil === 0
                                ? "Due today"
                                : `Due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-[12px] font-semibold text-foreground shrink-0 pl-3 numeric">
                        {formatMoney(Number(ob.amount), workspace.currency ?? "USD")}
                      </span>
                    </div>
                  );
                })}
                {activeObligations.length > upcomingObligations.length && (
                  <div className="px-5 py-3">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="text-[11px] text-primary h-7 px-0"
                    >
                      <Link to="/app/obligations">
                        +{activeObligations.length - upcomingObligations.length} more{" "}
                        {activeObligations.length - upcomingObligations.length === 1
                          ? "obligation"
                          : "obligations"}
                        <ArrowRight className="ml-1 size-3" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 text-center">
                <Clock className="size-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden />
                <p className="text-[12px] text-muted-foreground font-medium">
                  No upcoming obligations
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Add obligations to track known upcoming payments.
                </p>
                {canMutate && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-[12px] text-primary h-7"
                  >
                    <Link to="/app/obligations">Add obligation</Link>
                  </Button>
                )}
              </div>
            )}

            {/* Tax reserve health */}
            {taxSummaries.length > 0 && (
              <div className="border-t border-border/50 px-5 py-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="size-3.5 text-muted-foreground/70" aria-hidden />
                    <span className="section-label">Tax Reserve</span>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-[11px] text-primary h-6 px-0"
                  >
                    <Link to="/app/taxes">
                      View <ArrowRight className="ml-1 size-3" aria-hidden />
                    </Link>
                  </Button>
                </div>
                {taxSummaries.slice(0, 1).map((ts) => {
                  const hasShorfall = ts.shortfall && ts.shortfall > 0;
                  return (
                    <div
                      key={ts.currency}
                      className="mt-2 flex items-center justify-between text-[12px]"
                    >
                      <span className="text-muted-foreground">Tracked vs target</span>
                      <span
                        className={cn(
                          "font-mono font-semibold",
                          hasShorfall
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {formatMoney(ts.trackedTaxReserve, ts.currency)}
                        {" / "}
                        {formatMoney(ts.targetTaxReserve, ts.currency)}
                        {hasShorfall && (
                          <span className="ml-1.5 text-[10px] text-amber-500">(shortfall)</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          FINANCIAL PULSE — "Worth knowing"
          Answers: What needs my attention?
      ═══════════════════════════════════════════════════════ */}
      {attentionItems.length > 0 && (
        <section aria-labelledby="financial-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-500" aria-hidden />
              <h2 id="financial-pulse" className="text-[13px] font-semibold text-foreground">
                Worth knowing
              </h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-[11px] text-primary h-7 px-2">
              <Link to="/app/insights">
                All insights <ArrowRight className="ml-1 size-3" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {attentionItems.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border p-4 flex items-start justify-between gap-4 transition-colors",
                  item.severity === "warning"
                    ? "border-destructive/30 bg-destructive/[0.025]"
                    : "border-amber-500/30 bg-amber-500/[0.025]",
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {item.severity === "warning" ? (
                    <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" aria-hidden />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground leading-tight">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>
                {item.action && (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-[11px] h-7 px-2.5"
                  >
                    <Link to={item.action.to}>{item.action.label}</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          RECENT ACTIVITY + THIS MONTH
          Supporting context
      ═══════════════════════════════════════════════════════ */}
      {hasAccounts && (
        <section aria-labelledby="recent-supporting" className="grid gap-6 lg:grid-cols-3">
          {/* Recent ledger activity — 2/3 */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <History className="size-4 text-muted-foreground/70" aria-hidden />
                <h2 id="recent-activity" className="text-[13px] font-semibold text-foreground">
                  Recent transactions
                </h2>
              </div>
              {recentTransactions.length > 0 && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-[11px] text-primary h-7 px-2"
                >
                  <Link to="/app/cash">
                    Full ledger <ArrowRight className="ml-1 size-3" aria-hidden />
                  </Link>
                </Button>
              )}
            </div>

            {recentTransactionsQuery.isPending ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <Skeleton key={n} className="h-5 w-full" />
                ))}
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="divide-y divide-border/40">
                {recentTransactions.map((tx) => {
                  const isIncome = tx.transaction_type === "income";
                  const isExpense = tx.transaction_type === "expense";
                  const isTransfer = tx.transaction_type === "transfer";

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px]",
                            isIncome && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            isExpense && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                            isTransfer && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                            !isIncome &&
                              !isExpense &&
                              !isTransfer &&
                              "bg-muted text-muted-foreground",
                          )}
                          aria-hidden
                        >
                          {isIncome && <ArrowDownLeft className="size-3.5" />}
                          {isExpense && <ArrowUpRight className="size-3.5" />}
                          {isTransfer && <ArrowLeftRight className="size-3.5" />}
                          {!isIncome && !isExpense && !isTransfer && "↺"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-foreground truncate">
                            {tx.description}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {tx.category?.name ?? "General"}
                            {tx.account?.name && ` · ${tx.account.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-3">
                        <p
                          className={cn(
                            "font-mono text-[13px] font-semibold numeric",
                            isIncome && "text-emerald-600 dark:text-emerald-400",
                            isExpense && "text-rose-600 dark:text-rose-400",
                            !isIncome && !isExpense && "text-foreground",
                          )}
                        >
                          {formatMoney(tx.amount, tx.currency)}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {new Date(tx.transaction_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <History className="size-8 mx-auto mb-3 text-muted-foreground/30" aria-hidden />
                <p className="text-[13px] font-medium text-foreground">No transactions yet</p>
                <p className="mt-1 text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Record income, expenses or transfers to see your ledger activity here.
                </p>
                {canMutate && (
                  <Button asChild size="sm" className="mt-4 gap-1.5">
                    <Link to="/app/cash">
                      <Plus className="size-3.5" aria-hidden />
                      Record transaction
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* This month summary + quick actions — 1/3 */}
          <div className="space-y-4">
            {/* This month */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Gauge className="size-4 text-muted-foreground/70" aria-hidden />
                  <h2 className="text-[13px] font-semibold text-foreground">This month</h2>
                </div>
              </div>
              {performanceQuery.isPending ? (
                <div className="p-5 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : performanceMetrics.length > 0 ? (
                <div className="divide-y divide-border/40">
                  {performanceMetrics.map((metric) => {
                    const isPositive = metric.net_cash >= 0;
                    return (
                      <div key={metric.currency} className="px-5 py-4 space-y-3">
                        <div>
                          <p className="section-label mb-1.5">{metric.currency} Net Movement</p>
                          <p
                            className={cn(
                              "font-mono text-xl font-bold numeric",
                              isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400",
                            )}
                          >
                            {formatMoney(metric.net_cash, metric.currency)}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-border/40 pt-3">
                          <div>
                            <p className="text-muted-foreground mb-0.5">Collected</p>
                            <p className="font-mono font-semibold text-foreground numeric">
                              {formatMoney(metric.total_revenue, metric.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-0.5">Expenses</p>
                            <p className="font-mono font-semibold text-rose-500 numeric">
                              {formatMoney(metric.total_expenses, metric.currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 text-center">
                  <p className="text-[11px] text-muted-foreground">
                    Record transactions to see this month's cash movement.
                  </p>
                </div>
              )}
            </div>

            {/* Quick actions */}
            {canMutate && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/50">
                  <p className="text-[13px] font-semibold text-foreground">Quick actions</p>
                </div>
                <div className="p-3 space-y-1">
                  {[
                    {
                      to: "/app/cash" as const,
                      label: "Record income",
                      icon: TrendingUp,
                      color: "text-emerald-600",
                    },
                    {
                      to: "/app/expenses" as const,
                      label: "Record expense",
                      icon: Receipt,
                      color: "text-rose-500",
                    },
                    {
                      to: "/app/invoices" as const,
                      label: "Create invoice",
                      icon: FileText,
                      color: "text-primary",
                    },
                    {
                      to: "/app/payments" as const,
                      label: "Record payment",
                      icon: CreditCard,
                      color: "text-blue-500",
                    },
                    {
                      to: "/app/ai-cfo" as const,
                      label: "Ask AI CFO",
                      icon: Bot,
                      color: "text-violet-500",
                    },
                  ].map(({ to, label, icon: Icon, color }) => (
                    <Link
                      key={label}
                      to={to}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors group"
                    >
                      <Icon className={cn("size-4 shrink-0", color)} aria-hidden />
                      {label}
                      <ArrowRight
                        className="ml-auto size-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-hidden
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

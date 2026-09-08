import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  FileText,
  Gauge,
  History,
  Lightbulb,
  Plus,
  Receipt,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyValue } from "@/components/ui/money-value";
import { transactionsQueryOptions, workspaceCashSummaryQueryOptions } from "@/domain/financial";
import { clientsQueryOptions } from "@/domain/clients";
import { projectsQueryOptions } from "@/domain/projects";
import {
  invoicesQueryOptions,
  workspaceReceivablesSummaryQueryOptions,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/domain/invoices";
import { commandCenterSummaryQueryOptions } from "@/domain/profitability";
import { insightsQueryOptions } from "@/domain/insights";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Command Center | SoloOS" },
      {
        name: "description",
        content:
          "SoloOS financial command center: cash positions, collected revenue, expenses, receivables, and operational insights.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CommandCenter,
});

function CommandCenter() {
  const { workspace, profile, role } = useWorkspace();
  const firstName = profile?.full_name?.split(" ")[0];
  const canMutate = role === "owner" || role === "admin" || role === "finance";

  // Authoritative Queries
  const cashSummaryQuery = useQuery(workspaceCashSummaryQueryOptions(workspace.id));
  const recentTransactionsQuery = useQuery(transactionsQueryOptions(workspace.id, { limit: 6 }));
  const clientsQuery = useQuery(clientsQueryOptions(workspace.id, { status: "active" }));
  const projectsQuery = useQuery(projectsQueryOptions(workspace.id, { status: "active" }));
  const receivablesQuery = useQuery(workspaceReceivablesSummaryQueryOptions(workspace.id));
  const recentInvoicesQuery = useQuery(invoicesQueryOptions(workspace.id));
  const performanceQuery = useQuery(commandCenterSummaryQueryOptions(workspace.id));
  const insightsQuery = useQuery(insightsQueryOptions(workspace.id));

  const cashSummary = cashSummaryQuery.data;
  const recentTransactions = recentTransactionsQuery.data ?? [];
  const activeClients = clientsQuery.data ?? [];
  const activeProjects = projectsQuery.data ?? [];
  const receivables = receivablesQuery.data;
  const recentInvoices = (recentInvoicesQuery.data ?? []).slice(0, 5);
  const performanceMetrics = performanceQuery.data ?? [];
  const allInsights = insightsQuery.data ?? [];
  const attentionItems = allInsights.filter(
    (i) => i.severity === "warning" || i.severity === "attention",
  );

  const hasAccounts = (cashSummary?.totalAccounts ?? 0) > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-9 pb-16">
      {/* Cockpit Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {workspace.name}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-primary/30 text-primary"
            >
              {role.toUpperCase()}
            </Badge>
          </div>
          <h1 className="text-display mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            {firstName ? `Command Center · ${firstName}` : "Financial Command Center"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Know what you earned. Know what you keep. Know what to do next.
          </p>
        </div>

        {canMutate && (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline" className="gap-1.5 shadow-xs">
              <Link to="/app/expenses">
                <Receipt className="size-4 text-rose-500" />
                <span>Record Expense</span>
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5 shadow-xs">
              <Link to="/app/invoices">
                <FileText className="size-4 text-primary" />
                <span>New Invoice</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 shadow-sm">
              <Link to="/app/cash">
                <Plus className="size-4" />
                <span>Record Cash</span>
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* Attention Required Strip (If any items need attention) */}
      {attentionItems.length > 0 && (
        <section aria-labelledby="attention-required" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-destructive" />
              <h2
                id="attention-required"
                className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
              >
                Attention Required ({attentionItems.length})
              </h2>
            </div>
            <Button asChild size="sm" variant="ghost" className="text-xs text-primary">
              <Link to="/app/insights">
                View All Insights
                <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {attentionItems.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className={cn(
                  "panel p-4 flex items-start justify-between gap-3 border transition-colors",
                  item.severity === "warning"
                    ? "border-destructive/40 bg-destructive/[0.03]"
                    : "border-amber-500/40 bg-amber-500/[0.03]",
                )}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.severity === "warning" ? (
                      <AlertCircle className="size-4 text-destructive shrink-0" />
                    ) : (
                      <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                    )}
                    <p className="font-semibold text-sm text-foreground truncate">{item.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                </div>
                {item.action && (
                  <Button asChild size="sm" variant="outline" className="shrink-0 text-xs h-7">
                    <Link to={item.action.to}>
                      {item.action.label}
                      <ArrowRight className="ml-1 size-3" />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 1. Liquid Cash Positions */}
      <section aria-labelledby="cash-positions" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-primary" />
            <h2
              id="cash-positions"
              className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
            >
              Liquid Cash Positions
            </h2>
          </div>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-xs text-primary hover:text-primary"
          >
            <Link to="/app/cash">
              Cash & Accounts
              <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
        </div>

        {hasAccounts && cashSummary?.positions.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cashSummary.positions.map((pos) => (
              <div
                key={pos.currency}
                className="panel p-5 bg-card/80 border border-border transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider text-foreground">
                    {pos.currency} Cash Position
                  </span>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                    Reconciled
                  </span>
                </div>
                <p className="mt-3 text-display text-2xl sm:text-3xl font-bold tracking-tight numeric text-foreground">
                  {formatMoney(pos.totalBalance, pos.currency)}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                  <span>
                    {pos.activeAccounts} active account{pos.activeAccounts === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="size-3" />
                    Authoritative
                  </span>
                </div>
              </div>
            ))}

            <div className="panel p-5 bg-primary/5 border border-primary/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-primary">
                    Safe-To-Spend Status
                  </span>
                  <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Live Baseline
                  </span>
                </div>
                <p className="mt-3 text-sm text-foreground leading-relaxed">
                  Liquid cash is currently unencumbered. Automatic tax withholding & recurring
                  obligations attach in Phase 6.
                </p>
              </div>
              <div className="mt-4 border-t border-primary/20 pt-2 flex items-center justify-between text-[11px] text-primary/90 font-medium">
                <span className="flex items-center gap-1">
                  <Scale className="size-3.5" />
                  Formula: Cash − Reserves = Safe
                </span>
                <span>Ready</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="panel p-6 text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="size-5" />
              </div>
              <div>
                <p className="font-bold text-foreground text-base">
                  No financial accounts initialized
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
                  SoloOS strictly reports verified records. Create your bank accounts, mobile money
                  wallets, or cash reserves to activate authoritative ledger tracking.
                </p>
              </div>
            </div>
            {canMutate && (
              <Button asChild size="sm" className="shrink-0 shadow-sm">
                <Link to="/app/cash">
                  <Plus className="mr-1.5 size-4" />
                  Initialize Cash Accounts
                </Link>
              </Button>
            )}
          </div>
        )}
      </section>

      {/* 2. This Period: Cash Performance (Revenue vs Expenses = Net Cash Movement) */}
      <section aria-labelledby="period-performance" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="size-4 text-primary" />
            <h2
              id="period-performance"
              className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
            >
              This Month · Cash Movement
            </h2>
          </div>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-xs text-primary hover:text-primary"
          >
            <Link to="/app/profitability">
              Full Profitability
              <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
        </div>

        {performanceMetrics.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {performanceMetrics.map((metric) => {
              const isPositive = metric.net_cash >= 0;
              return (
                <div
                  key={metric.currency}
                  className="panel p-5 bg-card/80 border border-border space-y-4"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wider text-foreground">
                      {metric.currency} Net Movement
                    </span>
                    <Badge
                      variant={isPositive ? "default" : "destructive"}
                      className="text-[10px] font-mono"
                    >
                      {isPositive ? "Surplus" : "Deficit"}
                    </Badge>
                  </div>

                  <div>
                    <p
                      className={cn(
                        "text-display text-2xl sm:text-3xl font-bold tracking-tight numeric",
                        isPositive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {formatMoney(metric.net_cash, metric.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Net Cash Movement (Income minus Expenses)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-3 text-xs">
                    <div>
                      <span className="text-muted-foreground text-[11px] block">
                        Collected Revenue
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {formatMoney(metric.total_revenue, metric.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px] block">
                        Expenses Posted
                      </span>
                      <span className="font-mono font-semibold text-rose-500">
                        {formatMoney(metric.total_expenses, metric.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="panel p-5 bg-card/40 border border-border text-xs text-muted-foreground text-center">
            No posted cash movements recorded for the current month yet.
          </div>
        )}
      </section>

      {/* 3. Receivables & Commercial Operations */}
      <section aria-labelledby="receivables-summary" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <h2
              id="receivables-summary"
              className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
            >
              Receivables & Commercial Operations
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="text-xs text-primary hover:text-primary"
            >
              <Link to="/app/payments">
                Payments
                <CreditCard className="ml-1 size-3" />
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="text-xs text-primary hover:text-primary"
            >
              <Link to="/app/invoices">
                All Invoices
                <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/app/invoices"
            className="panel p-5 bg-card/80 border border-border transition-all hover:border-primary/40 hover:shadow-md block min-w-0"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-amber-500" />
                Outstanding
              </span>
              <ArrowRight className="size-3 text-muted-foreground" />
            </div>
            <div className="mt-3">
              <MoneyValue
                value={receivables?.total_outstanding ?? 0}
                currency={workspace.currency}
                size="lg"
                className="font-bold tracking-tight text-foreground"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Pending client payments across all active invoices.
            </p>
          </Link>

          <Link
            to="/app/invoices"
            className="panel p-5 bg-card/80 border border-border transition-all hover:border-primary/40 hover:shadow-md block min-w-0"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-rose-500" />
                Overdue
              </span>
              <ArrowRight className="size-3 text-muted-foreground" />
            </div>
            <div className="mt-3">
              <MoneyValue
                value={receivables?.total_overdue ?? 0}
                currency={workspace.currency}
                size="lg"
                className="font-bold tracking-tight text-rose-500"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Invoices with past due dates requiring follow-up.
            </p>
          </Link>

          <Link
            to="/app/invoices"
            className="panel p-5 bg-card/80 border border-border transition-all hover:border-primary/40 hover:shadow-md block min-w-0"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                Active Invoices
              </span>
              <ArrowRight className="size-3 text-muted-foreground" />
            </div>
            <p className="mt-3 text-display text-2xl sm:text-3xl font-bold tracking-tight numeric text-foreground">
              {receivables?.active_invoice_count ?? 0}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Total uncancelled commercial receivables.
            </p>
          </Link>

          <Link
            to="/app/invoices"
            className="panel p-5 bg-card/80 border border-border transition-all hover:border-primary/40 hover:shadow-md block min-w-0"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-emerald-500" />
                This Month
              </span>
              <ArrowRight className="size-3 text-muted-foreground" />
            </div>
            <p className="mt-3 text-display text-2xl sm:text-3xl font-bold tracking-tight numeric text-foreground">
              {receivables?.invoices_this_month ?? 0}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Invoices issued during the current month.
            </p>
          </Link>
        </div>

        {/* Recent Invoices strip */}
        {recentInvoices.length > 0 && (
          <div className="panel border border-border divide-y divide-border/60 bg-card overflow-hidden">
            <div className="p-3 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between">
              <span>Recent Invoices</span>
              <span>Amount / Status</span>
            </div>
            {recentInvoices.map((inv) => {
              const colors = INVOICE_STATUS_COLORS[inv.status];
              return (
                <div
                  key={inv.id}
                  className="p-3.5 flex items-center justify-between text-sm hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      to="/app/invoices/$invoiceId"
                      params={{ invoiceId: inv.id }}
                      className="font-mono font-semibold text-primary hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {inv.client?.name ?? "Unknown Client"}
                      {inv.project && ` · ${inv.project.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <MoneyValue value={inv.total} currency={inv.currency} size="sm" />
                      {inv.amount_due > 0 && (
                        <p className="text-[11px] text-amber-500 font-medium">
                          Due: {inv.currency} {inv.amount_due.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase font-semibold",
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
      </section>

      {/* 4. Operations & Engagements */}
      <section aria-labelledby="operations-summary" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="size-4 text-primary" />
            <h2
              id="operations-summary"
              className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
            >
              Operations & Engagements
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/app/clients"
            className="panel p-5 bg-card/80 border border-border transition-all hover:border-primary/40 hover:shadow-md block min-w-0"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                Active Clients
              </span>
              <ArrowRight className="size-3 text-muted-foreground" />
            </div>
            <p className="mt-3 text-display text-2xl sm:text-3xl font-bold tracking-tight numeric text-foreground">
              {activeClients.length}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Organizations & partners with active commercial relationships.
            </p>
          </Link>

          <Link
            to="/app/projects"
            className="panel p-5 bg-card/80 border border-border transition-all hover:border-primary/40 hover:shadow-md block min-w-0"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Briefcase className="size-3.5 text-primary" />
                Active Projects
              </span>
              <ArrowRight className="size-3 text-muted-foreground" />
            </div>
            <p className="mt-3 text-display text-2xl sm:text-3xl font-bold tracking-tight numeric text-foreground">
              {activeProjects.length}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Active deliverables, retainers, and client initiatives.
            </p>
          </Link>
        </div>
      </section>

      {/* 5. Two Column Grid: Recent Ledger Activity + Financial Core Status */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Recent Authoritative Transactions */}
        <section aria-labelledby="recent-activity" className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              <h2
                id="recent-activity"
                className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
              >
                Recent Ledger Activity
              </h2>
            </div>
            {recentTransactions.length > 0 && (
              <Button asChild size="sm" variant="ghost" className="text-xs text-primary">
                <Link to="/app/cash">
                  Full Ledger ({recentTransactions.length})
                  <ArrowRight className="ml-1 size-3" />
                </Link>
              </Button>
            )}
          </div>

          {recentTransactions.length > 0 ? (
            <div className="panel overflow-hidden border border-border divide-y divide-border/60 bg-card">
              {recentTransactions.map((tx) => {
                const isIncome = tx.transaction_type === "income";
                const isExpense = tx.transaction_type === "expense";
                const isTransfer = tx.transaction_type === "transfer";

                return (
                  <div
                    key={tx.id}
                    className="p-4 flex items-center justify-between text-sm hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          isIncome && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          isExpense && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                          isTransfer && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                          !isIncome &&
                            !isExpense &&
                            !isTransfer &&
                            "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {isIncome && <ArrowDownLeft className="size-4" />}
                        {isExpense && <ArrowUpRight className="size-4" />}
                        {isTransfer && <ArrowLeftRight className="size-4" />}
                        {!isIncome && !isExpense && !isTransfer && (
                          <RotateCcwIcon className="size-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.category ? tx.category.name : "General"} ·{" "}
                          {tx.account?.name ?? "Account"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <p
                        className={cn(
                          "font-mono font-bold",
                          isIncome && "text-emerald-600 dark:text-emerald-400",
                          isExpense && "text-rose-600 dark:text-rose-400",
                          !isIncome && !isExpense && "text-foreground",
                        )}
                      >
                        {isIncome ? "+" : isExpense ? "-" : ""}
                        {formatMoney(tx.amount, tx.currency)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {new Date(tx.transaction_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panel p-6 text-center text-muted-foreground text-xs bg-card/40">
              <History className="size-7 mx-auto mb-2 opacity-50" />
              <p className="font-medium text-foreground text-sm">No transactions posted yet</p>
              <p className="mt-0.5">
                Post an opening balance, income, or expense to populate the authoritative ledger.
              </p>
            </div>
          )}
        </section>

        {/* Right 1 Col: Financial Core Status & Invariants */}
        <section aria-labelledby="engine-status" className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h2
              id="engine-status"
              className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
            >
              Operating Modules
            </h2>
          </div>

          <div className="panel p-5 bg-card space-y-4 border border-border">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Receivables & Invoicing</span>
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-600 border-emerald-500/30"
                >
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Payment Settlement</span>
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-600 border-emerald-500/30"
                >
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Expense Ledger</span>
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-600 border-emerald-500/30"
                >
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Cash Profitability</span>
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-600 border-emerald-500/30"
                >
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Deterministic Insights</span>
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-600 border-emerald-500/30"
                >
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Currency Isolation</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <CheckCircle2 className="size-3" />
                  Enforced
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Roadmap Modules:</p>
              <p>• Tax Withholding & Reserve Engine (Phase 6)</p>
              <p>• Formal Financial Reporting Suite (Phase 7)</p>
              <p>• AI CFO Autonomous Copilot (Phase 8)</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RotateCcwIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

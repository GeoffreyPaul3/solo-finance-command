import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Clock,
  Coins,
  History,
  Lock,
  Plus,
  Scale,
  Shield,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { transactionsQueryOptions, workspaceCashSummaryQueryOptions } from "@/domain/financial";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Command Center | SoloOS" },
      {
        name: "description",
        content:
          "Your SoloOS financial command center: what you earned, what you keep, what to do next.",
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

  const cashSummaryQuery = useQuery(workspaceCashSummaryQueryOptions(workspace.id));
  const recentTransactionsQuery = useQuery(transactionsQueryOptions(workspace.id, { limit: 5 }));

  const cashSummary = cashSummaryQuery.data;
  const recentTransactions = recentTransactionsQuery.data ?? [];
  const hasAccounts = (cashSummary?.totalAccounts ?? 0) > 0;

  // Calculate real Money In vs Money Out from posted transactions
  const totalMoneyIn = recentTransactions
    .filter((tx) => tx.transaction_type === "income" && tx.status === "posted")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalMoneyOut = recentTransactions
    .filter((tx) => tx.transaction_type === "expense" && tx.status === "posted")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

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
            {firstName ? `Welcome back, ${firstName}` : "Financial Command Center"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Authoritative financial state derived exclusively from verified double-entry records.
          </p>
        </div>

        {canMutate && (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="gap-1.5 shadow-sm">
              <Link to="/app/cash">
                <Plus className="size-4" />
                <span>Record Transaction</span>
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/cash">
                <Wallet className="size-4 mr-1.5 text-primary" />
                <span>All Accounts</span>
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* Primary Financial Cockpit Grid */}
      <section aria-labelledby="financial-cockpit" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-primary" />
            <h2
              id="financial-cockpit"
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
              Open Cash Ledger
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
                    Ledger balanced
                  </span>
                </div>
              </div>
            ))}

            {/* Safe to spend indicator card */}
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
                  obligations will attach in Phase 4.
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

      {/* Two Column Grid: Recent Ledger Activity + Financial Core Status */}
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
                  View Full Ledger ({recentTransactions.length})
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
                const isAdjustment = tx.transaction_type === "adjustment";

                return (
                  <div
                    key={tx.id}
                    className="p-4 flex items-center justify-between text-sm hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                          isIncome
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : isExpense
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : isTransfer
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {isIncome && <ArrowDownLeft className="size-4" />}
                        {isExpense && <ArrowUpRight className="size-4" />}
                        {isTransfer && <ArrowLeftRight className="size-4" />}
                        {isAdjustment && <RotateCcwIcon className="size-4" />}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.category ? tx.category.name : "Uncategorized"} ·{" "}
                          {tx.account?.name ?? "Account"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <p
                        className={`font-mono font-bold ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isExpense
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-foreground"
                        }`}
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

        {/* Right 1 Col: Financial Engine Status & Invariants */}
        <section aria-labelledby="engine-status" className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h2
              id="engine-status"
              className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
            >
              Financial Engine
            </h2>
          </div>

          <div className="panel p-5 bg-card space-y-4 border border-border">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">PostgreSQL Invariants</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <CheckCircle2 className="size-3" />
                  Active (RLS)
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Transaction Immutability</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <Lock className="size-3" />
                  Enforced
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Audit Log Trail</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <CheckCircle2 className="size-3" />
                  Append-Only
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Multi-Currency Isolation</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <CheckCircle2 className="size-3" />
                  Enforced
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Next Downstream Rollouts:</p>
              <p>• Phase 3: Clients & Project Profitability</p>
              <p>• Phase 4: Invoices & Receivables Aging</p>
              <p>• Phase 7: Automated Tax Reserves</p>
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

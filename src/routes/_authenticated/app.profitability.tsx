import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  DollarSign,
  Gauge,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import { EntitlementGate } from "@/components/app/entitlement-gate";
import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyValue } from "@/components/ui/money-value";
import { profitabilitySummaryQueryOptions } from "@/domain/profitability";
import { cn } from "@/lib/utils";
import { formatMoney, formatPercent } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/app/profitability")({
  head: () => ({
    meta: [
      { title: "Profitability | SoloOS" },
      {
        name: "description",
        content: "Cash-based profitability analysis: collected revenue minus posted expenses.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfitabilityPage,
});

function ProfitabilityPage() {
  const { entitlements } = useWorkspace();

  if (!entitlements.canAccessAnalytics) {
    return (
      <EntitlementGate
        title="Profitability Analysis"
        description="Cash-based profitability analysis: collected revenue minus posted expenses, strictly per-currency with no FX conversions."
        requiredPlan="solo"
        features={[
          "Monthly and period profitability breakdown",
          "Revenue vs. expense comparison",
          "Profit margin percentages",
          "Multi-currency isolation (no FX mixing)",
          "Custom date range selection",
        ]}
      />
    );
  }

  return <ProfitabilityContent />;
}

// Get first day of current year and today for default range
function getDefaultDateRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-01-01`;
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

function ProfitabilityContent() {
  const { workspace } = useWorkspace();
  const defaults = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);

  const profitQuery = useQuery(profitabilitySummaryQueryOptions(workspace.id, dateFrom, dateTo));

  const periods = profitQuery.data?.periods ?? [];
  const isLoading = profitQuery.isLoading;
  const isError = profitQuery.isError;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Understand · Profitability
            </span>
          </div>
          <h1 className="text-display mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            Profitability
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cash-based: Collected revenue minus posted expenses. Strictly per-currency — no FX
            conversions.
          </p>
        </div>
      </header>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl bg-muted/30 border border-border/60">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prof-from" className="text-xs font-medium text-muted-foreground">
            From
          </Label>
          <Input
            id="prof-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 text-sm w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prof-to" className="text-xs font-medium text-muted-foreground">
            To
          </Label>
          <Input
            id="prof-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 text-sm w-40"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              const now = new Date();
              setDateFrom(`${now.getFullYear()}-01-01`);
              setDateTo(now.toISOString().slice(0, 10));
            }}
          >
            This Year
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              const now = new Date();
              const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
              const m = String(now.getMonth() + 1).padStart(2, "0");
              setDateFrom(`${y}-${m}-01`);
              setDateTo(now.toISOString().slice(0, 10));
            }}
          >
            This Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setDateFrom("2000-01-01");
              setDateTo(new Date().toISOString().slice(0, 10));
            }}
          >
            All Time
          </Button>
        </div>
        <div className="text-xs text-muted-foreground ml-auto">
          {dateFrom} → {dateTo}
        </div>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="panel p-6 text-center text-sm text-destructive bg-destructive/5 border border-destructive/20">
          <AlertCircle className="size-5 mx-auto mb-2" />
          <p>{(profitQuery.error as Error).message}</p>
        </div>
      )}

      {!isLoading && !isError && periods.length === 0 && (
        <div className="panel p-12 text-center bg-card/60 border border-border">
          <BarChart3 className="size-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">No financial activity in this period</p>
          <p className="text-sm text-muted-foreground mt-1">
            Record transactions in Cash &amp; Accounts and expenses in the Expenses page to see
            profitability metrics.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <Button asChild variant="outline" size="sm">
              <Link to="/app/cash">Cash &amp; Accounts</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/app/expenses">Record Expense</Link>
            </Button>
          </div>
        </div>
      )}

      {!isLoading && periods.length > 0 && (
        <div className="space-y-6">
          {/* Currency Profitability Cards */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {periods.map((p) => {
              const isProfit = p.net_profit >= 0;
              return (
                <Card
                  key={p.currency}
                  className={cn(
                    "bg-card border transition-all hover:shadow-md",
                    isProfit
                      ? "border-emerald-500/20 hover:border-emerald-500/40"
                      : "border-rose-500/20 hover:border-rose-500/40",
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        {p.currency}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold uppercase",
                          isProfit
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 border-rose-500/20",
                        )}
                      >
                        {isProfit ? "Profitable" : "Net Loss"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Net */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Net Cash Contribution</p>
                      <MoneyValue
                        value={p.net_profit}
                        currency={p.currency}
                        size="xl"
                        className={cn(
                          isProfit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400",
                        )}
                      />
                    </div>

                    {/* Margin */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Margin</span>
                      <span
                        className={cn(
                          "font-mono font-bold",
                          isProfit ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        {p.total_revenue > 0 ? formatPercent(p.margin_percent) : "—"}
                      </span>
                    </div>

                    {/* Revenue / Expenses breakdown */}
                    <div className="space-y-2 border-t border-border/60 pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <TrendingUp className="size-3 text-emerald-500" />
                          Revenue ({p.invoice_count})
                        </span>
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(p.total_revenue, p.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <TrendingDown className="size-3 text-rose-500" />
                          Expenses ({p.expense_count})
                        </span>
                        <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                          {formatMoney(p.total_expenses, p.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Visual bar */}
                    {p.total_revenue > 0 && (
                      <div className="space-y-1">
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              isProfit ? "bg-emerald-500" : "bg-rose-500",
                            )}
                            style={{
                              width: `${Math.min(100, Math.abs(p.margin_percent))}%`,
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right">
                          {isProfit ? "Profit margin" : "Loss ratio"}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Methodology Note */}
          <div className="panel p-4 bg-muted/20 border border-border/60 rounded-xl text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-sm mb-2">Methodology</p>
            <p>
              <span className="text-emerald-600 font-medium">Revenue</span> = Sum of all posted{" "}
              <strong>income transactions</strong> in the selected period (cash collected, not
              invoiced).
            </p>
            <p>
              <span className="text-rose-600 font-medium">Expenses</span> = Sum of all posted{" "}
              <strong>expense transactions</strong> in the selected period.
            </p>
            <p>
              <span className="font-medium">Net</span> = Revenue − Expenses. Cash-basis, not
              accrual.
            </p>
            <p className="text-amber-600">
              ⚠ Each currency is an isolated bucket. SoloOS never converts between currencies.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

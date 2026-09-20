import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  FileText,
  Filter,
  Info,
  Loader2,
  Lock,
  Receipt,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EntitlementGate } from "@/components/app/entitlement-gate";
import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyValue, MoneyValueBlock } from "@/components/ui/money-value";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateCashForecast,
  type ForecastHorizon,
  type ForecastScenario,
} from "@/domain/forecasting";
import { workspaceCashSummaryQueryOptions } from "@/domain/financial";
import { invoicesQueryOptions } from "@/domain/invoices";
import { obligationsListQueryOptions } from "@/domain/obligations";
import { recurringExpensesListQueryOptions } from "@/domain/recurring-expenses";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/forecast")({
  head: () => ({
    meta: [
      { title: "Cashflow Forecasting | SoloOS" },
      {
        name: "description",
        content:
          "Deterministic cashflow projections across 30, 60, and 90 day horizons with explicit scenario assumptions.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForecastPage,
});

function ForecastPage() {
  const { entitlements } = useWorkspace();

  if (!entitlements.canAccessAnalytics) {
    return (
      <EntitlementGate
        title="Cashflow Forecasting"
        description="Plan your liquidity with 30, 60, and 90-day deterministic cash projections and scenario models."
        requiredPlan="solo"
        features={[
          "30, 60, and 90 day horizon forecasting",
          "Base, Conservative, and Optimistic scenario modeling",
          "Transparent collection and outflow assumptions",
          "Visual cash trajectory timeline",
          "Currency isolation across all projections",
        ]}
      />
    );
  }

  return <ForecastCockpit />;
}

function ForecastCockpit() {
  const { workspace } = useWorkspace();

  const [horizon, setHorizon] = useState<ForecastHorizon>(60);
  const [scenario, setScenario] = useState<ForecastScenario>("base");

  // Authoritative data queries
  const cashSummaryQuery = useQuery(workspaceCashSummaryQueryOptions(workspace.id));
  const invoicesQuery = useQuery(invoicesQueryOptions(workspace.id));
  const obligationsQuery = useQuery(
    obligationsListQueryOptions(workspace.id, { status: "all_active" }),
  );
  const recurringQuery = useQuery(recurringExpensesListQueryOptions(workspace.id));

  const isLoading =
    cashSummaryQuery.isLoading ||
    invoicesQuery.isLoading ||
    obligationsQuery.isLoading ||
    recurringQuery.isLoading;

  const cashSummary = cashSummaryQuery.data;
  const rawInvoices = invoicesQuery.data ?? [];
  const rawObligations = obligationsQuery.data ?? [];
  const rawRecurring = recurringQuery.data ?? [];

  // Available currencies from cash accounts or primary workspace currency
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>();
    set.add(workspace.currency);
    for (const pos of cashSummary?.positions ?? []) {
      set.add(pos.currency);
    }
    return Array.from(set);
  }, [workspace.currency, cashSummary]);

  const [selectedCurrency, setSelectedCurrency] = useState<string>(workspace.currency);

  // Active currency cash balance
  const startingLiquidCash = useMemo(() => {
    const balObj = cashSummary?.positions.find((b) => b.currency === selectedCurrency);
    return balObj ? Number(balObj.totalBalance) : 0;
  }, [cashSummary, selectedCurrency]);

  // Transform raw entities for pure forecasting engine
  const forecastInvoices = useMemo(() => {
    return rawInvoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoice_number,
      clientName: i.client?.name ?? null,
      currency: i.currency,
      amountDue: Number(i.amount_due),
      dueDate: i.due_date,
      status: i.status,
    }));
  }, [rawInvoices]);

  const forecastObligations = useMemo(() => {
    return rawObligations.map((o) => ({
      id: o.id,
      name: o.title,
      currency: o.currency,
      amount: Number(o.amount),
      dueDate: o.due_date,
      status: o.status,
    }));
  }, [rawObligations]);

  const forecastRecurring = useMemo(() => {
    return rawRecurring
      .filter((r) => r.status === "active")
      .map((r) => ({
        id: r.id,
        name: r.title,
        currency: r.currency,
        amount: Number(r.amount),
        frequency: r.frequency,
        nextOccurrence: r.next_due_date,
        endDate: r.end_date,
      }));
  }, [rawRecurring]);

  // Run deterministic forecasting calculation
  const forecast = useMemo(() => {
    return calculateCashForecast({
      currency: selectedCurrency,
      startingLiquidCash,
      invoices: forecastInvoices,
      obligations: forecastObligations,
      recurringExpenses: forecastRecurring,
      horizonDays: horizon,
      scenario,
    });
  }, [
    selectedCurrency,
    startingLiquidCash,
    forecastInvoices,
    forecastObligations,
    forecastRecurring,
    horizon,
    scenario,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Planning & Decision Support
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              Deterministic Projections
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Cashflow Forecast
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Deterministic liquidity projections based on verified liquid cash, authoritative
            invoices, and scheduled commitments.
          </p>
        </div>

        {/* Currency Selector (Currency Isolation) */}
        {availableCurrencies.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Currency:</span>
            <div className="flex rounded-lg border border-border/70 p-0.5 bg-surface">
              {availableCurrencies.map((c) => (
                <Button
                  key={c}
                  variant={c === selectedCurrency ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCurrency(c)}
                  className="h-7 text-xs px-2.5"
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Control Bar: Horizon + Scenario Selectors */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/70 bg-secondary/20 p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Horizon:
          </span>
          <div className="flex rounded-lg border border-border/70 bg-surface p-0.5">
            {[30, 60, 90].map((h) => (
              <Button
                key={h}
                variant={horizon === h ? "default" : "ghost"}
                size="sm"
                onClick={() => setHorizon(h as ForecastHorizon)}
                className="h-7 text-xs px-3"
              >
                {h} Days
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Scenario:
          </span>
          <div className="flex rounded-lg border border-border/70 bg-surface p-0.5">
            {(["base", "conservative", "optimistic"] as const).map((s) => (
              <Button
                key={s}
                variant={scenario === s ? "default" : "ghost"}
                size="sm"
                onClick={() => setScenario(s)}
                className="h-7 text-xs px-3 capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Cards: Distinguishing Actual vs Expected vs Planned vs Projected */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Actual Starting Cash */}
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Starting Cash
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
              >
                Actual
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <MoneyValueBlock
              value={forecast.startingLiquidCash}
              currency={forecast.currency}
              size="xl"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Verified liquid balances today</p>
          </CardContent>
        </Card>

        {/* Expected Inflows */}
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Expected Inflows
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400 bg-teal-500/10"
              >
                Expected
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <MoneyValueBlock
              value={forecast.totalExpectedInflows}
              currency={forecast.currency}
              size="xl"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {forecast.assumptions.invoicesIncludedCount} client invoices in horizon
            </p>
          </CardContent>
        </Card>

        {/* Planned Outflows */}
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Planned Outflows
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10"
              >
                Planned
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <MoneyValueBlock
              value={forecast.totalPlannedOutflows}
              currency={forecast.currency}
              size="xl"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Scheduled obligations & recurring
            </p>
          </CardContent>
        </Card>

        {/* Projected Cash (Dominant Result) */}
        <Card className="border-primary/40 bg-primary/5 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">
                Projected Cash
              </CardTitle>
              <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
                Projected ({horizon}d)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <MoneyValueBlock
              value={forecast.endingProjectedCash}
              currency={forecast.currency}
              size="xl"
              className={forecast.endingProjectedCash < 0 ? "text-destructive" : ""}
            />
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              {forecast.netProjectedChange >= 0 ? (
                <span className="text-emerald-500 flex items-center">
                  <TrendingUp className="size-3 mr-0.5 inline" /> +
                  {formatMoney(forecast.netProjectedChange, forecast.currency)}
                </span>
              ) : (
                <span className="text-rose-500 flex items-center">
                  <TrendingDown className="size-3 mr-0.5 inline" />{" "}
                  {formatMoney(forecast.netProjectedChange, forecast.currency)}
                </span>
              )}
              <span>net over period</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Explanation Narrative & Scenario Assumptions Panel */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Explanation Card */}
        <Card className="md:col-span-2 border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-primary" />
              Forecast Trajectory Explanation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium leading-relaxed text-foreground">
              {forecast.explanation}
            </p>
            <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Important Forecasting Principle:</strong> Projected numbers reflect
                scheduled commitments and expected collections. They are strictly estimates and are
                never added to your physical bank ledgers.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Assumptions Card */}
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Scenario Assumptions: {forecast.assumptions.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground block">Collections Assumption:</span>
              <p className="mt-0.5 leading-relaxed">{forecast.assumptions.collectionAssumptions}</p>
            </div>
            <div className="border-t border-border/40 pt-2">
              <span className="font-semibold text-foreground block">Outflow Assumption:</span>
              <p className="mt-0.5 leading-relaxed">{forecast.assumptions.outflowAssumptions}</p>
            </div>
            <div className="border-t border-border/40 pt-2 flex justify-between font-mono text-[11px]">
              <span>Invoices Included:</span>
              <span className="font-bold text-foreground">
                {forecast.assumptions.invoicesIncludedCount}
              </span>
            </div>
            {forecast.assumptions.invoicesExcludedCount > 0 && (
              <div className="flex justify-between font-mono text-[11px] text-amber-500">
                <span>Invoices Excluded:</span>
                <span className="font-bold">{forecast.assumptions.invoicesExcludedCount}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projected Cash Chart */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                Projected Cash Trajectory ({horizon} Days)
              </CardTitle>
              <CardDescription className="text-xs">
                Visualizing cumulative daily projected cash balance.
              </CardDescription>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {forecast.currency} Denominated
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={forecast.timeline}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="projectedCashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => v.slice(5)} // MM-DD
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) =>
                    formatMoney(v, forecast.currency, { maximumFractionDigits: 0 })
                  }
                  width={75}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border border-border/80 bg-popover p-3 shadow-md text-xs space-y-1">
                        <p className="font-bold text-popover-foreground">{data.date}</p>
                        {data.actualCash !== null && (
                          <p className="text-emerald-500 font-medium">
                            Starting Cash (Actual):{" "}
                            {formatMoney(data.actualCash, forecast.currency)}
                          </p>
                        )}
                        {data.expectedInflows > 0 && (
                          <p className="text-teal-500">
                            Expected Inflows: +
                            {formatMoney(data.expectedInflows, forecast.currency)}
                          </p>
                        )}
                        {data.plannedOutflows > 0 && (
                          <p className="text-amber-500">
                            Planned Outflows: -
                            {formatMoney(data.plannedOutflows, forecast.currency)}
                          </p>
                        )}
                        <p className="font-bold text-primary pt-1 border-t border-border/50">
                          Projected Cash: {formatMoney(data.projectedCash, forecast.currency)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="projectedCash"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#projectedCashGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

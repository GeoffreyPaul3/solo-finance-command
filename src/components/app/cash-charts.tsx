import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  Calendar,
  Layers,
  PieChart as PieChartIcon,
  Sliders,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  FinancialAccount,
  FinancialTransactionWithRelations,
  FinancialTransactionType,
} from "@/domain/financial";
import { formatMoney } from "@/lib/money";

export interface CashChartsProps {
  accounts: FinancialAccount[];
  transactions: FinancialTransactionWithRelations[];
  availableCurrencies: string[];
  defaultCurrency?: string;
}

type PeriodFilter = "7d" | "30d" | "90d" | "12m";

const TYPE_CONFIG: Record<
  FinancialTransactionType,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  income: { label: "Income", color: "#10b981", icon: ArrowDownLeft },
  expense: { label: "Expense", color: "#ef4444", icon: ArrowUpRight },
  transfer: { label: "Transfer", color: "#06b6d4", icon: ArrowLeftRight },
  adjustment: { label: "Adjustment", color: "#818cf8", icon: Sliders },
};

export function CashCharts({
  accounts,
  transactions,
  availableCurrencies,
  defaultCurrency,
}: CashChartsProps) {
  const currencies = availableCurrencies.length > 0 ? availableCurrencies : ["USD"];
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    defaultCurrency || currencies[0] || "USD",
  );
  const [period, setPeriod] = useState<PeriodFilter>("30d");

  // Ensure selected currency is valid
  const currency = currencies.includes(selectedCurrency)
    ? selectedCurrency
    : (currencies[0] ?? "USD");

  // 1. Filter accounts for active currency
  const currencyAccounts = useMemo(() => {
    return accounts.filter(
      (a) => a.currency.toUpperCase() === currency.toUpperCase() && a.status === "active",
    );
  }, [accounts, currency]);

  // 2. Filter transactions for active currency
  const currencyTransactions = useMemo(() => {
    return transactions.filter(
      (tx) =>
        tx.account?.currency?.toUpperCase() === currency.toUpperCase() && tx.status !== "reversed",
    );
  }, [transactions, currency]);

  // 3. Time Series: Inflow vs Outflow over time
  const { timeSeriesData, totals } = useMemo(() => {
    const now = new Date();
    let daysToSubtract = 30;
    if (period === "7d") daysToSubtract = 7;
    if (period === "90d") daysToSubtract = 90;
    if (period === "12m") daysToSubtract = 365;

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - daysToSubtract);

    const dateMap = new Map<
      string,
      { date: string; displayDate: string; inflow: number; outflow: number; net: number }
    >();

    const intervalDays = period === "12m" ? 30 : period === "90d" ? 7 : 1;
    for (let d = new Date(cutoff); d <= now; d.setDate(d.getDate() + intervalDays)) {
      const key = d.toISOString().slice(0, 10);
      const displayDate = d.toLocaleDateString(undefined, {
        month: "short",
        day: period === "12m" ? undefined : "numeric",
      });
      dateMap.set(key, { date: key, displayDate, inflow: 0, outflow: 0, net: 0 });
    }

    let totalInflow = 0;
    let totalOutflow = 0;

    for (const tx of currencyTransactions) {
      const txDate = new Date(tx.transaction_date);
      if (txDate < cutoff || txDate > now) continue;

      let key = tx.transaction_date;
      if (period === "90d" || period === "12m") {
        let nearestKey = "";
        let minDiff = Infinity;
        for (const [mapDate] of dateMap) {
          const diff = Math.abs(new Date(mapDate).getTime() - txDate.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            nearestKey = mapDate;
          }
        }
        if (nearestKey) key = nearestKey;
      }

      const entry = dateMap.get(key) || {
        date: key,
        displayDate: txDate.toLocaleDateString(undefined, {
          month: "short",
          day: period === "12m" ? undefined : "numeric",
        }),
        inflow: 0,
        outflow: 0,
        net: 0,
      };

      if (tx.transaction_type === "income") {
        entry.inflow += tx.amount;
        totalInflow += tx.amount;
      } else if (tx.transaction_type === "expense") {
        entry.outflow += tx.amount;
        totalOutflow += tx.amount;
      } else if (tx.transaction_type === "transfer") {
        if (tx.transfer_role === "destination") {
          entry.inflow += tx.amount;
          totalInflow += tx.amount;
        } else {
          entry.outflow += tx.amount;
          totalOutflow += tx.amount;
        }
      }

      entry.net = entry.inflow - entry.outflow;
      dateMap.set(key, entry);
    }

    const sortedData = Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return {
      timeSeriesData: sortedData,
      totals: {
        inflow: totalInflow,
        outflow: totalOutflow,
        net: totalInflow - totalOutflow,
      },
    };
  }, [currencyTransactions, period]);

  // 4. Accounts Balance Breakdown
  const accountBalancesData = useMemo(() => {
    return currencyAccounts
      .map((acc) => ({
        name: acc.name,
        balance: acc.current_balance,
        type: acc.type,
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [currencyAccounts]);

  // 5. Transaction Composition by Type
  const compositionData = useMemo(() => {
    const counts: Record<FinancialTransactionType, { count: number; volume: number }> = {
      income: { count: 0, volume: 0 },
      expense: { count: 0, volume: 0 },
      transfer: { count: 0, volume: 0 },
      adjustment: { count: 0, volume: 0 },
    };

    let totalVolume = 0;

    for (const tx of currencyTransactions) {
      if (counts[tx.transaction_type]) {
        counts[tx.transaction_type].count += 1;
        counts[tx.transaction_type].volume += tx.amount;
        totalVolume += tx.amount;
      }
    }

    return (Object.keys(counts) as FinancialTransactionType[]).map((type) => ({
      type,
      label: TYPE_CONFIG[type].label,
      color: TYPE_CONFIG[type].color,
      count: counts[type].count,
      volume: counts[type].volume,
      percentage: totalVolume > 0 ? (counts[type].volume / totalVolume) * 100 : 0,
    }));
  }, [currencyTransactions]);

  const hasActivity = totals.inflow > 0 || totals.outflow > 0;

  return (
    <div className="space-y-6">
      {/* Visual Controls Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Cashflow & Account Analytics</h2>
        </div>

        <div className="flex items-center gap-3">
          {currencies.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Currency:</span>
              <Select value={currency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="h-8 w-24 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs font-mono">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <TabsList className="h-8 p-0.5 bg-muted/60">
              <TabsTrigger value="7d" className="text-[11px] px-2 py-1">
                7D
              </TabsTrigger>
              <TabsTrigger value="30d" className="text-[11px] px-2 py-1">
                30D
              </TabsTrigger>
              <TabsTrigger value="90d" className="text-[11px] px-2 py-1">
                90D
              </TabsTrigger>
              <TabsTrigger value="12m" className="text-[11px] px-2 py-1">
                12M
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Cash Movement Chart (2 Columns) ── */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Cash Inflow vs Outflow</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Velocity of verified funds in {currency} over selected window.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            {/* Summary Strip */}
            <div className="grid grid-cols-3 gap-2 border-y border-border/50 py-2.5 mb-4 text-xs font-mono">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                  Total Inflow
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(totals.inflow, currency)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                  Total Outflow
                </span>
                <span className="font-bold text-rose-500">
                  -{formatMoney(totals.outflow, currency)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                  Net Movement
                </span>
                <span
                  className={
                    totals.net >= 0 ? "font-bold text-foreground" : "font-bold text-rose-500"
                  }
                >
                  {totals.net >= 0 ? "+" : ""}
                  {formatMoney(totals.net, currency)}
                </span>
              </div>
            </div>

            {hasActivity ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timeSeriesData}
                    margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="cashInflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="cashOutflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-border/40"
                    />
                    <XAxis
                      dataKey="displayDate"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const inflowVal = Number(
                          payload.find((p) => p.dataKey === "inflow")?.value ?? 0,
                        );
                        const outflowVal = Number(
                          payload.find((p) => p.dataKey === "outflow")?.value ?? 0,
                        );
                        return (
                          <div className="rounded-lg border border-border bg-card p-2.5 shadow-md text-xs font-mono">
                            <p className="font-sans font-semibold text-foreground mb-1.5">
                              {label}
                            </p>
                            <div className="space-y-1">
                              <p className="text-emerald-600 dark:text-emerald-400">
                                Inflow: +{formatMoney(inflowVal, currency)}
                              </p>
                              <p className="text-rose-500">
                                Outflow: -{formatMoney(outflowVal, currency)}
                              </p>
                              <p className="border-t border-border/60 pt-1 text-foreground font-semibold">
                                Net: {inflowVal - outflowVal >= 0 ? "+" : ""}
                                {formatMoney(inflowVal - outflowVal, currency)}
                              </p>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="inflow"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#cashInflowGrad)"
                      name="Inflow"
                    />
                    <Area
                      type="monotone"
                      dataKey="outflow"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#cashOutflowGrad)"
                      name="Outflow"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center p-6 border border-dashed rounded-lg bg-muted/10">
                <Calendar className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  No transaction movement in {currency}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                  Record income, expenses, or transfers to visualize cash movement over this window.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Transaction Composition by Type ── */}
        <Card className="border-border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PieChartIcon className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">Activity Composition</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Volume and counts by transaction category.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {currencyTransactions.length > 0 ? (
              <div className="space-y-3">
                {compositionData.map((item) => {
                  const Icon = TYPE_CONFIG[item.type].icon;
                  return (
                    <div key={item.type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <Icon className="size-3 text-muted-foreground" />
                          {item.label}
                          <span className="text-[10px] text-muted-foreground">({item.count})</span>
                        </span>
                        <span className="font-mono font-medium">
                          {formatMoney(item.volume, currency)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(item.percentage, 0)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center text-center p-4 border border-dashed rounded-lg bg-muted/10">
                <Layers className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-medium text-muted-foreground">
                  No transactions recorded
                </p>
              </div>
            )}

            {/* Account Allocation Section */}
            <div className="border-t border-border/60 pt-3">
              <span className="text-[11px] font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">
                Account Balances ({currency})
              </span>
              {accountBalancesData.length > 0 ? (
                <div className="space-y-2">
                  {accountBalancesData.slice(0, 4).map((acc) => (
                    <div
                      key={acc.name}
                      className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30 border border-border/40"
                    >
                      <span className="truncate max-w-[140px] font-medium text-foreground">
                        {acc.name}
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {formatMoney(acc.balance, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No active accounts</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

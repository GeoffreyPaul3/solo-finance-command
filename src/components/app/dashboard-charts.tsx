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
import { ArrowDownRight, ArrowUpRight, BarChart2, Calendar, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FinancialTransaction } from "@/domain/financial";
import type { InvoiceWithRelations } from "@/domain/invoices";
import { formatMoney } from "@/lib/money";

export interface DashboardChartsProps {
  transactions: FinancialTransaction[];
  invoices: InvoiceWithRelations[];
  currency: string;
}

type PeriodFilter = "7d" | "30d" | "90d" | "12m";

export function DashboardCharts({ transactions, invoices, currency }: DashboardChartsProps) {
  const [period, setPeriod] = useState<PeriodFilter>("30d");

  // Filter transactions by currency and date range
  const { chartData, totals } = useMemo(() => {
    const now = new Date();
    let daysToSubtract = 30;
    if (period === "7d") daysToSubtract = 7;
    if (period === "90d") daysToSubtract = 90;
    if (period === "12m") daysToSubtract = 365;

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - daysToSubtract);

    // Group transactions by date
    const dateMap = new Map<
      string,
      { date: string; displayDate: string; inflow: number; outflow: number; net: number }
    >();

    // Pre-populate empty dates for continuous curve
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

    const matchingTx = transactions.filter((tx) => {
      const txCurrency = tx.currency || "USD";
      if (txCurrency.toUpperCase() !== currency.toUpperCase()) return false;
      const txDate = new Date(tx.transaction_date || tx.created_at);
      return txDate >= cutoff && txDate <= now;
    });

    for (const tx of matchingTx) {
      const dateKey = (tx.transaction_date || tx.created_at).slice(0, 10);
      const entry = dateMap.get(dateKey) || {
        date: dateKey,
        displayDate: new Date(dateKey).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        inflow: 0,
        outflow: 0,
        net: 0,
      };

      const amount = Number(tx.amount);
      if (tx.transaction_type === "income" || amount > 0) {
        entry.inflow += Math.abs(amount);
        totalInflow += Math.abs(amount);
      } else if (tx.transaction_type === "expense" || amount < 0) {
        entry.outflow += Math.abs(amount);
        totalOutflow += Math.abs(amount);
      }
      entry.net = entry.inflow - entry.outflow;
      dateMap.set(dateKey, entry);
    }

    const sortedData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      chartData: sortedData,
      totals: {
        inflow: totalInflow,
        outflow: totalOutflow,
        net: totalInflow - totalOutflow,
      },
    };
  }, [transactions, currency, period]);

  // Receivables breakdown by status
  const receivablesData = useMemo(() => {
    let current = 0;
    let overdue = 0;
    let paid = 0;
    const now = new Date();

    for (const inv of invoices) {
      if ((inv.currency || "USD").toUpperCase() !== currency.toUpperCase()) continue;
      if (inv.status === "paid") {
        paid += inv.total;
      } else if (
        inv.status === "overdue" ||
        (inv.due_date && new Date(inv.due_date) < now && inv.amount_due > 0)
      ) {
        overdue += inv.amount_due;
      } else if (inv.status === "sent" || inv.status === "partially_paid") {
        current += inv.amount_due;
      }
    }

    return [
      { name: "Current Due", amount: current, fill: "var(--color-primary, #10b981)" },
      { name: "Overdue", amount: overdue, fill: "#ef4444" },
      { name: "Settled", amount: paid, fill: "#6b7280" },
    ].filter((item) => item.amount > 0);
  }, [invoices, currency]);

  const hasData = totals.inflow > 0 || totals.outflow > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ── Cash Flow Movement Chart (2 Columns) ── */}
      <Card className="lg:col-span-2 border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">Cash Flow Movement</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Verified inflows and outflows in {currency} across recorded accounts.
            </CardDescription>
          </div>

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
              <span className="font-bold text-destructive">
                {formatMoney(totals.outflow, currency)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                Net Cashflow
              </span>
              <span
                className={
                  totals.net >= 0 ? "font-bold text-foreground" : "font-bold text-destructive"
                }
              >
                {totals.net >= 0 ? "+" : ""}
                {formatMoney(totals.net, currency)}
              </span>
            </div>
          </div>

          {hasData ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
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
                          <p className="font-sans font-semibold text-foreground mb-1.5">{label}</p>
                          <div className="space-y-1">
                            <p className="text-emerald-600 dark:text-emerald-400">
                              Inflow: +{formatMoney(inflowVal, currency)}
                            </p>
                            <p className="text-destructive">
                              Outflow: {formatMoney(outflowVal, currency)}
                            </p>
                            <p className="pt-1 border-t border-border/60 font-bold text-foreground">
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
                    fill="url(#inflowGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="outflow"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    fillOpacity={1}
                    fill="url(#outflowGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground border border-dashed border-border/60 rounded-lg">
              <Calendar className="size-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">No cash movement recorded for this period</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                When you record income or expenses in {currency}, cash movement curves appear here
                automatically.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Receivables & Invoice Status (1 Column) ── */}
      <Card className="border-border shadow-sm flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="size-4 text-primary" />
            <CardTitle className="text-base font-semibold">Receivables Radar</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Invoice balances categorized by collection posture.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-between pt-2">
          {receivablesData.length > 0 ? (
            <>
              <div className="h-44 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={receivablesData}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      className="stroke-border/40"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                      width={85}
                    />
                    <Tooltip
                      formatter={(val: unknown) => [formatMoney(Number(val), currency), "Amount"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {receivablesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 pt-4 border-t border-border/60 mt-auto">
                {receivablesData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      {item.name}
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      {formatMoney(item.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground border border-dashed border-border/60 rounded-lg">
              <BarChart2 className="size-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">No receivables active</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Active and overdue customer invoices in {currency} will be tracked here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  DollarSign,
  Loader2,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientsQueryOptions } from "@/domain/clients";
import { transactionsQueryOptions } from "@/domain/financial";
import { invoicesQueryOptions, INVOICE_STATUS_LABELS } from "@/domain/invoices";
import { profitabilitySummaryQueryOptions } from "@/domain/profitability";
import { projectsQueryOptions } from "@/domain/projects";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics | SoloOS" },
      { name: "description", content: "Financial analytics and performance insights." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { entitlements } = useWorkspace();

  if (!entitlements.canAccessAnalytics) {
    return (
      <EntitlementGate
        title="Analytics"
        description="Deep-dive into your revenue trends, expense composition, and profitability across any date range."
        requiredPlan="solo"
        features={[
          "Revenue & expense trend charts",
          "Profitability analysis by period",
          "Invoice status distribution",
          "Client and project performance metrics",
          "Customizable date ranges (30D, 90D, 12M, YTD)",
        ]}
      />
    );
  }

  return <AnalyticsContent />;
}

type DateRange = "30d" | "90d" | "12m" | "ytd";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "30d": "30 Days",
  "90d": "90 Days",
  "12m": "12 Months",
  ytd: "Year to Date",
};

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  let from: Date;
  switch (range) {
    case "30d":
      from = new Date(now);
      from.setDate(now.getDate() - 30);
      break;
    case "90d":
      from = new Date(now);
      from.setDate(now.getDate() - 90);
      break;
    case "12m":
      from = new Date(now);
      from.setFullYear(now.getFullYear() - 1);
      break;
    case "ytd":
      from = new Date(now.getFullYear(), 0, 1);
      break;
  }
  return { from: from.toISOString().slice(0, 10), to };
}

// Minimal tooltip formatter for recharts
function MoneyTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean | undefined;
  payload?: Array<{ name: string; value: number; color: string }> | undefined;
  label?: string | undefined;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">{formatMoney(p.value, currency)}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral" | undefined;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-xl font-bold tracking-tight text-foreground truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div
            className={cn(
              "rounded-lg p-2 shrink-0",
              trend === "up" && "bg-emerald-500/10 text-emerald-500",
              trend === "down" && "bg-destructive/10 text-destructive",
              trend === "neutral" && "bg-primary/10 text-primary",
              !trend && "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsContent() {
  const { workspace } = useWorkspace();

  const [dateRange, setDateRange] = useState<DateRange>("90d");

  const { from, to } = getDateRange(dateRange);

  // Data queries
  const profitQuery = useQuery(profitabilitySummaryQueryOptions(workspace.id, from, to));
  const invoicesQuery = useQuery(invoicesQueryOptions(workspace.id));
  const transactionsQuery = useQuery(transactionsQueryOptions(workspace.id));
  const clientsQuery = useQuery(clientsQueryOptions(workspace.id, { status: "active" }));
  const projectsQuery = useQuery(projectsQueryOptions(workspace.id, {}));

  const isLoading =
    profitQuery.isLoading ||
    invoicesQuery.isLoading ||
    transactionsQuery.isLoading ||
    clientsQuery.isLoading ||
    projectsQuery.isLoading;

  // Process profitability data per currency
  const profitData = profitQuery.data?.periods ?? [];
  // Use workspace primary currency or first available
  const primaryCurrency =
    profitData.find((p) => p.currency === workspace.currency) ?? profitData[0];

  // Build monthly cashflow chart data from transactions
  const transactions = transactionsQuery.data ?? [];
  const cashflowByMonth = buildMonthlyCashflow(transactions);

  // Invoice status breakdown
  const invoices = invoicesQuery.data ?? [];
  const invoiceStatusBreakdown = buildInvoiceStatusBreakdown(invoices);

  // Active clients & projects counts
  const activeClients = (clientsQuery.data ?? []).filter((c) => c.status === "active").length;
  const activeProjects = (projectsQuery.data ?? []).filter(
    (p) => p.status === "active" || p.status === "planning",
  ).length;

  const currency = workspace.currency;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Financial performance across your workspace — all figures drawn from your ledger.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1 self-start sm:self-auto rounded-lg border border-border bg-card p-1">
          {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={dateRange === r ? "secondary" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setDateRange(r)}
            >
              {DATE_RANGE_LABELS[r]}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="h-9">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="receivables">Receivables</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Revenue"
                value={primaryCurrency ? formatMoney(primaryCurrency.total_revenue, currency) : "—"}
                sub={`${primaryCurrency?.invoice_count ?? 0} invoices`}
                icon={DollarSign}
                trend="up"
              />
              <StatCard
                label="Expenses"
                value={
                  primaryCurrency ? formatMoney(primaryCurrency.total_expenses, currency) : "—"
                }
                sub={`${primaryCurrency?.expense_count ?? 0} entries`}
                icon={TrendingDown}
                trend="down"
              />
              <StatCard
                label="Net Profit"
                value={primaryCurrency ? formatMoney(primaryCurrency.net_profit, currency) : "—"}
                sub={
                  primaryCurrency
                    ? `${primaryCurrency.margin_percent.toFixed(1)}% margin`
                    : undefined
                }
                icon={TrendingUp}
                trend={
                  primaryCurrency ? (primaryCurrency.net_profit >= 0 ? "up" : "down") : "neutral"
                }
              />
              <StatCard
                label="Active Clients"
                value={String(activeClients)}
                sub={`${activeProjects} active projects`}
                icon={Users}
                trend="neutral"
              />
            </div>

            {/* Multi-currency profitability */}
            {profitData.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Profitability by Currency</CardTitle>
                  <CardDescription className="text-xs">
                    Currency isolation is enforced — figures are never aggregated across currencies.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="pb-2 font-medium">Currency</th>
                          <th className="pb-2 font-medium text-right">Revenue</th>
                          <th className="pb-2 font-medium text-right">Expenses</th>
                          <th className="pb-2 font-medium text-right">Net Profit</th>
                          <th className="pb-2 font-medium text-right">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitData.map((row) => (
                          <tr
                            key={row.currency}
                            className="border-b border-border/40 last:border-0"
                          >
                            <td className="py-2.5">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {row.currency}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-right font-mono text-xs text-emerald-500">
                              {formatMoney(row.total_revenue, row.currency)}
                            </td>
                            <td className="py-2.5 text-right font-mono text-xs text-destructive">
                              {formatMoney(row.total_expenses, row.currency)}
                            </td>
                            <td
                              className={cn(
                                "py-2.5 text-right font-mono text-xs font-semibold",
                                row.net_profit >= 0 ? "text-emerald-500" : "text-destructive",
                              )}
                            >
                              {formatMoney(row.net_profit, row.currency)}
                            </td>
                            <td className="py-2.5 text-right text-xs text-muted-foreground">
                              {row.margin_percent.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {profitData.length === 0 && (
              <Card className="border-dashed p-10 text-center">
                <BarChart3 className="mx-auto size-10 text-muted-foreground/50" />
                <h3 className="mt-3 text-base font-semibold">No financial data yet</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  Start recording transactions and invoices to see your financial analytics here.
                </p>
              </Card>
            )}
          </TabsContent>

          {/* ── RECEIVABLES ── */}
          <TabsContent value="receivables" className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {invoiceStatusBreakdown.map((item) => (
                <Card key={item.status}>
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {INVOICE_STATUS_LABELS[item.status as keyof typeof INVOICE_STATUS_LABELS] ??
                        item.status}
                    </p>
                    <p className="text-xl font-bold mt-1">{item.count}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {formatMoney(item.total, currency)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {invoiceStatusBreakdown.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Invoice Distribution</CardTitle>
                  <CardDescription className="text-xs">
                    Breakdown by count across invoice statuses in the selected period.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={invoiceStatusBreakdown.filter((d) => d.count > 0)}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {invoiceStatusBreakdown.map((item) => (
                          <Cell key={item.status} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [String(value), "Count"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed p-10 text-center">
                <Receipt className="mx-auto size-10 text-muted-foreground/50" />
                <h3 className="mt-3 text-base font-semibold">No invoices in this period</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Issue your first invoice to track receivables here.
                </p>
              </Card>
            )}
          </TabsContent>

          {/* ── CASHFLOW ── */}
          <TabsContent value="cashflow" className="space-y-6">
            {cashflowByMonth.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Cash Flow — {currency}</CardTitle>
                  <CardDescription className="text-xs">
                    Monthly income and expenses from your transaction ledger. Amounts shown in{" "}
                    {currency} only.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={cashflowByMonth}
                      margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                    >
                      <defs>
                        <linearGradient id="inflow-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="outflow-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                        tickFormatter={(v) =>
                          v >= 1_000_000
                            ? `${(v / 1_000_000).toFixed(1)}M`
                            : v >= 1_000
                              ? `${(v / 1_000).toFixed(0)}K`
                              : String(v)
                        }
                      />
                      <Tooltip
                        content={({ active, payload, label }) => (
                          <MoneyTooltip
                            active={active}
                            payload={
                              payload as Array<{ name: string; value: number; color: string }>
                            }
                            label={String(label)}
                            currency={currency}
                          />
                        )}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#inflow-grad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#outflow-grad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed p-10 text-center">
                <TrendingUp className="mx-auto size-10 text-muted-foreground/50" />
                <h3 className="mt-3 text-base font-semibold">No transactions in this period</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Record income and expenses to visualize your cash flow here.
                </p>
              </Card>
            )}
          </TabsContent>

          {/* ── BUSINESS ── */}
          <TabsContent value="business" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Active Clients"
                value={String(activeClients)}
                sub="Currently active"
                icon={Users}
                trend="neutral"
              />
              <StatCard
                label="Active Projects"
                value={String(activeProjects)}
                sub="In progress or planning"
                icon={BarChart3}
                trend="neutral"
              />
            </div>

            {/* Project status breakdown */}
            {(projectsQuery.data ?? []).length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Project Status Breakdown</CardTitle>
                  <CardDescription className="text-xs">
                    Distribution of your projects by current status.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={buildProjectStatusBreakdown(projectsQuery.data ?? [])}
                      margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [String(v), "Projects"]} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed p-10 text-center">
                <BarChart3 className="mx-auto size-10 text-muted-foreground/50" />
                <h3 className="mt-3 text-base font-semibold">No projects yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create projects to track your business activity here.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Transaction = {
  transaction_date: string;
  transaction_type: string;
  amount: number;
  currency: string;
};

function buildMonthlyCashflow(
  transactions: Transaction[],
): Array<{ month: string; income: number; expenses: number }> {
  const map = new Map<string, { income: number; expenses: number }>();

  for (const tx of transactions) {
    const d = new Date(tx.transaction_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
    if (!map.has(label)) map.set(label, { income: 0, expenses: 0 });
    const entry = map.get(label)!;
    if (tx.transaction_type === "income") {
      entry.income += Number(tx.amount);
    } else if (tx.transaction_type === "expense") {
      entry.expenses += Number(tx.amount);
    }
    void key;
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, ...vals }));
}

type InvoiceStatusItem = {
  status: string;
  total: number;
  currency: string;
};

function buildInvoiceStatusBreakdown(
  invoices: InvoiceStatusItem[],
): Array<{ status: string; label: string; count: number; total: number; color: string }> {
  const STATUS_COLORS: Record<string, string> = {
    draft: "#6b7280",
    sent: "#3b82f6",
    viewed: "#8b5cf6",
    paid: "#10b981",
    overdue: "#ef4444",
    cancelled: "#9ca3af",
  };

  const map = new Map<string, { count: number; total: number }>();
  for (const inv of invoices) {
    if (!map.has(inv.status)) map.set(inv.status, { count: 0, total: 0 });
    const e = map.get(inv.status)!;
    e.count++;
    e.total += Number(inv.total);
  }

  return Array.from(map.entries()).map(([status, vals]) => ({
    status,
    label: INVOICE_STATUS_LABELS[status as keyof typeof INVOICE_STATUS_LABELS] ?? status,
    ...vals,
    color: STATUS_COLORS[status] ?? "#6b7280",
  }));
}

type Project = {
  status: string;
};

function buildProjectStatusBreakdown(projects: Project[]): Array<{ label: string; count: number }> {
  const STATUS_LABELS: Record<string, string> = {
    planning: "Planning",
    active: "Active",
    on_hold: "On Hold",
    completed: "Completed",
    archived: "Archived",
  };

  const map = new Map<string, number>();
  for (const p of projects) {
    map.set(p.status, (map.get(p.status) ?? 0) + 1);
  }

  return Array.from(map.entries()).map(([status, count]) => ({
    label: STATUS_LABELS[status] ?? status,
    count,
  }));
}

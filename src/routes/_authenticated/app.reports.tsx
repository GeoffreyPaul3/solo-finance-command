import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  BarChart3,
  Clock,
  Download,
  FileText,
  Loader2,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { generateReportPdf } from "@/lib/pdf/report-pdf";

import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calculateExpenseReportTotals,
  calculateIncomeReportTotals,
  calculateReceivablesAgingBuckets,
  cashflowReportQueryOptions,
  downloadCsv,
  expenseReportQueryOptions,
  incomeReportQueryOptions,
  receivablesReportQueryOptions,
  type CashflowReportItem,
  type ExpenseReportItem,
  type IncomeReportItem,
  type ReceivablesAgingItem,
  type ReportType,
} from "@/domain/reports";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/reports")({
  head: () => ({
    meta: [
      { title: "Reports | SoloOS" },
      {
        name: "description",
        content:
          "Generate income, expense, cashflow, and receivables aging reports with CSV export.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});

function getDefaultDateRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-01-01`;
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

const REPORT_TABS: { id: ReportType; label: string; icon: typeof BarChart3 }[] = [
  { id: "income", label: "Income", icon: TrendingUp },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "cashflow", label: "Cashflow", icon: Wallet },
  { id: "receivables", label: "Receivables Aging", icon: Clock },
];

function ReportsPage() {
  const { workspace } = useWorkspace();
  const defaults = getDefaultDateRange();
  const [reportType, setReportType] = useState<ReportType>("income");
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [currency, setCurrency] = useState<string>("all");

  const currencyFilter = currency === "all" ? undefined : currency;

  const incomeQuery = useQuery({
    ...incomeReportQueryOptions(workspace.id, dateFrom, dateTo, currencyFilter),
    enabled: reportType === "income",
  });

  const expenseQuery = useQuery({
    ...expenseReportQueryOptions(workspace.id, dateFrom, dateTo, currencyFilter),
    enabled: reportType === "expenses",
  });

  const cashflowQuery = useQuery({
    ...cashflowReportQueryOptions(workspace.id, dateFrom, dateTo, currencyFilter),
    enabled: reportType === "cashflow",
  });

  const receivablesQuery = useQuery({
    ...receivablesReportQueryOptions(workspace.id, currencyFilter),
    enabled: reportType === "receivables",
  });

  const isLoading =
    incomeQuery.isLoading ||
    expenseQuery.isLoading ||
    cashflowQuery.isLoading ||
    receivablesQuery.isLoading;

  const isError =
    incomeQuery.isError ||
    expenseQuery.isError ||
    cashflowQuery.isError ||
    receivablesQuery.isError;

  function handleExport() {
    try {
      if (reportType === "income") {
        const data = (incomeQuery.data ?? []).map((r) => ({
          client: r.clientName,
          project: r.projectName,
          currency: r.currency,
          invoices: r.invoiceCount,
          gross_billed: r.grossBilled,
          gross_collected: r.grossCollected,
          outstanding: r.outstanding,
        }));
        downloadCsv(data, `income-report-${dateFrom}-to-${dateTo}`);
      } else if (reportType === "expenses") {
        const data = (expenseQuery.data ?? []).map((r) => ({
          category: r.categoryName,
          vendor: r.vendor,
          currency: r.currency,
          count: r.expenseCount,
          total: r.totalAmount,
          deductible: r.taxDeductibleAmount,
        }));
        downloadCsv(data, `expense-report-${dateFrom}-to-${dateTo}`);
      } else if (reportType === "cashflow") {
        const data = (cashflowQuery.data ?? []).map((r) => ({
          period: r.periodStart,
          currency: r.currency,
          inflow: r.cashInflow,
          outflow: r.cashOutflow,
          net: r.netCashflow,
          balance: r.closingBalance,
        }));
        downloadCsv(data, `cashflow-report-${dateFrom}-to-${dateTo}`);
      } else {
        const data = (receivablesQuery.data ?? []).map((r) => ({
          invoice: r.invoiceNumber,
          client: r.clientName,
          currency: r.currency,
          issue_date: r.issueDate,
          due_date: r.dueDate,
          days_overdue: r.daysOverdue,
          total: r.totalAmount,
          paid: r.amountPaid,
          due: r.amountDue,
          bucket: r.agingBucket,
        }));
        downloadCsv(data, `receivables-aging`);
      }
      toast.success("CSV exported");
    } catch {
      toast.error("Export failed");
    }
  }

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  async function handleExportPdf() {
    setIsExportingPdf(true);
    try {
      if (reportType === "income") {
        const incomeData = incomeQuery.data ?? [];
        const totals = calculateIncomeReportTotals(incomeData);
        await generateReportPdf(
          {
            title: "Income by Client & Project Report",
            workspaceName: workspace.name,
            logoUrl: workspace.logo_url,
            periodLabel: `${dateFrom} to ${dateTo}`,
            currency: currency === "all" ? "All Currencies" : currency,
            metrics: [
              {
                label: "Total Billed",
                value: formatMoney(totals.totalBilled, currency === "all" ? "USD" : currency),
              },
              {
                label: "Total Collected",
                value: formatMoney(totals.totalCollected, currency === "all" ? "USD" : currency),
              },
              {
                label: "Total Outstanding",
                value: formatMoney(totals.totalOutstanding, currency === "all" ? "USD" : currency),
              },
              { label: "Total Invoices", value: String(totals.invoiceCount) },
            ],
            tables: [
              {
                title: "Income Breakdown",
                headers: [
                  "Client",
                  "Project",
                  "Currency",
                  "Invoices",
                  "Billed",
                  "Collected",
                  "Due",
                ],
                rows: incomeData.map((r) => [
                  r.clientName,
                  r.projectName || "—",
                  r.currency,
                  r.invoiceCount,
                  formatMoney(r.grossBilled, r.currency),
                  formatMoney(r.grossCollected, r.currency),
                  formatMoney(r.outstanding, r.currency),
                ]),
              },
            ],
          },
          `income-report-${dateFrom}-to-${dateTo}.pdf`,
        );
      } else if (reportType === "expenses") {
        const expenseData = expenseQuery.data ?? [];
        const totals = calculateExpenseReportTotals(expenseData);
        await generateReportPdf(
          {
            title: "Expenses by Category Report",
            workspaceName: workspace.name,
            logoUrl: workspace.logo_url,
            periodLabel: `${dateFrom} to ${dateTo}`,
            currency: currency === "all" ? "All Currencies" : currency,
            metrics: [
              {
                label: "Total Spent",
                value: formatMoney(totals.totalAmount, currency === "all" ? "USD" : currency),
              },
              {
                label: "Tax Deductible",
                value: formatMoney(totals.totalDeductible, currency === "all" ? "USD" : currency),
              },
              { label: "Total Expenses", value: String(totals.expenseCount) },
            ],
            tables: [
              {
                title: "Expense Breakdown",
                headers: [
                  "Category",
                  "Vendor",
                  "Currency",
                  "Count",
                  "Total Spent",
                  "Tax Deductible",
                ],
                rows: expenseData.map((r) => [
                  r.categoryName,
                  r.vendor || "—",
                  r.currency,
                  r.expenseCount,
                  formatMoney(r.totalAmount, r.currency),
                  formatMoney(r.taxDeductibleAmount, r.currency),
                ]),
              },
            ],
          },
          `expense-report-${dateFrom}-to-${dateTo}.pdf`,
        );
      } else if (reportType === "cashflow") {
        const cashflowData = cashflowQuery.data ?? [];
        await generateReportPdf(
          {
            title: "Cashflow Statement Report",
            workspaceName: workspace.name,
            logoUrl: workspace.logo_url,
            periodLabel: `${dateFrom} to ${dateTo}`,
            currency: currency === "all" ? "All Currencies" : currency,
            metrics: [],
            tables: [
              {
                title: "Cashflow Activity",
                headers: ["Period", "Currency", "Inflow", "Outflow", "Net", "Closing Balance"],
                rows: cashflowData.map((r) => [
                  r.periodStart,
                  r.currency,
                  formatMoney(r.cashInflow, r.currency),
                  formatMoney(r.cashOutflow, r.currency),
                  formatMoney(r.netCashflow, r.currency),
                  formatMoney(r.closingBalance, r.currency),
                ]),
              },
            ],
          },
          `cashflow-report-${dateFrom}-to-${dateTo}.pdf`,
        );
      } else {
        const agingData = receivablesQuery.data ?? [];
        const buckets = calculateReceivablesAgingBuckets(agingData);
        await generateReportPdf(
          {
            title: "Receivables Aging Report",
            workspaceName: workspace.name,
            logoUrl: workspace.logo_url,
            periodLabel: `As of ${new Date().toLocaleDateString()}`,
            currency: currency === "all" ? "All Currencies" : currency,
            metrics: [
              {
                label: "Current",
                value: formatMoney(buckets.current, currency === "all" ? "USD" : currency),
              },
              {
                label: "1-30 Days",
                value: formatMoney(buckets.bucket1_30, currency === "all" ? "USD" : currency),
              },
              {
                label: "31-60 Days",
                value: formatMoney(buckets.bucket31_60, currency === "all" ? "USD" : currency),
              },
              {
                label: "61-90 Days",
                value: formatMoney(buckets.bucket61_90, currency === "all" ? "USD" : currency),
              },
              {
                label: "90+ Days",
                value: formatMoney(buckets.bucket90_plus, currency === "all" ? "USD" : currency),
              },
              {
                label: "Total Due",
                value: formatMoney(buckets.totalDue, currency === "all" ? "USD" : currency),
              },
            ],
            tables: [
              {
                title: "Receivables Aging Breakdown",
                headers: [
                  "Invoice",
                  "Client",
                  "Currency",
                  "Due Date",
                  "Days",
                  "Amount Due",
                  "Bucket",
                ],
                rows: agingData.map((r) => [
                  r.invoiceNumber,
                  r.clientName,
                  r.currency,
                  r.dueDate,
                  r.daysOverdue > 0 ? `${r.daysOverdue}d` : "Current",
                  formatMoney(r.amountDue, r.currency),
                  r.agingBucket,
                ]),
              },
            ],
          },
          `receivables-aging-${new Date().toISOString().slice(0, 10)}.pdf`,
        );
      }
      toast.success("PDF report generated and downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF report");
    } finally {
      setIsExportingPdf(false);
    }
  }

  const showDateRange = reportType !== "receivables";

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Understand · Reports
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Income, expenses, cashflow and receivables aging — per-currency, no FX conversions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <Button
            id="export-report-pdf"
            variant="default"
            className="gap-2"
            onClick={handleExportPdf}
            disabled={isLoading || isExportingPdf}
          >
            {isExportingPdf ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            Export PDF
          </Button>
          <Button
            id="export-report-csv"
            variant="outline"
            className="gap-2"
            onClick={handleExport}
            disabled={isLoading}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        {/* Report type tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {REPORT_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`report-tab-${tab.id}`}
                onClick={() => setReportType(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  reportType === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Date range */}
        {showDateRange && (
          <>
            <div className="flex items-center gap-2">
              <Label htmlFor="report-date-from" className="text-sm font-medium shrink-0">
                From
              </Label>
              <Input
                id="report-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="report-date-to" className="text-sm font-medium shrink-0">
                To
              </Label>
              <Input
                id="report-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36"
              />
            </div>
          </>
        )}

        {/* Currency filter */}
        <div className="flex items-center gap-2">
          <Label htmlFor="report-currency" className="text-sm font-medium shrink-0">
            Currency
          </Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="report-currency" className="w-28">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {["USD", "EUR", "GBP", "CAD", "AUD", "CHF"].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin mr-2" />
          Generating report…
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          <AlertCircle className="size-5 shrink-0" />
          <span className="text-sm">Failed to load report. Please refresh.</span>
        </div>
      )}

      {/* Income report */}
      {!isLoading && reportType === "income" && <IncomeReportView data={incomeQuery.data ?? []} />}

      {/* Expenses report */}
      {!isLoading && reportType === "expenses" && (
        <ExpenseReportView data={expenseQuery.data ?? []} />
      )}

      {/* Cashflow report */}
      {!isLoading && reportType === "cashflow" && (
        <CashflowReportView data={cashflowQuery.data ?? []} />
      )}

      {/* Receivables aging */}
      {!isLoading && reportType === "receivables" && (
        <ReceivablesAgingView data={receivablesQuery.data ?? []} />
      )}
    </div>
  );
}

// ─── Report sub-views ────────────────────────────────────────────────────────

function IncomeReportView({ data }: { data: IncomeReportItem[] }) {
  const totals = calculateIncomeReportTotals(data);
  if (data.length === 0) return <EmptyState label="income" />;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Invoices" value={String(totals.invoiceCount)} />
        <SummaryCard label="Gross Billed" value={totals.totalBilled} currency={data[0]?.currency} />
        <SummaryCard
          label="Gross Collected"
          value={totals.totalCollected}
          currency={data[0]?.currency}
          highlight
        />
        <SummaryCard
          label="Outstanding"
          value={totals.totalOutstanding}
          currency={data[0]?.currency}
          isWarning={totals.totalOutstanding > 0}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Currency</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.clientName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.projectName}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.currency}</TableCell>
                  <TableCell className="text-right">{row.invoiceCount}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.grossBilled, row.currency)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">
                    {formatMoney(row.grossCollected, row.currency)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      row.outstanding > 0 ? "text-amber-600" : "text-muted-foreground",
                    )}
                  >
                    {formatMoney(row.outstanding, row.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpenseReportView({ data }: { data: ExpenseReportItem[] }) {
  const totals = calculateExpenseReportTotals(data);
  if (data.length === 0) return <EmptyState label="expenses" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Total Expenses"
          value={totals.totalAmount}
          currency={data[0]?.currency}
          isWarning
        />
        <SummaryCard
          label="Tax Deductible"
          value={totals.totalDeductible}
          currency={data[0]?.currency}
          highlight
        />
        <SummaryCard label="Expense Count" value={String(totals.expenseCount)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Currency</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Deductible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.categoryName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.vendor || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.currency}</TableCell>
                  <TableCell className="text-right">{row.expenseCount}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.totalAmount, row.currency)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-600">
                    {formatMoney(row.taxDeductibleAmount, row.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CashflowReportView({ data }: { data: CashflowReportItem[] }) {
  if (data.length === 0) return <EmptyState label="cashflow" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Cashflow</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Currency</TableHead>
              <TableHead className="text-right">Inflow</TableHead>
              <TableHead className="text-right">Outflow</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">Closing Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">
                  {new Date(row.periodStart).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                  })}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{row.currency}</TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">
                  {formatMoney(row.cashInflow, row.currency)}
                </TableCell>
                <TableCell className="text-right text-rose-600 font-medium">
                  {formatMoney(row.cashOutflow, row.currency)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-bold",
                    row.netCashflow >= 0 ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {row.netCashflow >= 0 ? "+" : ""}
                  {formatMoney(row.netCashflow, row.currency)}
                </TableCell>
                <TableCell className="text-right">
                  {formatMoney(row.closingBalance, row.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const AGING_BUCKETS: {
  key: "current" | "1_30" | "31_60" | "61_90" | "90_plus";
  label: string;
  className: string;
}[] = [
  { key: "current", label: "Current", className: "text-emerald-600" },
  { key: "1_30", label: "1–30 days", className: "text-amber-500" },
  { key: "31_60", label: "31–60 days", className: "text-amber-600" },
  { key: "61_90", label: "61–90 days", className: "text-orange-600" },
  { key: "90_plus", label: "90+ days", className: "text-rose-600" },
];

const BUCKET_BADGE_CLASS: Record<string, string> = {
  current: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  "1_30": "bg-amber-500/10 text-amber-700 border-amber-500/30",
  "31_60": "bg-amber-600/10 text-amber-800 border-amber-600/30",
  "61_90": "bg-orange-500/10 text-orange-700 border-orange-500/30",
  "90_plus": "bg-rose-500/10 text-rose-700 border-rose-500/30",
};

function ReceivablesAgingView({ data }: { data: ReceivablesAgingItem[] }) {
  const summary = calculateReceivablesAgingBuckets(data);
  if (data.length === 0) return <EmptyState label="outstanding receivables" />;

  return (
    <div className="space-y-4">
      {/* Aging buckets summary */}
      <div className="flex flex-wrap gap-3">
        {AGING_BUCKETS.map((b) => {
          const amount =
            b.key === "current"
              ? summary.current
              : b.key === "1_30"
                ? summary.bucket1_30
                : b.key === "31_60"
                  ? summary.bucket31_60
                  : b.key === "61_90"
                    ? summary.bucket61_90
                    : summary.bucket90_plus;
          const pct = summary.totalDue > 0 ? (amount / summary.totalDue) * 100 : 0;
          return (
            <div
              key={b.key}
              className="flex-1 min-w-[120px] rounded-lg border border-border/40 bg-card p-3"
            >
              <p className="text-xs text-muted-foreground">{b.label}</p>
              <p className={cn("mt-1 text-base font-bold", b.className)}>
                {formatMoney(amount, data[0]?.currency ?? "USD")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{Math.round(pct)}%</p>
            </div>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Due Date</TableHead>
                <TableHead className="text-right">Days Overdue</TableHead>
                <TableHead className="text-right">Amount Due</TableHead>
                <TableHead className="text-right">Bucket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.invoiceId}>
                  <TableCell className="font-mono text-sm font-medium">
                    {row.invoiceNumber}
                  </TableCell>
                  <TableCell>{row.clientName}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(row.dueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.daysOverdue > 0 ? (
                      <span className="text-rose-600 font-medium">{row.daysOverdue}d</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatMoney(row.amountDue, row.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", BUCKET_BADGE_CLASS[row.agingBucket])}
                    >
                      {AGING_BUCKETS.find((b) => b.key === row.agingBucket)?.label ??
                        row.agingBucket}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-10 text-center">
      <BarChart3 className="mx-auto mb-3 size-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">No {label} data for this period</p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        Adjust the date range or add records to generate a report.
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  currency,
  highlight,
  isWarning,
}: {
  label: string;
  value: string | number;
  currency?: string | undefined;
  highlight?: boolean | undefined;
  isWarning?: boolean | undefined;
}) {
  const formatted =
    typeof value === "number" && currency ? formatMoney(value, currency) : String(value);

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        highlight ? "border-primary/20 bg-primary/5" : "border-border/40 bg-muted/20",
        isWarning && "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-base font-bold tracking-tight",
          highlight && "text-primary",
          isWarning && "text-amber-700 dark:text-amber-400",
        )}
      >
        {formatted}
      </p>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  Info,
  Loader2,
  Printer,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { MoneyValue } from "@/components/ui/money-value";
import { Textarea } from "@/components/ui/textarea";
import { downloadCsv } from "@/domain/reports";
import {
  evaluateTaxHealth,
  taxAdjustmentsListQueryOptions,
  taxSummaryQueryOptions,
  upsertTaxReserveAdjustment,
  type TaxHealthStatus,
  type TaxSummaryRow,
} from "@/domain/tax-reserve";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/taxes")({
  head: () => ({
    meta: [
      { title: "Taxes | SoloOS" },
      {
        name: "description",
        content:
          "Track your tax reserve, YTD taxable income, and target set-aside across all currencies.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TaxesPage,
});

function getDefaultTaxYear() {
  return new Date().getFullYear();
}

const HEALTH_CONFIG: Record<
  TaxHealthStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    className: string;
    badgeVariant: "default" | "destructive" | "secondary" | "outline";
  }
> = {
  funded: {
    label: "Funded",
    icon: CheckCircle2,
    className: "text-emerald-600",
    badgeVariant: "default",
  },
  shortfall: {
    label: "Shortfall",
    icon: AlertTriangle,
    className: "text-amber-600",
    badgeVariant: "destructive",
  },
  overfunded: {
    label: "Overfunded",
    icon: TrendingUp,
    className: "text-sky-600",
    badgeVariant: "secondary",
  },
};

function TaxesPage() {
  const { workspace } = useWorkspace();
  const [taxYear, setTaxYear] = useState(getDefaultTaxYear);
  const [updateDialog, setUpdateDialog] = useState<{
    open: boolean;
    currency: string;
    currentTracked: number;
  }>({
    open: false,
    currency: "",
    currentTracked: 0,
  });
  const [updatedAmount, setUpdatedAmount] = useState("");
  const [updatedNotes, setUpdatedNotes] = useState("");
  const [expandedCurrency, setExpandedCurrency] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const summaryQuery = useQuery(taxSummaryQueryOptions(workspace.id, taxYear));
  const adjustmentsQuery = useQuery(taxAdjustmentsListQueryOptions(workspace.id));

  const updateMutation = useMutation({
    mutationFn: (input: { currency: string; amount: number; notes?: string }) =>
      upsertTaxReserveAdjustment(workspace.id, {
        currency: input.currency,
        amount: input.amount,
        notes: input.notes,
      }),
    onSuccess: () => {
      toast.success("Tax reserve updated");
      void queryClient.invalidateQueries({ queryKey: ["tax-summary", workspace.id] });
      void queryClient.invalidateQueries({ queryKey: ["tax-adjustments", workspace.id] });
      setUpdateDialog({ open: false, currency: "", currentTracked: 0 });
      setUpdatedAmount("");
      setUpdatedNotes("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update tax reserve");
    },
  });

  const summaryRows: TaxSummaryRow[] = summaryQuery.data ?? [];
  const isLoading = summaryQuery.isLoading;
  const isError = summaryQuery.isError;

  function openUpdateDialog(row: TaxSummaryRow) {
    setUpdateDialog({ open: true, currency: row.currency, currentTracked: row.trackedTaxReserve });
    setUpdatedAmount(String(row.trackedTaxReserve));
    setUpdatedNotes("");
  }

  function handleUpdate() {
    const amount = parseFloat(updatedAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid non-negative amount");
      return;
    }
    updateMutation.mutate({
      currency: updateDialog.currency,
      amount,
      ...(updatedNotes.trim() ? { notes: updatedNotes.trim() } : {}),
    });
  }

  function handleExportCsv() {
    if (!summaryRows.length) {
      toast.error("No tax data to export");
      return;
    }
    const data = summaryRows.map((r) => {
      const health = evaluateTaxHealth(r.targetTaxReserve, r.trackedTaxReserve);
      return {
        tax_year: taxYear,
        currency: r.currency,
        reporting_period: `${taxYear}-01-01 to ${taxYear}-12-31`,
        gross_income_ytd: r.grossIncomeYtd,
        expenses_ytd: r.expensesYtd,
        taxable_basis: r.netTaxableIncomeYtd,
        tax_rate_percent: r.taxReserveRate,
        target_reserve: r.targetTaxReserve,
        tracked_reserve: r.trackedTaxReserve,
        shortfall: r.shortfall,
        health_status: health,
      };
    });
    downloadCsv(data, `tax-planning-report-${taxYear}`);
    toast.success("Tax planning report exported to CSV");
  }

  const now = new Date().getFullYear();
  const years = [now, now - 1, now - 2];

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6 print:border-none print:pb-2">
        <div>
          <div className="flex items-center gap-2 print:hidden">
            <Calculator className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Understand · Taxes
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Tax Reserve & Planning
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your tax set-aside against YTD taxable income. Amounts are manually tracked — not
            ledger-based.
          </p>
        </div>

        {/* Actions & Year picker */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Label htmlFor="tax-year" className="text-sm font-medium text-muted-foreground">
              Tax Year
            </Label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {years.map((y) => (
                <button
                  key={y}
                  id={y === now ? "tax-year" : undefined}
                  onClick={() => setTaxYear(y)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium transition-colors",
                    taxYear === y
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={summaryRows.length === 0}
              className="gap-1.5"
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              disabled={summaryRows.length === 0}
              className="gap-1.5"
            >
              <Printer className="size-3.5" />
              Print
            </Button>
          </div>
        </div>
      </header>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin mr-2" />
          Loading tax summary…
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          <AlertCircle className="size-5 shrink-0" />
          <span className="text-sm">Failed to load tax summary. Please refresh.</span>
        </div>
      )}

      {!isLoading && !isError && summaryRows.length === 0 && (
        <div className="rounded-xl border border-border/50 bg-muted/30 p-10 text-center">
          <Calculator className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No data for {taxYear}</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Record income and expenses to see your tax reserve summary.
          </p>
        </div>
      )}

      {/* Currency rows */}
      {summaryRows.map((row) => {
        const health = evaluateTaxHealth(row.targetTaxReserve, row.trackedTaxReserve);
        const cfg = HEALTH_CONFIG[health];
        const StatusIcon = cfg.icon;
        const isExpanded = expandedCurrency === row.currency;
        const collectionRate =
          row.grossIncomeYtd > 0 ? (row.trackedTaxReserve / row.targetTaxReserve) * 100 : null;

        return (
          <Card
            key={row.currency}
            className={cn(
              "overflow-hidden border transition-shadow",
              health === "shortfall" && "border-amber-500/30",
              health === "funded" && "border-emerald-500/20",
              health === "overfunded" && "border-sky-500/20",
            )}
          >
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full",
                      health === "funded" && "bg-emerald-500/10",
                      health === "shortfall" && "bg-amber-500/10",
                      health === "overfunded" && "bg-sky-500/10",
                    )}
                  >
                    <StatusIcon className={cn("size-5", cfg.className)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold">{row.currency}</CardTitle>
                      {row.isPrimaryCurrency && (
                        <Badge variant="outline" className="text-xs">
                          Primary
                        </Badge>
                      )}
                      <Badge
                        variant={cfg.badgeVariant}
                        className={cn(
                          "text-xs",
                          health === "funded" &&
                            "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
                          health === "overfunded" && "bg-sky-500/15 text-sky-700 border-sky-500/30",
                        )}
                      >
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Tax rate: {formatPercent(row.taxReserveRate / 100)} · Tax year {taxYear}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <Button
                    id={`update-tax-reserve-${row.currency}`}
                    size="sm"
                    variant="outline"
                    onClick={() => openUpdateDialog(row)}
                    className="gap-1.5"
                  >
                    <Edit3 className="size-3.5" />
                    Update Reserve
                  </Button>
                  <button
                    onClick={() => setExpandedCurrency(isExpanded ? null : row.currency)}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                    aria-label={isExpanded ? "Collapse details" : "Expand details"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Reserve progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Reserve progress</span>
                  <span className="font-semibold">
                    {collectionRate !== null
                      ? `${Math.min(100, Math.round(collectionRate))}%`
                      : "—"}
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      health === "funded" && "bg-emerald-500",
                      health === "shortfall" && "bg-amber-500",
                      health === "overfunded" && "bg-sky-500",
                    )}
                    style={{
                      width: `${Math.min(100, collectionRate ?? 0)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Tracked:{" "}
                    <span className="font-semibold text-foreground">
                      {formatMoney(row.trackedTaxReserve, row.currency)}
                    </span>
                  </span>
                  <span>
                    Target:{" "}
                    <span className="font-semibold text-foreground">
                      {formatMoney(row.targetTaxReserve, row.currency)}
                    </span>
                  </span>
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricTile
                  label="Gross Income YTD"
                  value={formatMoney(row.grossIncomeYtd, row.currency)}
                />
                <MetricTile
                  label="Expenses YTD"
                  value={formatMoney(row.expensesYtd, row.currency)}
                />
                <MetricTile
                  label="Net Taxable YTD"
                  value={formatMoney(row.netTaxableIncomeYtd, row.currency)}
                  highlight
                />
                <MetricTile
                  label="Shortfall"
                  value={row.shortfall > 0 ? formatMoney(row.shortfall, row.currency) : "None"}
                  isWarning={row.shortfall > 0}
                />
              </div>

              {/* Shortfall alert */}
              {health === "shortfall" && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    You are <strong>{formatMoney(row.shortfall, row.currency)}</strong> short of
                    your tax target. Consider setting this amount aside before spending.
                  </p>
                </div>
              )}

              {/* Expanded breakdown */}
              {isExpanded && (
                <div className="mt-2 rounded-lg border border-border/50 bg-muted/20 p-4 space-y-2 text-sm">
                  <p className="font-semibold text-foreground mb-3">Detailed breakdown</p>
                  <Row
                    label="Gross Income YTD"
                    value={formatMoney(row.grossIncomeYtd, row.currency)}
                  />
                  <Row label="Expenses YTD" value={formatMoney(row.expensesYtd, row.currency)} />
                  <Row
                    label="Net Taxable Income YTD"
                    value={formatMoney(row.netTaxableIncomeYtd, row.currency)}
                    bold
                  />
                  <div className="my-2 border-t border-border/40" />
                  <Row
                    label={`Reserve Rate (${formatPercent(row.taxReserveRate / 100)})`}
                    value={formatMoney(row.targetTaxReserve, row.currency)}
                  />
                  <Row
                    label="Tracked Reserve"
                    value={formatMoney(row.trackedTaxReserve, row.currency)}
                  />
                  <Row
                    label="Shortfall / (Surplus)"
                    value={
                      row.shortfall > 0
                        ? `(${formatMoney(row.shortfall, row.currency)})`
                        : health === "overfunded"
                          ? `+${formatMoney(row.trackedTaxReserve - row.targetTaxReserve, row.currency)}`
                          : "—"
                    }
                    warn={row.shortfall > 0}
                  />
                  <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3 shrink-0" />
                    <span>
                      Tax reserve is tracked manually. "Tracked" reflects what you've manually
                      marked as set aside. The target is computed from your YTD net taxable income
                      at your configured tax rate.
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Recent adjustments */}
      {!isLoading && (adjustmentsQuery.data?.length ?? 0) > 0 && (
        <section aria-label="Recent tax reserve adjustments" className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Updates
          </h2>
          <div className="space-y-2">
            {(adjustmentsQuery.data ?? []).slice(0, 8).map((adj) => (
              <div
                key={adj.id}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-card px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{adj.currency}</span>
                  {adj.notes && (
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      {adj.notes}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <MoneyValue
                    value={Number(adj.amount)}
                    currency={adj.currency}
                    className="font-semibold"
                  />
                  <span className="text-xs text-muted-foreground">
                    {new Date(adj.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Update reserve dialog */}
      <Dialog
        open={updateDialog.open}
        onOpenChange={(open) => !open && setUpdateDialog((p) => ({ ...p, open: false }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Tax Reserve — {updateDialog.currency}</DialogTitle>
            <DialogDescription>
              Enter the total amount you have set aside for taxes in {updateDialog.currency}. This
              overwrites the previous tracked value.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reserve-amount">Tracked Amount ({updateDialog.currency})</Label>
              <MoneyInput
                id="reserve-amount"
                value={updatedAmount}
                onChange={setUpdatedAmount}
                currency={updateDialog.currency}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reserve-notes">Notes (optional)</Label>
              <Textarea
                id="reserve-notes"
                rows={3}
                value={updatedNotes}
                onChange={(e) => setUpdatedNotes(e.target.value)}
                placeholder="e.g. Moved to dedicated tax savings account"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateDialog((p) => ({ ...p, open: false }))}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              id="confirm-update-reserve"
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Save Reserve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Small sub-components ────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  highlight,
  isWarning,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  isWarning?: boolean;
}) {
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
        {value}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  warn,
}: {
  label: string;
  value: string;
  bold?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          bold && "font-semibold text-foreground",
          warn && "text-amber-700 dark:text-amber-400 font-semibold",
        )}
      >
        {value}
      </span>
    </div>
  );
}

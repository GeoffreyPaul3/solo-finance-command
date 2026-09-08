import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  CreditCard,
  DollarSign,
  ExternalLink,
  Filter,
  Loader2,
  Receipt,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { MoneyValue } from "@/components/ui/money-value";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { accountsQueryOptions } from "@/domain/financial";
import {
  workspacePaymentsQueryOptions,
  reversePayment,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type PaymentFilters,
  type PaymentMethod,
  type PaymentStatus,
} from "@/domain/payments";
import { roleAtLeast } from "@/domain/workspace";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/app/payments")({
  head: () => ({
    meta: [
      { title: "Payments | SoloOS" },
      { name: "description", content: "Global payment receipts and collection history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { workspace, role } = useWorkspace();
  const queryClient = useQueryClient();
  const canMutate = roleAtLeast(role, "finance");

  const [filters, setFilters] = useState<PaymentFilters>({ status: "posted" });
  const [search, setSearch] = useState("");
  const [reverseDialog, setReverseDialog] = useState<{
    open: boolean;
    paymentId: string;
    amount: number;
    currency: string;
  } | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  const paymentsQuery = useQuery(workspacePaymentsQueryOptions(workspace.id, filters));
  const accountsQuery = useQuery(accountsQueryOptions(workspace.id));

  const payments = (paymentsQuery.data ?? []).filter((p) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      p.reference?.toLowerCase().includes(term) ||
      p.notes?.toLowerCase().includes(term) ||
      p.invoice?.invoice_number?.toLowerCase().includes(term) ||
      p.invoice?.client?.name?.toLowerCase().includes(term)
    );
  });

  const reverseMutation = useMutation({
    mutationFn: () =>
      reversePayment(workspace.id, {
        paymentId: reverseDialog!.paymentId,
        reversalReason,
      }),
    onSuccess: () => {
      toast.success("Payment reversed successfully");
      void queryClient.invalidateQueries({ queryKey: ["payments-global", workspace.id] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-cash-summary"] });
      setReverseDialog(null);
      setReversalReason("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const totalPosted = payments
    .filter((p) => p.status === "posted")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Money · Payments
            </span>
          </div>
          <h1 className="text-display mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            Payments
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All collected invoice payments, linked to the authoritative cash ledger.
          </p>
        </div>
        <Link to="/app/invoices">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Receipt className="size-4" />
            View Invoices
          </Button>
        </Link>
      </header>

      {/* Summary Bar */}
      {payments.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-card/80 border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span className="font-semibold uppercase tracking-wider">Posted Payments</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                {payments.filter((p) => p.status === "posted").length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/80 border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <DollarSign className="size-3.5 text-primary" />
                <span className="font-semibold uppercase tracking-wider">Total Collected</span>
              </div>
              <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                {payments.length > 0
                  ? // Group by currency for display
                    Object.entries(
                      payments
                        .filter((p) => p.status === "posted")
                        .reduce<Record<string, number>>((acc, p) => {
                          acc[p.currency] = (acc[p.currency] ?? 0) + Number(p.amount);
                          return acc;
                        }, {}),
                    )
                      .map(([cur, amt]) => formatMoney(amt, cur))
                      .join(" · ") || "—"
                  : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/80 border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Calendar className="size-3.5 text-amber-500" />
                <span className="font-semibold uppercase tracking-wider">Reversed</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                {payments.filter((p) => p.status === "reversed").length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id="payments-search"
            placeholder="Search invoice #, client, reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <Select
          value={filters.status ?? "posted"}
          onValueChange={(v) =>
            setFilters((prev) => ({ ...prev, status: v as PaymentStatus | "all" }))
          }
        >
          <SelectTrigger id="filter-status" className="h-9 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="reversed">Reversed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.method ?? "all"}
          onValueChange={(v) =>
            setFilters((prev) => ({ ...prev, method: v as PaymentMethod | "all" }))
          }
        >
          <SelectTrigger id="filter-method" className="h-9 w-44 text-sm">
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.accountId ?? "all"}
          onValueChange={(v) =>
            setFilters((prev) => ({ ...prev, accountId: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger id="filter-account" className="h-9 w-44 text-sm">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {(accountsQuery.data ?? []).map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filters.status !== "posted" || filters.method || filters.accountId || search) && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => {
              setFilters({ status: "posted" });
              setSearch("");
            }}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Payments Table */}
      {paymentsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : paymentsQuery.isError ? (
        <div className="panel p-6 text-center text-sm text-destructive bg-destructive/5 border border-destructive/20">
          <AlertCircle className="size-5 mx-auto mb-2" />
          <p>{(paymentsQuery.error as Error).message}</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="panel p-12 text-center bg-card/60 border border-border">
          <CreditCard className="size-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">No payments found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Payments are recorded when invoices are collected. Head to Invoices to record a payment.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-5">
            <Link to="/app/invoices">
              View Invoices
              <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="panel overflow-hidden border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Invoice
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Client
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Method
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Account
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Amount
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Status
                </TableHead>
                {canMutate && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => {
                const inv = payment.invoice;
                const client = inv?.client;
                const isPosted = payment.status === "posted";
                return (
                  <TableRow key={payment.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {inv ? (
                        <Link
                          to="/app/invoices/$invoiceId"
                          params={{ invoiceId: payment.invoice_id }}
                          className="font-mono text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          {inv.invoice_number}
                          <ExternalLink className="size-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {client?.name ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[payment.payment_method]}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                      {payment.financial_account?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyValue value={payment.amount} currency={payment.currency} size="sm" />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase font-semibold",
                          isPosted
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
                        )}
                      >
                        {PAYMENT_STATUS_LABELS[payment.status]}
                      </Badge>
                    </TableCell>
                    {canMutate && (
                      <TableCell>
                        {isPosted && (
                          <Button
                            id={`reverse-payment-${payment.id}`}
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-destructive h-7"
                            onClick={() =>
                              setReverseDialog({
                                open: true,
                                paymentId: payment.id,
                                amount: Number(payment.amount),
                                currency: payment.currency,
                              })
                            }
                          >
                            Reverse
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reversal Dialog */}
      <Dialog
        open={Boolean(reverseDialog?.open)}
        onOpenChange={(open) => {
          if (!open) {
            setReverseDialog(null);
            setReversalReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reverse Payment</DialogTitle>
            <DialogDescription>
              This will reverse{" "}
              {reverseDialog && formatMoney(reverseDialog.amount, reverseDialog.currency)} from the
              cash ledger and update the invoice balance. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reversal-reason-payments">
                Reversal Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reversal-reason-payments"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Describe why this payment is being reversed…"
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReverseDialog(null);
                setReversalReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reversalReason.trim().length < 3 || reverseMutation.isPending}
              onClick={() => reverseMutation.mutate()}
            >
              {reverseMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Confirm Reversal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

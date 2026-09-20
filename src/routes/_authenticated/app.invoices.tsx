import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useChildMatches,
  useNavigate,
} from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Receipt,
  Search,
  Send,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { RecordPaymentDialog } from "@/components/app/record-payment-dialog";
import { useWorkspace } from "@/components/app/workspace-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { MoneyValue } from "@/components/ui/money-value";
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
import { TablePagination } from "@/components/ui/table-pagination";
import { Textarea } from "@/components/ui/textarea";
import { clientsQueryOptions } from "@/domain/clients";
import { accountsQueryOptions } from "@/domain/financial";
import {
  cancelInvoice,
  createInvoice,
  invoicesQueryOptions,
  sendInvoice,
  workspaceReceivablesSummaryQueryOptions,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  type CreateInvoiceInput,
  type InvoiceStatus,
  type InvoiceWithRelations,
  type LineItemInput,
} from "@/domain/invoices";
import { projectsQueryOptions } from "@/domain/projects";
import { roleAtLeast } from "@/domain/workspace";
import { computeLineTotal, computeSubtotal, computeTotal } from "@/lib/invoice-calculations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices | SoloOS" },
      { name: "description", content: "Professional invoicing and accounts receivable engine." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvoicesLayout,
});

function InvoicesLayout() {
  const childMatches = useChildMatches();
  // If a child route (e.g. $invoiceId) is active, render it via Outlet.
  // Otherwise render the list page directly.
  if (childMatches.length > 0) {
    return <Outlet />;
  }
  return <InvoicesPage />;
}

function InvoicesPage() {
  const { workspace, role } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [cancelTarget, setCancelTarget] = useState<InvoiceWithRelations | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<InvoiceWithRelations | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const accountsQuery = useQuery(accountsQueryOptions(workspace.id));
  const accounts = accountsQuery.data ?? [];

  const canManage = roleAtLeast(role, "manager");

  const invoicesQuery = useQuery(
    invoicesQueryOptions(workspace.id, {
      status: statusFilter,
      clientId: clientFilter !== "all" ? clientFilter : undefined,
      search: searchQuery,
    }),
  );

  const summaryQuery = useQuery(workspaceReceivablesSummaryQueryOptions(workspace.id));
  const clientsQuery = useQuery(clientsQueryOptions(workspace.id, { status: "active" }));

  const invoices = invoicesQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const summary = summaryQuery.data;

  const paginatedInvoices = invoices.slice(page * pageSize, (page + 1) * pageSize);

  const invalidateInvoices = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices", workspace.id] });
    queryClient.invalidateQueries({ queryKey: ["receivables-summary", workspace.id] });
  };

  const cancelMutation = useMutation({
    mutationFn: (inv: InvoiceWithRelations) => cancelInvoice(workspace.id, inv.id),
    onSuccess: () => {
      toast.success("Invoice cancelled.");
      invalidateInvoices();
      setCancelTarget(null);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to cancel invoice."),
  });

  const sendMutation = useMutation({
    mutationFn: async (inv: InvoiceWithRelations) => {
      setSendingId(inv.id);
      return sendInvoice(workspace.id, inv.id);
    },
    onSuccess: () => {
      toast.success("Invoice sent to client.");
      invalidateInvoices();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to send invoice."),
    onSettled: () => setSendingId(null),
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {invoices.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Commercial invoicing, line items, and receivables tracking with automatic ledger
            integration.
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setIsCreateOpen(true)} className="sm:self-center">
            <Plus className="mr-1.5 size-4" />
            Create Invoice
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="size-4 text-amber-500" />
            <span className="text-xs font-medium">Outstanding</span>
          </div>
          <div className="mt-2">
            <MoneyValue
              value={summary?.total_outstanding ?? 0}
              currency={workspace.currency}
              size="lg"
              className="font-bold tracking-tight"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Pending client payment</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="size-4 text-rose-500" />
            <span className="text-xs font-medium">Overdue</span>
          </div>
          <div className="mt-2">
            <MoneyValue
              value={summary?.total_overdue ?? 0}
              currency={workspace.currency}
              size="lg"
              className="font-bold tracking-tight text-rose-500"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Past payment due date</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Receipt className="size-4 text-primary" />
            <span className="text-xs font-medium">Active Invoices</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {summary?.active_invoice_count ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Non-cancelled invoices</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="size-4 text-emerald-500" />
            <span className="text-xs font-medium">This Month</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {summary?.invoices_this_month ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Created this month</p>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="pl-9 text-sm"
            />
          </div>

          <Select
            value={clientFilter}
            onValueChange={(val) => {
              setClientFilter(val);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val as InvoiceStatus | "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {invoicesQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-8 animate-spin mb-3 text-primary" />
          <p className="text-sm">Loading invoices...</p>
        </div>
      )}

      {/* Empty State */}
      {!invoicesQuery.isLoading && invoices.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <CardContent className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Receipt className="size-6" />
            </div>
            <CardTitle className="text-lg">No invoices found</CardTitle>
            <CardDescription className="text-sm">
              {searchQuery || statusFilter !== "all" || clientFilter !== "all"
                ? "No invoices match the selected filters. Try resetting your search or filter options."
                : "Create your first invoice to bill clients, track payments, and automate ledger recording."}
            </CardDescription>
            {canManage && (
              <Button onClick={() => setIsCreateOpen(true)} className="mt-2">
                <Plus className="mr-1.5 size-4" />
                Create Invoice
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Desktop Table */}
      {!invoicesQuery.isLoading && invoices.length > 0 && (
        <>
          <div className="hidden md:block rounded-md border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[140px] font-semibold">Invoice #</TableHead>
                  <TableHead className="font-semibold">Client / Project</TableHead>
                  <TableHead className="w-[110px] font-semibold">Issue Date</TableHead>
                  <TableHead className="w-[110px] font-semibold">Due Date</TableHead>
                  <TableHead className="text-right font-semibold">Total</TableHead>
                  <TableHead className="text-right font-semibold">Outstanding</TableHead>
                  <TableHead className="w-[120px] text-center font-semibold">Status</TableHead>
                  <TableHead className="w-[80px] text-right font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((inv) => {
                  const colors = INVOICE_STATUS_COLORS[inv.status];
                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-medium text-foreground">
                        <Link
                          to="/app/invoices/$invoiceId"
                          params={{ invoiceId: inv.id }}
                          className="hover:underline text-primary"
                        >
                          {inv.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {inv.client?.name ?? "Unknown Client"}
                          </span>
                          {inv.project && (
                            <span className="text-xs text-muted-foreground">
                              {inv.project.name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.issue_date}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.due_date}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <MoneyValue value={inv.total} currency={inv.currency} size="sm" />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <MoneyValue
                          value={inv.amount_due}
                          currency={inv.currency}
                          size="sm"
                          className={
                            inv.amount_due > 0
                              ? "text-amber-500 font-semibold"
                              : "text-muted-foreground"
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-medium uppercase tracking-wider",
                            colors.bg,
                            colors.text,
                            colors.border,
                          )}
                        >
                          {INVOICE_STATUS_LABELS[inv.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Actions for ${inv.invoice_number}`}
                            >
                              {sendingId === inv.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="size-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem asChild>
                              <Link
                                to="/app/invoices/$invoiceId"
                                params={{ invoiceId: inv.id }}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Eye className="size-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            {canManage && inv.status !== "cancelled" && (
                              <>
                                <DropdownMenuSeparator />
                                {(inv.status === "draft" ||
                                  inv.status === "sent" ||
                                  inv.status === "overdue") && (
                                  <DropdownMenuItem
                                    onClick={() => sendMutation.mutate(inv)}
                                    disabled={sendMutation.isPending}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Send className="size-4" />
                                    Send to Client
                                  </DropdownMenuItem>
                                )}
                                {(inv.status === "sent" ||
                                  inv.status === "partially_paid" ||
                                  inv.status === "overdue") && (
                                  <DropdownMenuItem
                                    onClick={() => setPaymentTarget(inv)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Wallet className="size-4" />
                                    Record Payment
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setCancelTarget(inv)}
                                  className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                                >
                                  <Ban className="size-4" />
                                  Cancel Invoice
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedInvoices.map((inv) => {
              const colors = INVOICE_STATUS_COLORS[inv.status];
              return (
                <Card key={inv.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        to="/app/invoices/$invoiceId"
                        params={{ invoiceId: inv.id }}
                        className="font-mono font-bold text-base hover:underline text-primary"
                      >
                        {inv.invoice_number}
                      </Link>
                      <p className="text-sm font-medium text-foreground mt-0.5">
                        {inv.client?.name ?? "Unknown Client"}
                      </p>
                      {inv.project && (
                        <p className="text-xs text-muted-foreground">{inv.project.name}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium uppercase tracking-wider",
                        colors.bg,
                        colors.text,
                        colors.border,
                      )}
                    >
                      {INVOICE_STATUS_LABELS[inv.status]}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-2.5 text-xs text-muted-foreground">
                    <span>Due: {inv.due_date}</span>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        <MoneyValue value={inv.total} currency={inv.currency} size="sm" />
                      </div>
                      {inv.amount_due > 0 && (
                        <span className="text-[11px] text-amber-500 font-medium">
                          Due: {inv.currency} {inv.amount_due.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                    <Link to="/app/invoices/$invoiceId" params={{ invoiceId: inv.id }}>
                      View Invoice
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                </Card>
              );
            })}
          </div>

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={invoices.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="invoices"
          />
        </>
      )}

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          invalidateInvoices();
          setIsCreateOpen(false);
        }}
        workspaceId={workspace.id}
        defaultCurrency={workspace.currency}
      />

      {/* Cancel Invoice Confirmation */}
      <AlertDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invoice?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Are you sure you want to cancel invoice{" "}
                  <strong className="text-foreground">{cancelTarget?.invoice_number}</strong>?
                </p>
                <p>
                  This will mark the invoice as cancelled. Existing payment records are preserved.
                  This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>Keep Invoice</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelTarget) cancelMutation.mutate(cancelTarget);
              }}
              disabled={cancelMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelMutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Cancel Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Record Payment Dialog */}
      {paymentTarget && (
        <RecordPaymentDialog
          isOpen={paymentTarget !== null}
          onClose={() => setPaymentTarget(null)}
          onSuccess={() => {
            setPaymentTarget(null);
            invalidateInvoices();
          }}
          invoice={paymentTarget}
          accounts={accounts}
          workspaceId={workspace.id}
        />
      )}
    </div>
  );
}

interface CreateInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  workspaceId: string;
  defaultCurrency: string;
}

function CreateInvoiceDialog({
  isOpen,
  onClose,
  onCreated,
  workspaceId,
  defaultCurrency,
}: CreateInvoiceDialogProps) {
  const todayStr = new Date().toISOString().split("T")[0] ?? "2026-09-08";
  const in30Days =
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] ?? "2026-10-08";

  const [clientId, setClientId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("none");
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [dueDate, setDueDate] = useState<string>(in30Days);
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [taxAmount, setTaxAmount] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [paymentInstructions, setPaymentInstructions] = useState<string>("");

  const [lineItems, setLineItems] = useState<
    { description: string; quantity: string; unit_price: string }[]
  >([{ description: "", quantity: "1", unit_price: "0" }]);

  const clientsQuery = useQuery(clientsQueryOptions(workspaceId, { status: "active" }));
  const projectsQuery = useQuery(
    projectsQueryOptions(workspaceId, {
      clientId: clientId ? clientId : undefined,
    }),
  );

  const clients = clientsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];

  // Live calculations
  const subtotal = computeSubtotal(lineItems);
  const total = computeTotal(subtotal, discountAmount, taxAmount);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: "1", unit_price: "0" }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: string) => {
    const updated = [...lineItems];
    const item = { ...updated[index] };
    if (field === "description") item.description = value;
    if (field === "quantity") item.quantity = value;
    if (field === "unit_price") item.unit_price = value;
    updated[index] = item as { description: string; quantity: string; unit_price: string };
    setLineItems(updated);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) {
        throw new Error("Please select a client");
      }
      if (lineItems.some((item) => !item.description.trim())) {
        throw new Error("All line items must have a description");
      }

      const payload: CreateInvoiceInput = {
        clientId,
        projectId: projectId !== "none" ? projectId : null,
        currency,
        issueDate,
        dueDate,
        discountAmount: Number(discountAmount) || 0,
        taxAmount: Number(taxAmount) || 0,
        notes: notes.trim() ? notes : null,
        paymentInstructions: paymentInstructions.trim() ? paymentInstructions : null,
        lineItems: lineItems.map((item, idx) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          sort_order: idx + 1,
        })),
      };

      return createInvoice(workspaceId, payload);
    },
    onSuccess: () => {
      toast.success("Invoice created successfully");
      onCreated();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create invoice");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create an official commercial invoice with itemized services, tax, and automated
            numbering.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Client & Project */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company_name ? `(${c.company_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Project (Optional)</Label>
              <Select value={projectId} onValueChange={setProjectId} disabled={!clientId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={clientId ? "Select project" : "Choose client first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates & Currency */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Issue Date *</Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date *</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Currency *</Label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                className="h-9 text-xs font-mono uppercase"
              />
            </div>
          </div>

          {/* Line Items Editor */}
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="h-7 text-xs"
              >
                <Plus className="mr-1 size-3" />
                Add Item
              </Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {lineItems.map((item, index) => {
                const lineTotal = computeLineTotal(item.quantity, item.unit_price);
                return (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-center bg-muted/30 p-2 rounded-md border border-border"
                  >
                    <div className="col-span-12 sm:col-span-6">
                      <Input
                        placeholder="Item description *"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Input
                        placeholder="Qty"
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-3">
                      <MoneyInput
                        placeholder="Unit price"
                        value={item.unit_price}
                        onChange={(canonical) => updateLineItem(index, "unit_price", canonical)}
                        currency={currency}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length <= 1}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discounts, Taxes, and Totals */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-border pt-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Discount Amount ({currency})</Label>
                <MoneyInput
                  value={discountAmount}
                  onChange={setDiscountAmount}
                  currency={currency}
                  placeholder="0.00"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tax Amount ({currency})</Label>
                <MoneyInput
                  value={taxAmount}
                  onChange={setTaxAmount}
                  currency={currency}
                  placeholder="0.00"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Calculations Card */}
            <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1.5 flex flex-col justify-center border border-border">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono">
                  {currency} {Number(subtotal).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Discount:</span>
                <span className="font-mono text-rose-500">
                  -{currency} {Number(discountAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax:</span>
                <span className="font-mono">
                  +{currency} {Number(taxAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground text-sm">
                <span>Total:</span>
                <span className="font-mono">
                  {currency} {Number(total).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Instructions */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                placeholder="Thank you for your business..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Instructions</Label>
              <Textarea
                placeholder="Bank Name: National Bank\nAccount: 100293848..."
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                rows={2}
                className="text-xs resize-none font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

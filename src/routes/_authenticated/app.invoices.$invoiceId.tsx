import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Clock,
  CreditCard,
  Edit2,
  Loader2,
  Mail,
  Plus,
  Printer,
  RotateCcw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sendInvoiceEmailServerFn } from "@/server/invoices";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { accountsQueryOptions, type FinancialAccount } from "@/domain/financial";
import {
  cancelInvoice,
  invoiceQueryOptions,
  sendInvoice,
  updateInvoice,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  type InvoiceWithRelations,
  type UpdateInvoiceInput,
} from "@/domain/invoices";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
  recordPayment,
  reversePayment,
  type PaymentMethod,
  type PaymentWithRelations,
} from "@/domain/payments";
import { roleAtLeast } from "@/domain/workspace";
import {
  checkPaymentInvariant,
  computeLineTotal,
  computeSubtotal,
  computeTotal,
} from "@/lib/invoice-calculations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/invoices/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Invoice Details | SoloOS" },
      {
        name: "description",
        content: "Commercial invoice detail and ledger-backed payment processing.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const { workspace, role } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [reversalTargetPayment, setReversalTargetPayment] = useState<PaymentWithRelations | null>(
    null,
  );

  type InvoiceTemplate = "modern" | "minimal" | "professional" | "premium";
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>("modern");
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailCustomNote, setEmailCustomNote] = useState("");

  const canManage = roleAtLeast(role, "manager");

  const invoiceQuery = useQuery(invoiceQueryOptions(workspace.id, invoiceId));
  const accountsQuery = useQuery(accountsQueryOptions(workspace.id));

  const invoice = invoiceQuery.data;
  const accounts = accountsQuery.data ?? [];

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: ["invoice", workspace.id, invoiceId] });
    queryClient.invalidateQueries({ queryKey: ["invoices", workspace.id] });
    queryClient.invalidateQueries({ queryKey: ["receivables-summary", workspace.id] });
    queryClient.invalidateQueries({ queryKey: ["accounts", workspace.id] });
    queryClient.invalidateQueries({ queryKey: ["transactions", workspace.id] });
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      await sendInvoice(workspace.id, invoiceId);
    },
    onSuccess: () => {
      toast.success("Invoice marked as sent");
      invalidateData();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send invoice");
    },
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      const recipient = emailRecipient.trim() || invoice?.client?.email;
      if (!recipient) throw new Error("Recipient email address is required");
      return await sendInvoiceEmailServerFn({
        data: {
          workspaceId: workspace.id,
          invoiceId,
          recipientEmail: recipient,
          clientName: invoice?.client?.name || "Valued Client",
          customMessage: emailCustomNote.trim() || undefined,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Invoice emailed successfully to ${res.recipient}`);
      setIsEmailDialogOpen(false);
      setEmailCustomNote("");
      invalidateData();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send invoice email");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await cancelInvoice(workspace.id, invoiceId);
    },
    onSuccess: () => {
      toast.success("Invoice cancelled");
      setIsCancelConfirmOpen(false);
      invalidateData();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to cancel invoice");
    },
  });

  if (invoiceQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin mb-3 text-primary" />
        <p className="text-sm">Loading invoice details...</p>
      </div>
    );
  }

  if (invoiceQuery.isError || !invoice) {
    return (
      <div className="space-y-4 py-12 text-center">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Invoice Not Found</h2>
        <p className="text-sm text-muted-foreground">
          {invoiceQuery.error?.message || "The requested invoice could not be located."}
        </p>
        <Button asChild variant="outline">
          <Link to="/app/invoices">Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  const colors = INVOICE_STATUS_COLORS[invoice.status];
  const canSend = canManage && invoice.status === "draft";
  const canEdit =
    canManage &&
    (invoice.status === "draft" || (invoice.status === "sent" && invoice.amount_paid === 0));
  const canCancel =
    canManage &&
    (invoice.status === "draft" || (invoice.status === "sent" && invoice.amount_paid === 0));
  const canPay =
    canManage &&
    invoice.status !== "draft" &&
    invoice.status !== "cancelled" &&
    invoice.amount_due > 0;

  const isInvariantValid = checkPaymentInvariant(
    String(invoice.total),
    String(invoice.amount_paid),
    String(invoice.amount_due),
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Bar Navigation & Actions (Hidden during print) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link to="/app/invoices">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                {invoice.invoice_number}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  colors.bg,
                  colors.text,
                  colors.border,
                )}
              >
                {INVOICE_STATUS_LABELS[invoice.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created on {new Date(invoice.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-9">
            <Printer className="mr-1.5 size-4" />
            Print / PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEmailRecipient(invoice.client?.email ?? "");
              setIsEmailDialogOpen(true);
            }}
            className="h-9"
          >
            <Mail className="mr-1.5 size-4" />
            Email
          </Button>

          {canSend && (
            <Button
              size="sm"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="h-9"
            >
              {sendMutation.isPending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 size-4" />
              )}
              Send Invoice
            </Button>
          )}

          {canPay && (
            <Button
              size="sm"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CreditCard className="mr-1.5 size-4" />
              Record Payment
            </Button>
          )}

          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="h-9">
              <Edit2 className="mr-1.5 size-4" />
              Edit
            </Button>
          )}

          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(true)}
              className="h-9 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
            >
              <XCircle className="mr-1.5 size-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Template Selector Bar (Hidden during print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-border/70 rounded-lg px-3.5 py-2 bg-muted/20 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Template:
          </span>
          <div className="flex items-center gap-1">
            {(
              [
                { id: "modern", label: "Modern" },
                { id: "minimal", label: "Minimal" },
                { id: "professional", label: "Professional" },
                { id: "premium", label: "Premium" },
              ] as const
            ).map((tmpl) => (
              <Button
                key={tmpl.id}
                variant={selectedTemplate === tmpl.id ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setSelectedTemplate(tmpl.id)}
              >
                {tmpl.label}
              </Button>
            ))}
          </div>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Live styling for export &amp; client presentation
        </span>
      </div>

      {/* Main Printable Invoice Card */}
      <Card
        className={cn(
          "shadow-sm space-y-8 text-foreground print:shadow-none print:border-none print:p-0 transition-all duration-150 relative",
          selectedTemplate === "modern" && "bg-card border border-border/80 p-6 sm:p-8 rounded-xl",
          selectedTemplate === "minimal" &&
            "bg-background border border-border/40 p-8 sm:p-12 shadow-none rounded-none",
          selectedTemplate === "professional" &&
            "bg-card border-2 border-border p-6 sm:p-8 rounded-md",
          selectedTemplate === "premium" &&
            "bg-card border border-amber-500/30 p-6 sm:p-8 rounded-xl shadow-md overflow-hidden",
        )}
      >
        {selectedTemplate === "premium" && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-primary to-emerald-500" />
        )}
        {/* Invoice Header: Issuer and Client */}
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                SO
              </div>
              <span className="text-xl font-bold tracking-tight">{workspace.name}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Solo Commercial Invoicing</p>
          </div>

          <div className="sm:text-right space-y-1">
            <h2 className="text-2xl font-bold font-mono tracking-tight text-primary">INVOICE</h2>
            <div className="text-sm font-semibold font-mono">{invoice.invoice_number}</div>
            <div className="text-xs text-muted-foreground">
              Status:{" "}
              <span className="font-semibold uppercase">
                {INVOICE_STATUS_LABELS[invoice.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To / Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Billed To:
            </span>
            <div className="font-bold text-base text-foreground">
              {invoice.client ? (
                <Link
                  to="/app/clients/$clientId"
                  params={{ clientId: invoice.client.id }}
                  className="hover:underline text-primary"
                >
                  {invoice.client.name}
                </Link>
              ) : (
                "Unknown Client"
              )}
            </div>
            {invoice.client?.company_name && (
              <p className="text-muted-foreground text-xs">{invoice.client.company_name}</p>
            )}
            {invoice.client?.email && (
              <p className="text-muted-foreground text-xs">{invoice.client.email}</p>
            )}
            {invoice.client?.address && (
              <p className="text-muted-foreground text-xs mt-1 whitespace-pre-line">
                {invoice.client.address}
              </p>
            )}

            {invoice.project && (
              <div className="mt-3 text-xs">
                <span className="text-muted-foreground font-medium">Project: </span>
                <Link
                  to="/app/projects/$projectId"
                  params={{ projectId: invoice.project.id }}
                  className="font-medium text-primary hover:underline"
                >
                  {invoice.project.name}
                </Link>
              </div>
            )}
          </div>

          <div className="sm:text-right space-y-2">
            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-x-4 text-xs">
              <span className="text-muted-foreground">Issue Date:</span>
              <span className="font-medium">{invoice.issue_date}</span>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-x-4 text-xs">
              <span className="text-muted-foreground">Payment Due:</span>
              <span className="font-medium font-mono">{invoice.due_date}</span>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-x-4 text-xs">
              <span className="text-muted-foreground">Currency:</span>
              <span className="font-mono font-bold">{invoice.currency}</span>
            </div>
            {invoice.status === "overdue" && (
              <div className="text-xs text-rose-500 font-semibold mt-1">
                Payment is currently overdue
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[50px] text-center font-semibold">#</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="w-[100px] text-right font-semibold">Qty</TableHead>
                <TableHead className="w-[140px] text-right font-semibold">Unit Price</TableHead>
                <TableHead className="w-[150px] text-right font-semibold">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoice.line_items ?? []).map((item, idx) => (
                <TableRow key={item.id} className="hover:bg-muted/10">
                  <TableCell className="text-center text-xs text-muted-foreground font-mono">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{item.description}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{item.quantity}</TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {invoice.currency} {Number(item.unit_price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono font-semibold">
                    {invoice.currency} {Number(item.line_total).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totals and Notes Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
          <div className="sm:col-span-7 space-y-4 text-xs">
            {invoice.payment_instructions && (
              <div className="p-3 bg-muted/40 rounded-md border border-border space-y-1">
                <span className="font-bold text-foreground block">Payment Instructions:</span>
                <p className="whitespace-pre-line font-mono text-muted-foreground">
                  {invoice.payment_instructions}
                </p>
              </div>
            )}

            {invoice.notes && (
              <div className="space-y-1">
                <span className="font-bold text-muted-foreground block">Notes:</span>
                <p className="whitespace-pre-line text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </div>

          <div className="sm:col-span-5 space-y-2 text-sm border-t sm:border-t-0 border-border pt-4 sm:pt-0">
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Subtotal:</span>
              <span className="font-mono">
                {invoice.currency} {invoice.subtotal.toFixed(2)}
              </span>
            </div>

            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-rose-500 text-xs">
                <span>Discount:</span>
                <span className="font-mono">
                  -{invoice.currency} {invoice.discount_amount.toFixed(2)}
                </span>
              </div>
            )}

            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Tax:</span>
                <span className="font-mono">
                  +{invoice.currency} {invoice.tax_amount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="border-t border-border pt-2 flex justify-between font-bold text-base text-foreground">
              <span>Invoice Total:</span>
              <span className="font-mono">
                <MoneyValue value={invoice.total} currency={invoice.currency} size="md" />
              </span>
            </div>

            <div className="flex justify-between text-emerald-600 text-xs pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono font-medium">
                {invoice.currency} {invoice.amount_paid.toFixed(2)}
              </span>
            </div>

            <div className="border-t border-border/80 pt-2 flex justify-between font-bold text-base">
              <span>Amount Due:</span>
              <span
                className={cn(
                  "font-mono",
                  invoice.amount_due > 0 ? "text-amber-500" : "text-muted-foreground",
                )}
              >
                <MoneyValue value={invoice.amount_due} currency={invoice.currency} size="lg" />
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment History & Ledger Integration Section (Hidden during print) */}
      <Card className="print:hidden">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Banknote className="size-5 text-emerald-500" />
              Payment History & Ledger Entries
            </CardTitle>
            <CardDescription className="text-xs">
              Payments are recorded as immutable income transactions in your financial ledger.
            </CardDescription>
          </div>

          {canPay && (
            <Button
              size="sm"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CreditCard className="mr-1.5 size-3.5" />
              Record Payment
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {!invoice.payments || invoice.payments.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No payments recorded yet for this invoice.
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[110px] font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Method</TableHead>
                    <TableHead className="font-semibold">Account Deposited</TableHead>
                    <TableHead className="font-semibold">Reference</TableHead>
                    <TableHead className="text-right font-semibold">Amount</TableHead>
                    <TableHead className="w-[100px] text-center font-semibold">Status</TableHead>
                    {canManage && (
                      <TableHead className="w-[100px] text-right font-semibold">Action</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invoice.payments ?? []).map((p: PaymentWithRelations) => {
                    const isReversed = p.status === "reversed";
                    return (
                      <TableRow key={p.id} className={cn(isReversed && "opacity-60 bg-muted/20")}>
                        <TableCell className="text-xs font-mono">{p.payment_date}</TableCell>
                        <TableCell className="text-xs font-medium">
                          {PAYMENT_METHOD_LABELS[p.payment_method]}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.financial_account?.name ?? "Financial Account"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {p.reference || "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono font-bold">
                          <span
                            className={
                              isReversed ? "line-through text-muted-foreground" : "text-emerald-500"
                            }
                          >
                            {invoice.currency} {Number(p.amount).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isReversed ? "destructive" : "secondary"}
                            className="text-[10px] uppercase font-semibold"
                          >
                            {PAYMENT_STATUS_LABELS[p.status]}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            {!isReversed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReversalTargetPayment(p)}
                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                              >
                                <RotateCcw className="mr-1 size-3" />
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
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      {canPay && (
        <RecordPaymentDialog
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
          onSuccess={() => {
            invalidateData();
            setIsRecordPaymentOpen(false);
          }}
          invoice={invoice}
          accounts={accounts}
          workspaceId={workspace.id}
        />
      )}

      {/* Edit Invoice Dialog */}
      {canEdit && (
        <EditInvoiceDialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => {
            invalidateData();
            setIsEditOpen(false);
          }}
          invoice={invoice}
          workspaceId={workspace.id}
        />
      )}

      {/* Reverse Payment Dialog */}
      {reversalTargetPayment && (
        <ReversePaymentDialog
          isOpen={!!reversalTargetPayment}
          onClose={() => setReversalTargetPayment(null)}
          onSuccess={() => {
            invalidateData();
            setReversalTargetPayment(null);
          }}
          payment={reversalTargetPayment}
          currency={invoice.currency}
          workspaceId={workspace.id}
        />
      )}

      {/* Cancel Invoice Confirmation Dialog */}
      <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel invoice{" "}
              <span className="font-mono font-bold">{invoice.invoice_number}</span>? This action
              cannot be undone. No further payments can be accepted for cancelled invoices.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCancelConfirmOpen(false)}>
              Keep Invoice
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              <span>Email Invoice {invoice.invoice_number}</span>
            </DialogTitle>
            <DialogDescription>
              Dispatch this invoice directly to your client via your configured email provider.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Recipient Email</Label>
              <Input
                type="email"
                placeholder="client@company.com"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                className="text-sm"
              />
              {invoice.client?.email && (
                <p className="text-[11px] text-muted-foreground">
                  Default from client profile: {invoice.client.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Recipient Name</Label>
              <Input
                readOnly
                value={invoice.client?.name || "Client"}
                className="text-sm bg-muted/40 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Personal Note (Optional)</Label>
              <Textarea
                placeholder="Add instructions, payment details, or a greeting..."
                value={emailCustomNote}
                onChange={(e) => setEmailCustomNote(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
              disabled={emailMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => emailMutation.mutate()}
              disabled={
                emailMutation.isPending || (!emailRecipient.trim() && !invoice.client?.email)
              }
              className="gap-1.5"
            >
              {emailMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Record Payment Dialog
// ============================================================================

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: InvoiceWithRelations;
  accounts: FinancialAccount[];
  workspaceId: string;
}

function RecordPaymentDialog({
  isOpen,
  onClose,
  onSuccess,
  invoice,
  accounts,
  workspaceId,
}: RecordPaymentDialogProps) {
  const todayStr = new Date().toISOString().split("T")[0] ?? "2026-09-08";

  // Filter financial accounts by currency matching invoice currency
  const eligibleAccounts = accounts.filter(
    (a) => a.currency.toUpperCase() === invoice.currency.toUpperCase() && a.status === "active",
  );

  const [amount, setAmount] = useState<string>(String(invoice.amount_due));
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [financialAccountId, setFinancialAccountId] = useState<string>(
    eligibleAccounts[0]?.id ?? "",
  );
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Payment amount must be greater than 0");
      }
      if (numAmount > invoice.amount_due) {
        throw new Error(
          `Payment cannot exceed outstanding balance of ${invoice.currency} ${invoice.amount_due.toFixed(2)}`,
        );
      }
      if (!financialAccountId) {
        throw new Error("Please select an active deposit account");
      }

      await recordPayment(workspaceId, {
        invoiceId: invoice.id,
        amount: numAmount,
        paymentDate,
        paymentMethod,
        financialAccountId,
        reference: reference.trim() ? reference.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      });
    },
    onSuccess: () => {
      toast.success("Payment recorded and ledger updated");
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to record payment");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record client payment for invoice{" "}
            <span className="font-mono font-semibold">{invoice.invoice_number}</span>. This creates
            an income transaction in the selected deposit account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 bg-muted/40 rounded-md border border-border flex justify-between items-center">
            <span className="text-muted-foreground">Outstanding Amount:</span>
            <span className="font-bold text-sm font-mono text-amber-500">
              {invoice.currency} {invoice.amount_due.toFixed(2)}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Payment Amount ({invoice.currency}) *</Label>
            <Input
              type="number"
              step="any"
              min="0.01"
              max={invoice.amount_due}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Date *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Deposit Account ({invoice.currency}) *</Label>
            {eligibleAccounts.length === 0 ? (
              <p className="text-xs text-rose-500">
                No active financial accounts found with currency {invoice.currency}. Please create
                one under Cash & Accounts first.
              </p>
            ) : (
              <Select value={financialAccountId} onValueChange={setFinancialAccountId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency}) — Bal: {acc.current_balance.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Payment Reference / Transaction ID</Label>
            <Input
              placeholder="e.g. Bank Ref #109283"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              placeholder="Optional payment notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={paymentMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => paymentMutation.mutate()}
            disabled={paymentMutation.isPending || eligibleAccounts.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {paymentMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Reverse Payment Dialog
// ============================================================================

interface ReversePaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  payment: PaymentWithRelations;
  currency: string;
  workspaceId: string;
}

function ReversePaymentDialog({
  isOpen,
  onClose,
  onSuccess,
  payment,
  currency,
  workspaceId,
}: ReversePaymentDialogProps) {
  const [reversalReason, setReversalReason] = useState("");

  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (!reversalReason.trim() || reversalReason.trim().length < 3) {
        throw new Error("Please enter a reversal reason of at least 3 characters");
      }

      await reversePayment(workspaceId, {
        paymentId: payment.id,
        reversalReason: reversalReason.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Payment reversed and account balance restored");
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reverse payment");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reverse Payment</DialogTitle>
          <DialogDescription>
            Reversing this payment of{" "}
            <span className="font-mono font-bold">
              {currency} {Number(payment.amount).toFixed(2)}
            </span>{" "}
            will create a reversal transaction in the financial ledger and restore the invoice
            balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs">Reason for Reversal *</Label>
            <Textarea
              placeholder="e.g. Paid in error, bounced check, or incorrect deposit account..."
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={reverseMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => reverseMutation.mutate()}
            disabled={reverseMutation.isPending}
          >
            {reverseMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirm Reversal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Edit Invoice Dialog
// ============================================================================

interface EditInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: InvoiceWithRelations;
  workspaceId: string;
}

function EditInvoiceDialog({
  isOpen,
  onClose,
  onSuccess,
  invoice,
  workspaceId,
}: EditInvoiceDialogProps) {
  const [issueDate, setIssueDate] = useState<string>(invoice.issue_date);
  const [dueDate, setDueDate] = useState<string>(invoice.due_date);
  const [discountAmount, setDiscountAmount] = useState<string>(String(invoice.discount_amount));
  const [taxAmount, setTaxAmount] = useState<string>(String(invoice.tax_amount));
  const [notes, setNotes] = useState<string>(invoice.notes ?? "");
  const [paymentInstructions, setPaymentInstructions] = useState<string>(
    invoice.payment_instructions ?? "",
  );

  const [lineItems, setLineItems] = useState<
    { id?: string; description: string; quantity: string; unit_price: string }[]
  >(
    (invoice.line_items ?? []).map((item) => ({
      id: item.id,
      description: item.description,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    })),
  );

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

  const editMutation = useMutation({
    mutationFn: async () => {
      if (lineItems.some((item) => !item.description.trim())) {
        throw new Error("All line items must have a description");
      }

      const payload: UpdateInvoiceInput = {
        issueDate,
        dueDate,
        discountAmount: Number(discountAmount) || 0,
        taxAmount: Number(taxAmount) || 0,
        notes: notes.trim() ? notes : null,
        paymentInstructions: paymentInstructions.trim() ? paymentInstructions : null,
        lineItems: lineItems.map((item, idx) => ({
          ...(item.id && { id: item.id }),
          description: item.description.trim(),
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          sort_order: idx + 1,
        })),
      };

      await updateInvoice(workspaceId, invoice.id, payload);
    },
    onSuccess: () => {
      toast.success("Invoice updated successfully");
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update invoice");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice {invoice.invoice_number}</DialogTitle>
          <DialogDescription>
            Update invoice terms, line items, and instructions. Allowed only before payments are
            recorded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
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
              {lineItems.map((item, index) => (
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
                    <Input
                      placeholder="Unit price"
                      type="number"
                      min="0"
                      step="any"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, "unit_price", e.target.value)}
                      className="h-8 text-xs font-mono"
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
              ))}
            </div>
          </div>

          {/* Discounts, Taxes, and Totals */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-border pt-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Discount Amount ({invoice.currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tax Amount ({invoice.currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1.5 flex flex-col justify-center border border-border">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono">
                  {invoice.currency} {Number(subtotal).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Discount:</span>
                <span className="font-mono text-rose-500">
                  -{invoice.currency} {Number(discountAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax:</span>
                <span className="font-mono">
                  +{invoice.currency} {Number(taxAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground text-sm">
                <span>Total:</span>
                <span className="font-mono">
                  {invoice.currency} {Number(total).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Instructions</Label>
              <Textarea
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
            disabled={editMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => editMutation.mutate()}
            disabled={editMutation.isPending}
          >
            {editMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

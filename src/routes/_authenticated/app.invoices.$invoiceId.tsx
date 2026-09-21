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
  Share2,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InvoiceTemplateRenderer,
  type InvoiceTemplateId,
} from "@/components/app/invoice-templates";
import { RecordPaymentDialog } from "@/components/app/record-payment-dialog";
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
import { formatMoney } from "@/lib/money";
import { createShareArtifactServerFn } from "@/server/share";
import { supabase } from "@/integrations/supabase/client";

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

  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplateId>("modern");
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailCustomNote, setEmailCustomNote] = useState("");
  const [isSharing, setIsSharing] = useState(false);

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

      // Retrieve the current session token so the server fn can verify the caller
      const { data: sessionData } = await import("@/integrations/supabase/client").then((m) =>
        m.supabase.auth.getSession(),
      );
      const authToken = sessionData?.session?.access_token;

      return await sendInvoiceEmailServerFn({
        data: {
          workspaceId: workspace.id,
          invoiceId,
          recipientEmail: recipient,
          clientName: invoice?.client?.name || "Valued Client",
          customMessage: emailCustomNote.trim() || undefined,
          authToken,
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
      {/* ── Print-only isolation styles ── */}
      <style>{`
        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            height: auto !important;
          }
          aside, header, nav, .print\\:hidden {
            display: none !important;
          }
          #invoice-print-region {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          @page {
            margin: 12mm;
            size: auto;
          }
        }
      `}</style>

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
            id={`share-invoice-btn-${invoice.id}`}
            disabled={isSharing}
            onClick={async () => {
              setIsSharing(true);
              try {
                const {
                  data: { session },
                } = await supabase.auth.getSession();
                const res = await createShareArtifactServerFn({
                  data: {
                    workspaceId: workspace.id,
                    artifactType: "invoice",
                    sourceEntityType: "invoice",
                    sourceEntityId: invoice.id,
                    title: `Invoice ${invoice.invoice_number}`,
                    description: `Invoice for ${invoice.client?.name ?? "client"} — ${invoice.currency} ${Number(invoice.total).toFixed(2)}`,
                    visibility: "unlisted",
                    accessConfig: {},
                    sourceData: {
                      invoiceNumber: invoice.invoice_number,
                      clientName: invoice.client?.name,
                      totalAmount: Number(invoice.total),
                      status: invoice.status,
                      issueDate: invoice.issue_date,
                      dueDate: invoice.due_date,
                      currency: invoice.currency,
                      lineItems: invoice.line_items,
                    },
                    authToken: session?.access_token,
                  },
                });
                if (res.success) {
                  const url = `${window.location.origin}${res.shareUrl}`;
                  await navigator.clipboard.writeText(url);
                  toast.success("Share link copied to clipboard", { description: url });
                }
              } catch (e) {
                toast.error("Failed to create share link");
              } finally {
                setIsSharing(false);
              }
            }}
            className="h-9"
          >
            {isSharing ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Share2 className="mr-1.5 size-4" />
            )}
            Share
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

      {/* Dynamic Renderable Invoice Template (Printable) — isolated region */}
      <div id="invoice-print-region">
        <InvoiceTemplateRenderer
          templateId={selectedTemplate}
          invoice={invoice}
          workspace={workspace}
        />
      </div>

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
                            {formatMoney(p.amount, invoice.currency)}
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
            <span className="font-mono font-bold">{formatMoney(payment.amount, currency)}</span>{" "}
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
                    <MoneyInput
                      placeholder="Unit price"
                      value={item.unit_price}
                      onChange={(canonical) => updateLineItem(index, "unit_price", canonical)}
                      currency={invoice.currency}
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
              ))}
            </div>
          </div>

          {/* Discounts, Taxes, and Totals */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-border pt-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Discount Amount ({invoice.currency})</Label>
                <MoneyInput
                  value={discountAmount}
                  onChange={setDiscountAmount}
                  currency={invoice.currency}
                  placeholder="0.00"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tax Amount ({invoice.currency})</Label>
                <MoneyInput
                  value={taxAmount}
                  onChange={setTaxAmount}
                  currency={invoice.currency}
                  placeholder="0.00"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1.5 flex flex-col justify-center border border-border">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono">{formatMoney(subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Discount:</span>
                <span className="font-mono text-rose-500">
                  -{formatMoney(discountAmount || 0, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax:</span>
                <span className="font-mono">+{formatMoney(taxAmount || 0, invoice.currency)}</span>
              </div>
              <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground text-sm">
                <span>Total:</span>
                <span className="font-mono">{formatMoney(total, invoice.currency)}</span>
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

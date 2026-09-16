import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FinancialAccount } from "@/domain/financial";
import type { InvoiceWithRelations } from "@/domain/invoices";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  recordPayment,
  type PaymentMethod,
} from "@/domain/payments";

export interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: InvoiceWithRelations;
  accounts: FinancialAccount[];
  workspaceId: string;
}

export function RecordPaymentDialog({
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
            <MoneyInput
              value={amount}
              onChange={setAmount}
              currency={invoice.currency}
              placeholder="0.00"
              className="h-9 text-xs"
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

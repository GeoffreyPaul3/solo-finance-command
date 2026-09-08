import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { FinancialAccount, FinancialTransaction } from "./financial";

// ============================================================================
// Core Database Types
// ============================================================================

export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];

export type PaymentWithRelations = Payment & {
  financial_transaction?: FinancialTransaction | null;
  financial_account?: FinancialAccount | null;
  invoice?: (Invoice & { client?: Client | null; project?: Project | null }) | null;
};

export interface PaymentFilters {
  clientId?: string | undefined;
  invoiceId?: string | undefined;
  accountId?: string | undefined;
  method?: PaymentMethod | "all" | undefined;
  status?: PaymentStatus | "all" | undefined;
  currency?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  search?: string | undefined;
  limit?: number | undefined;
}

// ============================================================================
// Display & Enumeration Constants
// ============================================================================

export const PAYMENT_METHODS: PaymentMethod[] = [
  "bank_transfer",
  "cash",
  "mobile_money",
  "card",
  "payment_processor",
  "other",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  mobile_money: "Mobile Money",
  card: "Credit / Debit Card",
  payment_processor: "Payment Processor (Stripe, PayPal, etc.)",
  other: "Other Method",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  posted: "Posted",
  reversed: "Reversed",
};

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z
    .enum(["bank_transfer", "cash", "mobile_money", "card", "payment_processor", "other"] as const)
    .default("bank_transfer"),
  financialAccountId: z.string().uuid("Please select a deposit account"),
  reference: z
    .string()
    .trim()
    .max(100, "Reference cannot exceed 100 characters")
    .optional()
    .nullable(),
  notes: z.string().trim().max(2000, "Notes cannot exceed 2000 characters").optional().nullable(),
  idempotencyKey: z.string().trim().optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const reversePaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
  reversalReason: z
    .string()
    .trim()
    .min(3, "A clear reversal reason of at least 3 characters is required")
    .max(1000, "Reversal reason cannot exceed 1000 characters"),
});

export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;

// ============================================================================
// Query Options
// ============================================================================

export function invoicePaymentsQueryOptions(workspaceId: string, invoiceId: string) {
  return queryOptions({
    queryKey: ["payments", workspaceId, invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(
          `
          *,
          financial_transaction:financial_transactions(*),
          financial_account:financial_accounts(*)
        `,
        )
        .eq("workspace_id", workspaceId)
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as PaymentWithRelations[];
    },
  });
}

export function workspacePaymentsQueryOptions(workspaceId: string, filters: PaymentFilters = {}) {
  return queryOptions({
    queryKey: ["payments-global", workspaceId, filters],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<PaymentWithRelations[]> => {
      let query = supabase
        .from("payments")
        .select(
          `
          *,
          financial_transaction:financial_transactions(*),
          financial_account:financial_accounts(*),
          invoice:invoices(
            *,
            client:clients(*),
            project:projects(*)
          )
        `,
        )
        .eq("workspace_id", workspaceId)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.invoiceId) query = query.eq("invoice_id", filters.invoiceId);
      if (filters.accountId) query = query.eq("financial_account_id", filters.accountId);
      if (filters.method && filters.method !== "all")
        query = query.eq("payment_method", filters.method);
      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.currency) query = query.eq("currency", filters.currency);
      if (filters.dateFrom) query = query.gte("payment_date", filters.dateFrom);
      if (filters.dateTo) query = query.lte("payment_date", filters.dateTo);
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data as unknown as PaymentWithRelations[]) ?? [];
    },
  });
}

// ============================================================================
// Mutations (via RPCs)
// ============================================================================

export async function recordPayment(
  workspaceId: string,
  input: RecordPaymentInput,
): Promise<string> {
  const validated = recordPaymentSchema.parse(input);

  const args: Database["public"]["Functions"]["record_invoice_payment"]["Args"] = {
    _workspace_id: workspaceId,
    _invoice_id: validated.invoiceId,
    _amount: validated.amount,
    _payment_date: validated.paymentDate,
    _payment_method: validated.paymentMethod,
    _financial_account_id: validated.financialAccountId,
  };

  if (validated.reference) args._reference = validated.reference;
  if (validated.notes) args._notes = validated.notes;
  if (validated.idempotencyKey) args._idempotency_key = validated.idempotencyKey;

  const { data, error } = await supabase.rpc("record_invoice_payment", args);
  if (error) throw new Error(error.message);
  return data;
}

export async function reversePayment(
  workspaceId: string,
  input: ReversePaymentInput,
): Promise<void> {
  const validated = reversePaymentSchema.parse(input);

  const { error } = await supabase.rpc("reverse_invoice_payment", {
    _workspace_id: workspaceId,
    _payment_id: validated.paymentId,
    _reversal_reason: validated.reversalReason,
  });

  if (error) throw new Error(error.message);
}

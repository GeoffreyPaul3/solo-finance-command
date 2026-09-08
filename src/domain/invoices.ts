import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
export type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceLineItem = Database["public"]["Tables"]["invoice_line_items"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type FinancialTransaction = Database["public"]["Tables"]["financial_transactions"]["Row"];
export type FinancialAccount = Database["public"]["Tables"]["financial_accounts"]["Row"];

export type PaymentWithRelations = Payment & {
  financial_transaction?: FinancialTransaction | null;
  financial_account?: FinancialAccount | null;
};

export type InvoiceWithRelations = Invoice & {
  client?: Client | null;
  project?: Project | null;
  line_items?: InvoiceLineItem[];
  payments?: PaymentWithRelations[];
};

// ============================================================================
// Display & Enumeration Constants
// ============================================================================

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const INVOICE_STATUS_COLORS: Record<
  InvoiceStatus,
  { bg: string; text: string; border: string }
> = {
  draft: {
    bg: "bg-muted text-muted-foreground",
    text: "text-muted-foreground",
    border: "border-muted",
  },
  sent: {
    bg: "bg-blue-500/10 text-blue-500",
    text: "text-blue-500",
    border: "border-blue-500/20",
  },
  partially_paid: {
    bg: "bg-amber-500/10 text-amber-500",
    text: "text-amber-500",
    border: "border-amber-500/20",
  },
  paid: {
    bg: "bg-emerald-500/10 text-emerald-500",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
  },
  overdue: {
    bg: "bg-rose-500/10 text-rose-500",
    text: "text-rose-500",
    border: "border-rose-500/20",
  },
  cancelled: {
    bg: "bg-zinc-500/10 text-zinc-500",
    text: "text-zinc-500",
    border: "border-zinc-500/20",
  },
};

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const lineItemSchema = z.object({
  id: z.string().uuid().optional(),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(1000, "Description cannot exceed 1000 characters"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unit_price: z.coerce.number().min(0, "Unit price cannot be negative"),
  sort_order: z.number().int().optional(),
});

export type LineItemInput = z.infer<typeof lineItemSchema>;

export const createInvoiceSchema = z
  .object({
    clientId: z.string().uuid("Client is required"),
    projectId: z.string().uuid().optional().nullable(),
    currency: z
      .string()
      .trim()
      .length(3, "Currency must be a 3-letter ISO code")
      .toUpperCase()
      .default("MWK"),
    issueDate: z.string().min(1, "Issue date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    discountAmount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
    taxAmount: z.coerce.number().min(0, "Tax cannot be negative").default(0),
    notes: z.string().trim().max(2000, "Notes cannot exceed 2000 characters").optional().nullable(),
    paymentInstructions: z
      .string()
      .trim()
      .max(2000, "Payment instructions cannot exceed 2000 characters")
      .optional()
      .nullable(),
    lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  })
  .refine(
    (data) => {
      if (!data.issueDate || !data.dueDate) return true;
      return data.dueDate >= data.issueDate;
    },
    {
      message: "Due date cannot be before issue date",
      path: ["dueDate"],
    },
  );

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z
  .object({
    clientId: z.string().uuid("Client is required").optional(),
    projectId: z.string().uuid().optional().nullable(),
    projectIdClear: z.boolean().optional(),
    currency: z
      .string()
      .trim()
      .length(3, "Currency must be a 3-letter ISO code")
      .toUpperCase()
      .optional(),
    issueDate: z.string().min(1).optional(),
    dueDate: z.string().min(1).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    taxAmount: z.coerce.number().min(0).optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
    paymentInstructions: z.string().trim().max(2000).optional().nullable(),
    lineItems: z.array(lineItemSchema).min(1, "At least one line item is required").optional(),
  })
  .refine(
    (data) => {
      if (!data.issueDate || !data.dueDate) return true;
      return data.dueDate >= data.issueDate;
    },
    {
      message: "Due date cannot be before issue date",
      path: ["dueDate"],
    },
  );

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

// ============================================================================
// Query Options
// ============================================================================

export interface InvoiceFilters {
  status?: (InvoiceStatus | "all") | undefined;
  clientId?: string | undefined;
  projectId?: string | undefined;
  search?: string | undefined;
}

export function invoicesQueryOptions(workspaceId: string, filters: InvoiceFilters = {}) {
  return queryOptions({
    queryKey: ["invoices", workspaceId, filters],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(
          `
          *,
          client:clients(*),
          project:projects(*)
        `,
        )
        .eq("workspace_id", workspaceId)
        .order("issue_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.clientId) {
        query = query.eq("client_id", filters.clientId);
      }

      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }

      if (filters.search) {
        const term = `%${filters.search.trim()}%`;
        query = query.or(`invoice_number.ilike.${term}`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as InvoiceWithRelations[];
    },
  });
}

export function invoiceQueryOptions(workspaceId: string, invoiceId: string) {
  return queryOptions({
    queryKey: ["invoice", workspaceId, invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          *,
          client:clients(*),
          project:projects(*),
          line_items:invoice_line_items(*),
          payments:payments(
            *,
            financial_transaction:financial_transactions(*),
            financial_account:financial_accounts(*)
          )
        `,
        )
        .eq("workspace_id", workspaceId)
        .eq("id", invoiceId)
        .order("sort_order", { referencedTable: "invoice_line_items", ascending: true })
        .order("payment_date", { referencedTable: "payments", ascending: false })
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Invoice not found");
      return data as unknown as InvoiceWithRelations;
    },
  });
}

export function clientInvoicesQueryOptions(workspaceId: string, clientId: string) {
  return queryOptions({
    queryKey: ["invoices", "client", workspaceId, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          *,
          client:clients(*),
          project:projects(*)
        `,
        )
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId)
        .order("issue_date", { ascending: false });

      if (error) throw new Error(error.message);
      return data as InvoiceWithRelations[];
    },
  });
}

export function projectInvoicesQueryOptions(workspaceId: string, projectId: string) {
  return queryOptions({
    queryKey: ["invoices", "project", workspaceId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          *,
          client:clients(*),
          project:projects(*)
        `,
        )
        .eq("workspace_id", workspaceId)
        .eq("project_id", projectId)
        .order("issue_date", { ascending: false });

      if (error) throw new Error(error.message);
      return data as InvoiceWithRelations[];
    },
  });
}

export interface ReceivablesSummary {
  total_outstanding: number;
  total_overdue: number;
  invoices_this_month: number;
  active_invoice_count: number;
}

export function workspaceReceivablesSummaryQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: ["receivables-summary", workspaceId],
    queryFn: async (): Promise<ReceivablesSummary> => {
      const { data, error } = await supabase.rpc("get_workspace_receivables_summary", {
        _workspace_id: workspaceId,
      });

      if (error) throw new Error(error.message);
      const row = data?.[0];
      return {
        total_outstanding: Number(row?.total_outstanding ?? 0),
        total_overdue: Number(row?.total_overdue ?? 0),
        invoices_this_month: Number(row?.invoices_this_month ?? 0),
        active_invoice_count: Number(row?.active_invoice_count ?? 0),
      };
    },
  });
}

// ============================================================================
// Mutations (via RPCs)
// ============================================================================

export async function createInvoice(
  workspaceId: string,
  input: CreateInvoiceInput,
): Promise<string> {
  const validated = createInvoiceSchema.parse(input);

  const { data, error } = await supabase.rpc("create_invoice", {
    _workspace_id: workspaceId,
    _client_id: validated.clientId,
    _project_id: validated.projectId ?? null,
    _currency: validated.currency,
    _issue_date: validated.issueDate,
    _due_date: validated.dueDate,
    _discount_amount: validated.discountAmount,
    _tax_amount: validated.taxAmount,
    _notes: validated.notes ?? null,
    _payment_instructions: validated.paymentInstructions ?? null,
    _line_items: validated.lineItems as unknown as Json,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function updateInvoice(
  workspaceId: string,
  invoiceId: string,
  input: UpdateInvoiceInput,
): Promise<void> {
  const validated = updateInvoiceSchema.parse(input);

  const args: Database["public"]["Functions"]["update_invoice"]["Args"] = {
    _workspace_id: workspaceId,
    _invoice_id: invoiceId,
  };

  if (validated.clientId !== undefined) args._client_id = validated.clientId;
  if (validated.projectId !== undefined) args._project_id = validated.projectId;
  if (validated.projectIdClear !== undefined) args._project_id_clear = validated.projectIdClear;
  if (validated.currency !== undefined) args._currency = validated.currency;
  if (validated.issueDate !== undefined) args._issue_date = validated.issueDate;
  if (validated.dueDate !== undefined) args._due_date = validated.dueDate;
  if (validated.discountAmount !== undefined) args._discount_amount = validated.discountAmount;
  if (validated.taxAmount !== undefined) args._tax_amount = validated.taxAmount;
  if (validated.notes !== undefined) args._notes = validated.notes;
  if (validated.paymentInstructions !== undefined)
    args._payment_instructions = validated.paymentInstructions;
  if (validated.lineItems !== undefined) args._line_items = validated.lineItems as unknown as Json;

  const { error } = await supabase.rpc("update_invoice", args);
  if (error) throw new Error(error.message);
}

export async function sendInvoice(workspaceId: string, invoiceId: string): Promise<void> {
  const { error } = await supabase.rpc("send_invoice", {
    _workspace_id: workspaceId,
    _invoice_id: invoiceId,
  });

  if (error) throw new Error(error.message);
}

export async function cancelInvoice(workspaceId: string, invoiceId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_invoice", {
    _workspace_id: workspaceId,
    _invoice_id: invoiceId,
  });

  if (error) throw new Error(error.message);
}

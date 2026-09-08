import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { FinancialAccount, FinancialCategory, FinancialTransaction } from "./financial";
import type { Client } from "./clients";
import type { Project } from "./projects";

// ============================================================================
// Core Database Types (self-contained to avoid circular imports)
// ============================================================================

export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type ExpenseStatus = Database["public"]["Enums"]["expense_status"];

export type ExpenseWithRelations = Expense & {
  financial_transaction?: FinancialTransaction | null;
  financial_account?: FinancialAccount | null;
  category?: FinancialCategory | null;
  client?: Client | null;
  project?: Project | null;
};

// ============================================================================
// Display & Enumeration Constants
// ============================================================================

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  posted: "Posted",
  reversed: "Reversed",
};

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const recordExpenseWithMetaSchema = z.object({
  accountId: z.string().uuid("Please select a valid account"),
  amount: z.coerce.number().gt(0, "Expense amount must be strictly greater than 0"),
  transactionDate: z.string().min(1, "Transaction date is required"),
  description: z.string().trim().min(1, "Description is required"),
  categoryId: z.string().uuid().optional().nullable(),
  vendor: z
    .string()
    .trim()
    .max(200, "Vendor name cannot exceed 200 characters")
    .optional()
    .nullable(),
  projectId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000, "Notes cannot exceed 2000 characters").optional().nullable(),
  reference: z.string().trim().optional().nullable(),
  idempotencyKey: z.string().trim().optional().nullable(),
});

export type RecordExpenseWithMetaInput = z.infer<typeof recordExpenseWithMetaSchema>;

export const reverseExpenseSchema = z.object({
  expenseId: z.string().uuid("Invalid expense ID"),
  reversalReason: z
    .string()
    .trim()
    .min(3, "A clear reversal reason of at least 3 characters is required")
    .max(1000, "Reversal reason cannot exceed 1000 characters"),
});

export type ReverseExpenseInput = z.infer<typeof reverseExpenseSchema>;

// ============================================================================
// Query Filters
// ============================================================================

export interface ExpenseFilters {
  accountId?: string | undefined;
  categoryId?: string | undefined;
  clientId?: string | undefined;
  projectId?: string | undefined;
  status?: "posted" | "reversed" | "all" | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  search?: string | undefined;
  limit?: number | undefined;
}

// ============================================================================
// Query Options
// ============================================================================

export function expensesQueryOptions(workspaceId: string, filters: ExpenseFilters = {}) {
  return queryOptions({
    queryKey: ["expenses", workspaceId, filters],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<ExpenseWithRelations[]> => {
      let query = supabase
        .from("expenses")
        .select(
          `
          *,
          financial_transaction:financial_transactions(*),
          financial_account:financial_accounts(*),
          category:financial_categories(*),
          client:clients(*),
          project:projects(*)
        `,
        )
        .eq("workspace_id", workspaceId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.accountId) {
        query = query.eq("financial_account_id", filters.accountId);
      }
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.clientId) {
        query = query.eq("client_id", filters.clientId);
      }
      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.dateFrom) {
        query = query.gte("expense_date", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("expense_date", filters.dateTo);
      }
      if (filters.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        query = query.or(`description.ilike.${term},vendor.ilike.${term}`);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data as unknown as ExpenseWithRelations[]) ?? [];
    },
  });
}

export function expenseQueryOptions(workspaceId: string, expenseId: string) {
  return queryOptions({
    queryKey: ["expense", workspaceId, expenseId],
    enabled: Boolean(workspaceId && expenseId),
    queryFn: async (): Promise<ExpenseWithRelations | null> => {
      const { data, error } = await supabase
        .from("expenses")
        .select(
          `
          *,
          financial_transaction:financial_transactions(*),
          financial_account:financial_accounts(*),
          category:financial_categories(*),
          client:clients(*),
          project:projects(*)
        `,
        )
        .eq("workspace_id", workspaceId)
        .eq("id", expenseId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as unknown as ExpenseWithRelations | null;
    },
  });
}

// ============================================================================
// Mutations (via RPCs)
// ============================================================================

export async function recordExpenseWithMeta(
  workspaceId: string,
  input: RecordExpenseWithMetaInput,
): Promise<string> {
  const validated = recordExpenseWithMetaSchema.parse(input);

  const args: Database["public"]["Functions"]["record_expense_with_meta"]["Args"] = {
    _workspace_id: workspaceId,
    _account_id: validated.accountId,
    _amount: validated.amount,
    _transaction_date: validated.transactionDate,
    _description: validated.description,
  };

  if (validated.categoryId) args._category_id = validated.categoryId;
  if (validated.vendor) args._vendor = validated.vendor;
  if (validated.projectId) args._project_id = validated.projectId;
  if (validated.clientId) args._client_id = validated.clientId;
  if (validated.notes) args._notes = validated.notes;
  if (validated.reference) args._reference = validated.reference;
  if (validated.idempotencyKey) args._idempotency_key = validated.idempotencyKey;

  const { data, error } = await supabase.rpc("record_expense_with_meta", args);
  if (error) throw new Error(error.message);
  return data;
}

export async function reverseExpense(
  workspaceId: string,
  input: ReverseExpenseInput,
): Promise<void> {
  const validated = reverseExpenseSchema.parse(input);

  const { error } = await supabase.rpc("reverse_expense", {
    _workspace_id: workspaceId,
    _expense_id: validated.expenseId,
    _reversal_reason: validated.reversalReason,
  });

  if (error) throw new Error(error.message);
}

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ============================================================================
// Core Database Types
// ============================================================================

export type Obligation = Database["public"]["Tables"]["obligations"]["Row"];
export type ObligationStatus = Database["public"]["Enums"]["obligation_status"];

export type ObligationWithRelations = Obligation & {
  category?: Database["public"]["Tables"]["financial_categories"]["Row"] | null;
  recurring_expense?: Database["public"]["Tables"]["recurring_expenses"]["Row"] | null;
};

// ============================================================================
// Display & Enumeration Constants
// ============================================================================

export const OBLIGATION_STATUS_LABELS: Record<ObligationStatus, string> = {
  upcoming: "Upcoming",
  due: "Due Today",
  overdue: "Overdue",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const OBLIGATION_PRIORITY_LABELS: Record<number, string> = {
  1: "Critical (P1)",
  2: "High (P2)",
  3: "Standard (P3)",
  4: "Low (P4)",
  5: "Optional (P5)",
};

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const createObligationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters"),
  amount: z.coerce.number().gt(0, "Amount must be strictly greater than 0"),
  currency: z.string().trim().length(3, "Currency must be a 3-letter code").toUpperCase(),
  dueDate: z.string().min(1, "Due date is required"),
  categoryId: z.string().uuid().optional().nullable(),
  recurringExpenseId: z.string().uuid().optional().nullable(),
  vendor: z.string().trim().max(200, "Vendor cannot exceed 200 characters").optional().nullable(),
  notes: z.string().trim().max(2000, "Notes cannot exceed 2000 characters").optional().nullable(),
  priority: z.coerce.number().int().min(1).max(5).default(3),
});

export type CreateObligationInput = z.infer<typeof createObligationSchema>;

export const updateObligationSchema = createObligationSchema.extend({
  obligationId: z.string().uuid("Invalid obligation ID"),
});

export type UpdateObligationInput = z.infer<typeof updateObligationSchema>;

// ============================================================================
// Pure Business Logic Functions (Unit Testable)
// ============================================================================

/**
 * Classifies the active status of an obligation based on its due date relative to asOfDate.
 * If already paid or cancelled, returns that terminal status.
 */
export function classifyObligationStatus(
  dueDate: string,
  currentStatus: ObligationStatus,
  asOfDate: string = new Date().toISOString().slice(0, 10),
): ObligationStatus {
  if (currentStatus === "paid" || currentStatus === "cancelled") {
    return currentStatus;
  }

  const due = dueDate.slice(0, 10);
  const today = asOfDate.slice(0, 10);

  if (due < today) {
    return "overdue";
  }
  if (due === today) {
    return "due";
  }
  return "upcoming";
}

export interface ObligationTimelineGroups {
  overdue: Obligation[];
  dueToday: Obligation[];
  next7Days: Obligation[];
  next30Days: Obligation[];
  future: Obligation[];
}

/**
 * Groups active obligations into timeline buckets relative to an asOfDate.
 * Paid and cancelled obligations are excluded.
 */
export function groupObligationsByTimeline(
  obligations: Obligation[],
  asOfDate: string = new Date().toISOString().slice(0, 10),
): ObligationTimelineGroups {
  const today = asOfDate.slice(0, 10);
  const todayMs = new Date(today).getTime();

  const d7Ms = todayMs + 7 * 24 * 60 * 60 * 1000;
  const d30Ms = todayMs + 30 * 24 * 60 * 60 * 1000;

  const groups: ObligationTimelineGroups = {
    overdue: [],
    dueToday: [],
    next7Days: [],
    next30Days: [],
    future: [],
  };

  for (const item of obligations) {
    if (item.status === "paid" || item.status === "cancelled") {
      continue;
    }

    const due = item.due_date.slice(0, 10);
    const dueMs = new Date(due).getTime();

    if (due < today) {
      groups.overdue.push(item);
    } else if (due === today) {
      groups.dueToday.push(item);
    } else if (dueMs <= d7Ms) {
      groups.next7Days.push(item);
    } else if (dueMs <= d30Ms) {
      groups.next30Days.push(item);
    } else {
      groups.future.push(item);
    }
  }

  return groups;
}

/**
 * Calculates sum of obligations filtered optionally by currency and active statuses.
 */
export function calculateObligationsTotal(
  obligations: Obligation[],
  currency?: string,
  activeOnly: boolean = true,
): number {
  return obligations.reduce((sum, item) => {
    if (currency && item.currency !== currency) return sum;
    if (activeOnly && (item.status === "paid" || item.status === "cancelled")) return sum;
    return sum + Number(item.amount);
  }, 0);
}

// ============================================================================
// Supabase Data Access & TanStack Query Options
// ============================================================================

export function obligationsListQueryOptions(
  workspaceId: string,
  options?: {
    status?: ObligationStatus | "all_active";
    currency?: string;
  },
) {
  return queryOptions({
    queryKey: ["obligations", workspaceId, options?.status, options?.currency],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<Obligation[]> => {
      let query = supabase
        .from("obligations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("due_date", { ascending: true });

      if (options?.status) {
        if (options.status === "all_active") {
          query = query.in("status", ["upcoming", "due", "overdue"]);
        } else {
          query = query.eq("status", options.status);
        }
      }

      if (options?.currency) {
        query = query.eq("currency", options.currency);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

// ============================================================================
// Mutations via Database RPCs
// ============================================================================

export async function createObligation(
  workspaceId: string,
  input: CreateObligationInput,
): Promise<string> {
  const validated = createObligationSchema.parse(input);
  const args: {
    _workspace_id: string;
    _title: string;
    _amount: number;
    _currency: string;
    _due_date: string;
    _category_id?: string;
    _recurring_expense_id?: string;
    _vendor?: string;
    _notes?: string;
    _priority?: number;
  } = {
    _workspace_id: workspaceId,
    _title: validated.title,
    _amount: validated.amount,
    _currency: validated.currency,
    _due_date: validated.dueDate,
    _priority: validated.priority,
  };

  if (validated.categoryId) args._category_id = validated.categoryId;
  if (validated.recurringExpenseId) args._recurring_expense_id = validated.recurringExpenseId;
  if (validated.vendor) args._vendor = validated.vendor;
  if (validated.notes) args._notes = validated.notes;

  const { data, error } = await supabase.rpc("create_obligation", args);

  if (error) throw new Error(error.message);
  return data;
}

export async function updateObligation(
  workspaceId: string,
  input: UpdateObligationInput,
): Promise<void> {
  const validated = updateObligationSchema.parse(input);
  const args: {
    _workspace_id: string;
    _obligation_id: string;
    _title: string;
    _amount: number;
    _currency: string;
    _due_date: string;
    _category_id?: string;
    _recurring_expense_id?: string;
    _vendor?: string;
    _notes?: string;
    _priority?: number;
  } = {
    _workspace_id: workspaceId,
    _obligation_id: validated.obligationId,
    _title: validated.title,
    _amount: validated.amount,
    _currency: validated.currency,
    _due_date: validated.dueDate,
    _priority: validated.priority,
  };

  if (validated.categoryId) args._category_id = validated.categoryId;
  if (validated.recurringExpenseId) args._recurring_expense_id = validated.recurringExpenseId;
  if (validated.vendor) args._vendor = validated.vendor;
  if (validated.notes) args._notes = validated.notes;

  const { error } = await supabase.rpc("update_obligation", args);

  if (error) throw new Error(error.message);
}

export async function cancelObligation(workspaceId: string, obligationId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_obligation", {
    _workspace_id: workspaceId,
    _obligation_id: obligationId,
  });

  if (error) throw new Error(error.message);
}

export async function completeObligation(
  workspaceId: string,
  obligationId: string,
  settledByTransactionId?: string,
): Promise<void> {
  const args: {
    _workspace_id: string;
    _obligation_id: string;
    _settled_by_transaction_id?: string;
  } = {
    _workspace_id: workspaceId,
    _obligation_id: obligationId,
  };

  if (settledByTransactionId) args._settled_by_transaction_id = settledByTransactionId;

  const { error } = await supabase.rpc("complete_obligation", args);

  if (error) throw new Error(error.message);
}

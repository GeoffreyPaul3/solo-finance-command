import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ============================================================================
// Core Database Types
// ============================================================================

export type RecurringExpense = Database["public"]["Tables"]["recurring_expenses"]["Row"];
export type RecurringExpenseFrequency = Database["public"]["Enums"]["recurring_expense_frequency"];
export type RecurringExpenseStatus = Database["public"]["Enums"]["recurring_expense_status"];
export type RecurringExpenseOccurrence =
  Database["public"]["Tables"]["recurring_expense_occurrences"]["Row"];

export type RecurringExpenseWithRelations = RecurringExpense & {
  category?: Database["public"]["Tables"]["financial_categories"]["Row"] | null;
};

// ============================================================================
// Display & Enumeration Constants
// ============================================================================

export const RECURRING_FREQUENCY_LABELS: Record<RecurringExpenseFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export const RECURRING_STATUS_LABELS: Record<RecurringExpenseStatus, string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
};

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const createRecurringExpenseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters"),
  amount: z.coerce.number().gt(0, "Amount must be strictly greater than 0"),
  currency: z.string().trim().length(3, "Currency must be a 3-letter code").toUpperCase(),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  vendor: z.string().trim().max(200, "Vendor cannot exceed 200 characters").optional().nullable(),
  notes: z.string().trim().max(2000, "Notes cannot exceed 2000 characters").optional().nullable(),
});

export type CreateRecurringExpenseInput = z.infer<typeof createRecurringExpenseSchema>;

// ============================================================================
// Pure Business Logic Functions (Unit Testable)
// ============================================================================

/**
 * Calculates the next occurrence date after a given date according to the recurring frequency.
 * Handles month-end clamping safely (e.g. Jan 31 + 1 month -> Feb 28/29).
 */
export function calculateNextOccurrenceDate(
  frequency: RecurringExpenseFrequency,
  fromDateStr: string,
): string {
  const parts = fromDateStr.slice(0, 10).split("-");
  const year = Number(parts[0] ?? 2026);
  const month = Number(parts[1] ?? 1) - 1; // 0-indexed JS month
  const day = Number(parts[2] ?? 1);

  const date = new Date(Date.UTC(year, month, day));

  switch (frequency) {
    case "weekly": {
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    }
    case "monthly": {
      // Advance 1 month, clamp day if new month has fewer days
      const targetMonth = month + 1;
      const targetYear = year + Math.floor(targetMonth / 12);
      const normalizedMonth = ((targetMonth % 12) + 12) % 12;
      const maxDays = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
      const clampedDay = Math.min(day, maxDays);
      return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay)).toISOString().slice(0, 10);
    }
    case "quarterly": {
      const targetMonth = month + 3;
      const targetYear = year + Math.floor(targetMonth / 12);
      const normalizedMonth = ((targetMonth % 12) + 12) % 12;
      const maxDays = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
      const clampedDay = Math.min(day, maxDays);
      return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay)).toISOString().slice(0, 10);
    }
    case "yearly": {
      const targetYear = year + 1;
      const maxDays = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
      const clampedDay = Math.min(day, maxDays);
      return new Date(Date.UTC(targetYear, month, clampedDay)).toISOString().slice(0, 10);
    }
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Calculates annualized cost for a recurring expense based on its frequency.
 */
export function calculateAnnualizedCost(
  amount: number,
  frequency: RecurringExpenseFrequency,
): number {
  switch (frequency) {
    case "weekly":
      return Math.round(amount * 52 * 100) / 100;
    case "monthly":
      return Math.round(amount * 12 * 100) / 100;
    case "quarterly":
      return Math.round(amount * 4 * 100) / 100;
    case "yearly":
      return Math.round(amount * 100) / 100;
  }
}

/**
 * Calculates monthly equivalent cost for a recurring expense based on its frequency.
 */
export function calculateMonthlyEquivalent(
  amount: number,
  frequency: RecurringExpenseFrequency,
): number {
  switch (frequency) {
    case "weekly":
      return Math.round(((amount * 52) / 12) * 100) / 100;
    case "monthly":
      return Math.round(amount * 100) / 100;
    case "quarterly":
      return Math.round((amount / 3) * 100) / 100;
    case "yearly":
      return Math.round((amount / 12) * 100) / 100;
  }
}

// ============================================================================
// Supabase Data Access & TanStack Query Options
// ============================================================================

export function recurringExpensesListQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: ["recurring-expenses", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<RecurringExpense[]> => {
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("next_due_date", { ascending: true });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

// ============================================================================
// Mutations via Database RPCs
// ============================================================================

export async function createRecurringExpense(
  workspaceId: string,
  input: CreateRecurringExpenseInput,
): Promise<string> {
  const validated = createRecurringExpenseSchema.parse(input);
  const args: {
    _workspace_id: string;
    _title: string;
    _amount: number;
    _currency: string;
    _frequency: RecurringExpenseFrequency;
    _start_date: string;
    _end_date?: string;
    _category_id?: string;
    _vendor?: string;
    _notes?: string;
  } = {
    _workspace_id: workspaceId,
    _title: validated.title,
    _amount: validated.amount,
    _currency: validated.currency,
    _frequency: validated.frequency,
    _start_date: validated.startDate,
  };

  if (validated.endDate) args._end_date = validated.endDate;
  if (validated.categoryId) args._category_id = validated.categoryId;
  if (validated.vendor) args._vendor = validated.vendor;
  if (validated.notes) args._notes = validated.notes;

  const { data, error } = await supabase.rpc("create_recurring_expense", args);

  if (error) throw new Error(error.message);
  return data;
}

export async function updateRecurringExpenseStatus(
  workspaceId: string,
  recurringExpenseId: string,
  status: RecurringExpenseStatus,
): Promise<void> {
  const { error } = await supabase.rpc("update_recurring_expense_status", {
    _workspace_id: workspaceId,
    _recurring_expense_id: recurringExpenseId,
    _status: status,
  });

  if (error) throw new Error(error.message);
}

export async function generateRecurringOccurrences(
  workspaceId: string,
  asOfDate?: string,
  horizonDays: number = 60,
): Promise<void> {
  const args: {
    _workspace_id: string;
    _as_of_date?: string;
    _horizon_days?: number;
  } = {
    _workspace_id: workspaceId,
    _horizon_days: horizonDays,
  };

  if (asOfDate) args._as_of_date = asOfDate;

  const { error } = await supabase.rpc("generate_recurring_occurrences", args);

  if (error) throw new Error(error.message);
}

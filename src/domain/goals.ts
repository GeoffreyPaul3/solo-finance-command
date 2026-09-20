/**
 * SoloOS Phase 10: Financial Goals Model
 *
 * PLANNING & DESIGNATION CONSTRUCT ONLY.
 *
 * CRITICAL ARCHITECTURAL GUARANTEE:
 * A financial goal is an intentional planning milestone.
 * Neither creating, editing, nor updating goal progress creates a financial_transaction
 * or touches account balances. Actual money movement is handled exclusively by
 * the authoritative financial accounts transfer system.
 */

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FinancialGoal = Database["public"]["Tables"]["financial_goals"]["Row"];

export type GoalCategory =
  "emergency_fund" | "business_buffer" | "tax_reserve" | "equipment" | "growth_fund" | "custom";

export type GoalStatus = "in_progress" | "completed" | "paused" | "cancelled";

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  emergency_fund: "Emergency Fund",
  business_buffer: "Business Buffer",
  tax_reserve: "Tax Reserve",
  equipment: "Equipment & Hardware",
  growth_fund: "Growth & Expansion",
  custom: "Custom Goal",
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  in_progress: "In Progress",
  completed: "Completed",
  paused: "Paused",
  cancelled: "Cancelled",
};

export interface GoalProgressCalculationInput {
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
  asOfDate?: string;
}

export interface GoalProgressResult {
  percentComplete: number;
  remainingAmount: number;
  isComplete: boolean;
  daysRemaining: number | null;
  isOnPace: boolean | null;
  statusLabel: string;
}

/**
 * Pure function: calculates planning progress toward a financial milestone.
 */
export function calculateGoalProgress(input: GoalProgressCalculationInput): GoalProgressResult {
  const target = Math.max(0.01, input.targetAmount);
  const current = Math.max(0, input.currentAmount);

  const percentComplete = Math.min(100, Math.round((current / target) * 1000) / 10);
  const remainingAmount = Math.max(0, Math.round((target - current) * 100) / 100);
  const isComplete = current >= target;

  let daysRemaining: number | null = null;
  let isOnPace: boolean | null = null;
  let statusLabel = isComplete ? "Target Reached" : `${percentComplete}% Funded`;

  if (input.targetDate) {
    const asOfMs = new Date(input.asOfDate ?? new Date().toISOString().slice(0, 10)).getTime();
    const targetMs = new Date(input.targetDate).getTime();
    daysRemaining = Math.round((targetMs - asOfMs) / (24 * 60 * 60 * 1000));

    if (!isComplete) {
      if (daysRemaining < 0) {
        statusLabel = "Past Target Date";
        isOnPace = false;
      } else if (daysRemaining === 0) {
        statusLabel = "Target Date Today";
        isOnPace = percentComplete >= 95;
      } else {
        isOnPace = percentComplete >= 50; // simple pacing metric
      }
    }
  }

  return {
    percentComplete,
    remainingAmount,
    isComplete,
    daysRemaining,
    isOnPace,
    statusLabel,
  };
}

// ============================================================================
// Schemas & Mutations
// ============================================================================

export const createGoalSchema = z.object({
  name: z.string().trim().min(1, "Goal name is required").max(200),
  category: z.enum([
    "emergency_fund",
    "business_buffer",
    "tax_reserve",
    "equipment",
    "growth_fund",
    "custom",
  ] as const),
  targetAmount: z.number().positive("Target amount must be greater than zero"),
  currentAmount: z.number().min(0).default(0),
  currency: z.string().length(3),
  targetDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = createGoalSchema.partial().extend({
  status: z.enum(["in_progress", "completed", "paused", "cancelled"] as const).optional(),
});

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export function goalsQueryOptions(workspaceId: string, status?: GoalStatus | "all") {
  return queryOptions({
    queryKey: ["financial-goals", workspaceId, status ?? "all"],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<FinancialGoal[]> => {
      let query = supabase
        .from("financial_goals")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export async function createFinancialGoal(
  workspaceId: string,
  input: CreateGoalInput,
): Promise<FinancialGoal> {
  const validated = createGoalSchema.parse(input);
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("financial_goals")
    .insert({
      workspace_id: workspaceId,
      name: validated.name,
      category: validated.category,
      target_amount: validated.targetAmount,
      current_amount: validated.currentAmount,
      currency: validated.currency,
      target_date: validated.targetDate || null,
      notes: validated.notes || null,
      status: validated.currentAmount >= validated.targetAmount ? "completed" : "in_progress",
      created_by: user.user?.id ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "financial_goal.created",
    _entity_type: "financial_goal",
    _entity_id: data.id,
    _metadata: {
      name: data.name,
      target_amount: data.target_amount,
      currency: data.currency,
    } as never,
  });

  return data;
}

export async function updateFinancialGoal(
  workspaceId: string,
  goalId: string,
  input: UpdateGoalInput,
): Promise<FinancialGoal> {
  const validated = updateGoalSchema.parse(input);

  const payload: Database["public"]["Tables"]["financial_goals"]["Update"] = {};
  if (validated.name !== undefined) payload.name = validated.name;
  if (validated.category !== undefined) payload.category = validated.category;
  if (validated.targetAmount !== undefined) payload.target_amount = validated.targetAmount;
  if (validated.currentAmount !== undefined) {
    payload.current_amount = validated.currentAmount;
    // Auto-complete if target is met
    if (validated.targetAmount && validated.currentAmount >= validated.targetAmount) {
      payload.status = "completed";
    }
  }
  if (validated.currency !== undefined) payload.currency = validated.currency;
  if (validated.targetDate !== undefined) payload.target_date = validated.targetDate || null;
  if (validated.notes !== undefined) payload.notes = validated.notes || null;
  if (validated.status !== undefined) payload.status = validated.status;

  const { data, error } = await supabase
    .from("financial_goals")
    .update(payload)
    .eq("workspace_id", workspaceId)
    .eq("id", goalId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "financial_goal.updated",
    _entity_type: "financial_goal",
    _entity_id: goalId,
    _metadata: payload as never,
  });

  return data;
}

export async function deleteFinancialGoal(
  workspaceId: string,
  goalId: string,
): Promise<{ id: string }> {
  const { error } = await supabase
    .from("financial_goals")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", goalId);

  if (error) throw new Error(error.message);

  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "financial_goal.deleted",
    _entity_type: "financial_goal",
    _entity_id: goalId,
    _metadata: {} as never,
  });

  return { id: goalId };
}

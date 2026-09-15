import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ============================================================================
// Core Types
// ============================================================================

export type TaxReserveAdjustment = Database["public"]["Tables"]["tax_reserve_adjustments"]["Row"];

export interface TaxSummaryRow {
  currency: string;
  grossIncomeYtd: number;
  expensesYtd: number;
  netTaxableIncomeYtd: number;
  taxReserveRate: number;
  targetTaxReserve: number;
  trackedTaxReserve: number;
  shortfall: number;
  isPrimaryCurrency: boolean;
}

export type TaxHealthStatus = "funded" | "shortfall" | "overfunded";

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const upsertTaxAdjustmentSchema = z.object({
  currency: z.string().trim().length(3, "Currency must be a 3-letter code").toUpperCase(),
  amount: z.coerce.number().min(0, "Tracked tax reserve amount cannot be negative"),
  notes: z.string().trim().max(1000, "Notes cannot exceed 1000 characters").optional().nullable(),
  asOfDate: z.string().optional(),
});

export type UpsertTaxAdjustmentInput = z.infer<typeof upsertTaxAdjustmentSchema>;

// ============================================================================
// Pure Business Logic Functions (Unit Testable)
// ============================================================================

/**
 * Computes target tax reserve based on net taxable income and tax reserve percent.
 * Rate percent is expected as e.g. 25.0 for 25%.
 */
export function computeTaxReserveTarget(netIncome: number, ratePercent: number): number {
  if (netIncome <= 0 || ratePercent <= 0) return 0;
  return Math.round(netIncome * (ratePercent / 100) * 100) / 100;
}

/**
 * Computes tax reserve shortfall between target and actual tracked reserve.
 * If tracked >= target, shortfall is strictly 0.
 */
export function computeTaxShortfall(target: number, tracked: number): number {
  const diff = target - tracked;
  return diff > 0 ? Math.round(diff * 100) / 100 : 0;
}

/**
 * Evaluates funding health of the tax reserve:
 * - 'overfunded': tracked > target (by more than 0.01)
 * - 'funded': tracked is within 0.01 of target
 * - 'shortfall': tracked < target
 */
export function evaluateTaxHealth(target: number, tracked: number): TaxHealthStatus {
  const diff = Math.round((tracked - target) * 100) / 100;
  if (diff > 0.01) return "overfunded";
  if (diff >= -0.01) return "funded";
  return "shortfall";
}

// ============================================================================
// Supabase Data Access & TanStack Query Options
// ============================================================================

export function taxSummaryQueryOptions(workspaceId: string, taxYear?: number) {
  return queryOptions({
    queryKey: ["tax-summary", workspaceId, taxYear],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<TaxSummaryRow[]> => {
      const args: {
        _workspace_id: string;
        _tax_year?: number;
      } = { _workspace_id: workspaceId };

      if (taxYear !== undefined) args._tax_year = taxYear;

      const { data, error } = await supabase.rpc("get_tax_summary", args);

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        currency: row.currency,
        grossIncomeYtd: Number(row.gross_income_ytd),
        expensesYtd: Number(row.expenses_ytd),
        netTaxableIncomeYtd: Number(row.net_taxable_income_ytd),
        taxReserveRate: Number(row.tax_reserve_rate),
        targetTaxReserve: Number(row.target_tax_reserve),
        trackedTaxReserve: Number(row.tracked_tax_reserve),
        shortfall: Number(row.shortfall),
        isPrimaryCurrency: Boolean(row.is_primary_currency),
      }));
    },
  });
}

export function taxAdjustmentsListQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: ["tax-adjustments", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<TaxReserveAdjustment[]> => {
      const { data, error } = await supabase
        .from("tax_reserve_adjustments")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

// ============================================================================
// Mutations via Database RPCs
// ============================================================================

export async function upsertTaxReserveAdjustment(
  workspaceId: string,
  input: UpsertTaxAdjustmentInput,
): Promise<void> {
  const validated = upsertTaxAdjustmentSchema.parse(input);
  const args: {
    _workspace_id: string;
    _currency: string;
    _amount: number;
    _notes?: string;
    _as_of_date?: string;
  } = {
    _workspace_id: workspaceId,
    _currency: validated.currency,
    _amount: validated.amount,
  };

  if (validated.notes) args._notes = validated.notes;
  if (validated.asOfDate) args._as_of_date = validated.asOfDate;

  const { error } = await supabase.rpc("upsert_tax_reserve_adjustment", args);

  if (error) throw new Error(error.message);
}

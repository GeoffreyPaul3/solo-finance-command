import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Core Types
// ============================================================================

export interface SafeToSpendBreakdown {
  currency: string;
  liquidCash: number;
  trackedTaxReserve: number;
  targetTaxReserve: number;
  upcomingObligations30d: number;
  operatingBuffer: number;
  expectedCollections30d: number;
  currentSafeToSpend: number;
  projectedSafeToSpend: number;
  isPrimaryCurrency: boolean;
}

export interface CashflowProjectionDay {
  projectionDate: string;
  currency: string;
  expectedInflow: number;
  expectedOutflow: number;
  netChange: number;
  projectedBalance: number;
}

export interface CommandCenterV2Metrics {
  currency: string;
  total_revenue: number;
  total_expenses: number;
  net_cash: number;
  cash_balance: number;
  receivables_due: number;
  upcoming_obligations: number;
  target_tax_reserve: number;
  tracked_tax_reserve: number;
  current_sts: number;
  projected_sts: number;
  is_primary_currency: boolean;
}

// ============================================================================
// Pure Business Logic Functions (Unit Testable)
// ============================================================================

export interface SafeToSpendCalculationInput {
  liquidCash: number;
  trackedTaxReserve: number;
  upcomingObligations: number;
  operatingBuffer: number;
  reliableExpectedCollections: number;
  isPrimaryCurrency: boolean;
}

export interface SafeToSpendCalculationResult {
  effectiveOperatingBuffer: number;
  currentSafeToSpend: number;
  projectedSafeToSpend: number;
}

/**
 * Deterministically computes Safe-to-Spend for a single currency.
 * Operating buffer applies STRICTLY to the primary workspace currency only.
 * Designated (tracked) tax reserve is deducted, protecting funds actually set aside.
 * Reliable collections are added to projected Safe-to-Spend.
 */
export function calculateSafeToSpend(
  input: SafeToSpendCalculationInput,
): SafeToSpendCalculationResult {
  const effectiveOperatingBuffer = input.isPrimaryCurrency ? Math.max(0, input.operatingBuffer) : 0;

  const currentSafeToSpend =
    Math.round(
      (input.liquidCash -
        input.trackedTaxReserve -
        input.upcomingObligations -
        effectiveOperatingBuffer) *
        100,
    ) / 100;

  const projectedSafeToSpend =
    Math.round((currentSafeToSpend + input.reliableExpectedCollections) * 100) / 100;

  return {
    effectiveOperatingBuffer,
    currentSafeToSpend,
    projectedSafeToSpend,
  };
}

export type CollectionReliability = "high" | "medium" | "low";

/**
 * Classifies an invoice's expected collection reliability for cashflow projections:
 * - High: sent or partially_paid, due today or in the future
 * - Medium: overdue by 1 to 30 days
 * - Low: overdue by more than 30 days (excluded from safe projection)
 */
export function classifyCollectionReliability(
  invoice: {
    status: string;
    dueDate: string;
    amountDue: number;
  },
  asOfDate: string = new Date().toISOString().slice(0, 10),
): CollectionReliability {
  if (invoice.amountDue <= 0 || invoice.status === "cancelled" || invoice.status === "draft") {
    return "low";
  }

  const today = asOfDate.slice(0, 10);
  const due = invoice.dueDate.slice(0, 10);

  if (due >= today) {
    return "high";
  }

  const todayMs = new Date(today).getTime();
  const dueMs = new Date(due).getTime();
  const daysOverdue = Math.floor((todayMs - dueMs) / (24 * 60 * 60 * 1000));

  if (daysOverdue <= 30) {
    return "medium";
  }

  return "low";
}

// ============================================================================
// Supabase Data Access & TanStack Query Options
// ============================================================================

export function safeToSpendQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: ["safe-to-spend", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<SafeToSpendBreakdown[]> => {
      const { data, error } = await supabase.rpc("get_safe_to_spend", {
        _workspace_id: workspaceId,
      });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        currency: row.currency,
        liquidCash: Number(row.liquid_cash),
        trackedTaxReserve: Number(row.tracked_tax_reserve),
        targetTaxReserve: Number(row.target_tax_reserve),
        upcomingObligations30d: Number(row.upcoming_obligations_30d),
        operatingBuffer: Number(row.operating_buffer),
        expectedCollections30d: Number(row.expected_collections_30d),
        currentSafeToSpend: Number(row.current_safe_to_spend),
        projectedSafeToSpend: Number(row.projected_safe_to_spend),
        isPrimaryCurrency: Boolean(row.is_primary_currency),
      }));
    },
  });
}

export function cashflowProjectionQueryOptions(workspaceId: string, horizonDays: number = 60) {
  return queryOptions({
    queryKey: ["cashflow-projection", workspaceId, horizonDays],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<CashflowProjectionDay[]> => {
      const { data, error } = await supabase.rpc("get_cashflow_projection", {
        _workspace_id: workspaceId,
        _horizon_days: horizonDays,
      });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        projectionDate: row.projection_date,
        currency: row.currency,
        expectedInflow: Number(row.expected_inflow),
        expectedOutflow: Number(row.expected_outflow),
        netChange: Number(row.net_change),
        projectedBalance: Number(row.projected_balance),
      }));
    },
  });
}

export function commandCenterV2QueryOptions(
  workspaceId: string,
  dateFrom?: string,
  dateTo?: string,
) {
  return queryOptions({
    queryKey: ["command-center-v2", workspaceId, dateFrom, dateTo],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<CommandCenterV2Metrics[]> => {
      const args: {
        _workspace_id: string;
        _date_from?: string;
        _date_to?: string;
      } = {
        _workspace_id: workspaceId,
      };

      if (dateFrom) args._date_from = dateFrom;
      if (dateTo) args._date_to = dateTo;

      const { data, error } = await supabase.rpc("get_command_center_v2_summary", args);

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        currency: row.currency,
        total_revenue: Number(row.total_revenue),
        total_expenses: Number(row.total_expenses),
        net_cash: Number(row.net_cash),
        cash_balance: Number(row.cash_balance),
        receivables_due: Number(row.receivables_due),
        upcoming_obligations: Number(row.upcoming_obligations),
        target_tax_reserve: Number(row.target_tax_reserve),
        tracked_tax_reserve: Number(row.tracked_tax_reserve),
        current_sts: Number(row.current_sts),
        projected_sts: Number(row.projected_sts),
        is_primary_currency: Boolean(row.is_primary_currency),
      }));
    },
  });
}

import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Core Types
// ============================================================================

export interface CurrencyProfitability {
  currency: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  invoice_count: number;
  expense_count: number;
  margin_percent: number; // computed client-side: net / revenue * 100
}

export interface ProfitabilitySummary {
  periods: CurrencyProfitability[];
  dateFrom: string;
  dateTo: string;
}

export interface CommandCenterMetrics {
  currency: string;
  total_revenue: number;
  total_expenses: number;
  net_cash: number;
  cash_balance: number;
  receivables_due: number;
}

// ============================================================================
// Query Options
// ============================================================================

export function profitabilitySummaryQueryOptions(
  workspaceId: string,
  dateFrom?: string,
  dateTo?: string,
) {
  return queryOptions({
    queryKey: ["profitability-summary", workspaceId, dateFrom, dateTo],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<ProfitabilitySummary> => {
      const args: {
        _workspace_id: string;
        _date_from?: string;
        _date_to?: string;
      } = { _workspace_id: workspaceId };
      if (dateFrom) args._date_from = dateFrom;
      if (dateTo) args._date_to = dateTo;

      const { data, error } = await supabase.rpc("get_profitability_summary", args);
      if (error) throw new Error(error.message);

      const periods: CurrencyProfitability[] = (data ?? []).map((row) => ({
        currency: row.currency,
        total_revenue: Number(row.total_revenue),
        total_expenses: Number(row.total_expenses),
        net_profit: Number(row.net_profit),
        invoice_count: Number(row.invoice_count),
        expense_count: Number(row.expense_count),
        margin_percent:
          Number(row.total_revenue) > 0
            ? (Number(row.net_profit) / Number(row.total_revenue)) * 100
            : 0,
      }));

      return {
        periods,
        dateFrom: dateFrom ?? "",
        dateTo: dateTo ?? "",
      };
    },
  });
}

export function commandCenterSummaryQueryOptions(
  workspaceId: string,
  dateFrom?: string,
  dateTo?: string,
) {
  return queryOptions({
    queryKey: ["command-center-summary", workspaceId, dateFrom, dateTo],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<CommandCenterMetrics[]> => {
      const args: {
        _workspace_id: string;
        _date_from?: string;
        _date_to?: string;
      } = { _workspace_id: workspaceId };
      if (dateFrom) args._date_from = dateFrom;
      if (dateTo) args._date_to = dateTo;

      const { data, error } = await supabase.rpc("get_command_center_summary", args);
      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        currency: row.currency,
        total_revenue: Number(row.total_revenue),
        total_expenses: Number(row.total_expenses),
        net_cash: Number(row.net_cash),
        cash_balance: Number(row.cash_balance),
        receivables_due: Number(row.receivables_due),
      }));
    },
  });
}

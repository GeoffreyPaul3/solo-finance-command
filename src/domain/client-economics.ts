/**
 * SoloOS Phase 10: Client Economics & Payment Behavior Model
 *
 * Deterministic client profitability and payment history metrics derived
 * strictly from authoritative invoices, payments, and expenses.
 *
 * Attribution principle:
 * Expenses are ONLY attributed to clients when expenses.client_id is explicitly set.
 * Unattributed expenses remain separate. Zero guessing or artificial distribution.
 */

import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientEconomicsRow {
  clientId: string;
  clientName: string;
  currency: string;
  totalInvoiced: number;
  totalCollected: number;
  outstandingReceivables: number;
  attributableExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  totalInvoicesCount: number;
  paidInvoicesCount: number;
  overdueInvoicesCount: number;
  avgDaysToPayment: number | null;
  lastPaymentDate: string | null;
}

export interface ClientPaymentBehaviorInput {
  paidInvoices: Array<{
    invoiceId: string;
    issueDate: string; // YYYY-MM-DD
    paidAtDate?: string | null; // YYYY-MM-DD
    payments?: Array<{ paymentDate: string; amount: number }>;
  }>;
}

export interface ClientPaymentBehaviorResult {
  paidInvoicesCount: number;
  avgDaysToPayment: number | null; // null if insufficient history
  fastestPaymentDays: number | null;
  slowestPaymentDays: number | null;
  hasSufficientHistory: boolean;
  explanation: string;
}

/**
 * Pure function: calculates payment speed statistics from verified payment dates.
 * Definition: Days between invoice issue_date and the final/latest payment date.
 */
export function calculateClientPaymentBehavior(
  input: ClientPaymentBehaviorInput,
): ClientPaymentBehaviorResult {
  const durations: number[] = [];

  for (const inv of input.paidInvoices) {
    let finalPayDate: string | null = null;
    if (inv.payments && inv.payments.length > 0) {
      // Find latest payment date
      const sorted = [...inv.payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
      finalPayDate = sorted[0]?.paymentDate ?? null;
    } else if (inv.paidAtDate) {
      finalPayDate = inv.paidAtDate;
    }

    if (finalPayDate && inv.issueDate) {
      const issueMs = new Date(inv.issueDate).getTime();
      const payMs = new Date(finalPayDate).getTime();
      const diffDays = Math.max(0, Math.round((payMs - issueMs) / (24 * 60 * 60 * 1000)));
      durations.push(diffDays);
    }
  }

  if (durations.length === 0) {
    return {
      paidInvoicesCount: 0,
      avgDaysToPayment: null,
      fastestPaymentDays: null,
      slowestPaymentDays: null,
      hasSufficientHistory: false,
      explanation: "Insufficient payment history to calculate payment speed.",
    };
  }

  const sum = durations.reduce((acc, d) => acc + d, 0);
  const avg = Math.round((sum / durations.length) * 10) / 10;
  const fastest = Math.min(...durations);
  const slowest = Math.max(...durations);

  return {
    paidInvoicesCount: durations.length,
    avgDaysToPayment: avg,
    fastestPaymentDays: fastest,
    slowestPaymentDays: slowest,
    hasSufficientHistory: true,
    explanation: `Average payment time: ${avg} ${avg === 1 ? "day" : "days"} (based on ${durations.length} settled ${durations.length === 1 ? "invoice" : "invoices"}).`,
  };
}

// ============================================================================
// TanStack Query Options
// ============================================================================

export function clientEconomicsQueryOptions(workspaceId: string, clientId?: string) {
  return queryOptions({
    queryKey: ["client-economics", workspaceId, clientId ?? "all"],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<ClientEconomicsRow[]> => {
      const { data, error } = await supabase.rpc("get_client_economics", {
        _workspace_id: workspaceId,
        _client_id: clientId ?? null,
      });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        clientId: row.client_id,
        clientName: row.client_name,
        currency: row.currency,
        totalInvoiced: Number(row.total_invoiced),
        totalCollected: Number(row.total_collected),
        outstandingReceivables: Number(row.outstanding_receivables),
        attributableExpenses: Number(row.attributable_expenses),
        netProfit: Number(row.net_profit),
        profitMarginPercent: Number(row.profit_margin_percent),
        totalInvoicesCount: Number(row.total_invoices_count),
        paidInvoicesCount: Number(row.paid_invoices_count),
        overdueInvoicesCount: Number(row.overdue_invoices_count),
        avgDaysToPayment: row.avg_days_to_payment !== null ? Number(row.avg_days_to_payment) : null,
        lastPaymentDate: row.last_payment_date,
      }));
    },
  });
}

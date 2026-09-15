import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SafeToSpendBreakdown } from "./cashflow";
import type { TaxSummaryRow } from "./tax-reserve";

// ============================================================================
// Core Types & Schemas
// ============================================================================

export type AiCfoInteraction = Database["public"]["Tables"]["ai_cfo_interactions"]["Row"];

export const aiCfoActionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  action_type: z.string().optional(),
  suggested_route: z.string().optional(),
});

export const aiCfoMetricReferenceSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const aiCfoResponseSchema = z.object({
  summary: z.string().min(1),
  key_points: z.array(z.string()),
  risks: z.array(z.string()),
  opportunities: z.array(z.string()),
  recommended_actions: z.array(aiCfoActionSchema),
  metric_references: z.array(aiCfoMetricReferenceSchema),
});

export type AiCfoResponse = z.infer<typeof aiCfoResponseSchema>;

export type AiCfoStatus = "ready" | "unavailable" | "error";

export interface AiCfoResult {
  status: AiCfoStatus;
  response?: AiCfoResponse;
  errorMessage?: string;
  isAvailable: boolean;
}

export const AI_CFO_SYSTEM_PROMPT = `You are SoloOS AI CFO, an elite, highly objective financial intelligence assistant for independent professionals.
Your duties:
1. Help the user UNDERSTAND their financial reality.
2. Ground all insights strictly in the provided deterministic financial metrics.
3. NEVER fabricate numbers, accounts, client names, or amounts. All metrics must reference the provided context.
4. Keep advice strategic, proactive, sober, and actionable.
5. Emphasize cash preservation, tax safety, and disciplined runway.
6. Return structured JSON conforming strictly to the requested schema.`;

// ============================================================================
// Pure Context Builder Functions (Unit Testable)
// ============================================================================

export interface FinancialContextParams {
  workspaceName: string;
  primaryCurrency: string;
  safeToSpend: SafeToSpendBreakdown[];
  taxSummary: TaxSummaryRow[];
  upcomingObligationsTotal: number;
  upcomingObligationsCount: number;
  unpaidReceivablesTotal: number;
  unpaidReceivablesCount: number;
}

/**
 * Builds a clean, deterministic markdown context snapshot of the user's financial reality.
 * Strictly separates factual numbers from AI instructions.
 */
export function buildDeterministicFinancialContext(params: FinancialContextParams): string {
  const lines: string[] = [];

  lines.push(`Workspace: ${params.workspaceName}`);
  lines.push(`Primary Currency: ${params.primaryCurrency}`);
  lines.push("");

  lines.push("--- SAFE-TO-SPEND BREAKDOWN ---");
  if (params.safeToSpend.length === 0) {
    lines.push("No Safe-to-Spend data available.");
  } else {
    for (const sts of params.safeToSpend) {
      lines.push(`Currency: ${sts.currency} (Primary: ${sts.isPrimaryCurrency ? "Yes" : "No"})`);
      lines.push(`- Liquid Cash: ${sts.liquidCash}`);
      lines.push(`- Tracked Tax Reserve: ${sts.trackedTaxReserve}`);
      lines.push(`- Target Tax Reserve: ${sts.targetTaxReserve}`);
      lines.push(`- Upcoming Obligations (30d): ${sts.upcomingObligations30d}`);
      lines.push(`- Operating Buffer: ${sts.operatingBuffer}`);
      lines.push(`- Expected Collections (30d): ${sts.expectedCollections30d}`);
      lines.push(`- Current Safe-to-Spend: ${sts.currentSafeToSpend}`);
      lines.push(`- Projected Safe-to-Spend: ${sts.projectedSafeToSpend}`);
    }
  }
  lines.push("");

  lines.push("--- TAX RESERVE STATUS ---");
  if (params.taxSummary.length === 0) {
    lines.push("No tax summary data available.");
  } else {
    for (const tax of params.taxSummary) {
      lines.push(`Currency: ${tax.currency}`);
      lines.push(`- Gross Income YTD: ${tax.grossIncomeYtd}`);
      lines.push(`- Expenses YTD: ${tax.expensesYtd}`);
      lines.push(`- Net Taxable Income YTD: ${tax.netTaxableIncomeYtd}`);
      lines.push(`- Target Tax Reserve (${tax.taxReserveRate}%): ${tax.targetTaxReserve}`);
      lines.push(`- Tracked Tax Reserve: ${tax.trackedTaxReserve}`);
      lines.push(`- Shortfall: ${tax.shortfall}`);
    }
  }
  lines.push("");

  lines.push("--- OBLIGATIONS & RECEIVABLES SUMMARY ---");
  lines.push(
    `Upcoming Active Obligations: ${params.upcomingObligationsCount} items, Total: ${params.upcomingObligationsTotal} ${params.primaryCurrency}`,
  );
  lines.push(
    `Outstanding Receivables: ${params.unpaidReceivablesCount} invoices, Total: ${params.unpaidReceivablesTotal} ${params.primaryCurrency}`,
  );

  return lines.join("\n");
}

/**
 * Returns the honest fallback state when AI provider is not configured.
 */
export function getUnavailableAiCfoResult(reason?: string): AiCfoResult {
  return {
    status: "unavailable",
    isAvailable: false,
    errorMessage:
      reason ||
      "AI CFO is unavailable because no AI provider API key is configured. Deterministic financial metrics, cashflow, and tax reserves remain fully operational.",
  };
}

// ============================================================================
// Supabase Data Access & TanStack Query Options
// ============================================================================

export function recentAiCfoInteractionsQueryOptions(workspaceId: string, limit: number = 10) {
  return queryOptions({
    queryKey: ["ai-cfo-interactions", workspaceId, limit],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<AiCfoInteraction[]> => {
      const { data, error } = await supabase.rpc("get_recent_ai_cfo_interactions", {
        _workspace_id: workspaceId,
        _limit: limit,
      });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        id: row.id,
        workspace_id: workspaceId,
        user_id: row.user_id,
        question: row.question,
        response: row.response,
        context_snapshot: row.context_snapshot,
        created_at: row.created_at,
      }));
    },
  });
}

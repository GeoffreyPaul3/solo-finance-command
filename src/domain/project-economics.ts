/**
 * SoloOS Phase 10: Project Economics Model
 *
 * Deterministic project profitability, budget utilization, and health metrics
 * derived strictly from authoritative invoices, payments, and attributable project expenses.
 *
 * Attribution rule:
 * Expenses are ONLY counted when expenses.project_id is explicitly set.
 * Zero guessing, zero revenue-based inference.
 */

import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProjectHealthState = "on_track" | "watch" | "over_budget" | "no_budget";

export interface ProjectHealthEvaluationInput {
  budget: number | null;
  budgetCurrency?: string | null;
  currency: string;
  projectExpenses: number;
}

export interface ProjectHealthEvaluationResult {
  state: ProjectHealthState;
  label: string;
  utilizationPercent: number | null;
  variance: number | null; // budget - expenses (positive = under budget, negative = over budget)
  explanation: string;
}

/**
 * Pure function: evaluates deterministic project health relative to agreed budget.
 */
export function evaluateProjectHealth(
  input: ProjectHealthEvaluationInput,
): ProjectHealthEvaluationResult {
  if (input.budget === null || input.budget === undefined || input.budget <= 0) {
    return {
      state: "no_budget",
      label: "Uncapped",
      utilizationPercent: null,
      variance: null,
      explanation:
        "No formal budget cap specified for this project. Tracking actual costs against billings.",
    };
  }

  // Budget currency must match expense currency
  if (input.budgetCurrency && input.budgetCurrency !== input.currency) {
    return {
      state: "no_budget",
      label: "Currency Mismatch",
      utilizationPercent: null,
      variance: null,
      explanation: `Project budget is denominated in ${input.budgetCurrency} while expenses are in ${input.currency}. Multi-currency budgets are not cross-converted.`,
    };
  }

  const utilization = Math.round((input.projectExpenses / input.budget) * 1000) / 10;
  const variance = Math.round((input.budget - input.projectExpenses) * 100) / 100;

  if (input.projectExpenses > input.budget) {
    return {
      state: "over_budget",
      label: "Over Budget",
      utilizationPercent: utilization,
      variance,
      explanation: `Over Budget: Attributable project expenses (${input.currency} ${input.projectExpenses.toLocaleString()}) exceed the agreed budget cap (${input.currency} ${input.budget.toLocaleString()}) by ${Math.abs(variance).toLocaleString()}.`,
    };
  }

  if (utilization >= 80) {
    return {
      state: "watch",
      label: "Watch",
      utilizationPercent: utilization,
      variance,
      explanation: `Watch: Budget utilization has reached ${utilization}%. ${input.currency} ${variance.toLocaleString()} remains available under the budget cap.`,
    };
  }

  return {
    state: "on_track",
    label: "On Track",
    utilizationPercent: utilization,
    variance,
    explanation: `On Track: Budget utilization is ${utilization}%. Remaining buffer is ${input.currency} ${variance.toLocaleString()}.`,
  };
}

export interface ProjectEconomicsRow {
  projectId: string;
  projectName: string;
  clientId: string | null;
  clientName: string | null;
  currency: string;
  projectRevenue: number; // total invoiced
  collectedRevenue: number; // total payments received
  outstandingRevenue: number; // unpaid amount due
  projectExpenses: number; // attributable expenses
  netProfit: number; // collectedRevenue - projectExpenses
  profitMarginPercent: number;
  budget: number | null;
  budgetCurrency: string | null;
  budgetUtilizationPercent: number | null;
  budgetVariance: number | null;
  healthState: ProjectHealthState;
  healthLabel: string;
  healthExplanation: string;
}

// ============================================================================
// TanStack Query Options
// ============================================================================

export function projectEconomicsQueryOptions(workspaceId: string, projectId?: string) {
  return queryOptions({
    queryKey: ["project-economics", workspaceId, projectId ?? "all"],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<ProjectEconomicsRow[]> => {
      const { data, error } = await supabase.rpc("get_project_economics", {
        _workspace_id: workspaceId,
        _project_id: projectId ?? null,
      });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => {
        const healthEval = evaluateProjectHealth({
          budget: row.budget !== null ? Number(row.budget) : null,
          budgetCurrency: row.budget_currency,
          currency: row.currency,
          projectExpenses: Number(row.project_expenses),
        });

        return {
          projectId: row.project_id,
          projectName: row.project_name,
          clientId: row.client_id,
          clientName: row.client_name,
          currency: row.currency,
          projectRevenue: Number(row.project_revenue),
          collectedRevenue: Number(row.collected_revenue),
          outstandingRevenue: Number(row.outstanding_revenue),
          projectExpenses: Number(row.project_expenses),
          netProfit: Number(row.net_profit),
          profitMarginPercent: Number(row.profit_margin_percent),
          budget: row.budget !== null ? Number(row.budget) : null,
          budgetCurrency: row.budget_currency,
          budgetUtilizationPercent: healthEval.utilizationPercent,
          budgetVariance: healthEval.variance,
          healthState: healthEval.state,
          healthLabel: healthEval.label,
          healthExplanation: healthEval.explanation,
        };
      });
    },
  });
}

/**
 * SoloOS Phase 10: Financial Brief Model
 *
 * Deterministic executive briefing engine for the Command Center.
 * Synthesizes core financial position, actionable attention signals, and positive signals.
 *
 * CRITICAL ARCHITECTURAL GUARANTEE:
 * All observations are 100% deterministic, grounded directly in verified workspace facts.
 * Zero fabricated numbers or imaginary events.
 */

import type { FinancialPulse } from "./financial-pulse";

export interface BriefSignal {
  id: string;
  type: "attention" | "positive";
  title: string;
  detail: string;
  actionLabel?: string;
  actionRoute?: string;
}

export interface FinancialBriefInput {
  pulse: FinancialPulse;
  overdueInvoicesCount: number;
  overdueInvoicesTotal: number;
  dueSoonInvoicesCount: number;
  dueSoonInvoicesTotal: number;
  obligationsDue7dCount: number;
  obligationsDue7dTotal: number;
  recentPaymentsCount: number;
  recentPaymentsTotal: number;
  overBudgetProjectsCount?: number;
}

export interface SoloOSFinancialBrief {
  currency: string;
  safeToSpend: number;
  liquidCash: number;
  receivables: number;
  actualTaxReserve: number;
  targetTaxReserve: number;
  upcomingObligations: number;
  attentionSignals: BriefSignal[];
  positiveSignals: BriefSignal[];
  headline: string;
}

export function generateFinancialBrief(input: FinancialBriefInput): SoloOSFinancialBrief {
  const { pulse, currency } = { pulse: input.pulse, currency: input.pulse.currency };

  const attentionSignals: BriefSignal[] = [];
  const positiveSignals: BriefSignal[] = [];

  // Attention signal 1: Overdue invoices
  if (input.overdueInvoicesCount > 0) {
    attentionSignals.push({
      id: "brief-overdue-invoices",
      type: "attention",
      title: `${input.overdueInvoicesCount} overdue ${input.overdueInvoicesCount === 1 ? "invoice" : "invoices"}`,
      detail: `${currency} ${input.overdueInvoicesTotal.toLocaleString()} is overdue from clients. Follow up to restore operating liquidity.`,
      actionLabel: "View Follow-ups",
      actionRoute: "/app/follow-ups",
    });
  }

  // Attention signal 2: Tax reserve shortfall
  if (pulse.taxShortfall > 0) {
    attentionSignals.push({
      id: "brief-tax-shortfall",
      type: "attention",
      title: "Tax reserve is below planning target",
      detail: `Current designated reserve of ${currency} ${pulse.actualTaxReserve.toLocaleString()} leaves a planning shortfall of ${currency} ${pulse.taxShortfall.toLocaleString()}.`,
      actionLabel: "Adjust Tax Reserve",
      actionRoute: "/app/taxes",
    });
  }

  // Attention signal 3: Obligations due within 7 days
  if (input.obligationsDue7dCount > 0) {
    attentionSignals.push({
      id: "brief-obligations-due-7d",
      type: "attention",
      title: `${currency} ${input.obligationsDue7dTotal.toLocaleString()} in commitments due within 7 days`,
      detail: `${input.obligationsDue7dCount} scheduled ${input.obligationsDue7dCount === 1 ? "obligation requires" : "obligations require"} funding in the next week.`,
      actionLabel: "Review Obligations",
      actionRoute: "/app/obligations",
    });
  }

  // Attention signal 4: Over-budget projects
  if (input.overBudgetProjectsCount && input.overBudgetProjectsCount > 0) {
    attentionSignals.push({
      id: "brief-over-budget-projects",
      type: "attention",
      title: `${input.overBudgetProjectsCount} project(s) over agreed budget`,
      detail: "Attributable project expenses have exceeded agreed contract budget caps.",
      actionLabel: "View Projects",
      actionRoute: "/app/projects",
    });
  }

  // Positive signal 1: Safe-to-Spend is positive and healthy
  if (pulse.safeToSpend > 0) {
    positiveSignals.push({
      id: "brief-sts-positive",
      type: "positive",
      title: "Safe-to-Spend remains positive",
      detail: `You have ${currency} ${pulse.safeToSpend.toLocaleString()} available to deploy after reserving for obligations and taxes.`,
    });
  }

  // Positive signal 2: Net cash movement in period is positive
  if (pulse.currentPeriodProfit > 0) {
    positiveSignals.push({
      id: "brief-operating-profit",
      type: "positive",
      title: "Operating cash flow is positive this period",
      detail: `Income exceeds operating expenses by ${currency} ${pulse.currentPeriodProfit.toLocaleString()}.`,
    });
  }

  // Positive signal 3: Recent client payments settled
  if (input.recentPaymentsCount > 0) {
    positiveSignals.push({
      id: "brief-recent-collections",
      type: "positive",
      title: `${input.recentPaymentsCount} recent client ${input.recentPaymentsCount === 1 ? "payment" : "payments"} collected`,
      detail: `Successfully collected ${currency} ${input.recentPaymentsTotal.toLocaleString()} into your accounts.`,
    });
  }

  // Positive signal 4: Zero overdue invoices
  if (input.overdueInvoicesCount === 0 && pulse.outstandingReceivables > 0) {
    positiveSignals.push({
      id: "brief-clean-receivables",
      type: "positive",
      title: "All client receivables are in good standing",
      detail: "No overdue invoices recorded across all client accounts.",
    });
  }

  let headline = "Your financial position is stable.";
  if (pulse.safeToSpend < 0 || input.overdueInvoicesCount > 2) {
    headline = "Action needed on cashflow commitments and collections.";
  } else if (pulse.status === "healthy" && positiveSignals.length >= 2) {
    headline = "Your financial runway and reserves are in strong standing.";
  }

  return {
    currency,
    safeToSpend: pulse.safeToSpend,
    liquidCash: pulse.liquidCash,
    receivables: pulse.outstandingReceivables,
    actualTaxReserve: pulse.actualTaxReserve,
    targetTaxReserve: pulse.targetTaxReserve,
    upcomingObligations: pulse.upcomingObligations,
    attentionSignals,
    positiveSignals,
    headline,
  };
}

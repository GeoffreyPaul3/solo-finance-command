/**
 * SoloOS Phase 10: Financial Pulse Model
 *
 * Reusable model that summarizes current financial health using real authoritative data.
 * Pure calculation functions — unit testable, currency-isolated, zero floating-point drift.
 */

export interface FinancialPulseInput {
  currency: string;
  liquidCash: number;
  safeToSpend: number;
  outstandingReceivables: number;
  upcomingObligations: number;
  actualTaxReserve: number;
  targetTaxReserve: number;
  taxShortfall: number;
  currentPeriodIncome: number;
  currentPeriodExpenses: number;
  currentPeriodProfit: number;
  isPrimaryCurrency?: boolean;
}

export type PulseStatus = "healthy" | "attention" | "critical" | "incomplete";

export interface FinancialPulse {
  currency: string;
  liquidCash: number;
  safeToSpend: number;
  outstandingReceivables: number;
  upcomingObligations: number;
  actualTaxReserve: number;
  targetTaxReserve: number;
  taxShortfall: number;
  currentPeriodIncome: number;
  currentPeriodExpenses: number;
  currentPeriodProfit: number;
  status: PulseStatus;
  statusLabel: string;
  statusDescription: string;
  isPrimaryCurrency: boolean;
  /** Coverage of 30d obligations by liquid cash (null if 0 obligations) */
  cashCoverageRatio: number | null;
  /** Percentage of target tax reserve actually designated */
  taxReserveFundedPercent: number;
}

export function computeFinancialPulse(input: FinancialPulseInput): FinancialPulse {
  const isPrimary = input.isPrimaryCurrency ?? true;

  // Determine empty/incomplete state: zero across all activity
  const isZeroActivity =
    input.liquidCash === 0 &&
    input.safeToSpend === 0 &&
    input.outstandingReceivables === 0 &&
    input.upcomingObligations === 0 &&
    input.currentPeriodIncome === 0 &&
    input.currentPeriodExpenses === 0;

  if (isZeroActivity) {
    return {
      ...input,
      isPrimaryCurrency: isPrimary,
      status: "incomplete",
      statusLabel: "Insufficient Data",
      statusDescription:
        "No posted transactions, active accounts, or obligations found for this currency.",
      cashCoverageRatio: null,
      taxReserveFundedPercent: 100,
    };
  }

  const cashCoverageRatio =
    input.upcomingObligations > 0
      ? Math.round((input.liquidCash / input.upcomingObligations) * 100) / 100
      : null;

  const taxReserveFundedPercent =
    input.targetTaxReserve > 0
      ? Math.min(100, Math.round((input.actualTaxReserve / input.targetTaxReserve) * 1000) / 10)
      : 100;

  let status: PulseStatus = "healthy";
  let statusLabel = "Healthy";
  let statusDescription =
    "Cash reserves comfortably exceed near-term obligations and tax obligations are covered.";

  // Critical checks
  if (
    input.safeToSpend < 0 ||
    (input.upcomingObligations > 0 && input.liquidCash < input.upcomingObligations)
  ) {
    status = "critical";
    statusLabel = "Action Required";
    statusDescription =
      input.safeToSpend < 0
        ? "Safe-to-Spend is negative. Commitments and reserves exceed liquid balances."
        : "Liquid cash is insufficient to cover scheduled upcoming obligations.";
  } else if (input.taxShortfall > 0 || (cashCoverageRatio !== null && cashCoverageRatio < 1.5)) {
    status = "attention";
    statusLabel = "Needs Attention";
    statusDescription =
      input.taxShortfall > 0
        ? `Tax reserve is below planning target with a shortfall of ${input.currency} ${input.taxShortfall.toLocaleString()}.`
        : "Cash coverage for scheduled obligations is narrow.";
  }

  return {
    currency: input.currency,
    liquidCash: Math.round(input.liquidCash * 100) / 100,
    safeToSpend: Math.round(input.safeToSpend * 100) / 100,
    outstandingReceivables: Math.round(input.outstandingReceivables * 100) / 100,
    upcomingObligations: Math.round(input.upcomingObligations * 100) / 100,
    actualTaxReserve: Math.round(input.actualTaxReserve * 100) / 100,
    targetTaxReserve: Math.round(input.targetTaxReserve * 100) / 100,
    taxShortfall: Math.max(0, Math.round(input.taxShortfall * 100) / 100),
    currentPeriodIncome: Math.round(input.currentPeriodIncome * 100) / 100,
    currentPeriodExpenses: Math.round(input.currentPeriodExpenses * 100) / 100,
    currentPeriodProfit: Math.round(input.currentPeriodProfit * 100) / 100,
    status,
    statusLabel,
    statusDescription,
    isPrimaryCurrency: isPrimary,
    cashCoverageRatio,
    taxReserveFundedPercent,
  };
}

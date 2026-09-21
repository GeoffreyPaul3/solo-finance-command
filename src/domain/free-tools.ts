/**
 * SoloOS Phase 11: Free Acquisition Tools Domain Logic
 *
 * Exact, decimal-safe calculations for unauthenticated public tools.
 *
 * Core principles:
 * 1. Zero hidden assumptions or artificial adjustments.
 * 2. Transparent mathematical formulas.
 * 3. Prominent planning disclaimers (never disguised as formal tax or legal advice).
 * 4. Zero JS floating-point corruption (2-decimal precision rounding).
 */

export interface PublicSafeToSpendInput {
  liquidCash: number;
  taxReserve: number;
  upcomingObligations: number;
  operatingBuffer: number;
  expectedCollections: number;
}

export interface PublicSafeToSpendResult {
  estimatedSafeToSpend: number;
  totalDeductions: number;
  netAvailableCash: number;
  formulaDescription: string;
  disclaimer: string;
}

export function calculatePublicSafeToSpend(input: PublicSafeToSpendInput): PublicSafeToSpendResult {
  const cash = Math.max(0, Number(input.liquidCash) || 0);
  const tax = Math.max(0, Number(input.taxReserve) || 0);
  const obligations = Math.max(0, Number(input.upcomingObligations) || 0);
  const buffer = Math.max(0, Number(input.operatingBuffer) || 0);
  const collections = Math.max(0, Number(input.expectedCollections) || 0);

  const totalDeductions = Math.round((tax + obligations + buffer) * 100) / 100;
  const netAvailableCash = Math.round((cash - totalDeductions) * 100) / 100;
  const estimatedSafeToSpend = Math.round((netAvailableCash + collections) * 100) / 100;

  return {
    estimatedSafeToSpend,
    totalDeductions,
    netAvailableCash,
    formulaDescription:
      "Liquid Cash − (Tax Reserve + Upcoming Obligations + Operating Buffer) + Expected Collections",
    disclaimer:
      "Estimated Safe-to-Spend is a planning estimate based strictly on user-entered values. Connect SoloOS to automate this against authoritative ledger accounts.",
  };
}

export interface PublicCashRunwayInput {
  currentCash: number;
  monthlyOperatingExpenses: number;
  upcomingObligations: number;
  expectedCollections: number;
}

export interface PublicCashRunwayResult {
  netAvailableCash: number;
  runwayMonths: number;
  isInfinite: boolean;
  status: "critical" | "tight" | "healthy" | "strong";
  disclaimer: string;
}

export function calculatePublicCashRunway(input: PublicCashRunwayInput): PublicCashRunwayResult {
  const cash = Math.max(0, Number(input.currentCash) || 0);
  const burn = Math.max(0, Number(input.monthlyOperatingExpenses) || 0);
  const obligations = Math.max(0, Number(input.upcomingObligations) || 0);
  const collections = Math.max(0, Number(input.expectedCollections) || 0);

  const netAvailableCash = Math.round((cash - obligations + collections) * 100) / 100;

  if (burn === 0) {
    return {
      netAvailableCash,
      runwayMonths: Infinity,
      isInfinite: true,
      status: "strong",
      disclaimer: "Zero monthly expenses entered. Runway is mathematically uncapped.",
    };
  }

  const rawMonths = netAvailableCash / burn;
  const runwayMonths = Math.max(0, Math.round(rawMonths * 10) / 10);

  let status: "critical" | "tight" | "healthy" | "strong" = "strong";
  if (runwayMonths < 1.5) status = "critical";
  else if (runwayMonths < 3.0) status = "tight";
  else if (runwayMonths < 6.0) status = "healthy";

  return {
    netAvailableCash,
    runwayMonths,
    isInfinite: false,
    status,
    disclaimer:
      "Runway assumes linear burn based on entered monthly operating expenses and does not model seasonal cash fluctuations.",
  };
}

export interface PublicProfitInput {
  revenue: number;
  directExpenses: number;
  operatingExpenses: number;
  taxPlanningReserve: number;
}

export interface PublicProfitResult {
  revenue: number;
  totalExpenses: number;
  grossProfit: number;
  grossMarginPercent: number;
  netProfit: number;
  netMarginPercent: number;
  disclaimer: string;
}

export function calculatePublicProfit(input: PublicProfitInput): PublicProfitResult {
  const rev = Math.max(0, Number(input.revenue) || 0);
  const direct = Math.max(0, Number(input.directExpenses) || 0);
  const opex = Math.max(0, Number(input.operatingExpenses) || 0);
  const tax = Math.max(0, Number(input.taxPlanningReserve) || 0);

  const totalExpenses = Math.round((direct + opex) * 100) / 100;
  const grossProfit = Math.round((rev - direct) * 100) / 100;
  const grossMarginPercent = rev > 0 ? Math.round((grossProfit / rev) * 10000) / 100 : 0;

  const netProfit = Math.round((rev - totalExpenses - tax) * 100) / 100;
  const netMarginPercent = rev > 0 ? Math.round((netProfit / rev) * 10000) / 100 : 0;

  return {
    revenue: rev,
    totalExpenses,
    grossProfit,
    grossMarginPercent,
    netProfit,
    netMarginPercent,
    disclaimer:
      "Calculations represent direct business economics based on inputs entered. Not an official income statement.",
  };
}

export interface PublicInvoiceProfitInput {
  invoiceAmount: number;
  directCosts: number;
  projectCosts: number;
  processingFeePercent: number;
}

export interface PublicInvoiceProfitResult {
  invoiceAmount: number;
  processingFeeAmount: number;
  totalCost: number;
  estimatedProfit: number;
  profitMarginPercent: number;
  disclaimer: string;
}

export function calculatePublicInvoiceProfit(
  input: PublicInvoiceProfitInput,
): PublicInvoiceProfitResult {
  const amount = Math.max(0, Number(input.invoiceAmount) || 0);
  const direct = Math.max(0, Number(input.directCosts) || 0);
  const project = Math.max(0, Number(input.projectCosts) || 0);
  const feeRate = Math.max(0, Number(input.processingFeePercent) || 0);

  const processingFeeAmount = Math.round(amount * (feeRate / 100) * 100) / 100;
  const totalCost = Math.round((direct + project + processingFeeAmount) * 100) / 100;
  const estimatedProfit = Math.round((amount - totalCost) * 100) / 100;
  const profitMarginPercent = amount > 0 ? Math.round((estimatedProfit / amount) * 10000) / 100 : 0;

  return {
    invoiceAmount: amount,
    processingFeeAmount,
    totalCost,
    estimatedProfit,
    profitMarginPercent,
    disclaimer:
      "Helps independent operators evaluate invoice pricing viability before billing clients.",
  };
}

export interface PublicTaxReserveInput {
  estimatedTaxableAmount: number;
  planningRatePercent: number;
}

export interface PublicTaxReserveResult {
  estimatedTaxableAmount: number;
  planningRatePercent: number;
  estimatedReserveAmount: number;
  effectiveTakeHome: number;
  disclaimer: string;
}

export function calculatePublicTaxReserve(input: PublicTaxReserveInput): PublicTaxReserveResult {
  const taxable = Math.max(0, Number(input.estimatedTaxableAmount) || 0);
  const rate = Math.max(0, Math.min(100, Number(input.planningRatePercent) || 0));

  const estimatedReserveAmount = Math.round(taxable * (rate / 100) * 100) / 100;
  const effectiveTakeHome = Math.round((taxable - estimatedReserveAmount) * 100) / 100;

  return {
    estimatedTaxableAmount: taxable,
    planningRatePercent: rate,
    estimatedReserveAmount,
    effectiveTakeHome,
    disclaimer:
      "Planning estimate based on the rate you enter. This is not a tax liability calculation.",
  };
}

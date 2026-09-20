/**
 * SoloOS Phase 10: Cash Forecasting & Scenario Engine
 *
 * Authoritative, deterministic cash projection engine supporting 30, 60, and 90 day horizons.
 * Strictly separates:
 *   - ACTUAL: Verified liquid cash already in accounts
 *   - EXPECTED: Inflows from client invoices
 *   - PLANNED: Outflows from scheduled obligations and recurring expenses
 *   - PROJECTED: Mathematical result of Actual + Expected - Planned
 *
 * Strictly maintains currency isolation — zero FX conversion.
 */

import { classifyCollectionReliability, type CollectionReliability } from "./cashflow";

export type ForecastHorizon = 30 | 60 | 90;
export type ForecastScenario = "base" | "conservative" | "optimistic";

export interface ForecastInvoiceInput {
  id: string;
  invoiceNumber: string;
  clientName?: string | null | undefined;
  currency: string;
  amountDue: number;
  dueDate: string; // YYYY-MM-DD
  status: string;
}

export interface ForecastObligationInput {
  id: string;
  name: string;
  currency: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: string;
}

export interface ForecastRecurringExpenseInput {
  id: string;
  name: string;
  currency: string;
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  nextOccurrence?: string | null | undefined;
  endDate?: string | null | undefined;
}

export interface ForecastEngineInput {
  currency: string;
  startingLiquidCash: number;
  invoices: ForecastInvoiceInput[];
  obligations: ForecastObligationInput[];
  recurringExpenses?: ForecastRecurringExpenseInput[] | undefined;
  horizonDays: ForecastHorizon;
  scenario?: ForecastScenario | undefined;
  asOfDate?: string | undefined;
}

export interface DailyProjectionPoint {
  date: string;
  actualCash: number | null; // only present for today (day 0)
  expectedInflows: number;
  plannedOutflows: number;
  netDayChange: number;
  projectedCash: number;
}

export interface ForecastScenarioAssumptions {
  scenario: ForecastScenario;
  title: string;
  collectionAssumptions: string;
  outflowAssumptions: string;
  invoicesIncludedCount: number;
  invoicesExcludedCount: number;
  totalInflowsExpected: number;
  totalOutflowsPlanned: number;
}

export interface ForecastResult {
  currency: string;
  horizonDays: ForecastHorizon;
  scenario: ForecastScenario;
  startingLiquidCash: number;
  endingProjectedCash: number;
  totalExpectedInflows: number;
  totalPlannedOutflows: number;
  netProjectedChange: number;
  timeline: DailyProjectionPoint[];
  assumptions: ForecastScenarioAssumptions;
  explanation: string;
}

/**
 * Generates projected recurring dates between asOfDate and horizonEnd
 */
export function expandRecurringOccurrences(
  rec: ForecastRecurringExpenseInput,
  asOfDate: string,
  endDate: string,
): { date: string; amount: number }[] {
  if (!rec.nextOccurrence) return [];

  const results: { date: string; amount: number }[] = [];
  const cur = new Date(rec.nextOccurrence);
  const end = new Date(endDate);
  const cutoff = rec.endDate ? new Date(rec.endDate) : null;

  while (cur <= end) {
    if (cutoff && cur > cutoff) break;
    const dateStr = cur.toISOString().slice(0, 10);
    if (dateStr >= asOfDate) {
      results.push({ date: dateStr, amount: rec.amount });
    }

    // Step frequency
    switch (rec.frequency) {
      case "weekly":
        cur.setDate(cur.getDate() + 7);
        break;
      case "monthly":
        cur.setMonth(cur.getMonth() + 1);
        break;
      case "quarterly":
        cur.setMonth(cur.getMonth() + 3);
        break;
      case "yearly":
        cur.setFullYear(cur.getFullYear() + 1);
        break;
    }
  }

  return results;
}

/**
 * Evaluates whether an invoice is included in the given scenario
 */
export function isInvoiceIncludedInScenario(
  invoice: ForecastInvoiceInput,
  scenario: ForecastScenario,
  asOfDate: string,
): boolean {
  if (invoice.status === "cancelled" || invoice.status === "draft" || invoice.amountDue <= 0) {
    return false;
  }

  const reliability: CollectionReliability = classifyCollectionReliability(invoice, asOfDate);

  switch (scenario) {
    case "conservative":
      // Only high reliability (due today or in future)
      return reliability === "high";

    case "base":
      // High and medium reliability (future, or overdue <= 30 days)
      return reliability === "high" || reliability === "medium";

    case "optimistic":
      // All non-cancelled, non-draft invoices with positive amount due
      return true;
  }
}

/**
 * Pure, deterministic cash forecasting calculation.
 */
export function calculateCashForecast(input: ForecastEngineInput): ForecastResult {
  const scenario = input.scenario ?? "base";
  const asOf = input.asOfDate ?? new Date().toISOString().slice(0, 10);
  const asOfDateObj = new Date(asOf);

  const horizonEndObj = new Date(asOfDateObj);
  horizonEndObj.setDate(horizonEndObj.getDate() + input.horizonDays);
  const horizonEnd = horizonEndObj.toISOString().slice(0, 10);

  // 1. Filter and classify inflows (invoices)
  let includedInvoicesCount = 0;
  let excludedInvoicesCount = 0;
  const inflowByDate = new Map<string, number>();

  for (const inv of input.invoices) {
    if (inv.currency !== input.currency) continue;

    const included = isInvoiceIncludedInScenario(inv, scenario, asOf);
    if (included) {
      includedInvoicesCount++;
      // If invoice is overdue, project collection for tomorrow or asOfDate
      const targetDate = inv.dueDate < asOf ? asOf : inv.dueDate;
      if (targetDate <= horizonEnd) {
        const existing = inflowByDate.get(targetDate) ?? 0;
        inflowByDate.set(targetDate, existing + inv.amountDue);
      }
    } else {
      excludedInvoicesCount++;
    }
  }

  // 2. Filter and map outflows (obligations)
  const outflowByDate = new Map<string, number>();
  for (const obl of input.obligations) {
    if (obl.currency !== input.currency) continue;
    if (obl.status === "paid" || obl.status === "cancelled") continue;
    if (obl.dueDate >= asOf && obl.dueDate <= horizonEnd) {
      const existing = outflowByDate.get(obl.dueDate) ?? 0;
      outflowByDate.set(obl.dueDate, existing + obl.amount);
    }
  }

  // 3. Expand recurring expenses
  for (const rec of input.recurringExpenses ?? []) {
    if (rec.currency !== input.currency) continue;
    const occurrences = expandRecurringOccurrences(rec, asOf, horizonEnd);
    for (const occ of occurrences) {
      const existing = outflowByDate.get(occ.date) ?? 0;
      outflowByDate.set(occ.date, existing + occ.amount);
    }
  }

  // 4. Construct daily timeline
  const timeline: DailyProjectionPoint[] = [];
  let runningCash = input.startingLiquidCash;
  let totalExpectedInflows = 0;
  let totalPlannedOutflows = 0;

  const currentIter = new Date(asOfDateObj);
  while (currentIter <= horizonEndObj) {
    const dateStr = currentIter.toISOString().slice(0, 10);
    const dayInflows = inflowByDate.get(dateStr) ?? 0;
    const dayOutflows = outflowByDate.get(dateStr) ?? 0;
    const netDay = Math.round((dayInflows - dayOutflows) * 100) / 100;

    totalExpectedInflows += dayInflows;
    totalPlannedOutflows += dayOutflows;

    if (dateStr === asOf) {
      // Day 0: start with actual cash balance
      timeline.push({
        date: dateStr,
        actualCash: input.startingLiquidCash,
        expectedInflows: dayInflows,
        plannedOutflows: dayOutflows,
        netDayChange: netDay,
        projectedCash: Math.round((runningCash + netDay) * 100) / 100,
      });
      runningCash = Math.round((runningCash + netDay) * 100) / 100;
    } else {
      runningCash = Math.round((runningCash + netDay) * 100) / 100;
      timeline.push({
        date: dateStr,
        actualCash: null, // Future dates do not have actual cash!
        expectedInflows: dayInflows,
        plannedOutflows: dayOutflows,
        netDayChange: netDay,
        projectedCash: runningCash,
      });
    }

    currentIter.setDate(currentIter.getDate() + 1);
  }

  totalExpectedInflows = Math.round(totalExpectedInflows * 100) / 100;
  totalPlannedOutflows = Math.round(totalPlannedOutflows * 100) / 100;
  const netProjectedChange = Math.round((totalExpectedInflows - totalPlannedOutflows) * 100) / 100;
  const endingProjectedCash =
    Math.round((input.startingLiquidCash + netProjectedChange) * 100) / 100;

  // 5. Scenario assumptions metadata
  let scenarioTitle = "Base Projection";
  let collectionAssumptions =
    "Includes current invoices due in period plus invoices overdue by 30 days or less.";
  const outflowAssumptions =
    "Includes 100% of scheduled obligations and recurring expenses occurring in this period.";

  if (scenario === "conservative") {
    scenarioTitle = "Conservative Projection";
    collectionAssumptions =
      "Excludes all overdue invoices. Only counts current invoices with due dates on or after today.";
  } else if (scenario === "optimistic") {
    scenarioTitle = "Optimistic Projection";
    collectionAssumptions =
      "Includes all outstanding invoices maturing in period regardless of historical overdue age.";
  }

  const assumptions: ForecastScenarioAssumptions = {
    scenario,
    title: scenarioTitle,
    collectionAssumptions,
    outflowAssumptions,
    invoicesIncludedCount: includedInvoicesCount,
    invoicesExcludedCount: excludedInvoicesCount,
    totalInflowsExpected: totalExpectedInflows,
    totalOutflowsPlanned: totalPlannedOutflows,
  };

  // 6. Plain-English Explanation
  let explanation = "";
  if (netProjectedChange >= 0) {
    explanation = `Projected cash increases by ${input.currency} ${netProjectedChange.toLocaleString()} over the next ${input.horizonDays} days because expected collections (${input.currency} ${totalExpectedInflows.toLocaleString()} across ${includedInvoicesCount} invoices) exceed planned commitments (${input.currency} ${totalPlannedOutflows.toLocaleString()}).`;
  } else {
    explanation = `Projected cash declines by ${input.currency} ${Math.abs(netProjectedChange).toLocaleString()} over the next ${input.horizonDays} days because scheduled commitments (${input.currency} ${totalPlannedOutflows.toLocaleString()}) exceed expected collections (${input.currency} ${totalExpectedInflows.toLocaleString()}).`;
  }

  return {
    currency: input.currency,
    horizonDays: input.horizonDays,
    scenario,
    startingLiquidCash: input.startingLiquidCash,
    endingProjectedCash,
    totalExpectedInflows,
    totalPlannedOutflows,
    netProjectedChange,
    timeline,
    assumptions,
    explanation,
  };
}

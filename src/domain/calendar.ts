/**
 * SoloOS Phase 10: Financial Planning Calendar Model
 *
 * READ-ONLY PLANNING AGGREGATION LAYER.
 *
 * Aggregates real financial schedule events across the timeline:
 * - Invoice due dates (Expected Collections)
 * - Obligations due (Planned Outflows)
 * - Recurring expense occurrences (Planned Recurring Outflows)
 * - Tax planning checkpoints (Planning milestones)
 *
 * CRITICAL ARCHITECTURAL GUARANTEE:
 * Calendar events are read-only views of scheduled commitments.
 * Viewing or interacting with calendar events NEVER creates financial transactions.
 */

import { expandRecurringOccurrences, type ForecastRecurringExpenseInput } from "./forecasting";

export type CalendarEventType =
  "invoice_due" | "obligation" | "recurring_expense" | "tax_checkpoint";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  title: string;
  currency: string;
  amount: number;
  entityId: string;
  status: string;
  isExpectedInflow: boolean;
  isPlannedOutflow: boolean;
  isPlanningCheckpoint: boolean;
  relatedEntityName?: string | undefined;
  actionRoute?: string | undefined;
}

export interface BuildCalendarEventsInput {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    clientName?: string | null;
    currency: string;
    amountDue: number;
    dueDate: string;
    status: string;
  }>;
  obligations: Array<{
    id: string;
    name: string;
    currency: string;
    amount: number;
    dueDate: string;
    status: string;
    vendor?: string | null;
  }>;
  recurringExpenses?: ForecastRecurringExpenseInput[];
  taxReserveRate?: number;
  primaryCurrency?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Pure function: aggregates and categorizes real financial calendar events.
 */
export function buildCalendarEvents(input: BuildCalendarEventsInput): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // 1. Invoice Due Dates (Expected Inflows)
  for (const inv of input.invoices) {
    if (inv.status === "cancelled" || inv.status === "draft" || inv.amountDue <= 0) continue;
    if (inv.dueDate >= input.startDate && inv.dueDate <= input.endDate) {
      events.push({
        id: `inv-${inv.id}`,
        type: "invoice_due",
        date: inv.dueDate,
        title: `Invoice ${inv.invoiceNumber}${inv.clientName ? ` (${inv.clientName})` : ""}`,
        currency: inv.currency,
        amount: inv.amountDue,
        entityId: inv.id,
        status: inv.status,
        isExpectedInflow: true,
        isPlannedOutflow: false,
        isPlanningCheckpoint: false,
        relatedEntityName: inv.clientName ?? undefined,
        actionRoute: `/app/invoices/${inv.id}`,
      });
    }
  }

  // 2. Obligations (Planned Outflows)
  for (const obl of input.obligations) {
    if (obl.status === "paid" || obl.status === "cancelled") continue;
    if (obl.dueDate >= input.startDate && obl.dueDate <= input.endDate) {
      events.push({
        id: `obl-${obl.id}`,
        type: "obligation",
        date: obl.dueDate,
        title: `Obligation: ${obl.name}${obl.vendor ? ` (${obl.vendor})` : ""}`,
        currency: obl.currency,
        amount: obl.amount,
        entityId: obl.id,
        status: obl.status,
        isExpectedInflow: false,
        isPlannedOutflow: true,
        isPlanningCheckpoint: false,
        relatedEntityName: obl.vendor || undefined,
        actionRoute: `/app/obligations`,
      });
    }
  }

  // 3. Recurring Expense Occurrences
  for (const rec of input.recurringExpenses ?? []) {
    const occurrences = expandRecurringOccurrences(rec, input.startDate, input.endDate);
    for (const occ of occurrences) {
      events.push({
        id: `rec-${rec.id}-${occ.date}`,
        type: "recurring_expense",
        date: occ.date,
        title: `Recurring: ${rec.name}`,
        currency: rec.currency,
        amount: occ.amount,
        entityId: rec.id,
        status: "scheduled",
        isExpectedInflow: false,
        isPlannedOutflow: true,
        isPlanningCheckpoint: false,
        actionRoute: `/app/expenses`,
      });
    }
  }

  // 4. Tax Planning Checkpoints (quarterly dates within range)
  if (input.taxReserveRate && input.taxReserveRate > 0 && input.primaryCurrency) {
    const quarters = ["03-31", "06-30", "09-30", "12-31"];
    const startYear = parseInt(input.startDate.slice(0, 4), 10);
    const endYear = parseInt(input.endDate.slice(0, 4), 10);

    for (let yr = startYear; yr <= endYear; yr++) {
      for (const q of quarters) {
        const qDate = `${yr}-${q}`;
        if (qDate >= input.startDate && qDate <= input.endDate) {
          events.push({
            id: `tax-checkpoint-${qDate}`,
            type: "tax_checkpoint",
            date: qDate,
            title: `Tax Planning Checkpoint (Q${quarters.indexOf(q) + 1})`,
            currency: input.primaryCurrency,
            amount: 0,
            entityId: `tax-${qDate}`,
            status: "planning",
            isExpectedInflow: false,
            isPlannedOutflow: false,
            isPlanningCheckpoint: true,
            actionRoute: `/app/taxes`,
          });
        }
      }
    }
  }

  // Sort chronologically
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * SoloOS Phase 10: Invoice Follow-up Center Domain Model
 *
 * Operational receivables workflow identifying invoices requiring attention:
 * - Overdue invoices (due date < today)
 * - Invoices approaching due date (due in next 3 days)
 * - Long-outstanding overdue (> 14 days)
 * - High-value outstanding invoices
 */

export type FollowUpUrgency = "critical" | "warning" | "attention" | "normal";

export interface FollowUpCandidateInput {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail?: string | null;
  currency: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: string;
  lastReminderSentAt?: string | null;
}

export interface ActionableFollowUp {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  currency: string;
  total: number;
  amountDue: number;
  issueDate: string;
  dueDate: string;
  status: string;
  daysOverdue: number; // positive if overdue, negative if days until due
  urgency: FollowUpUrgency;
  urgencyLabel: string;
  category: "overdue" | "approaching_due" | "high_value" | "current";
  suggestedAction: "send_escalation" | "send_gentle_reminder" | "send_upcoming_reminder" | "view";
  suggestedActionLabel: string;
  lastReminderSentAt: string | null;
  isThrottled: boolean; // sent within last 24h
}

export function classifyFollowUpInvoices(
  invoices: FollowUpCandidateInput[],
  asOfDate: string = new Date().toISOString().slice(0, 10),
): ActionableFollowUp[] {
  const asOfMs = new Date(asOfDate).getTime();

  // Filter out cancelled, draft, or fully settled invoices
  const eligible = invoices.filter(
    (inv) =>
      inv.status !== "cancelled" &&
      inv.status !== "draft" &&
      inv.status !== "paid" &&
      inv.amountDue > 0,
  );

  // Compute average amount for high-value threshold
  const totalDueSum = eligible.reduce((acc, inv) => acc + inv.amountDue, 0);
  const avgAmountDue = eligible.length > 0 ? totalDueSum / eligible.length : 0;

  const results: ActionableFollowUp[] = [];

  for (const inv of eligible) {
    const dueMs = new Date(inv.dueDate).getTime();
    const daysDiff = Math.round((asOfMs - dueMs) / (24 * 60 * 60 * 1000));
    // daysDiff > 0 means overdue by daysDiff days
    // daysDiff <= 0 means due in Math.abs(daysDiff) days

    let urgency: FollowUpUrgency = "normal";
    let urgencyLabel = "Current";
    let category: "overdue" | "approaching_due" | "high_value" | "current" = "current";
    let suggestedAction: ActionableFollowUp["suggestedAction"] = "view";
    let suggestedActionLabel = "View Invoice";

    const isHighValue = inv.amountDue >= avgAmountDue * 1.5;

    if (daysDiff > 14) {
      urgency = "critical";
      urgencyLabel = `Overdue (${daysDiff}d)`;
      category = "overdue";
      suggestedAction = "send_escalation";
      suggestedActionLabel = "Prepare Escalation Notice";
    } else if (daysDiff > 0) {
      urgency = isHighValue ? "critical" : "warning";
      urgencyLabel = `Overdue (${daysDiff}d)`;
      category = "overdue";
      suggestedAction = "send_gentle_reminder";
      suggestedActionLabel = "Prepare Reminder";
    } else if (daysDiff >= -3) {
      urgency = "attention";
      const daysLeft = Math.abs(daysDiff);
      urgencyLabel = daysLeft === 0 ? "Due Today" : `Due in ${daysLeft}d`;
      category = "approaching_due";
      suggestedAction = "send_upcoming_reminder";
      suggestedActionLabel = "Prepare Advance Notice";
    } else if (isHighValue) {
      category = "high_value";
      urgency = "attention";
      urgencyLabel = "High Value";
      suggestedAction = "send_upcoming_reminder";
      suggestedActionLabel = "Prepare Advance Notice";
    }

    let isThrottled = false;
    if (inv.lastReminderSentAt) {
      const lastSentMs = new Date(inv.lastReminderSentAt).getTime();
      const hoursSinceLastSent = (asOfMs - lastSentMs) / (60 * 60 * 1000);
      if (hoursSinceLastSent < 24) {
        isThrottled = true;
      }
    }

    results.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientId: inv.clientId,
      clientName: inv.clientName,
      clientEmail: inv.clientEmail ?? null,
      currency: inv.currency,
      total: inv.total,
      amountDue: inv.amountDue,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      status: inv.status,
      daysOverdue: daysDiff,
      urgency,
      urgencyLabel,
      category,
      suggestedAction,
      suggestedActionLabel,
      lastReminderSentAt: inv.lastReminderSentAt ?? null,
      isThrottled,
    });
  }

  // Sort by highest urgency and greatest overdue days
  const urgencyWeight: Record<FollowUpUrgency, number> = {
    critical: 4,
    warning: 3,
    attention: 2,
    normal: 1,
  };

  return results.sort((a, b) => {
    const diff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
    if (diff !== 0) return diff;
    return b.daysOverdue - a.daysOverdue;
  });
}

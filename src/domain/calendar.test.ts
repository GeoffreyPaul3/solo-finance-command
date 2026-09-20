import { describe, expect, it } from "vitest";
import { buildCalendarEvents } from "./calendar";

describe("Financial Calendar Domain Logic", () => {
  it("aggregates invoices, obligations, recurring expenses, and tax checkpoints chronologically", () => {
    const events = buildCalendarEvents({
      invoices: [
        {
          id: "inv-1",
          invoiceNumber: "INV-100",
          clientName: "Acme Corp",
          currency: "MWK",
          amountDue: 250000,
          dueDate: "2026-09-23",
          status: "sent",
        },
      ],
      obligations: [
        {
          id: "obl-1",
          name: "Office Fiber",
          currency: "MWK",
          amount: 150000,
          dueDate: "2026-09-23",
          status: "upcoming",
        },
      ],
      recurringExpenses: [
        {
          id: "rec-1",
          name: "Cloud Hosting",
          currency: "MWK",
          amount: 80000,
          frequency: "monthly",
          nextOccurrence: "2026-09-23",
        },
      ],
      taxReserveRate: 15,
      primaryCurrency: "MWK",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });

    expect(events.length).toBe(4); // invoice + obligation + recurring + quarterly tax checkpoint on 09-30
    expect(events[0]?.type).toBe("invoice_due");
    expect(events[0]?.amount).toBe(250000);
    expect(events[0]?.isExpectedInflow).toBe(true);

    expect(events[1]?.type).toBe("obligation");
    expect(events[1]?.amount).toBe(150000);
    expect(events[1]?.isPlannedOutflow).toBe(true);

    expect(events[2]?.type).toBe("recurring_expense");
    expect(events[2]?.amount).toBe(80000);

    expect(events[3]?.type).toBe("tax_checkpoint");
    expect(events[3]?.date).toBe("2026-09-30");
    expect(events[3]?.isPlanningCheckpoint).toBe(true);
  });

  it("filters out cancelled invoices and paid obligations", () => {
    const events = buildCalendarEvents({
      invoices: [
        {
          id: "inv-cancelled",
          invoiceNumber: "INV-999",
          currency: "USD",
          amountDue: 500,
          dueDate: "2026-09-23",
          status: "cancelled",
        },
      ],
      obligations: [
        {
          id: "obl-paid",
          name: "Paid bill",
          currency: "USD",
          amount: 100,
          dueDate: "2026-09-23",
          status: "paid",
        },
      ],
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });

    expect(events.length).toBe(0);
  });
});

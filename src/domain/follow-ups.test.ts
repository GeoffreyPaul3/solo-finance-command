import { describe, expect, it } from "vitest";
import { classifyFollowUpInvoices } from "./follow-ups";

describe("Invoice Follow-up Center Logic", () => {
  const asOf = "2026-09-20";

  it("classifies invoices into urgency buckets accurately", () => {
    const invoices = [
      {
        id: "inv-crit",
        invoiceNumber: "INV-001",
        clientId: "c-1",
        clientName: "Acme",
        currency: "USD",
        total: 2000,
        amountPaid: 0,
        amountDue: 2000,
        issueDate: "2026-08-01",
        dueDate: "2026-08-30", // 21 days overdue
        status: "overdue",
      },
      {
        id: "inv-warn",
        invoiceNumber: "INV-002",
        clientId: "c-2",
        clientName: "Globex",
        currency: "USD",
        total: 1000,
        amountPaid: 0,
        amountDue: 1000,
        issueDate: "2026-09-01",
        dueDate: "2026-09-15", // 5 days overdue
        status: "overdue",
      },
      {
        id: "inv-approaching",
        invoiceNumber: "INV-003",
        clientId: "c-3",
        clientName: "Initech",
        currency: "USD",
        total: 1500,
        amountPaid: 0,
        amountDue: 1500,
        issueDate: "2026-09-10",
        dueDate: "2026-09-22", // due in 2 days
        status: "sent",
      },
    ];

    const followUps = classifyFollowUpInvoices(invoices, asOf);

    expect(followUps.length).toBe(3);
    expect(followUps[0]?.invoiceNumber).toBe("INV-001");
    expect(followUps[0]?.urgency).toBe("critical");
    expect(followUps[0]?.suggestedAction).toBe("send_escalation");

    expect(followUps[1]?.invoiceNumber).toBe("INV-002");
    expect(followUps[1]?.urgency).toBe("warning");

    expect(followUps[2]?.invoiceNumber).toBe("INV-003");
    expect(followUps[2]?.urgency).toBe("attention");
  });

  it("flags 24-hour throttling when reminder was recently sent", () => {
    const invoices = [
      {
        id: "inv-recent-send",
        invoiceNumber: "INV-100",
        clientId: "c-1",
        clientName: "Umbrella",
        currency: "USD",
        total: 500,
        amountPaid: 0,
        amountDue: 500,
        issueDate: "2026-09-01",
        dueDate: "2026-09-10",
        status: "overdue",
        lastReminderSentAt: "2026-09-19T20:00:00Z", // 4 hours ago relative to 2026-09-20T00:00:00
      },
    ];

    const followUps = classifyFollowUpInvoices(invoices, asOf);
    expect(followUps[0]?.isThrottled).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { calculateClientPaymentBehavior } from "./client-economics";

describe("Client Economics & Payment Behavior Logic", () => {
  it("calculates average days to payment accurately from multiple settlement records", () => {
    const behavior = calculateClientPaymentBehavior({
      paidInvoices: [
        {
          invoiceId: "inv-1",
          issueDate: "2026-08-01",
          payments: [{ paymentDate: "2026-08-11", amount: 1000 }], // 10 days
        },
        {
          invoiceId: "inv-2",
          issueDate: "2026-08-15",
          payments: [{ paymentDate: "2026-09-04", amount: 2000 }], // 20 days
        },
      ],
    });

    expect(behavior.hasSufficientHistory).toBe(true);
    expect(behavior.paidInvoicesCount).toBe(2);
    expect(behavior.avgDaysToPayment).toBe(15); // (10 + 20) / 2
    expect(behavior.fastestPaymentDays).toBe(10);
    expect(behavior.slowestPaymentDays).toBe(20);
    expect(behavior.explanation).toBe(
      "Average payment time: 15 days (based on 2 settled invoices).",
    );
  });

  it("handles invoices with multiple partial payments by using the final payment date", () => {
    const behavior = calculateClientPaymentBehavior({
      paidInvoices: [
        {
          invoiceId: "inv-multi",
          issueDate: "2026-08-01",
          payments: [
            { paymentDate: "2026-08-05", amount: 500 }, // 4 days
            { paymentDate: "2026-08-15", amount: 500 }, // 14 days (final settlement)
          ],
        },
      ],
    });

    expect(behavior.avgDaysToPayment).toBe(14);
    expect(behavior.paidInvoicesCount).toBe(1);
  });

  it("returns insufficient history cleanly when zero invoices have payment records", () => {
    const behavior = calculateClientPaymentBehavior({
      paidInvoices: [],
    });

    expect(behavior.hasSufficientHistory).toBe(false);
    expect(behavior.avgDaysToPayment).toBeNull();
    expect(behavior.explanation).toContain("Insufficient payment history");
  });
});

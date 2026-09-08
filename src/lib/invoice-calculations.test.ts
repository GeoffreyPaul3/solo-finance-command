import { describe, it, expect } from "vitest";
import {
  computeLineTotal,
  computeSubtotal,
  computeTotal,
  computeAmountDue,
  computeInvoiceStatus,
  validateLineItem,
  checkPaymentInvariant,
} from "./invoice-calculations";

describe("Invoice Calculations", () => {
  describe("computeLineTotal", () => {
    it("multiplies quantity and unit price exactly", () => {
      expect(computeLineTotal("2", "150.0000")).toBe("300.0000");
      expect(computeLineTotal("1.5", "100.0000")).toBe("150.0000");
      expect(computeLineTotal("0.25", "40.0000")).toBe("10.0000");
      expect(computeLineTotal("10", "0")).toBe("0.0000");
    });
  });

  describe("computeSubtotal", () => {
    it("sums line items correctly", () => {
      const items = [
        { quantity: "2", unit_price: "100.0000" },
        { quantity: "1.5", unit_price: "200.0000" },
        { quantity: "3", unit_price: "50.0000" },
      ];
      // 200 + 300 + 150 = 650
      expect(computeSubtotal(items)).toBe("650.0000");
    });

    it("returns 0.0000 for empty line items", () => {
      expect(computeSubtotal([])).toBe("0.0000");
    });
  });

  describe("computeTotal", () => {
    it("calculates subtotal - discount + tax", () => {
      expect(computeTotal("1000.0000", "100.0000", "150.0000")).toBe("1050.0000");
      expect(computeTotal("500.0000", "0.0000", "0.0000")).toBe("500.0000");
      expect(computeTotal("100.0000", "20.0000", "0.0000")).toBe("80.0000");
    });

    it("clamps to 0.0000 if discount exceeds subtotal + tax", () => {
      expect(computeTotal("100.0000", "200.0000", "0.0000")).toBe("0.0000");
    });
  });

  describe("computeAmountDue", () => {
    it("subtracts amount_paid from total", () => {
      expect(computeAmountDue("1000.0000", "400.0000")).toBe("600.0000");
      expect(computeAmountDue("1000.0000", "1000.0000")).toBe("0.0000");
    });

    it("clamps to 0.0000 if overpaid", () => {
      expect(computeAmountDue("1000.0000", "1200.0000")).toBe("0.0000");
    });
  });

  describe("checkPaymentInvariant", () => {
    it("returns true when amount_paid + amount_due == total", () => {
      expect(checkPaymentInvariant("1000.0000", "400.0000", "600.0000")).toBe(true);
      expect(checkPaymentInvariant("5000.0000", "5000.0000", "0.0000")).toBe(true);
      expect(checkPaymentInvariant("5000.0000", "0.0000", "5000.0000")).toBe(true);
    });

    it("returns false when invariant is violated", () => {
      expect(checkPaymentInvariant("1000.0000", "400.0000", "500.0000")).toBe(false);
    });
  });

  describe("computeInvoiceStatus", () => {
    const today = new Date("2026-09-08T12:00:00Z");

    it("preserves draft status", () => {
      expect(
        computeInvoiceStatus({
          currentStatus: "draft",
          amountPaid: "0.0000",
          total: "1000.0000",
          amountDue: "1000.0000",
          dueDateStr: "2026-09-01",
          today,
        }),
      ).toBe("draft");
    });

    it("preserves cancelled status", () => {
      expect(
        computeInvoiceStatus({
          currentStatus: "cancelled",
          amountPaid: "0.0000",
          total: "1000.0000",
          amountDue: "1000.0000",
          dueDateStr: "2026-09-01",
          today,
        }),
      ).toBe("cancelled");
    });

    it("returns paid when amount_paid equals or exceeds total", () => {
      expect(
        computeInvoiceStatus({
          currentStatus: "sent",
          amountPaid: "1000.0000",
          total: "1000.0000",
          amountDue: "0.0000",
          dueDateStr: "2026-09-01",
          today,
        }),
      ).toBe("paid");
    });

    it("returns partially_paid when amount_paid > 0 and amount_due > 0", () => {
      expect(
        computeInvoiceStatus({
          currentStatus: "sent",
          amountPaid: "400.0000",
          total: "1000.0000",
          amountDue: "600.0000",
          dueDateStr: "2026-09-01",
          today,
        }),
      ).toBe("partially_paid");
    });

    it("returns overdue when amount_paid is 0 and due_date < today", () => {
      expect(
        computeInvoiceStatus({
          currentStatus: "sent",
          amountPaid: "0.0000",
          total: "1000.0000",
          amountDue: "1000.0000",
          dueDateStr: "2026-09-01", // in the past relative to 2026-09-08
          today,
        }),
      ).toBe("overdue");
    });

    it("returns sent when amount_paid is 0 and due_date >= today", () => {
      expect(
        computeInvoiceStatus({
          currentStatus: "sent",
          amountPaid: "0.0000",
          total: "1000.0000",
          amountDue: "1000.0000",
          dueDateStr: "2026-09-15", // in the future
          today,
        }),
      ).toBe("sent");
    });
  });

  describe("validateLineItem", () => {
    it("returns null for a valid line item", () => {
      expect(
        validateLineItem({
          description: "Consulting services",
          quantity: "10.0000",
          unit_price: "150.0000",
        }),
      ).toBeNull();
    });

    it("rejects empty description", () => {
      expect(
        validateLineItem({
          description: "   ",
          quantity: "1",
          unit_price: "100.0000",
        }),
      ).toBe("Description is required");
    });

    it("rejects non-positive quantity", () => {
      expect(
        validateLineItem({
          description: "Valid item",
          quantity: "0",
          unit_price: "100.0000",
        }),
      ).toBe("Quantity must be greater than 0");

      expect(
        validateLineItem({
          description: "Valid item",
          quantity: "-2",
          unit_price: "100.0000",
        }),
      ).toBe("Quantity must be greater than 0");
    });

    it("rejects negative unit price", () => {
      expect(
        validateLineItem({
          description: "Valid item",
          quantity: "1",
          unit_price: "-50.0000",
        }),
      ).toBe("Unit price cannot be negative");
    });
  });
});

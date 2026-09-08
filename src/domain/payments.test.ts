import { describe, expect, it } from "vitest";
import {
  recordPaymentSchema,
  reversePaymentSchema,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "./payments";

describe("Payment Domain Schemas", () => {
  const validInvoiceId = "11111111-1111-4111-8111-111111111111";
  const validAccountId = "22222222-2222-4222-8222-222222222222";
  const validPaymentId = "33333333-3333-4333-8333-333333333333";

  describe("recordPaymentSchema", () => {
    it("accepts valid payment input with all fields", () => {
      const parsed = recordPaymentSchema.parse({
        invoiceId: validInvoiceId,
        amount: 2500,
        paymentDate: "2026-09-08",
        paymentMethod: "bank_transfer",
        financialAccountId: validAccountId,
        reference: "NBM-TX-98432",
        notes: "Received via online banking",
      });

      expect(parsed.invoiceId).toBe(validInvoiceId);
      expect(parsed.amount).toBe(2500);
      expect(parsed.paymentMethod).toBe("bank_transfer");
      expect(parsed.financialAccountId).toBe(validAccountId);
      expect(parsed.reference).toBe("NBM-TX-98432");
      expect(parsed.notes).toBe("Received via online banking");
    });

    it("rejects non-positive payment amount", () => {
      expect(() =>
        recordPaymentSchema.parse({
          invoiceId: validInvoiceId,
          amount: 0,
          paymentDate: "2026-09-08",
          financialAccountId: validAccountId,
        }),
      ).toThrow(/Payment amount must be greater than 0/);

      expect(() =>
        recordPaymentSchema.parse({
          invoiceId: validInvoiceId,
          amount: -500,
          paymentDate: "2026-09-08",
          financialAccountId: validAccountId,
        }),
      ).toThrow(/Payment amount must be greater than 0/);
    });

    it("rejects invalid UUIDs", () => {
      expect(() =>
        recordPaymentSchema.parse({
          invoiceId: "invalid-uuid",
          amount: 100,
          paymentDate: "2026-09-08",
          financialAccountId: validAccountId,
        }),
      ).toThrow(/Invalid invoice ID/);

      expect(() =>
        recordPaymentSchema.parse({
          invoiceId: validInvoiceId,
          amount: 100,
          paymentDate: "2026-09-08",
          financialAccountId: "not-a-uuid",
        }),
      ).toThrow(/Please select a deposit account/);
    });

    it("defaults payment method to bank_transfer", () => {
      const parsed = recordPaymentSchema.parse({
        invoiceId: validInvoiceId,
        amount: 100,
        paymentDate: "2026-09-08",
        financialAccountId: validAccountId,
      });

      expect(parsed.paymentMethod).toBe("bank_transfer");
    });
  });

  describe("reversePaymentSchema", () => {
    it("accepts valid reversal input", () => {
      const parsed = reversePaymentSchema.parse({
        paymentId: validPaymentId,
        reversalReason: "Client paid incorrect account, reversing and reissuing",
      });

      expect(parsed.paymentId).toBe(validPaymentId);
      expect(parsed.reversalReason).toBe("Client paid incorrect account, reversing and reissuing");
    });

    it("rejects reversal reason shorter than 3 characters", () => {
      expect(() =>
        reversePaymentSchema.parse({
          paymentId: validPaymentId,
          reversalReason: "no",
        }),
      ).toThrow(/at least 3 characters/);
    });
  });

  describe("Constants", () => {
    it("has labels for every payment method", () => {
      for (const method of PAYMENT_METHODS) {
        expect(PAYMENT_METHOD_LABELS[method]).toBeDefined();
      }
    });

    it("has labels for posted and reversed statuses", () => {
      expect(PAYMENT_STATUS_LABELS.posted).toBe("Posted");
      expect(PAYMENT_STATUS_LABELS.reversed).toBe("Reversed");
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  recordExpenseWithMetaSchema,
  reverseExpenseSchema,
  EXPENSE_STATUS_LABELS,
} from "./expenses";

describe("Expense Domain Schemas", () => {
  const validAccountId = "11111111-1111-4111-8111-111111111111";
  const validCategoryId = "22222222-2222-4222-8222-222222222222";
  const validClientId = "33333333-3333-4333-8333-333333333333";
  const validProjectId = "44444444-4444-4444-8444-444444444444";
  const validExpenseId = "55555555-5555-4555-8555-555555555555";

  describe("recordExpenseWithMetaSchema", () => {
    it("accepts valid expense input with all fields", () => {
      const parsed = recordExpenseWithMetaSchema.parse({
        accountId: validAccountId,
        amount: 450.5,
        transactionDate: "2026-09-08",
        description: "Cloud infrastructure hosting",
        categoryId: validCategoryId,
        vendor: "Amazon Web Services",
        clientId: validClientId,
        projectId: validProjectId,
        notes: "Monthly production cluster bill",
        reference: "AWS-INV-9921",
        idempotencyKey: "aws-sep-2026",
      });

      expect(parsed.accountId).toBe(validAccountId);
      expect(parsed.amount).toBe(450.5);
      expect(parsed.transactionDate).toBe("2026-09-08");
      expect(parsed.description).toBe("Cloud infrastructure hosting");
      expect(parsed.vendor).toBe("Amazon Web Services");
      expect(parsed.clientId).toBe(validClientId);
      expect(parsed.projectId).toBe(validProjectId);
      expect(parsed.notes).toBe("Monthly production cluster bill");
      expect(parsed.reference).toBe("AWS-INV-9921");
      expect(parsed.idempotencyKey).toBe("aws-sep-2026");
    });

    it("accepts minimal valid expense input", () => {
      const parsed = recordExpenseWithMetaSchema.parse({
        accountId: validAccountId,
        amount: "120.00",
        transactionDate: "2026-09-08",
        description: "Domain renewal",
      });

      expect(parsed.accountId).toBe(validAccountId);
      expect(parsed.amount).toBe(120);
      expect(parsed.description).toBe("Domain renewal");
      expect(parsed.vendor).toBeUndefined();
    });

    it("rejects non-positive expense amounts", () => {
      expect(() =>
        recordExpenseWithMetaSchema.parse({
          accountId: validAccountId,
          amount: 0,
          transactionDate: "2026-09-08",
          description: "Office supplies",
        }),
      ).toThrow(/strictly greater than 0/);

      expect(() =>
        recordExpenseWithMetaSchema.parse({
          accountId: validAccountId,
          amount: -50,
          transactionDate: "2026-09-08",
          description: "Office supplies",
        }),
      ).toThrow(/strictly greater than 0/);
    });

    it("rejects empty description", () => {
      expect(() =>
        recordExpenseWithMetaSchema.parse({
          accountId: validAccountId,
          amount: 50,
          transactionDate: "2026-09-08",
          description: "   ",
        }),
      ).toThrow(/Description is required/);
    });

    it("rejects invalid account UUID", () => {
      expect(() =>
        recordExpenseWithMetaSchema.parse({
          accountId: "invalid-account-uuid",
          amount: 50,
          transactionDate: "2026-09-08",
          description: "Coffee",
        }),
      ).toThrow(/valid account/);
    });

    it("rejects vendor exceeding 200 chars", () => {
      expect(() =>
        recordExpenseWithMetaSchema.parse({
          accountId: validAccountId,
          amount: 50,
          transactionDate: "2026-09-08",
          description: "Software",
          vendor: "A".repeat(201),
        }),
      ).toThrow(/cannot exceed 200 characters/);
    });

    it("rejects notes exceeding 2000 chars", () => {
      expect(() =>
        recordExpenseWithMetaSchema.parse({
          accountId: validAccountId,
          amount: 50,
          transactionDate: "2026-09-08",
          description: "Software",
          notes: "N".repeat(2001),
        }),
      ).toThrow(/cannot exceed 2000 characters/);
    });
  });

  describe("reverseExpenseSchema", () => {
    it("accepts valid reversal input", () => {
      const parsed = reverseExpenseSchema.parse({
        expenseId: validExpenseId,
        reversalReason: "Duplicate expense entered by mistake",
      });

      expect(parsed.expenseId).toBe(validExpenseId);
      expect(parsed.reversalReason).toBe("Duplicate expense entered by mistake");
    });

    it("rejects short reversal reason", () => {
      expect(() =>
        reverseExpenseSchema.parse({
          expenseId: validExpenseId,
          reversalReason: "no",
        }),
      ).toThrow(/at least 3 characters/);
    });

    it("rejects invalid expense UUID", () => {
      expect(() =>
        reverseExpenseSchema.parse({
          expenseId: "not-a-uuid",
          reversalReason: "Valid reason",
        }),
      ).toThrow(/Invalid expense ID/);
    });
  });

  describe("Constants", () => {
    it("has labels for posted and reversed statuses", () => {
      expect(EXPENSE_STATUS_LABELS.posted).toBe("Posted");
      expect(EXPENSE_STATUS_LABELS.reversed).toBe("Reversed");
    });
  });
});

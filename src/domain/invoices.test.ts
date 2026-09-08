import { describe, expect, it } from "vitest";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  lineItemSchema,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
} from "./invoices";

describe("Invoice Domain Schemas", () => {
  const validClientId = "11111111-1111-4111-8111-111111111111";
  const validProjectId = "22222222-2222-4222-8222-222222222222";

  describe("lineItemSchema", () => {
    it("accepts valid line item", () => {
      const parsed = lineItemSchema.parse({
        description: "Website Design",
        quantity: 1,
        unit_price: 1500,
      });
      expect(parsed.description).toBe("Website Design");
      expect(parsed.quantity).toBe(1);
      expect(parsed.unit_price).toBe(1500);
    });

    it("rejects empty or whitespace description", () => {
      expect(() =>
        lineItemSchema.parse({
          description: "  ",
          quantity: 1,
          unit_price: 100,
        }),
      ).toThrow(/Description is required/);
    });

    it("rejects non-positive quantity", () => {
      expect(() =>
        lineItemSchema.parse({
          description: "Item",
          quantity: 0,
          unit_price: 100,
        }),
      ).toThrow(/Quantity must be greater than 0/);

      expect(() =>
        lineItemSchema.parse({
          description: "Item",
          quantity: -1,
          unit_price: 100,
        }),
      ).toThrow(/Quantity must be greater than 0/);
    });

    it("rejects negative unit price", () => {
      expect(() =>
        lineItemSchema.parse({
          description: "Item",
          quantity: 1,
          unit_price: -10,
        }),
      ).toThrow(/Unit price cannot be negative/);
    });
  });

  describe("createInvoiceSchema", () => {
    it("accepts valid invoice input", () => {
      const parsed = createInvoiceSchema.parse({
        clientId: validClientId,
        projectId: validProjectId,
        currency: "mwk",
        issueDate: "2026-09-08",
        dueDate: "2026-09-22",
        discountAmount: 100,
        taxAmount: 165,
        notes: "Thank you for your business",
        paymentInstructions: "Transfer to National Bank",
        lineItems: [
          {
            description: "Frontend Implementation",
            quantity: 2,
            unit_price: 500,
          },
        ],
      });

      expect(parsed.clientId).toBe(validClientId);
      expect(parsed.projectId).toBe(validProjectId);
      expect(parsed.currency).toBe("MWK");
      expect(parsed.lineItems).toHaveLength(1);
      expect(parsed.discountAmount).toBe(100);
      expect(parsed.taxAmount).toBe(165);
    });

    it("rejects due date earlier than issue date", () => {
      expect(() =>
        createInvoiceSchema.parse({
          clientId: validClientId,
          issueDate: "2026-09-20",
          dueDate: "2026-09-10",
          lineItems: [
            {
              description: "Work",
              quantity: 1,
              unit_price: 100,
            },
          ],
        }),
      ).toThrow(/Due date cannot be before issue date/);
    });

    it("rejects empty line items array", () => {
      expect(() =>
        createInvoiceSchema.parse({
          clientId: validClientId,
          issueDate: "2026-09-08",
          dueDate: "2026-09-20",
          lineItems: [],
        }),
      ).toThrow(/At least one line item is required/);
    });

    it("rejects negative discount or tax", () => {
      expect(() =>
        createInvoiceSchema.parse({
          clientId: validClientId,
          issueDate: "2026-09-08",
          dueDate: "2026-09-20",
          discountAmount: -50,
          lineItems: [{ description: "Work", quantity: 1, unit_price: 100 }],
        }),
      ).toThrow(/Discount cannot be negative/);

      expect(() =>
        createInvoiceSchema.parse({
          clientId: validClientId,
          issueDate: "2026-09-08",
          dueDate: "2026-09-20",
          taxAmount: -10,
          lineItems: [{ description: "Work", quantity: 1, unit_price: 100 }],
        }),
      ).toThrow(/Tax cannot be negative/);
    });
  });

  describe("updateInvoiceSchema", () => {
    it("accepts partial updates", () => {
      const parsed = updateInvoiceSchema.parse({
        notes: "Updated payment details",
        discountAmount: 50,
      });
      expect(parsed.notes).toBe("Updated payment details");
      expect(parsed.discountAmount).toBe(50);
    });

    it("validates due date against issue date if both provided", () => {
      expect(() =>
        updateInvoiceSchema.parse({
          issueDate: "2026-09-25",
          dueDate: "2026-09-20",
        }),
      ).toThrow(/Due date cannot be before issue date/);
    });
  });

  describe("Constants", () => {
    it("has labels for every invoice status", () => {
      for (const status of INVOICE_STATUSES) {
        expect(INVOICE_STATUS_LABELS[status]).toBeDefined();
      }
    });
  });
});

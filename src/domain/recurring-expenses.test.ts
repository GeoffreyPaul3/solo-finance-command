import { describe, expect, it } from "vitest";

import {
  calculateAnnualizedCost,
  calculateMonthlyEquivalent,
  calculateNextOccurrenceDate,
  createRecurringExpenseSchema,
} from "./recurring-expenses";

describe("Recurring Expenses Domain Logic", () => {
  describe("calculateNextOccurrenceDate", () => {
    it("advances weekly by exactly 7 days", () => {
      expect(calculateNextOccurrenceDate("weekly", "2026-09-01")).toBe("2026-09-08");
      expect(calculateNextOccurrenceDate("weekly", "2026-09-25")).toBe("2026-10-02");
    });

    it("advances monthly by 1 calendar month", () => {
      expect(calculateNextOccurrenceDate("monthly", "2026-01-15")).toBe("2026-02-15");
      expect(calculateNextOccurrenceDate("monthly", "2026-12-15")).toBe("2027-01-15");
    });

    it("clamps monthly dates on shorter months", () => {
      // 2026 is not a leap year, Feb has 28 days
      expect(calculateNextOccurrenceDate("monthly", "2026-01-31")).toBe("2026-02-28");
      expect(calculateNextOccurrenceDate("monthly", "2026-03-31")).toBe("2026-04-30");
    });

    it("advances quarterly by 3 calendar months", () => {
      expect(calculateNextOccurrenceDate("quarterly", "2026-01-15")).toBe("2026-04-15");
      expect(calculateNextOccurrenceDate("quarterly", "2026-11-15")).toBe("2027-02-15");
    });

    it("advances yearly by 1 calendar year", () => {
      expect(calculateNextOccurrenceDate("yearly", "2026-05-20")).toBe("2027-05-20");
    });
  });

  describe("calculateAnnualizedCost", () => {
    it("multiplies weekly by 52", () => {
      expect(calculateAnnualizedCost(100, "weekly")).toBe(5200);
    });

    it("multiplies monthly by 12", () => {
      expect(calculateAnnualizedCost(100, "monthly")).toBe(1200);
    });

    it("multiplies quarterly by 4", () => {
      expect(calculateAnnualizedCost(100, "quarterly")).toBe(400);
    });

    it("keeps yearly as is", () => {
      expect(calculateAnnualizedCost(100, "yearly")).toBe(100);
    });
  });

  describe("calculateMonthlyEquivalent", () => {
    it("converts weekly to monthly (amount * 52 / 12)", () => {
      expect(calculateMonthlyEquivalent(120, "weekly")).toBe(520);
    });

    it("returns monthly as is", () => {
      expect(calculateMonthlyEquivalent(350, "monthly")).toBe(350);
    });

    it("divides quarterly by 3", () => {
      expect(calculateMonthlyEquivalent(300, "quarterly")).toBe(100);
    });

    it("divides yearly by 12", () => {
      expect(calculateMonthlyEquivalent(1200, "yearly")).toBe(100);
    });
  });

  describe("createRecurringExpenseSchema", () => {
    it("validates valid input", () => {
      const valid = {
        title: "Google Workspace",
        amount: "14.40",
        currency: "eur",
        frequency: "monthly",
        startDate: "2026-01-01",
        vendor: "Google",
      };
      const result = createRecurringExpenseSchema.parse(valid);
      expect(result.amount).toBe(14.4);
      expect(result.currency).toBe("EUR");
      expect(result.frequency).toBe("monthly");
    });

    it("rejects non-positive amount", () => {
      expect(() =>
        createRecurringExpenseSchema.parse({
          title: "Invalid",
          amount: 0,
          currency: "USD",
          frequency: "monthly",
          startDate: "2026-01-01",
        }),
      ).toThrow();
    });
  });
});

import { describe, expect, it } from "vitest";

import { calculateSafeToSpend, classifyCollectionReliability } from "./cashflow";

describe("Cashflow & Safe-to-Spend Domain Logic", () => {
  describe("calculateSafeToSpend", () => {
    it("applies operating buffer only to the primary currency", () => {
      // Primary currency (e.g. USD)
      const primaryResult = calculateSafeToSpend({
        liquidCash: 10000,
        trackedTaxReserve: 2000,
        upcomingObligations: 1500,
        operatingBuffer: 3000,
        reliableExpectedCollections: 1200,
        isPrimaryCurrency: true,
      });

      expect(primaryResult.effectiveOperatingBuffer).toBe(3000);
      // 10000 - 2000 - 1500 - 3000 = 3500
      expect(primaryResult.currentSafeToSpend).toBe(3500);
      // 3500 + 1200 = 4700
      expect(primaryResult.projectedSafeToSpend).toBe(4700);

      // Secondary currency (e.g. EUR)
      const secondaryResult = calculateSafeToSpend({
        liquidCash: 5000,
        trackedTaxReserve: 1000,
        upcomingObligations: 800,
        operatingBuffer: 3000, // Workspace setting is present, but should NOT apply to secondary
        reliableExpectedCollections: 500,
        isPrimaryCurrency: false,
      });

      expect(secondaryResult.effectiveOperatingBuffer).toBe(0);
      // 5000 - 1000 - 800 - 0 = 3200
      expect(secondaryResult.currentSafeToSpend).toBe(3200);
      // 3200 + 500 = 3700
      expect(secondaryResult.projectedSafeToSpend).toBe(3700);
    });

    it("handles negative safe-to-spend when obligations and reserve exceed liquid cash", () => {
      const result = calculateSafeToSpend({
        liquidCash: 2000,
        trackedTaxReserve: 1500,
        upcomingObligations: 2000,
        operatingBuffer: 1000,
        reliableExpectedCollections: 500,
        isPrimaryCurrency: true,
      });

      // 2000 - 1500 - 2000 - 1000 = -2500
      expect(result.currentSafeToSpend).toBe(-2500);
      // -2500 + 500 = -2000
      expect(result.projectedSafeToSpend).toBe(-2000);
    });

    it("uses tracked actual reserve, not hypothetical targets", () => {
      // User only set aside 500 into tracked reserve even if target would have been 2000
      const result = calculateSafeToSpend({
        liquidCash: 5000,
        trackedTaxReserve: 500,
        upcomingObligations: 1000,
        operatingBuffer: 1000,
        reliableExpectedCollections: 0,
        isPrimaryCurrency: true,
      });

      // 5000 - 500 - 1000 - 1000 = 2500
      expect(result.currentSafeToSpend).toBe(2500);
    });
  });

  describe("classifyCollectionReliability", () => {
    const asOf = "2026-09-15";

    it("classifies future or today due invoices as high reliability", () => {
      expect(
        classifyCollectionReliability(
          { status: "sent", dueDate: "2026-09-15", amountDue: 1000 },
          asOf,
        ),
      ).toBe("high");

      expect(
        classifyCollectionReliability(
          { status: "partially_paid", dueDate: "2026-09-30", amountDue: 500 },
          asOf,
        ),
      ).toBe("high");
    });

    it("classifies overdue <= 30 days as medium reliability", () => {
      // Due 10 days ago (2026-09-05)
      expect(
        classifyCollectionReliability(
          { status: "sent", dueDate: "2026-09-05", amountDue: 800 },
          asOf,
        ),
      ).toBe("medium");

      // Due 30 days ago (2026-08-16)
      expect(
        classifyCollectionReliability(
          { status: "sent", dueDate: "2026-08-16", amountDue: 1200 },
          asOf,
        ),
      ).toBe("medium");
    });

    it("classifies severely overdue (> 30 days) as low reliability", () => {
      // Due 45 days ago (2026-08-01)
      expect(
        classifyCollectionReliability(
          { status: "overdue", dueDate: "2026-08-01", amountDue: 2000 },
          asOf,
        ),
      ).toBe("low");
    });

    it("classifies draft, cancelled, or 0 amount invoices as low reliability", () => {
      expect(
        classifyCollectionReliability(
          { status: "draft", dueDate: "2026-09-30", amountDue: 1000 },
          asOf,
        ),
      ).toBe("low");

      expect(
        classifyCollectionReliability(
          { status: "cancelled", dueDate: "2026-09-30", amountDue: 1000 },
          asOf,
        ),
      ).toBe("low");

      expect(
        classifyCollectionReliability(
          { status: "sent", dueDate: "2026-09-30", amountDue: 0 },
          asOf,
        ),
      ).toBe("low");
    });
  });
});

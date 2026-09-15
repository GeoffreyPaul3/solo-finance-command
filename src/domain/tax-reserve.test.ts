import { describe, expect, it } from "vitest";

import {
  computeTaxReserveTarget,
  computeTaxShortfall,
  evaluateTaxHealth,
  upsertTaxAdjustmentSchema,
} from "./tax-reserve";

describe("Tax Reserve Domain Logic", () => {
  describe("computeTaxReserveTarget", () => {
    it("computes reserve target as percentage of net income", () => {
      expect(computeTaxReserveTarget(10000, 25)).toBe(2500);
      expect(computeTaxReserveTarget(5500, 30)).toBe(1650);
      expect(computeTaxReserveTarget(1234.56, 20)).toBe(246.91);
    });

    it("returns 0 for zero or negative net income", () => {
      expect(computeTaxReserveTarget(0, 25)).toBe(0);
      expect(computeTaxReserveTarget(-1000, 25)).toBe(0);
    });

    it("returns 0 for zero or negative tax rate", () => {
      expect(computeTaxReserveTarget(10000, 0)).toBe(0);
      expect(computeTaxReserveTarget(10000, -5)).toBe(0);
    });
  });

  describe("computeTaxShortfall", () => {
    it("computes shortfall when tracked is less than target", () => {
      expect(computeTaxShortfall(2500, 1500)).toBe(1000);
      expect(computeTaxShortfall(3000, 0)).toBe(3000);
    });

    it("returns 0 when tracked meets or exceeds target", () => {
      expect(computeTaxShortfall(2500, 2500)).toBe(0);
      expect(computeTaxShortfall(2500, 3000)).toBe(0);
    });
  });

  describe("evaluateTaxHealth", () => {
    it("returns shortfall when tracked is less than target", () => {
      expect(evaluateTaxHealth(2500, 2000)).toBe("shortfall");
      expect(evaluateTaxHealth(1000, 999.98)).toBe("shortfall");
    });

    it("returns funded when tracked matches target within tolerance", () => {
      expect(evaluateTaxHealth(2500, 2500)).toBe("funded");
      expect(evaluateTaxHealth(2500, 2500.005)).toBe("funded");
    });

    it("returns overfunded when tracked exceeds target", () => {
      expect(evaluateTaxHealth(2500, 2600)).toBe("overfunded");
      expect(evaluateTaxHealth(1000, 1050)).toBe("overfunded");
    });
  });

  describe("upsertTaxAdjustmentSchema", () => {
    it("validates valid input", () => {
      const valid = {
        currency: "usd",
        amount: "1500.50",
        notes: "Moved to high yield tax savings account",
      };
      const result = upsertTaxAdjustmentSchema.parse(valid);
      expect(result.currency).toBe("USD");
      expect(result.amount).toBe(1500.5);
    });

    it("rejects negative amount", () => {
      expect(() =>
        upsertTaxAdjustmentSchema.parse({
          currency: "USD",
          amount: -100,
        }),
      ).toThrow();
    });

    it("rejects invalid currency code", () => {
      expect(() =>
        upsertTaxAdjustmentSchema.parse({
          currency: "INVALID",
          amount: 500,
        }),
      ).toThrow();
    });
  });
});

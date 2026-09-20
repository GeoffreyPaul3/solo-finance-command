import { describe, expect, it } from "vitest";
import { calculateSoloOSFinancialHealth } from "./financial-health";

describe("SoloOS Financial Health Domain Logic", () => {
  it("calculates a strong score when all metrics are positive", () => {
    const health = calculateSoloOSFinancialHealth({
      currency: "MWK",
      liquidCash: 10000000,
      safeToSpend: 5000000,
      totalReceivables: 3000000,
      overdueReceivables: 0,
      upcomingObligations: 2000000,
      operatingBuffer: 1000000,
      actualTaxReserve: 1500000,
      targetTaxReserve: 1500000,
      taxShortfall: 0,
      currentPeriodIncome: 6000000,
      currentPeriodExpenses: 2500000,
      hasActiveAccounts: true,
    });

    expect(health.rating).toBe("strong");
    expect(health.score).toBeGreaterThanOrEqual(80);
    expect(health.isInsufficientData).toBe(false);
    expect(health.reasons.some((r) => r.type === "positive")).toBe(true);
    expect(health.disclaimer).toContain(
      "SoloOS Financial Health is a deterministic planning metric",
    );
  });

  it("downgrades to needs_attention or vulnerable when obligations exceed cash and tax reserve has shortfall", () => {
    const health = calculateSoloOSFinancialHealth({
      currency: "USD",
      liquidCash: 1000,
      safeToSpend: -1500,
      totalReceivables: 4000,
      overdueReceivables: 3000, // 75% overdue
      upcomingObligations: 3000,
      operatingBuffer: 1000,
      actualTaxReserve: 0,
      targetTaxReserve: 1200,
      taxShortfall: 1200,
      currentPeriodIncome: 1000,
      currentPeriodExpenses: 2500,
      hasActiveAccounts: true,
    });

    expect(["needs_attention", "vulnerable"]).toContain(health.rating);
    expect(health.score).toBeLessThan(60);
    expect(
      health.reasons.some((r) => r.type === "warning" && r.text.includes("Overdue receivables")),
    ).toBe(true);
  });

  it("handles empty/insufficient data cleanly with null score", () => {
    const health = calculateSoloOSFinancialHealth({
      currency: "USD",
      liquidCash: 0,
      safeToSpend: 0,
      totalReceivables: 0,
      overdueReceivables: 0,
      upcomingObligations: 0,
      operatingBuffer: 0,
      actualTaxReserve: 0,
      targetTaxReserve: 0,
      taxShortfall: 0,
      currentPeriodIncome: 0,
      currentPeriodExpenses: 0,
      hasActiveAccounts: false,
    });

    expect(health.isInsufficientData).toBe(true);
    expect(health.score).toBeNull();
    expect(health.rating).toBe("insufficient_data");
  });
});

import { describe, expect, it } from "vitest";
import { computeFinancialPulse } from "./financial-pulse";

describe("Financial Pulse Domain Logic", () => {
  it("computes a healthy pulse state when cash exceeds obligations and tax reserve is funded", () => {
    const pulse = computeFinancialPulse({
      currency: "MWK",
      liquidCash: 5000000,
      safeToSpend: 3200000,
      outstandingReceivables: 1500000,
      upcomingObligations: 800000,
      actualTaxReserve: 1000000,
      targetTaxReserve: 1000000,
      taxShortfall: 0,
      currentPeriodIncome: 3000000,
      currentPeriodExpenses: 1200000,
      currentPeriodProfit: 1800000,
      isPrimaryCurrency: true,
    });

    expect(pulse.status).toBe("healthy");
    expect(pulse.statusLabel).toBe("Healthy");
    expect(pulse.cashCoverageRatio).toBe(6.25); // 5000000 / 800000
    expect(pulse.taxReserveFundedPercent).toBe(100);
    expect(pulse.safeToSpend).toBe(3200000);
    expect(pulse.currentPeriodProfit).toBe(1800000);
  });

  it("identifies critical status when Safe-to-Spend is negative", () => {
    const pulse = computeFinancialPulse({
      currency: "USD",
      liquidCash: 2000,
      safeToSpend: -1500,
      outstandingReceivables: 500,
      upcomingObligations: 2500,
      actualTaxReserve: 500,
      targetTaxReserve: 1000,
      taxShortfall: 500,
      currentPeriodIncome: 1000,
      currentPeriodExpenses: 1800,
      currentPeriodProfit: -800,
      isPrimaryCurrency: true,
    });

    expect(pulse.status).toBe("critical");
    expect(pulse.statusLabel).toBe("Action Required");
    expect(pulse.safeToSpend).toBe(-1500);
  });

  it("identifies attention status when there is a tax shortfall", () => {
    const pulse = computeFinancialPulse({
      currency: "USD",
      liquidCash: 10000,
      safeToSpend: 6000,
      outstandingReceivables: 2000,
      upcomingObligations: 1000,
      actualTaxReserve: 1000,
      targetTaxReserve: 2500,
      taxShortfall: 1500,
      currentPeriodIncome: 5000,
      currentPeriodExpenses: 2000,
      currentPeriodProfit: 3000,
      isPrimaryCurrency: true,
    });

    expect(pulse.status).toBe("attention");
    expect(pulse.statusLabel).toBe("Needs Attention");
    expect(pulse.taxShortfall).toBe(1500);
  });

  it("handles zero activity with an explicit incomplete state", () => {
    const pulse = computeFinancialPulse({
      currency: "EUR",
      liquidCash: 0,
      safeToSpend: 0,
      outstandingReceivables: 0,
      upcomingObligations: 0,
      actualTaxReserve: 0,
      targetTaxReserve: 0,
      taxShortfall: 0,
      currentPeriodIncome: 0,
      currentPeriodExpenses: 0,
      currentPeriodProfit: 0,
      isPrimaryCurrency: false,
    });

    expect(pulse.status).toBe("incomplete");
    expect(pulse.statusLabel).toBe("Insufficient Data");
    expect(pulse.cashCoverageRatio).toBeNull();
  });
});

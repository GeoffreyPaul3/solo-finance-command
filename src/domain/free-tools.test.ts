import { describe, expect, it } from "vitest";

import {
  calculatePublicCashRunway,
  calculatePublicInvoiceProfit,
  calculatePublicProfit,
  calculatePublicSafeToSpend,
  calculatePublicTaxReserve,
} from "./free-tools";

describe("free-tools domain calculations", () => {
  it("calculates Estimated Safe-to-Spend transparently with exact arithmetic", () => {
    const res = calculatePublicSafeToSpend({
      liquidCash: 5000000,
      taxReserve: 1000000,
      upcomingObligations: 500000,
      operatingBuffer: 1000000,
      expectedCollections: 800000,
    });

    // 5M - (1M + 0.5M + 1M) + 0.8M = 3.3M
    expect(res.totalDeductions).toBe(2500000);
    expect(res.netAvailableCash).toBe(2500000);
    expect(res.estimatedSafeToSpend).toBe(3300000);
    expect(res.disclaimer).toContain("planning estimate");
  });

  it("calculates Cash Runway and handles zero expenses", () => {
    const res = calculatePublicCashRunway({
      currentCash: 3000000,
      monthlyOperatingExpenses: 500000,
      upcomingObligations: 200000,
      expectedCollections: 200000,
    });

    // Net available: 3M - 0.2M + 0.2M = 3M. Runway = 3M / 0.5M = 6.0 months
    expect(res.netAvailableCash).toBe(3000000);
    expect(res.runwayMonths).toBe(6);
    expect(res.status).toBe("strong");

    const zeroRes = calculatePublicCashRunway({
      currentCash: 1000000,
      monthlyOperatingExpenses: 0,
      upcomingObligations: 0,
      expectedCollections: 0,
    });
    expect(zeroRes.isInfinite).toBe(true);
    expect(zeroRes.runwayMonths).toBe(Infinity);
  });

  it("calculates Profit and Gross/Net margins accurately", () => {
    const res = calculatePublicProfit({
      revenue: 10000000,
      directExpenses: 3000000,
      operatingExpenses: 2000000,
      taxPlanningReserve: 1000000,
    });

    expect(res.totalExpenses).toBe(5000000);
    expect(res.grossProfit).toBe(7000000);
    expect(res.grossMarginPercent).toBe(70);
    expect(res.netProfit).toBe(4000000);
    expect(res.netMarginPercent).toBe(40);
  });

  it("calculates Invoice Profit and fee deductions", () => {
    const res = calculatePublicInvoiceProfit({
      invoiceAmount: 2000000,
      directCosts: 500000,
      projectCosts: 300000,
      processingFeePercent: 3.5, // 3.5% of 2M = 70,000
    });

    expect(res.processingFeeAmount).toBe(70000);
    expect(res.totalCost).toBe(870000);
    expect(res.estimatedProfit).toBe(1130000);
    expect(res.profitMarginPercent).toBe(56.5);
  });

  it("calculates Tax Reserve planning with mandatory disclaimer", () => {
    const res = calculatePublicTaxReserve({
      estimatedTaxableAmount: 4000000,
      planningRatePercent: 25,
    });

    expect(res.estimatedReserveAmount).toBe(1000000);
    expect(res.effectiveTakeHome).toBe(3000000);
    expect(res.disclaimer).toBe(
      "Planning estimate based on the rate you enter. This is not a tax liability calculation.",
    );
  });
});

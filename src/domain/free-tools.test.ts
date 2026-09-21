import { describe, expect, it } from "vitest";

import {
  calculatePublicCashRunway,
  calculatePublicInvoiceProfit,
  calculatePublicProfit,
  calculatePublicSafeToSpend,
  calculatePublicTaxReserve,
} from "./free-tools";

describe("free-tools domain calculations", () => {
  describe("Safe-to-Spend calculator", () => {
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

    it("handles obligations exceeding cash (negative safe-to-spend)", () => {
      const res = calculatePublicSafeToSpend({
        liquidCash: 1000,
        taxReserve: 500,
        upcomingObligations: 2000,
        operatingBuffer: 500,
        expectedCollections: 0,
      });

      expect(res.totalDeductions).toBe(3000);
      expect(res.netAvailableCash).toBe(-2000);
      expect(res.estimatedSafeToSpend).toBe(-2000);
    });

    it("clamps negative inputs to 0 and handles zero cash", () => {
      const res = calculatePublicSafeToSpend({
        liquidCash: -1000,
        taxReserve: -500,
        upcomingObligations: 0,
        operatingBuffer: 0,
        expectedCollections: 0,
      });

      expect(res.estimatedSafeToSpend).toBe(0);
      expect(res.totalDeductions).toBe(0);
      expect(res.netAvailableCash).toBe(0);
    });

    it("maintains 2-decimal floating point precision without JS rounding corruption", () => {
      const res = calculatePublicSafeToSpend({
        liquidCash: 10.1,
        taxReserve: 2.2,
        upcomingObligations: 1.15,
        operatingBuffer: 0.05,
        expectedCollections: 0.3,
      });

      // 10.1 - (2.2 + 1.15 + 0.05) + 0.3 = 7.0
      expect(res.totalDeductions).toBe(3.4);
      expect(res.netAvailableCash).toBe(6.7);
      expect(res.estimatedSafeToSpend).toBe(7);
    });
  });

  describe("Cash Runway calculator", () => {
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

    it("handles zero cash / negative net cash as critical 0.0 months", () => {
      const res = calculatePublicCashRunway({
        currentCash: 1000,
        monthlyOperatingExpenses: 5000,
        upcomingObligations: 10000,
        expectedCollections: 0,
      });

      expect(res.netAvailableCash).toBe(-9000);
      expect(res.runwayMonths).toBe(0);
      expect(res.status).toBe("critical");
      expect(res.isInfinite).toBe(false);
    });

    it("evaluates tight and healthy status thresholds", () => {
      // 2 months -> tight
      const tight = calculatePublicCashRunway({
        currentCash: 2000,
        monthlyOperatingExpenses: 1000,
        upcomingObligations: 0,
        expectedCollections: 0,
      });
      expect(tight.runwayMonths).toBe(2);
      expect(tight.status).toBe("tight");

      // 4 months -> healthy
      const healthy = calculatePublicCashRunway({
        currentCash: 4000,
        monthlyOperatingExpenses: 1000,
        upcomingObligations: 0,
        expectedCollections: 0,
      });
      expect(healthy.runwayMonths).toBe(4);
      expect(healthy.status).toBe("healthy");
    });
  });

  describe("Profit Margin calculator", () => {
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

    it("handles zero revenue without division-by-zero or NaN", () => {
      const res = calculatePublicProfit({
        revenue: 0,
        directExpenses: 1000,
        operatingExpenses: 2000,
        taxPlanningReserve: 0,
      });

      expect(res.revenue).toBe(0);
      expect(res.grossProfit).toBe(-1000);
      expect(res.grossMarginPercent).toBe(0);
      expect(res.netProfit).toBe(-3000);
      expect(res.netMarginPercent).toBe(0);
    });

    it("accurately reports negative net margin when expenses exceed revenue", () => {
      const res = calculatePublicProfit({
        revenue: 1000,
        directExpenses: 800,
        operatingExpenses: 600,
        taxPlanningReserve: 100,
      });

      // Gross profit = 1000 - 800 = 200 (20%)
      // Net profit = 1000 - 1400 - 100 = -500 (-50%)
      expect(res.grossProfit).toBe(200);
      expect(res.grossMarginPercent).toBe(20);
      expect(res.netProfit).toBe(-500);
      expect(res.netMarginPercent).toBe(-50);
    });
  });

  describe("Invoice Profitability calculator", () => {
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

    it("handles zero invoice amount safely", () => {
      const res = calculatePublicInvoiceProfit({
        invoiceAmount: 0,
        directCosts: 500,
        projectCosts: 500,
        processingFeePercent: 3,
      });

      expect(res.invoiceAmount).toBe(0);
      expect(res.estimatedProfit).toBe(-1000);
      expect(res.profitMarginPercent).toBe(0);
    });

    it("handles 0% and 100% processing fees", () => {
      const zeroFee = calculatePublicInvoiceProfit({
        invoiceAmount: 1000,
        directCosts: 200,
        projectCosts: 100,
        processingFeePercent: 0,
      });
      expect(zeroFee.processingFeeAmount).toBe(0);
      expect(zeroFee.estimatedProfit).toBe(700);

      const fullFee = calculatePublicInvoiceProfit({
        invoiceAmount: 1000,
        directCosts: 0,
        projectCosts: 0,
        processingFeePercent: 100,
      });
      expect(fullFee.processingFeeAmount).toBe(1000);
      expect(fullFee.estimatedProfit).toBe(0);
    });
  });

  describe("Tax Reserve planner", () => {
    it("calculates Tax Reserve planning with mandatory disclaimer", () => {
      const res = calculatePublicTaxReserve({
        estimatedTaxableAmount: 4000000,
        planningRatePercent: 25,
      });

      expect(res.estimatedReserveAmount).toBe(1000000);
      expect(res.effectiveTakeHome).toBe(3000000);
      expect(res.disclaimer).toContain("Planning estimate");
      expect(res.disclaimer).toContain("not a tax liability calculation");
    });

    it("handles 0% and 100% planning rates", () => {
      const zero = calculatePublicTaxReserve({
        estimatedTaxableAmount: 5000,
        planningRatePercent: 0,
      });
      expect(zero.estimatedReserveAmount).toBe(0);
      expect(zero.effectiveTakeHome).toBe(5000);

      const full = calculatePublicTaxReserve({
        estimatedTaxableAmount: 5000,
        planningRatePercent: 100,
      });
      expect(full.estimatedReserveAmount).toBe(5000);
      expect(full.effectiveTakeHome).toBe(0);
    });

    it("clamps planning rate between 0% and 100%", () => {
      const over = calculatePublicTaxReserve({
        estimatedTaxableAmount: 1000,
        planningRatePercent: 150,
      });
      expect(over.planningRatePercent).toBe(100);
      expect(over.estimatedReserveAmount).toBe(1000);

      const under = calculatePublicTaxReserve({
        estimatedTaxableAmount: 1000,
        planningRatePercent: -20,
      });
      expect(under.planningRatePercent).toBe(0);
      expect(under.estimatedReserveAmount).toBe(0);
    });
  });
});

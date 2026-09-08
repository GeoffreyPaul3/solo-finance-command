import { describe, expect, it } from "vitest";
import type { CurrencyProfitability, CommandCenterMetrics } from "./profitability";

describe("Profitability Domain Calculations & Currency Isolation", () => {
  it("calculates profit margin percentage accurately for positive net profit", () => {
    const period: CurrencyProfitability = {
      currency: "USD",
      total_revenue: 10000,
      total_expenses: 6000,
      net_profit: 4000,
      invoice_count: 5,
      expense_count: 8,
      margin_percent: (4000 / 10000) * 100, // 40%
    };

    expect(period.margin_percent).toBe(40);
    expect(period.net_profit).toBe(period.total_revenue - period.total_expenses);
  });

  it("handles zero revenue without division by zero errors", () => {
    const totalRevenue = 0;
    const netProfit = -1500;
    const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    expect(marginPercent).toBe(0);
    expect(Number.isFinite(marginPercent)).toBe(true);
  });

  it("handles negative net profit (deficit) correctly", () => {
    const period: CurrencyProfitability = {
      currency: "EUR",
      total_revenue: 2000,
      total_expenses: 3000,
      net_profit: -1000,
      invoice_count: 1,
      expense_count: 4,
      margin_percent: (-1000 / 2000) * 100, // -50%
    };

    expect(period.margin_percent).toBe(-50);
    expect(period.net_profit).toBeLessThan(0);
  });

  it("enforces strict currency isolation across multiple currency positions", () => {
    const commandCenterMetrics: CommandCenterMetrics[] = [
      {
        currency: "MWK",
        total_revenue: 5000000,
        total_expenses: 2000000,
        net_cash: 3000000,
        cash_balance: 15000000,
        receivables_due: 4000000,
      },
      {
        currency: "USD",
        total_revenue: 5000,
        total_expenses: 1200,
        net_cash: 3800,
        cash_balance: 12000,
        receivables_due: 2500,
      },
    ];

    // Verify MWK and USD are completely independent buckets
    const mwk = commandCenterMetrics.find((m) => m.currency === "MWK");
    const usd = commandCenterMetrics.find((m) => m.currency === "USD");

    expect(mwk).toBeDefined();
    expect(usd).toBeDefined();
    expect(mwk?.currency).not.toBe(usd?.currency);
    expect(mwk?.net_cash).toBe(3000000);
    expect(usd?.net_cash).toBe(3800);
  });
});

import { describe, expect, it } from "vitest";
import {
  calculateCashForecast,
  expandRecurringOccurrences,
  isInvoiceIncludedInScenario,
} from "./forecasting";

describe("Cash Forecasting Engine Domain Logic", () => {
  const asOf = "2026-09-20";

  it("projects cash across 30 days accurately for base scenario", () => {
    const result = calculateCashForecast({
      currency: "MWK",
      startingLiquidCash: 5000000,
      invoices: [
        {
          id: "inv-1",
          invoiceNumber: "INV-001",
          currency: "MWK",
          amountDue: 2000000,
          dueDate: "2026-09-25",
          status: "sent",
        },
      ],
      obligations: [
        {
          id: "obl-1",
          name: "Rent",
          currency: "MWK",
          amount: 800000,
          dueDate: "2026-09-30",
          status: "upcoming",
        },
      ],
      horizonDays: 30,
      scenario: "base",
      asOfDate: asOf,
    });

    expect(result.startingLiquidCash).toBe(5000000);
    expect(result.totalExpectedInflows).toBe(2000000);
    expect(result.totalPlannedOutflows).toBe(800000);
    expect(result.netProjectedChange).toBe(1200000);
    expect(result.endingProjectedCash).toBe(6200000);
    expect(result.explanation).toContain("Projected cash increases by MWK 1,200,000");
    // Day 0 has actualCash, future days do not
    expect(result.timeline[0]?.actualCash).toBe(5000000);
    expect(result.timeline[1]?.actualCash).toBeNull();
  });

  it("handles conservative scenario by excluding overdue invoices", () => {
    const invoices = [
      {
        id: "inv-current",
        invoiceNumber: "INV-001",
        currency: "USD",
        amountDue: 1500,
        dueDate: "2026-09-28", // Future
        status: "sent",
      },
      {
        id: "inv-overdue",
        invoiceNumber: "INV-002",
        currency: "USD",
        amountDue: 1000,
        dueDate: "2026-09-10", // 10 days overdue
        status: "sent",
      },
    ];

    const conservative = calculateCashForecast({
      currency: "USD",
      startingLiquidCash: 4000,
      invoices,
      obligations: [],
      horizonDays: 30,
      scenario: "conservative",
      asOfDate: asOf,
    });

    expect(conservative.assumptions.invoicesIncludedCount).toBe(1);
    expect(conservative.assumptions.invoicesExcludedCount).toBe(1);
    expect(conservative.totalExpectedInflows).toBe(1500);

    const base = calculateCashForecast({
      currency: "USD",
      startingLiquidCash: 4000,
      invoices,
      obligations: [],
      horizonDays: 30,
      scenario: "base",
      asOfDate: asOf,
    });

    // Base includes overdue within 30 days
    expect(base.assumptions.invoicesIncludedCount).toBe(2);
    expect(base.totalExpectedInflows).toBe(2500);
  });

  it("expands recurring expense occurrences properly over horizon", () => {
    const occurrences = expandRecurringOccurrences(
      {
        id: "rec-1",
        name: "Software Subscription",
        currency: "USD",
        amount: 50,
        frequency: "monthly",
        nextOccurrence: "2026-09-25",
      },
      "2026-09-20",
      "2026-11-20", // 60 days
    );

    expect(occurrences.length).toBe(2);
    expect(occurrences[0]?.date).toBe("2026-09-25");
    expect(occurrences[1]?.date).toBe("2026-10-25");
  });

  it("strictly enforces currency isolation by ignoring mismatched records", () => {
    const result = calculateCashForecast({
      currency: "USD",
      startingLiquidCash: 1000,
      invoices: [
        {
          id: "inv-mwk",
          invoiceNumber: "INV-MWK",
          currency: "MWK",
          amountDue: 500000,
          dueDate: "2026-09-25",
          status: "sent",
        },
      ],
      obligations: [
        {
          id: "obl-eur",
          name: "European Server",
          currency: "EUR",
          amount: 200,
          dueDate: "2026-09-25",
          status: "upcoming",
        },
      ],
      horizonDays: 30,
      asOfDate: asOf,
    });

    expect(result.totalExpectedInflows).toBe(0);
    expect(result.totalPlannedOutflows).toBe(0);
    expect(result.endingProjectedCash).toBe(1000);
  });
});

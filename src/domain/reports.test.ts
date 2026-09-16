import { describe, expect, it } from "vitest";

import {
  calculateExpenseReportTotals,
  calculateIncomeReportTotals,
  calculateReceivablesAgingBuckets,
  calculateTaxPlanningTotals,
  generateCsvString,
  type ExpenseReportItem,
  type IncomeReportItem,
  type ReceivablesAgingItem,
  type TaxPlanningReportItem,
} from "./reports";

describe("Reports Domain Logic", () => {
  describe("calculateIncomeReportTotals", () => {
    it("aggregates billed, collected, outstanding and count", () => {
      const items: IncomeReportItem[] = [
        {
          clientId: "c1",
          clientName: "Acme Corp",
          projectId: "p1",
          projectName: "Website Redesign",
          currency: "USD",
          invoiceCount: 3,
          grossBilled: 5000,
          grossCollected: 3500,
          outstanding: 1500,
        },
        {
          clientId: "c2",
          clientName: "Beta Labs",
          projectId: "p2",
          projectName: "App Consulting",
          currency: "USD",
          invoiceCount: 2,
          grossBilled: 2500,
          grossCollected: 2500,
          outstanding: 0,
        },
      ];

      const totals = calculateIncomeReportTotals(items);
      expect(totals.totalBilled).toBe(7500);
      expect(totals.totalCollected).toBe(6000);
      expect(totals.totalOutstanding).toBe(1500);
      expect(totals.invoiceCount).toBe(5);
    });

    it("returns zeros for empty items", () => {
      const totals = calculateIncomeReportTotals([]);
      expect(totals.totalBilled).toBe(0);
      expect(totals.totalCollected).toBe(0);
      expect(totals.totalOutstanding).toBe(0);
      expect(totals.invoiceCount).toBe(0);
    });
  });

  describe("calculateExpenseReportTotals", () => {
    it("aggregates total amount, deductible amount and expense count", () => {
      const items: ExpenseReportItem[] = [
        {
          categoryId: "cat-1",
          categoryName: "Software",
          vendor: "GitHub",
          currency: "USD",
          expenseCount: 4,
          totalAmount: 400,
          taxDeductibleAmount: 400,
        },
        {
          categoryId: "cat-2",
          categoryName: "Travel",
          vendor: "Uber",
          currency: "USD",
          expenseCount: 2,
          totalAmount: 150,
          taxDeductibleAmount: 150,
        },
      ];

      const totals = calculateExpenseReportTotals(items);
      expect(totals.totalAmount).toBe(550);
      expect(totals.totalDeductible).toBe(550);
      expect(totals.expenseCount).toBe(6);
    });
  });

  describe("calculateReceivablesAgingBuckets", () => {
    it("buckets invoices into aging periods correctly", () => {
      const items: ReceivablesAgingItem[] = [
        {
          invoiceId: "i1",
          invoiceNumber: "INV-001",
          clientId: "c1",
          clientName: "Client A",
          currency: "USD",
          issueDate: "2026-09-01",
          dueDate: "2026-09-20",
          daysOverdue: 0,
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
          agingBucket: "current",
        },
        {
          invoiceId: "i2",
          invoiceNumber: "INV-002",
          clientId: "c2",
          clientName: "Client B",
          currency: "USD",
          issueDate: "2026-08-15",
          dueDate: "2026-09-05",
          daysOverdue: 10,
          totalAmount: 500,
          amountPaid: 0,
          amountDue: 500,
          agingBucket: "1_30",
        },
        {
          invoiceId: "i3",
          invoiceNumber: "INV-003",
          clientId: "c3",
          clientName: "Client C",
          currency: "USD",
          issueDate: "2026-07-01",
          dueDate: "2026-07-31",
          daysOverdue: 46,
          totalAmount: 750,
          amountPaid: 0,
          amountDue: 750,
          agingBucket: "31_60",
        },
        {
          invoiceId: "i4",
          invoiceNumber: "INV-004",
          clientId: "c4",
          clientName: "Client D",
          currency: "USD",
          issueDate: "2026-05-01",
          dueDate: "2026-06-01",
          daysOverdue: 106,
          totalAmount: 1200,
          amountPaid: 0,
          amountDue: 1200,
          agingBucket: "90_plus",
        },
      ];

      const summary = calculateReceivablesAgingBuckets(items);
      expect(summary.current).toBe(1000);
      expect(summary.bucket1_30).toBe(500);
      expect(summary.bucket31_60).toBe(750);
      expect(summary.bucket61_90).toBe(0);
      expect(summary.bucket90_plus).toBe(1200);
      expect(summary.totalDue).toBe(3450);
    });
  });

  describe("calculateTaxPlanningTotals", () => {
    it("correctly sums income, expenses, taxable basis, estimated tax, reserve, and shortfall", () => {
      const items: TaxPlanningReportItem[] = [
        {
          currency: "USD",
          isPrimaryCurrency: true,
          taxYear: 2026,
          actualIncome: 50000,
          actualExpenses: 10000,
          taxableBasis: 40000,
          configuredTaxRate: 25,
          estimatedTaxAmount: 10000,
          actualTrackedReserve: 8000,
          reserveShortfall: 2000,
          healthStatus: "shortfall",
        },
        {
          currency: "EUR",
          isPrimaryCurrency: false,
          taxYear: 2026,
          actualIncome: 20000,
          actualExpenses: 5000,
          taxableBasis: 15000,
          configuredTaxRate: 20,
          estimatedTaxAmount: 3000,
          actualTrackedReserve: 3500,
          reserveShortfall: 0,
          healthStatus: "overfunded",
        },
      ];

      const totals = calculateTaxPlanningTotals(items);
      expect(totals.totalIncome).toBe(70000);
      expect(totals.totalExpenses).toBe(15000);
      expect(totals.totalTaxableBasis).toBe(55000);
      expect(totals.totalEstimatedTax).toBe(13000);
      expect(totals.totalTrackedReserve).toBe(11500);
      expect(totals.totalShortfall).toBe(2000);
      expect(totals.currencyCount).toBe(2);
    });

    it("returns zeros for empty items", () => {
      const totals = calculateTaxPlanningTotals([]);
      expect(totals.totalIncome).toBe(0);
      expect(totals.totalExpenses).toBe(0);
      expect(totals.totalTaxableBasis).toBe(0);
      expect(totals.totalEstimatedTax).toBe(0);
      expect(totals.totalTrackedReserve).toBe(0);
      expect(totals.totalShortfall).toBe(0);
      expect(totals.currencyCount).toBe(0);
    });
  });

  describe("generateCsvString", () => {
    it("returns empty string for empty data", () => {
      expect(generateCsvString([])).toBe("");
    });

    it("generates header and rows with proper RFC 4180 escaping", () => {
      const data = [
        { client: "Acme, Inc.", amount: 1000, notes: 'Quote: "Done"' },
        { client: "Beta Labs", amount: 500, notes: "All good" },
      ];

      const csv = generateCsvString(data);
      const lines = csv.split("\r\n");

      expect(lines[0]).toBe("client,amount,notes");
      // "Acme, Inc." should be quoted because of comma
      // Quote: "Done" should have quotes escaped as ""
      expect(lines[1]).toBe('"Acme, Inc.",1000,"Quote: ""Done"""');
      expect(lines[2]).toBe("Beta Labs,500,All good");
    });
  });
});

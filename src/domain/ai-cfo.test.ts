import { describe, expect, it } from "vitest";

import {
  aiCfoActionSchema,
  aiCfoMetricReferenceSchema,
  aiCfoResponseSchema,
  buildDeterministicFinancialContext,
  getUnavailableAiCfoResult,
  type FinancialContextParams,
} from "./ai-cfo";

describe("AI CFO Domain Logic", () => {
  describe("buildDeterministicFinancialContext", () => {
    it("formats financial context into clear markdown with deterministic facts", () => {
      const params: FinancialContextParams = {
        workspaceName: "Acme Consulting",
        primaryCurrency: "USD",
        safeToSpend: [
          {
            currency: "USD",
            liquidCash: 50000,
            trackedTaxReserve: 10000,
            targetTaxReserve: 12000,
            upcomingObligations30d: 5000,
            operatingBuffer: 15000,
            expectedCollections30d: 8000,
            currentSafeToSpend: 20000,
            projectedSafeToSpend: 28000,
            isPrimaryCurrency: true,
          },
          {
            currency: "EUR",
            liquidCash: 10000,
            trackedTaxReserve: 2000,
            targetTaxReserve: 2000,
            upcomingObligations30d: 1000,
            operatingBuffer: 0,
            expectedCollections30d: 0,
            currentSafeToSpend: 7000,
            projectedSafeToSpend: 7000,
            isPrimaryCurrency: false,
          },
        ],
        taxSummary: [
          {
            currency: "USD",
            grossIncomeYtd: 80000,
            expensesYtd: 20000,
            netTaxableIncomeYtd: 60000,
            taxReserveRate: 20,
            targetTaxReserve: 12000,
            trackedTaxReserve: 10000,
            shortfall: 2000,
            isPrimaryCurrency: true,
          },
        ],
        upcomingObligationsTotal: 5000,
        upcomingObligationsCount: 3,
        unpaidReceivablesTotal: 12000,
        unpaidReceivablesCount: 2,
      };

      const result = buildDeterministicFinancialContext(params);

      expect(result).toContain("Workspace: Acme Consulting");
      expect(result).toContain("Primary Currency: USD");
      expect(result).toContain("SAFE-TO-SPEND BREAKDOWN");
      expect(result).toContain("Currency: USD (Primary: Yes)");
      expect(result).toContain("Liquid Cash: 50000");
      expect(result).toContain("Current Safe-to-Spend: 20000");
      expect(result).toContain("Currency: EUR (Primary: No)");
      expect(result).toContain("TAX RESERVE STATUS");
      expect(result).toContain("Target Tax Reserve (20%): 12000");
      expect(result).toContain("Shortfall: 2000");
      expect(result).toContain("Upcoming Active Obligations: 3 items, Total: 5000 USD");
      expect(result).toContain("Outstanding Receivables: 2 invoices, Total: 12000 USD");
    });

    it("handles empty context gracefully without crashing", () => {
      const params: FinancialContextParams = {
        workspaceName: "New Studio",
        primaryCurrency: "EUR",
        safeToSpend: [],
        taxSummary: [],
        upcomingObligationsTotal: 0,
        upcomingObligationsCount: 0,
        unpaidReceivablesTotal: 0,
        unpaidReceivablesCount: 0,
      };

      const result = buildDeterministicFinancialContext(params);
      expect(result).toContain("Workspace: New Studio");
      expect(result).toContain("No Safe-to-Spend data available.");
      expect(result).toContain("No tax summary data available.");
      expect(result).toContain("Upcoming Active Obligations: 0 items");
    });
  });

  describe("getUnavailableAiCfoResult", () => {
    it("returns truthful unavailable status and message when no key is set", () => {
      const result = getUnavailableAiCfoResult();
      expect(result.status).toBe("unavailable");
      expect(result.isAvailable).toBe(false);
      expect(result.errorMessage).toContain("AI CFO is unavailable");
      expect(result.errorMessage).toContain("Deterministic financial metrics");
    });

    it("accepts custom reason", () => {
      const result = getUnavailableAiCfoResult("Custom offline reason");
      expect(result.errorMessage).toBe("Custom offline reason");
      expect(result.isAvailable).toBe(false);
    });
  });

  describe("Schema Validation", () => {
    it("validates a structured AI CFO response successfully", () => {
      const validPayload = {
        summary: "Your cashflow is healthy with 4 months of runway.",
        key_points: [
          "Liquid cash covers next 30 days obligations.",
          "Tax reserve has a minor shortfall.",
        ],
        risks: ["$2,000 tax reserve shortfall in primary currency."],
        opportunities: ["Follow up on invoice #1042 due in 5 days."],
        recommended_actions: [
          {
            title: "Transfer $2,000 to Tax Reserve",
            description: "Move funds to eliminate your YTD tax reserve deficit.",
            action_type: "tax_reserve",
            suggested_route: "/app/taxes",
          },
        ],
        metric_references: [
          { label: "Current Safe-to-Spend", value: "$20,000" },
          { label: "Tax Shortfall", value: "$2,000" },
        ],
      };

      const parsed = aiCfoResponseSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid response missing required summary or arrays", () => {
      const invalidPayload = {
        summary: "",
        key_points: "not an array",
      };

      const parsed = aiCfoResponseSchema.safeParse(invalidPayload);
      expect(parsed.success).toBe(false);
    });

    it("validates action and metric reference sub-schemas", () => {
      expect(aiCfoActionSchema.safeParse({ title: "Action", description: "Desc" }).success).toBe(
        true,
      );
      expect(aiCfoMetricReferenceSchema.safeParse({ label: "STS", value: "$100" }).success).toBe(
        true,
      );
    });
  });
});

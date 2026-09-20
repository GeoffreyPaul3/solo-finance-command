import { describe, expect, it } from "vitest";
import { generateFinancialBrief } from "./financial-brief";
import { computeFinancialPulse } from "./financial-pulse";

describe("Financial Brief Domain Logic", () => {
  it("synthesizes deterministic position metrics, attention items, and positive signals", () => {
    const pulse = computeFinancialPulse({
      currency: "MWK",
      liquidCash: 12000000,
      safeToSpend: 6000000,
      outstandingReceivables: 4000000,
      upcomingObligations: 2000000,
      actualTaxReserve: 1000000,
      targetTaxReserve: 1500000,
      taxShortfall: 500000,
      currentPeriodIncome: 8000000,
      currentPeriodExpenses: 3000000,
      currentPeriodProfit: 5000000,
      isPrimaryCurrency: true,
    });

    const brief = generateFinancialBrief({
      pulse,
      overdueInvoicesCount: 1,
      overdueInvoicesTotal: 1500000,
      dueSoonInvoicesCount: 2,
      dueSoonInvoicesTotal: 2500000,
      obligationsDue7dCount: 1,
      obligationsDue7dTotal: 800000,
      recentPaymentsCount: 3,
      recentPaymentsTotal: 4000000,
      overBudgetProjectsCount: 0,
    });

    expect(brief.currency).toBe("MWK");
    expect(brief.safeToSpend).toBe(6000000);
    expect(brief.liquidCash).toBe(12000000);

    // Attention items: overdue invoice, tax shortfall, obligations due in 7d
    expect(brief.attentionSignals.length).toBe(3);
    expect(brief.attentionSignals.some((s) => s.id === "brief-overdue-invoices")).toBe(true);
    expect(brief.attentionSignals.some((s) => s.id === "brief-tax-shortfall")).toBe(true);
    expect(brief.attentionSignals.some((s) => s.id === "brief-obligations-due-7d")).toBe(true);

    // Positive signals: STS positive, operating profit, recent collections
    expect(brief.positiveSignals.length).toBe(3);
    expect(brief.positiveSignals.some((s) => s.id === "brief-sts-positive")).toBe(true);
    expect(brief.positiveSignals.some((s) => s.id === "brief-operating-profit")).toBe(true);
  });
});

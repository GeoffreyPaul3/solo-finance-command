import { describe, expect, it } from "vitest";
import { evaluateProjectHealth } from "./project-economics";

describe("Project Economics & Health Logic", () => {
  it("evaluates on_track when expenses are well below 80% of budget", () => {
    const result = evaluateProjectHealth({
      budget: 10000000,
      budgetCurrency: "MWK",
      currency: "MWK",
      projectExpenses: 4500000, // 45%
    });

    expect(result.state).toBe("on_track");
    expect(result.label).toBe("On Track");
    expect(result.utilizationPercent).toBe(45);
    expect(result.variance).toBe(5500000);
    expect(result.explanation).toContain("On Track: Budget utilization is 45%");
  });

  it("evaluates watch when expenses reach between 80% and 100% of budget", () => {
    const result = evaluateProjectHealth({
      budget: 5000,
      budgetCurrency: "USD",
      currency: "USD",
      projectExpenses: 4200, // 84%
    });

    expect(result.state).toBe("watch");
    expect(result.label).toBe("Watch");
    expect(result.utilizationPercent).toBe(84);
    expect(result.variance).toBe(800);
    expect(result.explanation).toContain("Watch: Budget utilization has reached 84%");
  });

  it("evaluates over_budget when expenses exceed agreed budget cap", () => {
    const result = evaluateProjectHealth({
      budget: 2000,
      budgetCurrency: "USD",
      currency: "USD",
      projectExpenses: 2500, // 125%
    });

    expect(result.state).toBe("over_budget");
    expect(result.label).toBe("Over Budget");
    expect(result.utilizationPercent).toBe(125);
    expect(result.variance).toBe(-500);
    expect(result.explanation).toContain(
      "Over Budget: Attributable project expenses (USD 2,500) exceed",
    );
  });

  it("handles uncapped projects without arbitrary thresholds", () => {
    const result = evaluateProjectHealth({
      budget: null,
      currency: "USD",
      projectExpenses: 3000,
    });

    expect(result.state).toBe("no_budget");
    expect(result.label).toBe("Uncapped");
    expect(result.utilizationPercent).toBeNull();
    expect(result.variance).toBeNull();
  });
});

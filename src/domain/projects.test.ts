import { describe, expect, it } from "vitest";

import { createProjectSchema, updateProjectSchema } from "./projects";

describe("createProjectSchema", () => {
  it("accepts valid project with full details", () => {
    const input = {
      name: "Q4 Brand Campaign",
      clientId: "123e4567-e89b-12d3-a456-426614174000",
      description: "Deliverables for new product launch",
      status: "active" as const,
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      budget: 15000,
      budgetCurrency: "USD",
      notes: "Contract cap with bi-weekly billing",
    };

    const parsed = createProjectSchema.parse(input);
    expect(parsed.name).toBe("Q4 Brand Campaign");
    expect(parsed.budget).toBe(15000);
    expect(parsed.budgetCurrency).toBe("USD");
    expect(parsed.status).toBe("active");
  });

  it("defaults status to planning when omitted", () => {
    const parsed = createProjectSchema.parse({
      name: "Initial Discovery",
    });
    expect(parsed.status).toBe("planning");
  });

  it("allows internal projects without clientId", () => {
    const parsed = createProjectSchema.parse({
      name: "Internal Infrastructure Overhaul",
      clientId: null,
    });
    expect(parsed.clientId).toBeNull();
  });

  it("coerces string budget to number", () => {
    const parsed = createProjectSchema.parse({
      name: "Website Redesign",
      budget: "25000.50" as unknown as number,
      budgetCurrency: "MWK",
    });
    expect(parsed.budget).toBe(25000.5);
  });

  it("allows budget of zero", () => {
    const parsed = createProjectSchema.parse({
      name: "Pro-bono Initiative",
      budget: 0,
      budgetCurrency: "USD",
    });
    expect(parsed.budget).toBe(0);
  });

  it("rejects negative budget", () => {
    expect(() =>
      createProjectSchema.parse({
        name: "Negative Budget Project",
        budget: -500,
        budgetCurrency: "USD",
      }),
    ).toThrow(/Budget cannot be negative/);
  });

  it("requires budgetCurrency when budget is provided", () => {
    expect(() =>
      createProjectSchema.parse({
        name: "Missing Currency Project",
        budget: 10000,
      }),
    ).toThrow(/Budget currency is required when a budget is set/);
  });

  it("enforces start date <= end date when both are present", () => {
    expect(() =>
      createProjectSchema.parse({
        name: "Invalid Timeline",
        startDate: "2026-12-01",
        endDate: "2026-10-01",
      }),
    ).toThrow(/Start date must be on or before end date/);

    // Valid timeline should pass
    const valid = createProjectSchema.parse({
      name: "Valid Timeline",
      startDate: "2026-10-01",
      endDate: "2026-12-01",
    });
    expect(valid.startDate).toBe("2026-10-01");
    expect(valid.endDate).toBe("2026-12-01");
  });

  it("rejects invalid status values", () => {
    expect(() =>
      createProjectSchema.parse({
        name: "Invalid Status",
        status: "in_progress" as never,
      }),
    ).toThrow();
  });
});

describe("updateProjectSchema", () => {
  it("allows partial updates", () => {
    const patch = {
      status: "completed" as const,
    };

    const parsed = updateProjectSchema.parse(patch);
    expect(parsed.status).toBe("completed");
    expect(parsed.name).toBeUndefined();
  });

  it("enforces start date <= end date when both updated", () => {
    expect(() =>
      updateProjectSchema.parse({
        startDate: "2026-12-01",
        endDate: "2026-10-01",
      }),
    ).toThrow(/Start date must be on or before end date/);
  });
});

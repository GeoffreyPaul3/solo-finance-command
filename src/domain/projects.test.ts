import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { createProjectSchema, deleteProject, updateProjectSchema } from "./projects";

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

describe("deleteProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws relational integrity error if project has linked invoices", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "invoices") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ count: 3, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ count: 0, error: null }),
          }),
        }),
      };
    });

    await expect(deleteProject("ws-1", "project-1")).rejects.toThrow(
      /Cannot delete project with linked records.*3 invoice\(s\)/,
    );
  });

  it("successfully deletes project and writes audit log when no linked records exist", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { name: "Redesign Project" }, error: null }),
              }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ count: 0, error: null }),
          }),
        }),
      };
    });

    const res = await deleteProject("ws-1", "project-1");
    expect(res).toEqual({ id: "project-1" });
    expect(mockRpc).toHaveBeenCalledWith(
      "write_audit_log",
      expect.objectContaining({
        _action: "project.deleted",
        _entity_id: "project-1",
      }),
    );
  });
});

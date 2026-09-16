import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { createClientSchema, deleteClient, updateClientSchema } from "./clients";

describe("createClientSchema", () => {
  it("accepts valid client input with all fields", () => {
    const input = {
      name: "Acme Client",
      companyName: "Acme Holdings LLC",
      email: "contact@acme.com",
      phone: "+1 555 123 4567",
      address: "100 Market St, San Francisco, CA",
      notes: "Key enterprise client with monthly retainer",
    };

    const parsed = createClientSchema.parse(input);
    expect(parsed.name).toBe("Acme Client");
    expect(parsed.companyName).toBe("Acme Holdings LLC");
    expect(parsed.email).toBe("contact@acme.com");
  });

  it("accepts client input with only required name", () => {
    const input = {
      name: "Simple Client",
    };

    const parsed = createClientSchema.parse(input);
    expect(parsed.name).toBe("Simple Client");
    expect(parsed.email).toBeUndefined();
    expect(parsed.companyName).toBeUndefined();
  });

  it("trims whitespace from name, company, email, and phone", () => {
    const input = {
      name: "   Trimmed Name   ",
      companyName: "   Acme Corp   ",
      email: "  trimmed@example.com  ",
      phone: "   +1234567   ",
    };

    const parsed = createClientSchema.parse(input);
    expect(parsed.name).toBe("Trimmed Name");
    expect(parsed.companyName).toBe("Acme Corp");
    expect(parsed.email).toBe("trimmed@example.com");
    expect(parsed.phone).toBe("+1234567");
  });

  it("accepts empty string as email or null", () => {
    const parsed1 = createClientSchema.parse({ name: "Client A", email: "" });
    expect(parsed1.email).toBe("");

    const parsed2 = createClientSchema.parse({ name: "Client B", email: null });
    expect(parsed2.email).toBeNull();
  });

  it("rejects empty name", () => {
    expect(() => createClientSchema.parse({ name: "" })).toThrow(/Client name is required/);
    expect(() => createClientSchema.parse({ name: "   " })).toThrow(/Client name is required/);
  });

  it("rejects invalid email formats", () => {
    expect(() => createClientSchema.parse({ name: "Client", email: "invalid-email" })).toThrow(
      /Invalid email address/,
    );
    expect(() => createClientSchema.parse({ name: "Client", email: "missing@domain" })).toThrow(
      /Invalid email address/,
    );
  });

  it("rejects names and company names exceeding 200 characters", () => {
    const longString = "A".repeat(201);
    expect(() => createClientSchema.parse({ name: longString })).toThrow(
      /cannot exceed 200 characters/,
    );
    expect(() => createClientSchema.parse({ name: "Valid", companyName: longString })).toThrow(
      /cannot exceed 200 characters/,
    );
  });

  it("rejects notes exceeding 2000 characters", () => {
    const longNotes = "N".repeat(2001);
    expect(() => createClientSchema.parse({ name: "Client", notes: longNotes })).toThrow(
      /cannot exceed 2000 characters/,
    );
  });
});

describe("updateClientSchema", () => {
  it("allows partial updates", () => {
    const patch = {
      notes: "Updated client notes",
    };

    const parsed = updateClientSchema.parse(patch);
    expect(parsed.notes).toBe("Updated client notes");
    expect(parsed.name).toBeUndefined();
  });

  it("allows status transition between active and archived", () => {
    const active = updateClientSchema.parse({ status: "active" });
    expect(active.status).toBe("active");

    const archived = updateClientSchema.parse({ status: "archived" });
    expect(archived.status).toBe("archived");
  });

  it("rejects invalid status", () => {
    expect(() => updateClientSchema.parse({ status: "deleted" as never })).toThrow();
  });
});

describe("deleteClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws relational integrity error if client has linked projects", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ count: 2, error: null }),
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

    await expect(deleteClient("ws-1", "client-1")).rejects.toThrow(
      /Cannot delete client with linked records.*2 project\(s\)/,
    );
  });

  it("successfully deletes client and writes audit log when no linked records exist", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "clients") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { name: "Test Client" }, error: null }),
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

    const res = await deleteClient("ws-1", "client-1");
    expect(res).toEqual({ id: "client-1" });
    expect(mockRpc).toHaveBeenCalledWith(
      "write_audit_log",
      expect.objectContaining({
        _action: "client.deleted",
        _entity_id: "client-1",
      }),
    );
  });
});

import { describe, expect, it } from "vitest";

import { createClientSchema, updateClientSchema } from "./clients";

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

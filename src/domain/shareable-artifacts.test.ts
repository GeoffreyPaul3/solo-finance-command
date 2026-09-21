import { describe, expect, it } from "vitest";

import {
  buildRedactedArtifactSnapshot,
  generateSecureShareToken,
  isArtifactAccessible,
  validateShareTokenFormat,
} from "./shareable-artifacts";

describe("shareable-artifacts domain model", () => {
  it("generates a high-entropy 32-byte URL-safe token", () => {
    const token = generateSecureShareToken();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(validateShareTokenFormat(token)).toBe(true);
  });

  it("validates token formats correctly", () => {
    expect(validateShareTokenFormat("")).toBe(false);
    expect(validateShareTokenFormat("short")).toBe(false);
    expect(validateShareTokenFormat("inv-123")).toBe(false);
    expect(validateShareTokenFormat("invalid char!@#$%^&*()")).toBe(false);
    expect(
      validateShareTokenFormat("aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789_-aBcDeFgHiJkLmNoP"),
    ).toBe(true);
  });

  it("correctly evaluates accessibility based on status, revocation, and expiration", () => {
    const activeArtifact = {
      status: "active" as const,
      visibility: "unlisted" as const,
      expires_at: null,
      revoked_at: null,
    };
    expect(isArtifactAccessible(activeArtifact).accessible).toBe(true);

    const revokedArtifact = {
      status: "revoked" as const,
      visibility: "unlisted" as const,
      expires_at: null,
      revoked_at: new Date().toISOString(),
    };
    expect(isArtifactAccessible(revokedArtifact).accessible).toBe(false);

    const expiredArtifact = {
      status: "active" as const,
      visibility: "unlisted" as const,
      expires_at: new Date(Date.now() - 10000).toISOString(),
      revoked_at: null,
    };
    expect(isArtifactAccessible(expiredArtifact).accessible).toBe(false);

    const workspaceOnlyArtifact = {
      status: "active" as const,
      visibility: "workspace_only" as const,
      expires_at: null,
      revoked_at: null,
    };
    expect(isArtifactAccessible(workspaceOnlyArtifact).accessible).toBe(false);
  });

  it("redacts invoice snapshots stripping sensitive internal fields", () => {
    const rawInvoice = {
      id: "raw-uuid-1234",
      workspace_id: "ws-secret-id",
      invoice_number: "INV-2026-001",
      currency: "USD",
      subtotal: 1000,
      total: 1000,
      amount_paid: 200,
      amount_due: 800,
      internal_notes: "Private client credit score is low",
      payment_instructions: "Deposit to Standard Bank acc 987654321",
      line_items: [
        {
          id: "item-uuid-1",
          description: "System Design Consultation",
          quantity: 10,
          unit_price: 100,
          line_total: 1000,
        },
      ],
    };

    const snapshot = buildRedactedArtifactSnapshot("invoice", rawInvoice, { hideNotes: true });
    expect(snapshot["invoiceNumber"]).toBe("INV-2026-001");
    expect(snapshot["total"]).toBe(1000);
    expect(snapshot["amountDue"]).toBe(800);
    expect(snapshot["notes"]).toBeNull();
    // Internal fields should never be copied
    expect((snapshot as Record<string, unknown>)["internal_notes"]).toBeUndefined();
    expect((snapshot as Record<string, unknown>)["workspace_id"]).toBeUndefined();
  });

  it("redacts financial brief preserving deterministic metrics", () => {
    const rawBrief = {
      headline: "Strong cash position",
      currency: "MWK",
      safeToSpend: 4500000,
      liquidCash: 6000000,
      receivables: 1200000,
      actualTaxReserve: 1500000,
      upcomingObligations: 800000,
      attentionSignals: [{ id: "sig-1", title: "Tax reserve shortfall", detail: "Detail text" }],
      positiveSignals: [{ id: "sig-2", title: "Cash runway > 6 months", detail: "Runway healthy" }],
    };

    const snapshot = buildRedactedArtifactSnapshot("financial_brief", rawBrief);
    expect(snapshot["safeToSpend"]).toBe(4500000);
    expect(snapshot["liquidCash"]).toBe(6000000);
    expect(snapshot["currency"]).toBe("MWK");
    expect(Array.isArray(snapshot["attentionSignals"])).toBe(true);
    expect((snapshot["attentionSignals"] as unknown[]).length).toBe(1);
  });
});

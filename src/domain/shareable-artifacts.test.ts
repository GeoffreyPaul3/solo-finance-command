import { describe, expect, it } from "vitest";

import {
  buildRedactedArtifactSnapshot,
  generateSecureShareToken,
  isArtifactAccessible,
  validateShareTokenFormat,
} from "./shareable-artifacts";

describe("shareable-artifacts domain model", () => {
  it("generates a high-entropy 32-byte (256-bit) URL-safe token", () => {
    const token = generateSecureShareToken();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(validateShareTokenFormat(token)).toBe(true);

    // Verify uniqueness across 50 generated tokens
    const set = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const t = generateSecureShareToken();
      expect(validateShareTokenFormat(t)).toBe(true);
      set.add(t);
    }
    expect(set.size).toBe(50);
  });

  it("validates token formats correctly", () => {
    expect(validateShareTokenFormat("")).toBe(false);
    expect(validateShareTokenFormat("short")).toBe(false);
    expect(validateShareTokenFormat("inv-123")).toBe(false);
    expect(validateShareTokenFormat("invalid char!@#$%^&*()")).toBe(false);
    expect(validateShareTokenFormat("aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789_-aBcDeFgHiJkLmNoP")).toBe(
      true,
    );
  });

  describe("accessibility matrix", () => {
    it("active + unexpired is accessible", () => {
      const artifact = {
        status: "active" as const,
        visibility: "unlisted" as const,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked_at: null,
      };
      expect(isArtifactAccessible(artifact).accessible).toBe(true);
    });

    it("active + null expires_at is accessible", () => {
      const artifact = {
        status: "active" as const,
        visibility: "unlisted" as const,
        expires_at: null,
        revoked_at: null,
      };
      expect(isArtifactAccessible(artifact).accessible).toBe(true);
    });

    it("revoked share is inaccessible", () => {
      const artifact = {
        status: "revoked" as const,
        visibility: "unlisted" as const,
        expires_at: null,
        revoked_at: new Date().toISOString(),
      };
      const res = isArtifactAccessible(artifact);
      expect(res.accessible).toBe(false);
      expect(res.reason).toContain("revoked");
    });

    it("expired share is inaccessible", () => {
      const artifact = {
        status: "active" as const,
        visibility: "unlisted" as const,
        expires_at: new Date(Date.now() - 10000).toISOString(),
        revoked_at: null,
      };
      const res = isArtifactAccessible(artifact);
      expect(res.accessible).toBe(false);
      expect(res.reason).toContain("expired");
    });

    it("revoked and expired share is inaccessible", () => {
      const artifact = {
        status: "revoked" as const,
        visibility: "unlisted" as const,
        expires_at: new Date(Date.now() - 10000).toISOString(),
        revoked_at: new Date().toISOString(),
      };
      const res = isArtifactAccessible(artifact);
      expect(res.accessible).toBe(false);
    });

    it("workspace_only visibility is inaccessible to unlisted public access", () => {
      const artifact = {
        status: "active" as const,
        visibility: "workspace_only" as const,
        expires_at: null,
        revoked_at: null,
      };
      const res = isArtifactAccessible(artifact);
      expect(res.accessible).toBe(false);
      expect(res.reason).toContain("restricted to authorized workspace members");
    });
  });

  describe("snapshot immutability & frozen state", () => {
    it("proves snapshot remains unchanged when original source data is mutated", () => {
      const sourceInvoice: Record<string, unknown> = {
        invoice_number: "INV-2026-042",
        currency: "MWK",
        total: 500000,
        subtotal: 500000,
        amount_paid: 0,
        amount_due: 500000,
        status: "sent",
        client_name: "Original Client Ltd",
        line_items: [{ description: "Consulting", quantity: 1, total: 500000 }],
      };

      // Create frozen snapshot at day 1
      const snapshot = buildRedactedArtifactSnapshot("invoice", sourceInvoice);

      expect(snapshot["invoiceNumber"]).toBe("INV-2026-042");
      expect(snapshot["total"]).toBe(500000);
      expect(snapshot["status"]).toBe("sent");

      // Mutate original source data at day 2 (simulate invoice edit, payment, cancellation)
      sourceInvoice["total"] = 0;
      sourceInvoice["status"] = "cancelled";
      sourceInvoice["amount_paid"] = 500000;
      sourceInvoice["client_name"] = "Different Client";
      (sourceInvoice["line_items"] as Array<unknown>).push({ description: "Added item" });

      // The snapshot MUST remain identical to its frozen state
      expect(snapshot["invoiceNumber"]).toBe("INV-2026-042");
      expect(snapshot["total"]).toBe(500000);
      expect(snapshot["status"]).toBe("sent");
      expect(snapshot["clientName"]).toBe("Original Client Ltd");
      expect((snapshot["lineItems"] as Array<unknown>).length).toBe(1);
    });
  });

  describe("sensitive data exclusion & redaction", () => {
    it("guarantees adversarial sensitive fields are completely stripped from snapshots", () => {
      const poisonedSourceData = {
        invoice_number: "INV-SAFE-001",
        currency: "USD",
        total: 1500,
        subtotal: 1500,
        // Injected sensitive fields:
        password: "super-secret-password",
        auth_token: "eyJh...raw_bearer_jwt",
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        workspace_id: "660e8400-e29b-41d4-a716-446655440000",
        bank_account_number: "1234567890",
        bank_routing_number: "021000021",
        credit_card_number: "4111222233334444",
        api_key: "sk_live_1234567890",
        internal_audit_log: "Client investigated for non-payment",
        payment_secret: "whsec_abcdef",
        line_items: [
          {
            description: "Product Development",
            quantity: 1,
            unit_price: 1500,
            line_total: 1500,
            internal_cost: 300,
            developer_id: "dev-99",
          },
        ],
      };

      const snapshot = buildRedactedArtifactSnapshot("invoice", poisonedSourceData);
      const snapshotKeys = Object.keys(snapshot);

      // Sensitive fields must NEVER be in snapshot
      expect(snapshotKeys).not.toContain("password");
      expect(snapshotKeys).not.toContain("auth_token");
      expect(snapshotKeys).not.toContain("user_id");
      expect(snapshotKeys).not.toContain("workspace_id");
      expect(snapshotKeys).not.toContain("bank_account_number");
      expect(snapshotKeys).not.toContain("bank_routing_number");
      expect(snapshotKeys).not.toContain("credit_card_number");
      expect(snapshotKeys).not.toContain("api_key");
      expect(snapshotKeys).not.toContain("internal_audit_log");
      expect(snapshotKeys).not.toContain("payment_secret");

      // Line item internal fields must not be present
      const items = snapshot["lineItems"] as Array<Record<string, unknown>>;
      expect(items[0]).toBeDefined();
      expect(items[0]?.["internal_cost"]).toBeUndefined();
      expect(items[0]?.["developer_id"]).toBeUndefined();
    });

    it("respects accessConfig redactions (hideNotes, hideLineItemPricing)", () => {
      const invData = {
        invoice_number: "INV-100",
        notes: "Confidential wire instructions",
        line_items: [{ description: "Service", quantity: 2, unit_price: 50, line_total: 100 }],
      };

      const redacted = buildRedactedArtifactSnapshot("invoice", invData, {
        hideNotes: true,
        hideLineItemPricing: true,
      });

      expect(redacted["notes"]).toBeNull();
      const items = redacted["lineItems"] as Array<Record<string, unknown>>;
      expect(items[0]?.["unitPrice"]).toBeNull();
      expect(items[0]?.["total"]).toBe(100);
    });
  });
});

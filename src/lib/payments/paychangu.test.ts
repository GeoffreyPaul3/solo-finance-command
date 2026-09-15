import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PayChanguClient } from "./paychangu";

describe("PayChangu Payment Reconciliation Engine", () => {
  const originalEnv = process.env;
  let client: PayChanguClient;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    client = new PayChanguClient();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("reports unconfigured when PAYCHANGU_SECRET_KEY is absent", () => {
    delete process.env["PAYCHANGU_SECRET_KEY"];
    expect(client.isConfigured()).toBe(false);
  });

  it("reports configured when PAYCHANGU_SECRET_KEY is set", () => {
    process.env["PAYCHANGU_SECRET_KEY"] = "sec-test-key-12345";
    expect(client.isConfigured()).toBe(true);
  });

  it("throws error when initiating checkout without secret key", async () => {
    delete process.env["PAYCHANGU_SECRET_KEY"];

    await expect(
      client.initiateCheckout({
        txRef: "solo_sub_test_001",
        planId: "solo",
        amountMajor: 14000,
        currency: "MWK",
        customerEmail: "user@example.com",
        callbackUrl: "https://example.com/callback",
        returnUrl: "https://example.com/return",
      }),
    ).rejects.toThrow("Missing PAYCHANGU_SECRET_KEY");
  });

  it("reconciliation detects amount mismatch and prevents entitlement activation", async () => {
    process.env["PAYCHANGU_SECRET_KEY"] = "sec-test-key-12345";

    // Mock API returning paid 1,400 MWK instead of expected 14,000 MWK
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          status: "success",
          amount: 1400, // Tampered or discounted amount
          currency: "MWK",
          tx_ref: "tx-test-123",
          reference: "ref-999",
        },
      }),
    } as Response);

    const result = await client.verifyPayment("tx-test-123", 14000, "MWK");

    expect(result.status).toBe("mismatch");
    expect(result.failureReason).toContain("Amount or currency mismatch");
    expect(result.verifiedAmountMajor).toBe(1400);
  });

  it("reconciliation detects currency mismatch and prevents entitlement activation", async () => {
    process.env["PAYCHANGU_SECRET_KEY"] = "sec-test-key-12345";

    // Mock API returning paid 8 MWK instead of 8 USD
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          status: "success",
          amount: 8,
          currency: "MWK", // Paid 8 MWK instead of 8 USD!
          tx_ref: "tx-test-456",
          reference: "ref-100",
        },
      }),
    } as Response);

    const result = await client.verifyPayment("tx-test-456", 8, "USD");

    expect(result.status).toBe("mismatch");
    expect(result.failureReason).toContain("Amount or currency mismatch");
  });

  it("reconciliation marks failed payments when provider status is not successful", async () => {
    process.env["PAYCHANGU_SECRET_KEY"] = "sec-test-key-12345";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          status: "failed",
          amount: 14000,
          currency: "MWK",
          tx_ref: "tx-test-fail",
        },
      }),
    } as Response);

    const result = await client.verifyPayment("tx-test-fail", 14000, "MWK");

    expect(result.status).toBe("failed");
    expect(result.failureReason).toContain("Payment status is failed");
  });

  it("reconciliation successfully verifies when amount, currency, and status match exactly", async () => {
    process.env["PAYCHANGU_SECRET_KEY"] = "sec-test-key-12345";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          status: "success",
          amount: 14000,
          currency: "MWK",
          tx_ref: "tx-test-ok",
          reference: "pc-ref-777",
        },
      }),
    } as Response);

    const result = await client.verifyPayment("tx-test-ok", 14000, "MWK");

    expect(result.status).toBe("successful");
    expect(result.verifiedAmountMajor).toBe(14000);
    expect(result.verifiedCurrency).toBe("MWK");
    expect(result.providerRef).toBe("pc-ref-777");
  });
});

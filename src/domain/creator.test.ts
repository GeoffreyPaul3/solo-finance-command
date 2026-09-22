import { describe, expect, it } from "vitest";

import {
  aggregateCommissions,
  computeCommissionCents,
  computeCreatorFunnel,
  formatBpsAsPercent,
  isApplicationTransitionValid,
  isCommissionTransitionValid,
  isCreatorStatusTransitionValid,
  isPayoutTransitionValid,
  isWithinCommissionWindow,
  slugifyCreatorHandle,
  STANDARD_COMMISSION_RATE_BPS,
  STANDARD_COMMISSION_WINDOW_MONTHS,
  validateCampaignCode,
  validateCreatorCode,
  type CommissionStatus,
  type CreatorCommission,
} from "./creator";

// ─── validateCreatorCode ───────────────────────────────────────────────────────

describe("validateCreatorCode", () => {
  it("accepts valid lowercase slugs", () => {
    expect(validateCreatorCode("geoffrey")).toBe(true);
    expect(validateCreatorCode("creator-geo")).toBe(true);
    expect(validateCreatorCode("freelancer-finance-tiktok")).toBe(true);
    expect(validateCreatorCode("a1b2c3")).toBe(true);
  });

  it("rejects too-short slugs (< 4 chars)", () => {
    expect(validateCreatorCode("ab")).toBe(false);
    expect(validateCreatorCode("abc")).toBe(false);
  });

  it("rejects slugs starting or ending with hyphen", () => {
    expect(validateCreatorCode("-geoffrey")).toBe(false);
    expect(validateCreatorCode("geoffrey-")).toBe(false);
  });

  it("rejects uppercase characters", () => {
    expect(validateCreatorCode("Geoffrey")).toBe(false);
    expect(validateCreatorCode("GEOFFREY")).toBe(false);
  });

  it("rejects workspace-style codes (UPPERCASE-XXXX)", () => {
    expect(validateCreatorCode("ACME-8F2K")).toBe(false);
  });

  it("rejects special characters", () => {
    expect(validateCreatorCode("geo@ffrey")).toBe(false);
    expect(validateCreatorCode("geo_ffrey")).toBe(false);
  });

  it("rejects empty string and null-ish", () => {
    expect(validateCreatorCode("")).toBe(false);
    expect(validateCreatorCode("   ")).toBe(false);
  });

  it("rejects slugs over 48 chars", () => {
    expect(validateCreatorCode("a".repeat(50))).toBe(false);
  });
});

// ─── validateCampaignCode ──────────────────────────────────────────────────────

describe("validateCampaignCode", () => {
  it("accepts valid campaign codes", () => {
    expect(validateCampaignCode("freelancer-finance-tiktok")).toBe(true);
    expect(validateCampaignCode("q4-launch")).toBe(true);
    expect(validateCampaignCode("campaign1")).toBe(true);
  });

  it("rejects codes under 4 chars", () => {
    expect(validateCampaignCode("abc")).toBe(false);
  });

  it("rejects codes over 64 chars", () => {
    expect(validateCampaignCode("a".repeat(66))).toBe(false);
  });

  it("rejects starting/ending with hyphen", () => {
    expect(validateCampaignCode("-campaign")).toBe(false);
    expect(validateCampaignCode("campaign-")).toBe(false);
  });
});

// ─── slugifyCreatorHandle ──────────────────────────────────────────────────────

describe("slugifyCreatorHandle", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugifyCreatorHandle("Geoffrey Paul")).toBe("geoffrey-paul");
  });

  it("collapses multiple spaces/hyphens", () => {
    expect(slugifyCreatorHandle("Geoffrey  Paul")).toBe("geoffrey-paul");
    expect(slugifyCreatorHandle("Geoffrey--Paul")).toBe("geoffrey-paul");
  });

  it("strips special characters", () => {
    expect(slugifyCreatorHandle("Géoffrey@Paul!")).toBe("geoffreypaul");
  });

  it("truncates to 46 chars", () => {
    const long = "a".repeat(100);
    expect(slugifyCreatorHandle(long).length).toBeLessThanOrEqual(46);
  });
});

// ─── computeCommissionCents ───────────────────────────────────────────────────

describe("computeCommissionCents", () => {
  it("computes 20% (2000 bps) of a clean amount", () => {
    // $100 = 10000 cents → 20% = $20 = 2000 cents
    expect(computeCommissionCents(10000, 2000)).toBe(2000);
  });

  it("computes 20% of 1499 cents (floors, no floating point rounding up)", () => {
    // 1499 * 2000 / 10000 = 299.8 → floor → 299
    expect(computeCommissionCents(1499, 2000)).toBe(299);
  });

  it("matches SQL integer division exactly", () => {
    // Reproduce: 99900 * 2000 / 10000 = 19980
    expect(computeCommissionCents(99900, 2000)).toBe(19980);
  });

  it("returns 0 for zero gross", () => {
    expect(computeCommissionCents(0, 2000)).toBe(0);
  });

  it("returns 0 for zero rate", () => {
    expect(computeCommissionCents(10000, 0)).toBe(0);
  });

  it("handles MWK amounts correctly (large integers)", () => {
    // 50000 MWK = 5000000 cents → 20% = 1000000 cents = 10000 MWK
    expect(computeCommissionCents(5000000, 2000)).toBe(1000000);
  });

  it("uses STANDARD_COMMISSION_RATE_BPS constant correctly", () => {
    expect(STANDARD_COMMISSION_RATE_BPS).toBe(2000);
    expect(computeCommissionCents(10000, STANDARD_COMMISSION_RATE_BPS)).toBe(2000);
  });
});

// ─── formatBpsAsPercent ───────────────────────────────────────────────────────

describe("formatBpsAsPercent", () => {
  it("formats 2000 bps as 20%", () => {
    expect(formatBpsAsPercent(2000)).toBe("20%");
  });

  it("formats 1500 bps as 15%", () => {
    expect(formatBpsAsPercent(1500)).toBe("15%");
  });

  it("formats 500 bps as 5%", () => {
    expect(formatBpsAsPercent(500)).toBe("5%");
  });
});

// ─── isWithinCommissionWindow ─────────────────────────────────────────────────

describe("isWithinCommissionWindow", () => {
  const converted = new Date("2025-01-15T00:00:00Z");

  it("returns true for a payment 6 months after conversion (within 12-month window)", () => {
    const payment = new Date("2025-07-01T00:00:00Z");
    expect(
      isWithinCommissionWindow({ convertedAt: converted, paymentDate: payment, windowMonths: 12 }),
    ).toBe(true);
  });

  it("returns true for a payment exactly at conversion date", () => {
    expect(
      isWithinCommissionWindow({
        convertedAt: converted,
        paymentDate: converted,
        windowMonths: 12,
      }),
    ).toBe(true);
  });

  it("returns false for a payment 13 months after conversion", () => {
    const payment = new Date("2026-02-20T00:00:00Z");
    expect(
      isWithinCommissionWindow({ convertedAt: converted, paymentDate: payment, windowMonths: 12 }),
    ).toBe(false);
  });

  it("returns false for a payment before the conversion date", () => {
    const payment = new Date("2024-12-01T00:00:00Z");
    expect(
      isWithinCommissionWindow({ convertedAt: converted, paymentDate: payment, windowMonths: 12 }),
    ).toBe(false);
  });

  it("respects STANDARD_COMMISSION_WINDOW_MONTHS = 12", () => {
    expect(STANDARD_COMMISSION_WINDOW_MONTHS).toBe(12);
  });
});

// ─── isApplicationTransitionValid ────────────────────────────────────────────

describe("isApplicationTransitionValid", () => {
  it("allows pending → approved", () => {
    expect(isApplicationTransitionValid("pending", "approved")).toBe(true);
  });

  it("allows pending → rejected", () => {
    expect(isApplicationTransitionValid("pending", "rejected")).toBe(true);
  });

  it("disallows approved → rejected", () => {
    expect(isApplicationTransitionValid("approved", "rejected")).toBe(false);
  });

  it("disallows rejected → approved directly", () => {
    expect(isApplicationTransitionValid("rejected", "approved")).toBe(false);
  });

  it("allows same state (idempotent)", () => {
    expect(isApplicationTransitionValid("pending", "pending")).toBe(true);
    expect(isApplicationTransitionValid("approved", "approved")).toBe(true);
  });
});

// ─── isCreatorStatusTransitionValid ──────────────────────────────────────────

describe("isCreatorStatusTransitionValid", () => {
  it("allows null → active (fresh approval)", () => {
    expect(isCreatorStatusTransitionValid(null, "active")).toBe(true);
  });

  it("allows active → suspended", () => {
    expect(isCreatorStatusTransitionValid("active", "suspended")).toBe(true);
  });

  it("allows suspended → active (reactivation)", () => {
    expect(isCreatorStatusTransitionValid("suspended", "active")).toBe(true);
  });

  it("allows any → closed (terminal)", () => {
    expect(isCreatorStatusTransitionValid("active", "closed")).toBe(true);
    expect(isCreatorStatusTransitionValid("suspended", "closed")).toBe(true);
  });

  it("disallows closed → active (terminal state)", () => {
    expect(isCreatorStatusTransitionValid("closed", "active")).toBe(false);
  });

  it("disallows closed → suspended", () => {
    expect(isCreatorStatusTransitionValid("closed", "suspended")).toBe(false);
  });
});

// ─── isCommissionTransitionValid ──────────────────────────────────────────────

describe("isCommissionTransitionValid", () => {
  it("allows pending → approved", () => {
    expect(isCommissionTransitionValid("pending", "approved")).toBe(true);
  });

  it("allows pending → ineligible", () => {
    expect(isCommissionTransitionValid("pending", "ineligible")).toBe(true);
  });

  it("allows approved → paid", () => {
    expect(isCommissionTransitionValid("approved", "paid")).toBe(true);
  });

  it("allows approved → reversed", () => {
    expect(isCommissionTransitionValid("approved", "reversed")).toBe(true);
  });

  it("allows paid → reversed", () => {
    expect(isCommissionTransitionValid("paid", "reversed")).toBe(true);
  });

  it("disallows pending → paid (must go through approved)", () => {
    expect(isCommissionTransitionValid("pending", "paid")).toBe(false);
  });

  it("disallows reversed → any", () => {
    expect(isCommissionTransitionValid("reversed", "pending")).toBe(false);
    expect(isCommissionTransitionValid("reversed", "approved")).toBe(false);
  });
});

// ─── isPayoutTransitionValid ──────────────────────────────────────────────────

describe("isPayoutTransitionValid", () => {
  it("allows pending → approved", () => {
    expect(isPayoutTransitionValid("pending", "approved")).toBe(true);
  });

  it("allows pending → cancelled", () => {
    expect(isPayoutTransitionValid("pending", "cancelled")).toBe(true);
  });

  it("allows approved → processing", () => {
    expect(isPayoutTransitionValid("approved", "processing")).toBe(true);
  });

  it("allows processing → paid", () => {
    expect(isPayoutTransitionValid("processing", "paid")).toBe(true);
  });

  it("allows processing → failed", () => {
    expect(isPayoutTransitionValid("processing", "failed")).toBe(true);
  });

  it("disallows paid → any", () => {
    expect(isPayoutTransitionValid("paid", "pending")).toBe(false);
    expect(isPayoutTransitionValid("paid", "cancelled")).toBe(false);
  });
});

// ─── computeCreatorFunnel ─────────────────────────────────────────────────────

describe("computeCreatorFunnel", () => {
  it("returns zeros for empty attribution list", () => {
    const result = computeCreatorFunnel([]);
    expect(result.totalClicks).toBe(0);
    expect(result.totalSignups).toBe(0);
    expect(result.totalConverted).toBe(0);
    expect(result.clickToSignupPct).toBe(0);
  });

  it("counts all statuses correctly", () => {
    const attributions = [
      { status: "visited" },
      { status: "visited" },
      { status: "signed_up" },
      { status: "activated" },
      { status: "converted" },
    ];
    const result = computeCreatorFunnel(attributions);
    expect(result.totalClicks).toBe(5);
    expect(result.totalSignups).toBe(3); // signed_up + activated + converted
    expect(result.totalActivated).toBe(2); // activated + converted
    expect(result.totalConverted).toBe(1);
  });

  it("computes click-to-signup percentage", () => {
    const attributions = [
      { status: "visited" },
      { status: "visited" },
      { status: "visited" },
      { status: "signed_up" },
    ];
    const result = computeCreatorFunnel(attributions);
    // 1 signup / 4 clicks = 25%
    expect(result.clickToSignupPct).toBe(25);
  });
});

// ─── aggregateCommissions ─────────────────────────────────────────────────────

describe("aggregateCommissions", () => {
  const makeCommission = (
    currency: string,
    status: CommissionStatus,
    amount: number,
  ): CreatorCommission => ({
    id: crypto.randomUUID(),
    creator_id: "c1",
    attribution_id: "a1",
    subscription_payment_id: "p1",
    referred_workspace_id: "w1",
    commission_rule_id: null,
    billing_period_label: "2025-01",
    gross_amount_cents: amount * 5,
    commission_rate_bps: 2000,
    window_months_snapshot: 12,
    commission_amount_cents: amount,
    currency,
    status: status as CreatorCommission["status"],
    flags: {},
    approved_at: null,
    approved_by: null,
    paid_at: null,
    reversed_at: null,
    reversal_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  it("separates commissions by currency", () => {
    const commissions = [
      makeCommission("USD", "pending", 2000),
      makeCommission("MWK", "pending", 50000),
      makeCommission("USD", "approved", 3000),
    ];
    const result = aggregateCommissions(commissions);
    expect(result).toHaveLength(2);

    const usd = result.find((r) => r.currency === "USD")!;
    expect(usd.pendingCents).toBe(2000);
    expect(usd.approvedCents).toBe(3000);

    const mwk = result.find((r) => r.currency === "MWK")!;
    expect(mwk.pendingCents).toBe(50000);
  });

  it("returns empty for no commissions", () => {
    expect(aggregateCommissions([])).toHaveLength(0);
  });

  it("does not mix USD and MWK totals", () => {
    const commissions = [
      makeCommission("USD", "paid", 1000),
      makeCommission("MWK", "paid", 200000),
    ];
    const result = aggregateCommissions(commissions);
    const usd = result.find((r) => r.currency === "USD")!;
    const mwk = result.find((r) => r.currency === "MWK")!;
    expect(usd.paidCents).toBe(1000);
    expect(mwk.paidCents).toBe(200000);
    // Confirm they are not added together
    expect(usd.paidCents + mwk.paidCents).toBe(201000); // meaningless, but sanity check
    expect(usd.paidCents).not.toBe(mwk.paidCents);
  });

  it("correctly buckets reversed commissions", () => {
    const commissions = [makeCommission("USD", "reversed", 500)];
    const result = aggregateCommissions(commissions);
    expect(result[0]!.reversedCents).toBe(500);
    expect(result[0]!.paidCents).toBe(0);
  });
});

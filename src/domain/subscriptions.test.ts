import { describe, expect, it } from "vitest";

import {
  TIER_ENTITLEMENTS,
  getWorkspaceEntitlements,
  type WorkspaceSubscription,
} from "./entitlements";
import { getDaysRemainingInPeriod } from "./subscriptions";
import { CANONICAL_PRICES, getCanonicalPrice, type PlanTier } from "@/lib/payments/pricing";

describe("Subscription Entitlements Engine", () => {
  it("returns Free tier entitlements when no subscription exists", () => {
    const entitlements = getWorkspaceEntitlements("free", null);

    expect(entitlements.tier).toBe("free");
    expect(entitlements.displayName).toBe("Free");
    expect(entitlements.canUseAiCfo).toBe(false);
    expect(entitlements.canExportPdfReports).toBe(false);
    expect(entitlements.maxTeamMembers).toBe(1);
    expect(entitlements.maxClients).toBe(5);
    expect(entitlements.maxInvoicesPerMonth).toBe(10);
    expect(entitlements.hasMultiCurrency).toBe(false);
    expect(entitlements.isPaidPlan).toBe(false);
  });

  it("returns Solo tier entitlements when active", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const sub: Pick<
      WorkspaceSubscription,
      "plan_id" | "status" | "cancel_at_period_end" | "current_period_end"
    > = {
      plan_id: "solo",
      status: "active",
      cancel_at_period_end: false,
      current_period_end: "2026-07-01T12:00:00Z",
    };

    const entitlements = getWorkspaceEntitlements("solo", sub, now);

    expect(entitlements.tier).toBe("solo");
    expect(entitlements.canUseAiCfo).toBe(true);
    expect(entitlements.canExportPdfReports).toBe(true);
    expect(entitlements.maxTeamMembers).toBe(3);
    expect(entitlements.maxClients).toBe(Infinity);
    expect(entitlements.maxInvoicesPerMonth).toBe(Infinity);
    expect(entitlements.hasMultiCurrency).toBe(true);
    expect(entitlements.isPaidPlan).toBe(true);
    expect(entitlements.isInGracePeriod).toBe(false);
  });

  it("returns Pro tier entitlements when active", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const sub: Pick<
      WorkspaceSubscription,
      "plan_id" | "status" | "cancel_at_period_end" | "current_period_end"
    > = {
      plan_id: "pro",
      status: "active",
      cancel_at_period_end: false,
      current_period_end: "2026-07-01T12:00:00Z",
    };

    const entitlements = getWorkspaceEntitlements("pro", sub, now);

    expect(entitlements.tier).toBe("pro");
    expect(entitlements.canUseAiCfo).toBe(true);
    expect(entitlements.canExportPdfReports).toBe(true);
    expect(entitlements.canManageMultipleWorkspaces).toBe(true);
    expect(entitlements.canInviteUnlimitedTeam).toBe(true);
    expect(entitlements.maxTeamMembers).toBe(Infinity);
    expect(entitlements.hasAdvancedTaxScenarios).toBe(true);
    expect(entitlements.isPaidPlan).toBe(true);
  });

  it("preserves paid entitlements during grace period (before current_period_end)", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const sub: Pick<
      WorkspaceSubscription,
      "plan_id" | "status" | "cancel_at_period_end" | "current_period_end"
    > = {
      plan_id: "solo",
      status: "active",
      cancel_at_period_end: true,
      current_period_end: "2026-07-01T12:00:00Z",
    };

    const entitlements = getWorkspaceEntitlements("solo", sub, now);

    expect(entitlements.tier).toBe("solo");
    expect(entitlements.canUseAiCfo).toBe(true);
    expect(entitlements.isInGracePeriod).toBe(true);
    expect(entitlements.isPaidPlan).toBe(true);
  });

  it("strictly reverts to Free tier once past current_period_end", () => {
    const now = new Date("2026-07-02T12:00:00Z");
    const sub: Pick<
      WorkspaceSubscription,
      "plan_id" | "status" | "cancel_at_period_end" | "current_period_end"
    > = {
      plan_id: "solo",
      status: "canceled",
      cancel_at_period_end: true,
      current_period_end: "2026-07-01T12:00:00Z",
    };

    const entitlements = getWorkspaceEntitlements("solo", sub, now);

    expect(entitlements.tier).toBe("free");
    expect(entitlements.canUseAiCfo).toBe(false);
    expect(entitlements.canExportPdfReports).toBe(false);
    expect(entitlements.isPaidPlan).toBe(false);
  });

  it("falls back to Free tier for unknown plan tiers", () => {
    const entitlements = getWorkspaceEntitlements("unknown_custom_tier", null);
    expect(entitlements.tier).toBe("free");
  });
});

describe("Subscription Period Calculation", () => {
  it("calculates positive days remaining in billing period", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const periodEnd = "2026-06-10T00:00:00Z";

    expect(getDaysRemainingInPeriod(periodEnd, now)).toBe(9);
  });

  it("never returns negative days when period has expired", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const periodEnd = "2026-06-10T00:00:00Z";

    expect(getDaysRemainingInPeriod(periodEnd, now)).toBe(0);
  });
});

describe("Canonical Pricing Engine", () => {
  it("defines clean, intentional launch prices without decimal artifacts", () => {
    const soloMwk = getCanonicalPrice("solo", "MWK");
    const soloUsd = getCanonicalPrice("solo", "USD");
    const proMwk = getCanonicalPrice("pro", "MWK");
    const proUsd = getCanonicalPrice("pro", "USD");

    // Exact required prices: MWK 14,000 / $8 and MWK 21,000 / $12
    expect(soloMwk.amountMajor).toBe(14000);
    expect(soloMwk.formatted).toBe("MWK 14,000/month");
    expect(soloUsd.amountMajor).toBe(8);
    expect(soloUsd.formatted).toBe("$8/month");

    expect(proMwk.amountMajor).toBe(21000);
    expect(proMwk.formatted).toBe("MWK 21,000/month");
    expect(proUsd.amountMajor).toBe(12);
    expect(proUsd.formatted).toBe("$12/month");
  });

  it("rejects invalid plans or currencies gracefully", () => {
    expect(() => getCanonicalPrice("enterprise" as PlanTier, "MWK")).toThrow();
  });

  it("keeps cents in sync with major units", () => {
    const soloMwk = CANONICAL_PRICES.solo.MWK;
    expect(soloMwk.amountCents).toBe(soloMwk.amountMajor * 100);

    const soloUsd = CANONICAL_PRICES.solo.USD;
    expect(soloUsd.amountCents).toBe(soloUsd.amountMajor * 100);
  });
});

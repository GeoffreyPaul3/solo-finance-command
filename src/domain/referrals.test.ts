import { describe, expect, it } from "vitest";

import {
  computeReferralFunnel,
  generateReferralCode,
  isSelfReferral,
  isWorkspaceActivated,
  validateReferralCode,
  type ReferralAttribution,
} from "./referrals";

describe("referrals domain model", () => {
  it("generates readable, well-formatted referral codes", () => {
    const code = generateReferralCode("Tiger Capital");
    expect(code).toMatch(/^TIGERC-[A-Z0-9]{4}$/);
    expect(validateReferralCode(code)).toBe(true);
  });

  it("handles empty or special character workspace names gracefully", () => {
    const code = generateReferralCode("$$$ %%%");
    expect(code).toMatch(/^SOLO-[A-Z0-9]{4}$/);
    expect(validateReferralCode(code)).toBe(true);
  });

  it("identifies self-referral attempts", () => {
    expect(
      isSelfReferral({
        referrerUserId: "user-1",
        referredUserId: "user-1",
        referrerWorkspaceId: "ws-1",
        referredWorkspaceId: "ws-2",
      }),
    ).toBe(true);

    expect(
      isSelfReferral({
        referrerUserId: "user-1",
        referredUserId: "user-2",
        referrerWorkspaceId: "ws-1",
        referredWorkspaceId: "ws-1",
      }),
    ).toBe(true);

    expect(
      isSelfReferral({
        referrerUserId: "user-1",
        referredUserId: "user-2",
        referrerWorkspaceId: "ws-1",
        referredWorkspaceId: "ws-2",
      }),
    ).toBe(false);
  });

  it("evaluates workspace activation according to SoloOS criteria", () => {
    // Requires >=1 account AND >=1 transaction
    expect(isWorkspaceActivated(0, 0)).toBe(false);
    expect(isWorkspaceActivated(1, 0)).toBe(false);
    expect(isWorkspaceActivated(0, 1)).toBe(false);
    expect(isWorkspaceActivated(1, 1)).toBe(true);
    expect(isWorkspaceActivated(3, 15)).toBe(true);
  });

  it("computes referral funnel statistics accurately", () => {
    const mockAttributions: ReferralAttribution[] = [
      {
        id: "1",
        referral_code: "REF-1",
        referrer_workspace_id: "ws-1",
        referred_user_id: null,
        referred_workspace_id: null,
        anonymous_session_id: "sess-1",
        status: "visited",
        landing_at: new Date().toISOString(),
        signup_at: null,
        activated_at: null,
        converted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "2",
        referral_code: "REF-1",
        referrer_workspace_id: "ws-1",
        referred_user_id: "user-2",
        referred_workspace_id: null,
        anonymous_session_id: "sess-2",
        status: "signed_up",
        landing_at: new Date().toISOString(),
        signup_at: new Date().toISOString(),
        activated_at: null,
        converted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "3",
        referral_code: "REF-1",
        referrer_workspace_id: "ws-1",
        referred_user_id: "user-3",
        referred_workspace_id: "ws-3",
        anonymous_session_id: "sess-3",
        status: "activated",
        landing_at: new Date().toISOString(),
        signup_at: new Date().toISOString(),
        activated_at: new Date().toISOString(),
        converted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "4",
        referral_code: "REF-1",
        referrer_workspace_id: "ws-1",
        referred_user_id: "user-4",
        referred_workspace_id: "ws-4",
        anonymous_session_id: "sess-4",
        status: "converted",
        landing_at: new Date().toISOString(),
        signup_at: new Date().toISOString(),
        activated_at: new Date().toISOString(),
        converted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const stats = computeReferralFunnel(mockAttributions);
    expect(stats.totalClicks).toBe(4);
    expect(stats.totalSignups).toBe(3);
    expect(stats.totalActivated).toBe(2);
    expect(stats.totalConverted).toBe(1);
    expect(stats.conversionRatePercent).toBe(25.0);
  });
});

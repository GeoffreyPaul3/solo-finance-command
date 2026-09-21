import { describe, expect, it } from "vitest";

import {
  computeReferralFunnel,
  formatReferralCookie,
  generateReferralCode,
  isReferralAttributionActive,
  isReferralStatusTransitionValid,
  isSelfReferral,
  isWorkspaceActivated,
  parseReferralCookie,
  resolveReferralAttribution,
  validateReferralCode,
  REFERRAL_ATTRIBUTION_WINDOW_MS,
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

  it("validates deterministic lifecycle progression", () => {
    // Forward progression is valid
    expect(isReferralStatusTransitionValid("visited", "signed_up")).toBe(true);
    expect(isReferralStatusTransitionValid("signed_up", "activated")).toBe(true);
    expect(isReferralStatusTransitionValid("activated", "converted")).toBe(true);
    expect(isReferralStatusTransitionValid("visited", "converted")).toBe(true);

    // Idempotent state is valid
    expect(isReferralStatusTransitionValid("activated", "activated")).toBe(true);

    // Backward regression is invalid
    expect(isReferralStatusTransitionValid("activated", "signed_up")).toBe(false);
    expect(isReferralStatusTransitionValid("converted", "visited")).toBe(false);
  });

  describe("30-day first-touch attribution model", () => {
    const day1 = 1700000000000;
    const day3 = day1 + 2 * 24 * 60 * 60 * 1000;
    const day20 = day1 + 19 * 24 * 60 * 60 * 1000;
    const day31 = day1 + 31 * 24 * 60 * 60 * 1000;

    it("first referral wins on clean visitor", () => {
      const res = resolveReferralAttribution({
        existing: null,
        incomingCode: "ALPHA-1234",
        asOf: day1,
      });

      expect(res.shouldUpdate).toBe(true);
      expect(res.activeCode).toBe("ALPHA-1234");
      expect(res.reason).toBe("first_touch");
    });

    it("second referral does NOT overwrite active first referral on day 3", () => {
      const existing = { code: "ALPHA-1234", timestamp: day1 };
      const res = resolveReferralAttribution({
        existing,
        incomingCode: "BETA-5678",
        asOf: day3,
      });

      expect(res.shouldUpdate).toBe(false);
      expect(res.activeCode).toBe("ALPHA-1234");
      expect(res.reason).toBe("preserved_existing");
    });

    it("third referral does NOT overwrite on day 20", () => {
      const existing = { code: "ALPHA-1234", timestamp: day1 };
      const res = resolveReferralAttribution({
        existing,
        incomingCode: "GAMMA-9999",
        asOf: day20,
      });

      expect(res.shouldUpdate).toBe(false);
      expect(res.activeCode).toBe("ALPHA-1234");
      expect(res.reason).toBe("preserved_existing");
    });

    it("expired referral (> 30 days) is replaced by new referral", () => {
      const existing = { code: "ALPHA-1234", timestamp: day1 };
      const res = resolveReferralAttribution({
        existing,
        incomingCode: "DELTA-7777",
        asOf: day31,
      });

      expect(res.shouldUpdate).toBe(true);
      expect(res.activeCode).toBe("DELTA-7777");
      expect(res.reason).toBe("expired_replaced");
    });

    it("ignores invalid incoming referral code format", () => {
      const existing = { code: "ALPHA-1234", timestamp: day1 };
      const res = resolveReferralAttribution({
        existing,
        incomingCode: "INVALID CODE!!!",
        asOf: day3,
      });

      expect(res.shouldUpdate).toBe(false);
      expect(res.activeCode).toBe("ALPHA-1234");
      expect(res.reason).toBe("invalid_incoming");

      const noExisting = resolveReferralAttribution({
        existing: null,
        incomingCode: "X",
        asOf: day1,
      });
      expect(noExisting.shouldUpdate).toBe(false);
      expect(noExisting.activeCode).toBeNull();
      expect(noExisting.reason).toBe("invalid_incoming");
    });

    it("safely parses and formats attribution cookies", () => {
      const cookieStr = formatReferralCookie("SOLO-TEST", day1);
      expect(cookieStr).toContain("solos_ref=");
      expect(cookieStr).toContain("SameSite=Lax");

      const parsed = parseReferralCookie(cookieStr);
      expect(parsed).not.toBeNull();
      expect(parsed?.code).toBe("SOLO-TEST");
      expect(parsed?.timestamp).toBe(day1);

      // Malformed cookie is safely handled
      expect(parseReferralCookie("")).toBeNull();
      expect(parseReferralCookie("solos_ref=")).toBeNull();
      expect(
        parseReferralCookie("other_cookie=123; solos_ref=NOT_A_VALID_CODE; other=456"),
      ).toBeNull();
      expect(parseReferralCookie("solos_ref=SOLO-1234:not_a_number")).toBeNull();
    });

    it("evaluates attribution activity against 30-day window", () => {
      const valid = { code: "SOLO-1234", timestamp: day1 };
      expect(isReferralAttributionActive(valid, day1)).toBe(true);
      expect(isReferralAttributionActive(valid, day20)).toBe(true);
      expect(isReferralAttributionActive(valid, day1 + REFERRAL_ATTRIBUTION_WINDOW_MS - 1000)).toBe(
        true,
      );
      expect(isReferralAttributionActive(valid, day1 + REFERRAL_ATTRIBUTION_WINDOW_MS + 1000)).toBe(
        false,
      );
    });
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

    const metrics = computeReferralFunnel(mockAttributions);
    expect(metrics.totalClicks).toBe(4);
    expect(metrics.totalSignups).toBe(3);
    expect(metrics.totalActivated).toBe(2);
    expect(metrics.totalConverted).toBe(1);
    expect(metrics.conversionRatePercent).toBe(25); // 1 / 4 = 25%
  });
});

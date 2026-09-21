/**
 * SoloOS Phase 11: Referral Engine Domain Model
 *
 * Core principles:
 * 1. First-touch attribution model.
 * 2. 30-day attribution window.
 * 3. Exactly one referral attribution record per referred workspace.
 * 4. Self-referral prevention (cannot refer oneself or own workspaces).
 * 5. Deterministic lifecycle states:
 *    - visited: Link clicked, attribution cookie established.
 *    - signed_up: User created account.
 *    - activated: Workspace created + >=1 financial account + >=1 financial transaction.
 *    - converted: Subscribed to paid tier (tier !== 'free').
 */

export type ReferralStatus = "visited" | "signed_up" | "activated" | "converted";

export interface WorkspaceReferralProfile {
  id: string;
  workspace_id: string;
  referral_code: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralAttribution {
  id: string;
  referral_code: string;
  referrer_workspace_id: string;
  referred_user_id: string | null;
  referred_workspace_id: string | null;
  anonymous_session_id: string | null;
  status: ReferralStatus;
  landing_at: string;
  signup_at: string | null;
  activated_at: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralMetrics {
  totalClicks: number;
  totalSignups: number;
  totalActivated: number;
  totalConverted: number;
  conversionRatePercent: number;
}

export const REFERRAL_ATTRIBUTION_WINDOW_DAYS = 30;
export const REFERRAL_ATTRIBUTION_WINDOW_MS =
  REFERRAL_ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface StoredReferralAttribution {
  code: string;
  timestamp: number;
}

/**
 * Parses a referral cookie string ("solos_ref=CODE") or stored JSON.
 */
export function parseReferralCookie(cookieStr: string): StoredReferralAttribution | null {
  if (!cookieStr || typeof cookieStr !== "string") return null;
  const match = cookieStr.match(/(?:^|;\s*)solos_ref=([^;]+)/);
  if (!match || !match[1]) return null;

  try {
    const rawVal = decodeURIComponent(match[1].trim());
    // Supports either plain code "ACME-8F2K" or combined "CODE:TIMESTAMP"
    if (rawVal.includes(":")) {
      const [code, tsStr] = rawVal.split(":");
      const ts = Number(tsStr);
      if (code && validateReferralCode(code) && !isNaN(ts) && ts > 0) {
        return { code: code.toUpperCase(), timestamp: ts };
      }
    } else if (validateReferralCode(rawVal)) {
      return { code: rawVal.toUpperCase(), timestamp: Date.now() };
    }
  } catch {
    /* ignore malformed values */
  }
  return null;
}

/**
 * Formats a secure referral cookie value with code and timestamp.
 */
export function formatReferralCookie(code: string, timestamp: number = Date.now()): string {
  const sanitized = code.trim().toUpperCase();
  const expires = new Date(timestamp + REFERRAL_ATTRIBUTION_WINDOW_MS);
  return `solos_ref=${encodeURIComponent(`${sanitized}:${timestamp}`)}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

/**
 * Checks whether an attribution is still active within the 30-day window.
 */
export function isReferralAttributionActive(
  attribution: StoredReferralAttribution | null,
  asOf: Date | number = Date.now(),
): boolean {
  if (!attribution || !attribution.code || !attribution.timestamp) return false;
  if (!validateReferralCode(attribution.code)) return false;
  const nowMs = typeof asOf === "number" ? asOf : asOf.getTime();
  const elapsed = nowMs - attribution.timestamp;
  return elapsed >= 0 && elapsed < REFERRAL_ATTRIBUTION_WINDOW_MS;
}

/**
 * Resolves referral attribution using the 30-day first-touch model:
 * 1. If incoming code is invalid -> ignore.
 * 2. If no existing attribution or existing attribution is expired (> 30 days) -> incoming code wins.
 * 3. If an existing attribution is currently active -> existing attribution WINS (first-touch preserved).
 */
export function resolveReferralAttribution(params: {
  existing: StoredReferralAttribution | null;
  incomingCode: string;
  asOf?: Date | number;
}): {
  shouldUpdate: boolean;
  activeCode: string | null;
  reason: "first_touch" | "preserved_existing" | "expired_replaced" | "invalid_incoming";
} {
  const { existing, incomingCode, asOf = Date.now() } = params;
  if (!validateReferralCode(incomingCode)) {
    const existingActive = isReferralAttributionActive(existing, asOf);
    return {
      shouldUpdate: false,
      activeCode: existingActive && existing ? existing.code : null,
      reason: "invalid_incoming",
    };
  }

  const cleanIncoming = incomingCode.trim().toUpperCase();
  const isExistingActive = isReferralAttributionActive(existing, asOf);

  if (!isExistingActive || !existing) {
    return {
      shouldUpdate: true,
      activeCode: cleanIncoming,
      reason: existing ? "expired_replaced" : "first_touch",
    };
  }

  // Active existing attribution wins (first-touch principle)
  return {
    shouldUpdate: false,
    activeCode: existing.code,
    reason: "preserved_existing",
  };
}

/**
 * Validates deterministic lifecycle progression:
 * visited -> signed_up -> activated -> converted
 */
export function isReferralStatusTransitionValid(from: ReferralStatus, to: ReferralStatus): boolean {
  const order: Record<ReferralStatus, number> = {
    visited: 0,
    signed_up: 1,
    activated: 2,
    converted: 3,
  };
  // Can stay at current (idempotent) or progress forward
  return order[to] >= order[from];
}

/**
 * Generates a clean, readable, collision-resistant referral code from a workspace name.
 * Format: PREFIX-XXXX (e.g. ACME-8F2K)
 */
export function generateReferralCode(workspaceName: string): string {
  const sanitized =
    workspaceName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6) || "SOLO";

  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${sanitized}-${randomSuffix}`;
}

/**
 * Validates whether a referral code follows valid format.
 */
export function validateReferralCode(code: string): boolean {
  if (!code || typeof code !== "string") return false;
  const trimmed = code.trim().toUpperCase();
  return /^[A-Z0-9]{2,10}-[A-Z0-9]{4,8}$/.test(trimmed);
}

/**
 * Checks for self-referral abuse.
 */
export function isSelfReferral(params: {
  referrerUserId?: string | null;
  referredUserId?: string | null;
  referrerWorkspaceId: string;
  referredWorkspaceId?: string | null;
}): boolean {
  if (
    params.referrerUserId &&
    params.referredUserId &&
    params.referrerUserId === params.referredUserId
  ) {
    return true;
  }
  if (params.referredWorkspaceId && params.referrerWorkspaceId === params.referredWorkspaceId) {
    return true;
  }
  return false;
}

/**
 * Evaluates whether a referred workspace satisfies the rigorous SoloOS activation definition:
 * Workspace exists + at least 1 financial account + at least 1 financial transaction.
 */
export function isWorkspaceActivated(accountsCount: number, transactionsCount: number): boolean {
  return accountsCount >= 1 && transactionsCount >= 1;
}

/**
 * Computes aggregate funnel metrics from authoritative attribution rows.
 */
export function computeReferralFunnel(attributions: ReferralAttribution[]): ReferralMetrics {
  const totalClicks = attributions.length;
  let totalSignups = 0;
  let totalActivated = 0;
  let totalConverted = 0;

  for (const attr of attributions) {
    if (attr.status === "signed_up" || attr.status === "activated" || attr.status === "converted") {
      totalSignups++;
    }
    if (attr.status === "activated" || attr.status === "converted") {
      totalActivated++;
    }
    if (attr.status === "converted") {
      totalConverted++;
    }
  }

  const conversionRatePercent =
    totalClicks > 0 ? Math.round((totalConverted / totalClicks) * 1000) / 10 : 0;

  return {
    totalClicks,
    totalSignups,
    totalActivated,
    totalConverted,
    conversionRatePercent,
  };
}

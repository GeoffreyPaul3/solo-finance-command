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

/**
 * Generates a clean, readable, collision-resistant referral code from a workspace name.
 * Format: PREFIX-XXXX (e.g. ACME-8F2K)
 */
export function generateReferralCode(workspaceName: string): string {
  const sanitized = workspaceName
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
  if (
    params.referredWorkspaceId &&
    params.referrerWorkspaceId === params.referredWorkspaceId
  ) {
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

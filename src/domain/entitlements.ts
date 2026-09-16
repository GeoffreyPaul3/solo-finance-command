import type { Database } from "@/integrations/supabase/types";
import type { PlanTier } from "@/lib/payments/pricing";

export type WorkspaceSubscription = Database["public"]["Tables"]["subscriptions"]["Row"];

export interface WorkspaceEntitlements {
  tier: PlanTier;
  displayName: string;
  canUseAiCfo: boolean;
  canExportPdfReports: boolean;
  canManageMultipleWorkspaces: boolean;
  canInviteUnlimitedTeam: boolean;
  canAccessAnalytics: boolean;
  canAccessAudit: boolean;
  maxTeamMembers: number;
  maxInvoicesPerMonth: number;
  maxClients: number;
  hasMultiCurrency: boolean;
  hasAutomatedObligations: boolean;
  hasAdvancedTaxScenarios: boolean;
  isPaidPlan: boolean;
  isInGracePeriod: boolean;
}

export type EntitlementKey =
  | "canUseAiCfo"
  | "canExportPdfReports"
  | "canManageMultipleWorkspaces"
  | "canInviteUnlimitedTeam"
  | "canAccessAnalytics"
  | "canAccessAudit"
  | "hasMultiCurrency"
  | "hasAutomatedObligations"
  | "hasAdvancedTaxScenarios";

export const TIER_ENTITLEMENTS: Record<PlanTier, WorkspaceEntitlements> = {
  free: {
    tier: "free",
    displayName: "Free",
    canUseAiCfo: false,
    canExportPdfReports: false,
    canManageMultipleWorkspaces: false,
    canInviteUnlimitedTeam: false,
    canAccessAnalytics: false,
    canAccessAudit: false,
    maxTeamMembers: 1,
    maxInvoicesPerMonth: 10,
    maxClients: 5,
    hasMultiCurrency: false,
    hasAutomatedObligations: false,
    hasAdvancedTaxScenarios: false,
    isPaidPlan: false,
    isInGracePeriod: false,
  },
  solo: {
    tier: "solo",
    displayName: "Solo",
    canUseAiCfo: true,
    canExportPdfReports: true,
    canManageMultipleWorkspaces: false,
    canInviteUnlimitedTeam: false,
    canAccessAnalytics: true,
    canAccessAudit: false,
    maxTeamMembers: 3,
    maxInvoicesPerMonth: Infinity,
    maxClients: Infinity,
    hasMultiCurrency: true,
    hasAutomatedObligations: true,
    hasAdvancedTaxScenarios: false,
    isPaidPlan: true,
    isInGracePeriod: false,
  },
  pro: {
    tier: "pro",
    displayName: "Pro",
    canUseAiCfo: true,
    canExportPdfReports: true,
    canManageMultipleWorkspaces: true,
    canInviteUnlimitedTeam: true,
    canAccessAnalytics: true,
    canAccessAudit: true,
    maxTeamMembers: Infinity,
    maxInvoicesPerMonth: Infinity,
    maxClients: Infinity,
    hasMultiCurrency: true,
    hasAutomatedObligations: true,
    hasAdvancedTaxScenarios: true,
    isPaidPlan: true,
    isInGracePeriod: false,
  },
};

export function hasEntitlement(entitlements: WorkspaceEntitlements, key: EntitlementKey): boolean {
  return Boolean(entitlements[key]);
}

/**
 * Resolves workspace entitlements deterministically.
 * Rule:
 * 1. If subscription is active, entitlements correspond to its plan.
 * 2. If subscription is set to cancel at period end, but current date <= current_period_end,
 *    paid plan features remain accessible until the end of the period.
 * 3. If past current_period_end or status is canceled/expired, it strictly reverts to 'free'.
 */
export function getWorkspaceEntitlements(
  workspacePlan?: string | null,
  subscription?: Pick<
    WorkspaceSubscription,
    "plan_id" | "status" | "cancel_at_period_end" | "current_period_end"
  > | null,
  now: Date = new Date(),
): WorkspaceEntitlements {
  if (!subscription) {
    const rawTier = (workspacePlan || "free").toLowerCase() as PlanTier;
    return TIER_ENTITLEMENTS[rawTier] || TIER_ENTITLEMENTS.free;
  }

  const periodEnd = new Date(subscription.current_period_end);
  const isPeriodValid = now <= periodEnd;
  const isCanceled = subscription.status === "canceled" || subscription.cancel_at_period_end;

  if (subscription.status === "active") {
    const tier = (subscription.plan_id.toLowerCase() as PlanTier) || "free";
    const base = TIER_ENTITLEMENTS[tier] || TIER_ENTITLEMENTS.free;
    return {
      ...base,
      isInGracePeriod: Boolean(subscription.cancel_at_period_end && isPeriodValid),
    };
  }

  // If marked canceled but still within paid period
  if (isCanceled && isPeriodValid) {
    const tier = (subscription.plan_id.toLowerCase() as PlanTier) || "free";
    const base = TIER_ENTITLEMENTS[tier] || TIER_ENTITLEMENTS.free;
    return {
      ...base,
      isInGracePeriod: true,
    };
  }

  // Otherwise, strictly Free
  return TIER_ENTITLEMENTS.free;
}

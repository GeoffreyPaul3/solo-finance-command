/**
 * SoloOS Phase 11: Distribution Analytics Domain Model
 *
 * Core principles:
 * 1. Tracks real telemetry without vanity padding or fake events.
 * 2. Strict event allowlist.
 * 3. Aggregates reach, referrals, and artifact engagement per workspace.
 */

export type DistributionEventType =
  | "share_created"
  | "share_viewed"
  | "share_link_copied"
  | "share_revoked"
  | "share_expired"
  | "share_email_sent"
  | "recipient_cta_clicked"
  | "referral_clicked"
  | "referral_signup"
  | "referral_activated"
  | "referral_converted"
  | "tool_used";

export const PUBLIC_ALLOWED_EVENT_TYPES: DistributionEventType[] = [
  "recipient_cta_clicked",
  "share_link_copied",
  "tool_used",
];

export interface DistributionEventRecord {
  id: string;
  workspace_id: string | null;
  actor_user_id: string | null;
  event_type: DistributionEventType;
  artifact_id: string | null;
  referral_code: string | null;
  anonymous_session_id: string | null;
  source: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ArtifactEngagementSummary {
  id: string;
  title: string;
  artifactType: string;
  viewCount: number;
  createdAt: string;
  status: string;
}

export interface WorkspaceDistributionSummary {
  totalSharesCreated: number;
  totalViews: number;
  totalLinkCopies: number;
  totalCtaClicks: number;
  referralClicks: number;
  referralSignups: number;
  referralActivations: number;
  referralConversions: number;
  topArtifacts: ArtifactEngagementSummary[];
  sourceBreakdown: Record<string, number>;
}

export interface PlatformDistributionSummary {
  totalArtifactsCount: number;
  totalViewsCount: number;
  totalReferralClicks: number;
  totalReferralSignups: number;
  totalActivatedUsers: number;
  totalConvertedUsers: number;
  totalToolUsages: number;
  toolUsageBreakdown: Record<string, number>;
}

/**
 * Aggregates raw distribution events and artifacts for a single workspace.
 */
export function aggregateWorkspaceDistribution(params: {
  events: DistributionEventRecord[];
  artifacts: Array<{
    id: string;
    title: string;
    artifact_type: string;
    view_count: number;
    created_at: string;
    status: string;
  }>;
  referralStats: {
    totalClicks: number;
    totalSignups: number;
    totalActivated: number;
    totalConverted: number;
  };
}): WorkspaceDistributionSummary {
  const { events, artifacts, referralStats } = params;

  let totalViews = 0;
  let totalLinkCopies = 0;
  let totalCtaClicks = 0;
  const sourceBreakdown: Record<string, number> = {};

  for (const ev of events) {
    if (ev.event_type === "share_viewed") totalViews++;
    if (ev.event_type === "share_link_copied") totalLinkCopies++;
    if (ev.event_type === "recipient_cta_clicked") totalCtaClicks++;

    if (ev.source) {
      sourceBreakdown[ev.source] = (sourceBreakdown[ev.source] || 0) + 1;
    }
  }

  // Also include the authoritative view_count on artifacts if higher
  const artifactViewsSum = artifacts.reduce((sum, a) => sum + (a.view_count || 0), 0);
  const effectiveTotalViews = Math.max(totalViews, artifactViewsSum);

  const topArtifacts: ArtifactEngagementSummary[] = [...artifacts]
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      title: a.title,
      artifactType: a.artifact_type,
      viewCount: a.view_count,
      createdAt: a.created_at,
      status: a.status,
    }));

  return {
    totalSharesCreated: artifacts.length,
    totalViews: effectiveTotalViews,
    totalLinkCopies,
    totalCtaClicks,
    referralClicks: referralStats.totalClicks,
    referralSignups: referralStats.totalSignups,
    referralActivations: referralStats.totalActivated,
    referralConversions: referralStats.totalConverted,
    topArtifacts,
    sourceBreakdown,
  };
}

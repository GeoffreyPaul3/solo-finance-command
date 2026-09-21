import { describe, expect, it } from "vitest";

import {
  aggregateWorkspaceDistribution,
  type DistributionEventRecord,
} from "./distribution";

describe("distribution domain model", () => {
  it("aggregates events and artifact counts accurately without fabrication", () => {
    const mockEvents: DistributionEventRecord[] = [
      {
        id: "ev-1",
        workspace_id: "ws-1",
        actor_user_id: null,
        event_type: "share_viewed",
        artifact_id: "art-1",
        referral_code: null,
        anonymous_session_id: "anon-1",
        source: "shared_artifact",
        metadata: {},
        created_at: new Date().toISOString(),
      },
      {
        id: "ev-2",
        workspace_id: "ws-1",
        actor_user_id: null,
        event_type: "share_viewed",
        artifact_id: "art-1",
        referral_code: null,
        anonymous_session_id: "anon-2",
        source: "shared_artifact",
        metadata: {},
        created_at: new Date().toISOString(),
      },
      {
        id: "ev-3",
        workspace_id: "ws-1",
        actor_user_id: "u-1",
        event_type: "share_link_copied",
        artifact_id: "art-1",
        referral_code: null,
        anonymous_session_id: null,
        source: "direct",
        metadata: {},
        created_at: new Date().toISOString(),
      },
      {
        id: "ev-4",
        workspace_id: "ws-1",
        actor_user_id: null,
        event_type: "recipient_cta_clicked",
        artifact_id: "art-1",
        referral_code: null,
        anonymous_session_id: "anon-1",
        source: "shared_artifact",
        metadata: {},
        created_at: new Date().toISOString(),
      },
    ];

    const mockArtifacts = [
      {
        id: "art-1",
        title: "September Financial Brief",
        artifact_type: "financial_brief",
        view_count: 5,
        created_at: new Date().toISOString(),
        status: "active",
      },
      {
        id: "art-2",
        title: "Q3 Profitability Report",
        artifact_type: "profitability_report",
        view_count: 1,
        created_at: new Date().toISOString(),
        status: "active",
      },
    ];

    const mockReferralStats = {
      totalClicks: 10,
      totalSignups: 4,
      totalActivated: 3,
      totalConverted: 1,
    };

    const result = aggregateWorkspaceDistribution({
      events: mockEvents,
      artifacts: mockArtifacts,
      referralStats: mockReferralStats,
    });

    expect(result.totalSharesCreated).toBe(2);
    // Uses highest between event count and recorded view_count sum (5 + 1 = 6)
    expect(result.totalViews).toBe(6);
    expect(result.totalLinkCopies).toBe(1);
    expect(result.totalCtaClicks).toBe(1);
    expect(result.referralClicks).toBe(10);
    expect(result.referralSignups).toBe(4);
    expect(result.referralActivations).toBe(3);
    expect(result.referralConversions).toBe(1);
    expect(result.topArtifacts.length).toBe(2);
    expect(result.topArtifacts[0]?.title).toBe("September Financial Brief");
  });
});

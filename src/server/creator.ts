/**
 * SoloOS Phase 12: Creator Distribution Engine — Server Functions
 *
 * Implements:
 * - Public: resolve creator code & campaign
 * - Creator: application, dashboard overview, campaign management, earnings & funnel, resources
 * - Admin: creator directory, application review, status management, commission review, manual payout recording
 * - Core: server-authoritative commission trigger via SECURITY DEFINER function
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  aggregateCommissions,
  computeCreatorFunnel,
  STANDARD_COMMISSION_RATE_BPS,
  STANDARD_COMMISSION_WINDOW_MONTHS,
  validateCampaignCode,
  validateCreatorCode,
  type ApplicationStatus,
  type CampaignStatus,
  type CommissionStatus,
  type CreatorStatus,
  type PayoutStatus,
} from "@/domain/creator";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/send";
import {
  renderCreatorApplicationApprovedEmail,
  renderCreatorApplicationRejectedEmail,
  renderCreatorApplicationSubmittedEmail,
  renderCreatorPayoutApprovedEmail,
} from "@/lib/email/templates";

// ─────────────────────────────────────────────
// Auth Helpers
// ─────────────────────────────────────────────

async function getAuthenticatedUserId(authToken?: string): Promise<string | null> {
  if (authToken) {
    try {
      const { data } = await supabaseAdmin.auth.getUser(authToken);
      if (data?.user) return data.user.id;
    } catch {
      /* ignore */
    }
  }
  const { data } = await supabase.auth.getUser();
  if (data?.user) return data.user.id;
  const { data: sd } = await supabase.auth.getSession();
  if (sd.session?.user) return sd.session.user.id;
  return null;
}

async function requirePlatformAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("platform_admin_roles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Forbidden: platform admin access required");
  }
}

async function getCreatorProfileForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("creator_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────
// 1. Resolve Creator Referral (Public)
// ─────────────────────────────────────────────

const resolveCreatorSchema = z.object({
  creatorCode: z.string(),
  campaignCode: z.string().optional(),
});

export const resolveCreatorReferralServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof resolveCreatorSchema>) => resolveCreatorSchema.parse(data))
  .handler(async ({ data }) => {
    const code = data.creatorCode.trim().toLowerCase();
    if (!validateCreatorCode(code)) {
      return { resolved: false as const, reason: "invalid_format" };
    }

    // Call RPC or query
    const { data: creator, error } = await supabaseAdmin
      .from("creator_profiles")
      .select("id, display_name, public_handle, referral_code, primary_platform, creator_status")
      .eq("referral_code", code)
      .eq("creator_status", "active")
      .maybeSingle();

    if (error || !creator) {
      return { resolved: false as const, reason: "not_found_or_inactive" };
    }

    let campaign: {
      id: string;
      campaignCode: string;
      name: string;
      destinationPath: string;
    } | null = null;

    if (data.campaignCode) {
      const campCode = data.campaignCode.trim().toLowerCase();
      const { data: campData } = await supabaseAdmin
        .from("creator_campaigns")
        .select("id, campaign_code, name, destination_path, status")
        .eq("creator_id", creator.id)
        .eq("campaign_code", campCode)
        .eq("status", "active")
        .maybeSingle();

      if (campData) {
        campaign = {
          id: campData.id,
          campaignCode: campData.campaign_code,
          name: campData.name,
          destinationPath: campData.destination_path || "/",
        };
      }
    }

    return {
      resolved: true as const,
      creator: {
        id: creator.id,
        displayName: creator.display_name,
        publicHandle: creator.public_handle,
        referralCode: creator.referral_code,
        primaryPlatform: creator.primary_platform,
      },
      campaign,
    };
  });

// ─────────────────────────────────────────────
// 1b. Record Creator Landing (30-day first touch)
// ─────────────────────────────────────────────

const recordCreatorLandingSchema = z.object({
  creatorCode: z.string(),
  campaignCode: z.string().optional(),
  anonymousSessionId: z.string().optional(),
});

export const recordCreatorLandingServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof recordCreatorLandingSchema>) =>
    recordCreatorLandingSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const code = data.creatorCode.trim().toLowerCase();
    if (!validateCreatorCode(code)) {
      return { recorded: false, reason: "invalid_format" };
    }

    const { data: creator } = await supabaseAdmin
      .from("creator_profiles")
      .select("id, display_name, public_handle, creator_status")
      .eq("referral_code", code)
      .eq("creator_status", "active")
      .maybeSingle();

    if (!creator) {
      return { recorded: false, reason: "creator_not_found_or_inactive" };
    }

    let campaign: { id: string; name: string; destinationPath: string } | null = null;
    if (data.campaignCode) {
      const campCode = data.campaignCode.trim().toLowerCase();
      const { data: campData } = await supabaseAdmin
        .from("creator_campaigns")
        .select("id, name, destination_path")
        .eq("creator_id", creator.id)
        .eq("campaign_code", campCode)
        .eq("status", "active")
        .maybeSingle();

      if (campData) {
        campaign = {
          id: campData.id,
          name: campData.name,
          destinationPath: campData.destination_path || "/",
        };
      }
    }

    // 30-day first-touch check on session
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    if (data.anonymousSessionId) {
      const { data: existing } = await supabaseAdmin
        .from("referral_attributions")
        .select("id, creator_id, campaign_id")
        .eq("anonymous_session_id", data.anonymousSessionId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existing) {
        return {
          recorded: true,
          creatorId: existing.creator_id || creator.id,
          campaignId: existing.campaign_id || campaign?.id || null,
          destinationPath: campaign?.destinationPath || "/",
          firstTouchPreserved: true,
        };
      }
    }

    // Insert new creator attribution
    await supabaseAdmin.from("referral_attributions").insert({
      creator_id: creator.id,
      campaign_id: campaign ? campaign.id : null,
      referral_code: null,
      referrer_workspace_id: null,
      anonymous_session_id: data.anonymousSessionId || null,
      status: "visited",
      landing_at: new Date().toISOString(),
    });

    return {
      recorded: true,
      creatorId: creator.id,
      campaignId: campaign ? campaign.id : null,
      destinationPath: campaign?.destinationPath || "/",
      firstTouchPreserved: false,
    };
  });

// ─────────────────────────────────────────────
// 1c. Record Creator Signup
// ─────────────────────────────────────────────

const recordCreatorSignupSchema = z.object({
  userId: z.string().uuid(),
  creatorId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  anonymousSessionId: z.string().optional(),
});

export const recordCreatorSignupServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof recordCreatorSignupSchema>) =>
    recordCreatorSignupSchema.parse(data),
  )
  .handler(async ({ data }) => {
    // 1. Check if user is already attributed
    const { data: alreadyAttributed } = await supabaseAdmin
      .from("referral_attributions")
      .select("id, status, creator_id")
      .eq("referred_user_id", data.userId)
      .maybeSingle();

    if (alreadyAttributed) {
      return { success: true, status: alreadyAttributed.status, alreadyLinked: true };
    }

    // 2. Find attribution candidate by anonymousSessionId or creatorId
    let candidateId: string | null = null;
    let targetCreatorId = data.creatorId || null;

    if (data.anonymousSessionId) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: sessionCandidate } = await supabaseAdmin
        .from("referral_attributions")
        .select("id, creator_id, status")
        .eq("anonymous_session_id", data.anonymousSessionId)
        .eq("status", "visited")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (sessionCandidate) {
        candidateId = sessionCandidate.id;
        targetCreatorId = sessionCandidate.creator_id || targetCreatorId;
      }
    }

    if (!targetCreatorId) {
      return { success: false, reason: "No matching creator attribution found." };
    }

    // 3. Self-referral prevention
    const { data: creatorProfile } = await supabaseAdmin
      .from("creator_profiles")
      .select("user_id")
      .eq("id", targetCreatorId)
      .maybeSingle();

    if (creatorProfile?.user_id === data.userId) {
      return { success: false, reason: "Self-referral blocked: User is the creator." };
    }

    const nowIso = new Date().toISOString();

    if (candidateId) {
      await supabaseAdmin
        .from("referral_attributions")
        .update({
          status: "signed_up",
          referred_user_id: data.userId,
          signup_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", candidateId);
    } else {
      await supabaseAdmin.from("referral_attributions").insert({
        creator_id: targetCreatorId,
        campaign_id: data.campaignId || null,
        referred_user_id: data.userId,
        status: "signed_up",
        landing_at: nowIso,
        signup_at: nowIso,
        anonymous_session_id: data.anonymousSessionId || null,
      });
    }

    return { success: true, status: "signed_up" as const };
  });

// ─────────────────────────────────────────────
// 2. Submit Creator Application (Authenticated)
// ─────────────────────────────────────────────

const channelInputSchema = z.object({
  platform: z.enum([
    "tiktok",
    "instagram",
    "youtube",
    "linkedin",
    "x",
    "facebook",
    "newsletter",
    "blog",
    "podcast",
    "community",
    "other",
  ]),
  handle: z.string().max(200).optional(),
  url: z.string().url().max(500).optional().or(z.literal("")),
  followerCount: z.number().int().min(0).optional(),
});

const submitApplicationSchema = z.object({
  authToken: z.string().optional(),
  displayName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  publicHandle: z.string().min(4).max(48),
  primaryPlatform: z.enum([
    "tiktok",
    "instagram",
    "youtube",
    "linkedin",
    "x",
    "facebook",
    "newsletter",
    "blog",
    "podcast",
    "community",
    "other",
  ]),
  bio: z.string().max(500).optional(),
  websiteUrl: z.string().url().max(500).optional().or(z.literal("")),
  applicationNote: z.string().max(1000).optional(),
  channels: z.array(channelInputSchema).optional(),
});

export const submitCreatorApplicationServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof submitApplicationSchema>) => submitApplicationSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) {
      throw new Error("Unauthenticated: You must be logged in to apply for the Creator Program.");
    }

    const handle = data.publicHandle.trim().toLowerCase();
    if (!validateCreatorCode(handle)) {
      throw new Error("Invalid handle format. Use 4-48 lowercase letters, numbers, or hyphens.");
    }

    // Check if user already has an application
    const existing = await getCreatorProfileForUser(userId);
    if (existing) {
      if (existing.application_status === "approved") {
        throw new Error("You are already an approved SoloOS Creator.");
      }
      if (existing.application_status === "pending") {
        throw new Error("You already have a pending Creator application under review.");
      }
    }

    // Check if handle is already taken
    const { data: handleConflict } = await supabaseAdmin
      .from("creator_profiles")
      .select("id")
      .eq("public_handle", handle)
      .maybeSingle();

    if (handleConflict) {
      throw new Error(`The handle "@${handle}" is already in use. Please choose another.`);
    }

    // Insert creator profile
    const { data: profile, error: insertError } = await supabaseAdmin
      .from("creator_profiles")
      .insert({
        user_id: userId,
        email: data.email.trim().toLowerCase(),
        display_name: data.displayName.trim(),
        public_handle: handle,
        referral_code: handle,
        bio: data.bio?.trim() || null,
        website_url: data.websiteUrl?.trim() || null,
        primary_platform: data.primaryPlatform,
        application_status: "pending",
        creator_status: null,
        application_note: data.applicationNote?.trim() || null,
      })
      .select("*")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    // Insert channels if provided
    if (data.channels && data.channels.length > 0) {
      const channelRows = data.channels.map((ch) => ({
        creator_id: profile.id,
        platform: ch.platform,
        handle: ch.handle?.trim() || null,
        url: ch.url?.trim() || null,
        follower_count: ch.followerCount || null,
        is_verified: false,
      }));

      await supabaseAdmin.from("creator_channels").insert(channelRows);
    }

    // Send confirmation email
    try {
      const emailContent = renderCreatorApplicationSubmittedEmail({
        displayName: profile.display_name,
        publicHandle: profile.public_handle,
      });
      await sendEmail({
        to: profile.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (e) {
      console.error("[Creator] Failed to send submission email:", e);
    }

    return {
      success: true,
      profileId: profile.id,
      applicationStatus: profile.application_status,
    };
  });

// ─────────────────────────────────────────────
// 3. Get Current User Creator Profile
// ─────────────────────────────────────────────

export const getMyCreatorProfileServerFn = createServerFn({ method: "POST" })
  .validator((data: { authToken?: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated: Please sign in.");

    const profile = await getCreatorProfileForUser(userId);
    if (!profile) {
      return { isCreator: false as const, profile: null };
    }

    // Fetch channels
    const { data: channels } = await supabaseAdmin
      .from("creator_channels")
      .select("*")
      .eq("creator_id", profile.id)
      .order("created_at", { ascending: true });

    // Fetch campaigns
    const { data: campaigns } = await supabaseAdmin
      .from("creator_campaigns")
      .select("*")
      .eq("creator_id", profile.id)
      .order("created_at", { ascending: false });

    return {
      isCreator: true as const,
      profile,
      channels: channels ?? [],
      campaigns: campaigns ?? [],
    };
  });

// ─────────────────────────────────────────────
// 4. Create Creator Campaign
// ─────────────────────────────────────────────

const createCampaignSchema = z.object({
  authToken: z.string().optional(),
  name: z.string().min(1).max(100),
  campaignCode: z.string().min(4).max(64),
  platform: z
    .enum([
      "tiktok",
      "instagram",
      "youtube",
      "linkedin",
      "x",
      "facebook",
      "newsletter",
      "blog",
      "podcast",
      "community",
      "other",
    ])
    .optional(),
  destinationPath: z.string().max(200).default("/"),
});

export const createCreatorCampaignServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof createCampaignSchema>) => createCampaignSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated: Please sign in.");

    const profile = await getCreatorProfileForUser(userId);
    if (!profile || profile.creator_status !== "active") {
      throw new Error("Forbidden: Only active creators can create campaigns.");
    }

    const campCode = data.campaignCode.trim().toLowerCase();
    if (!validateCampaignCode(campCode)) {
      throw new Error(
        "Invalid campaign code format. Use 4-64 lowercase letters, numbers, or hyphens.",
      );
    }

    // Check conflict
    const { data: conflict } = await supabaseAdmin
      .from("creator_campaigns")
      .select("id")
      .eq("campaign_code", campCode)
      .maybeSingle();

    if (conflict) {
      throw new Error(`Campaign code "${campCode}" is already in use. Choose another.`);
    }

    const { data: campaign, error } = await supabaseAdmin
      .from("creator_campaigns")
      .insert({
        creator_id: profile.id,
        name: data.name.trim(),
        campaign_code: campCode,
        platform: data.platform || profile.primary_platform,
        destination_path: data.destinationPath.startsWith("/")
          ? data.destinationPath
          : `/${data.destinationPath}`,
        status: "active",
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return { campaign };
  });

// ─────────────────────────────────────────────
// 5. Update Creator Campaign Status
// ─────────────────────────────────────────────

const updateCampaignSchema = z.object({
  authToken: z.string().optional(),
  campaignId: z.string().uuid(),
  status: z.enum(["active", "paused", "archived"]),
  name: z.string().min(1).max(100).optional(),
});

export const updateCreatorCampaignServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof updateCampaignSchema>) => updateCampaignSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated: Please sign in.");

    const profile = await getCreatorProfileForUser(userId);
    if (!profile) throw new Error("Forbidden: Creator profile not found.");

    const updates: {
      status: CampaignStatus;
      name?: string;
      archived_at?: string;
    } = { status: data.status };
    if (data.name) updates.name = data.name.trim();
    if (data.status === "archived") updates.archived_at = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from("creator_campaigns")
      .update(updates)
      .eq("id", data.campaignId)
      .eq("creator_id", profile.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { campaign: updated };
  });

// ─────────────────────────────────────────────
// 6. Creator Earnings & Funnel
// ─────────────────────────────────────────────

export const getCreatorEarningsServerFn = createServerFn({ method: "POST" })
  .validator((data: { authToken?: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated: Please sign in.");

    const profile = await getCreatorProfileForUser(userId);
    if (!profile) throw new Error("Forbidden: Creator profile not found.");

    // Commissions
    const { data: commissions, error: commError } = await supabaseAdmin
      .from("creator_commissions")
      .select("*")
      .eq("creator_id", profile.id)
      .order("created_at", { ascending: false });

    if (commError) throw new Error(commError.message);

    // Payouts
    const { data: payouts, error: payError } = await supabaseAdmin
      .from("creator_payouts")
      .select("*")
      .eq("creator_id", profile.id)
      .order("created_at", { ascending: false });

    if (payError) throw new Error(payError.message);

    // Attributions for funnel metrics
    const { data: attributions, error: attrError } = await supabaseAdmin
      .from("referral_attributions")
      .select("id, status, landing_at, signup_at, activated_at, converted_at")
      .eq("creator_id", profile.id);

    if (attrError) throw new Error(attrError.message);

    const funnel = computeCreatorFunnel(attributions ?? []);
    const aggregated = aggregateCommissions(commissions ?? []);

    return {
      commissions: commissions ?? [],
      payouts: payouts ?? [],
      funnel,
      aggregated,
    };
  });

// ─────────────────────────────────────────────
// 7. Creator Assets & Resources
// ─────────────────────────────────────────────

export const getCreatorAssetsServerFn = createServerFn({ method: "GET" }).handler(async () => {
  const { data: assets, error } = await supabaseAdmin
    .from("creator_assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return { assets: assets ?? [] };
});

// ─────────────────────────────────────────────
// 8. Admin: List Creators
// ─────────────────────────────────────────────

const adminListCreatorsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  applicationStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  creatorStatus: z.enum(["active", "suspended", "closed"]).optional(),
  search: z.string().optional(),
});

export const adminListCreatorsServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminListCreatorsSchema>) => adminListCreatorsSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("Unauthenticated");
    await requirePlatformAdmin(userId);

    const { page, pageSize, applicationStatus, creatorStatus, search } = data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("creator_profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (applicationStatus) query = query.eq("application_status", applicationStatus);
    if (creatorStatus) query = query.eq("creator_status", creatorStatus);
    if (search) {
      query = query.or(
        `display_name.ilike.%${search}%,public_handle.ilike.%${search}%,email.ilike.%${search}%`,
      );
    }

    const { data: creators, count, error } = await query;
    if (error) throw new Error(error.message);

    return {
      creators: creators ?? [],
      total: count ?? 0,
      page,
      pageSize,
    };
  });

// ─────────────────────────────────────────────
// 9. Admin: Get Creator Details
// ─────────────────────────────────────────────

const adminGetCreatorSchema = z.object({
  creatorId: z.string().uuid(),
});

export const adminGetCreatorDetailsServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminGetCreatorSchema>) => adminGetCreatorSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("Unauthenticated");
    await requirePlatformAdmin(userId);

    const { data: profile, error: profError } = await supabaseAdmin
      .from("creator_profiles")
      .select("*")
      .eq("id", data.creatorId)
      .single();

    if (profError) throw new Error(profError.message);

    const [channelsRes, campaignsRes, commissionsRes, payoutsRes, attributionsRes] =
      await Promise.all([
        supabaseAdmin.from("creator_channels").select("*").eq("creator_id", data.creatorId),
        supabaseAdmin.from("creator_campaigns").select("*").eq("creator_id", data.creatorId),
        supabaseAdmin
          .from("creator_commissions")
          .select("*")
          .eq("creator_id", data.creatorId)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("creator_payouts")
          .select("*")
          .eq("creator_id", data.creatorId)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("referral_attributions")
          .select("id, status, landing_at, signup_at, activated_at, converted_at")
          .eq("creator_id", data.creatorId),
      ]);

    const funnel = computeCreatorFunnel(attributionsRes.data ?? []);
    const aggregated = aggregateCommissions(commissionsRes.data ?? []);

    return {
      profile,
      channels: channelsRes.data ?? [],
      campaigns: campaignsRes.data ?? [],
      commissions: commissionsRes.data ?? [],
      payouts: payoutsRes.data ?? [],
      funnel,
      aggregated,
    };
  });

// ─────────────────────────────────────────────
// 10. Admin: Review Creator Application
// ─────────────────────────────────────────────

const reviewApplicationSchema = z.object({
  creatorId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  adminNote: z.string().max(500).optional(),
});

export const adminReviewCreatorApplicationServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof reviewApplicationSchema>) => reviewApplicationSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("Unauthenticated");
    await requirePlatformAdmin(userId);

    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from("creator_profiles")
      .select("*")
      .eq("id", data.creatorId)
      .single();

    if (fetchErr || !profile) throw new Error("Creator profile not found.");

    const now = new Date().toISOString();
    const updates: {
      application_status: ApplicationStatus;
      admin_note?: string | null;
      updated_at: string;
      creator_status?: CreatorStatus | null;
      approved_at?: string | null;
      approved_by?: string | null;
      rejected_at?: string | null;
    } = {
      application_status: data.decision,
      admin_note: data.adminNote?.trim() || null,
      updated_at: now,
    };

    if (data.decision === "approved") {
      updates.creator_status = "active";
      updates.approved_at = now;
      updates.approved_by = userId;
    } else {
      updates.rejected_at = now;
      updates.creator_status = null;
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("creator_profiles")
      .update(updates)
      .eq("id", data.creatorId)
      .select("*")
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // If approved, create default campaign if none exists
    if (data.decision === "approved") {
      const { data: existingCamp } = await supabaseAdmin
        .from("creator_campaigns")
        .select("id")
        .eq("creator_id", data.creatorId)
        .maybeSingle();

      if (!existingCamp) {
        await supabaseAdmin.from("creator_campaigns").insert({
          creator_id: data.creatorId,
          name: "Default Campaign",
          campaign_code: `${updated.public_handle}-launch`,
          platform: updated.primary_platform,
          destination_path: "/",
          status: "active",
        });
      }

      // Send approval email
      try {
        const origin =
          (process.env["VITE_APP_URL"] as string | undefined) || "https://solofinance.app";
        const emailContent = renderCreatorApplicationApprovedEmail({
          displayName: updated.display_name,
          publicHandle: updated.public_handle,
          referralLink: `${origin}/c/${updated.referral_code}`,
          dashboardLink: `${origin}/app/creator`,
        });
        await sendEmail({
          to: updated.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (e) {
        console.error("[Creator] Failed to send approval email:", e);
      }
    } else {
      // Send rejection email
      try {
        const emailContent = renderCreatorApplicationRejectedEmail({
          displayName: updated.display_name,
          reason: data.adminNote,
        });
        await sendEmail({
          to: updated.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (e) {
        console.error("[Creator] Failed to send rejection email:", e);
      }
    }

    // Write platform audit log
    await supabaseAdmin.from("platform_audit_logs").insert({
      actor_id: userId,
      action: `creator.application_${data.decision}`,
      entity_type: "creator_profile",
      entity_id: data.creatorId,
      metadata: {
        public_handle: updated.public_handle,
        email: updated.email,
        admin_note: data.adminNote ?? null,
      },
    });

    return { profile: updated };
  });

// ─────────────────────────────────────────────
// 11. Admin: Update Creator Status (Suspend / Close)
// ─────────────────────────────────────────────

const updateCreatorStatusSchema = z.object({
  creatorId: z.string().uuid(),
  status: z.enum(["active", "suspended", "closed"]),
  reason: z.string().max(500).optional(),
});

export const adminUpdateCreatorStatusServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof updateCreatorStatusSchema>) =>
    updateCreatorStatusSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("Unauthenticated");
    await requirePlatformAdmin(userId);

    const now = new Date().toISOString();
    const updates: {
      creator_status: CreatorStatus;
      updated_at: string;
      suspended_at?: string | null;
    } = {
      creator_status: data.status,
      updated_at: now,
    };
    if (data.status === "suspended") updates.suspended_at = now;

    const { data: updated, error } = await supabaseAdmin
      .from("creator_profiles")
      .update(updates)
      .eq("id", data.creatorId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("platform_audit_logs").insert({
      actor_id: userId,
      action: `creator.status_${data.status}`,
      entity_type: "creator_profile",
      entity_id: data.creatorId,
      metadata: { status: data.status, reason: data.reason ?? null },
    });

    return { profile: updated };
  });

// ─────────────────────────────────────────────
// 12. Admin: List Commissions
// ─────────────────────────────────────────────

const adminListCommissionsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "approved", "paid", "reversed", "ineligible"]).optional(),
  currency: z.string().length(3).optional(),
  creatorId: z.string().uuid().optional(),
});

export const adminListCommissionsServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminListCommissionsSchema>) =>
    adminListCommissionsSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("Unauthenticated");
    await requirePlatformAdmin(userId);

    const { page, pageSize, status, currency, creatorId } = data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("creator_commissions")
      .select(
        `
        id, creator_id, attribution_id, subscription_payment_id,
        referred_workspace_id, commission_rule_id, billing_period_label,
        gross_amount_cents, commission_rate_bps, window_months_snapshot,
        commission_amount_cents, currency, status, created_at, approved_at,
        paid_at, reversed_at, reversal_reason,
        creator_profiles(id, display_name, public_handle, email),
        workspaces(id, name)
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (currency) query = query.eq("currency", currency.toUpperCase());
    if (creatorId) query = query.eq("creator_id", creatorId);

    const { data: commissions, count, error } = await query;
    if (error) throw new Error(error.message);

    return {
      commissions: commissions ?? [],
      total: count ?? 0,
      page,
      pageSize,
    };
  });

// ─────────────────────────────────────────────
// 13. Admin: Review Commission (Approve / Reverse)
// ─────────────────────────────────────────────

const adminReviewCommissionSchema = z.object({
  commissionId: z.string().uuid(),
  decision: z.enum(["approved", "reversed"]),
  reason: z.string().max(500).optional(),
});

export const adminReviewCommissionServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminReviewCommissionSchema>) =>
    adminReviewCommissionSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("Unauthenticated");
    await requirePlatformAdmin(userId);

    const now = new Date().toISOString();
    const updates: {
      status: CommissionStatus;
      updated_at: string;
      approved_at?: string | null;
      approved_by?: string | null;
      reversed_at?: string | null;
      reversal_reason?: string | null;
    } = {
      status: data.decision,
      updated_at: now,
    };

    if (data.decision === "approved") {
      updates.approved_at = now;
      updates.approved_by = userId;
    } else {
      updates.reversed_at = now;
      updates.reversal_reason = data.reason?.trim() || null;
    }

    const { data: updated, error } = await supabaseAdmin
      .from("creator_commissions")
      .update(updates)
      .eq("id", data.commissionId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("platform_audit_logs").insert({
      actor_id: userId,
      action: `creator.commission_${data.decision}`,
      entity_type: "creator_commission",
      entity_id: data.commissionId,
      metadata: { decision: data.decision, reason: data.reason ?? null },
    });

    return { commission: updated };
  });

// ─────────────────────────────────────────────
// 14. Admin: List Payouts & Record Manual Payout
// ─────────────────────────────────────────────

const adminListPayoutsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "approved", "processing", "paid", "failed", "cancelled"]).optional(),
  creatorId: z.string().uuid().optional(),
});

export const adminListPayoutsServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminListPayoutsSchema>) => adminListPayoutsSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("Unauthenticated");
    await requirePlatformAdmin(userId);

    const { page, pageSize, status, creatorId } = data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("creator_payouts")
      .select(
        `
        id, creator_id, currency, amount_cents, status, payout_reference,
        commission_ids, requested_at, approved_at, paid_at, failed_at,
        created_at,
        creator_profiles(id, display_name, public_handle, email)
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (creatorId) query = query.eq("creator_id", creatorId);

    const { data: payouts, count, error } = await query;
    if (error) throw new Error(error.message);

    return {
      payouts: payouts ?? [],
      total: count ?? 0,
      page,
      pageSize,
    };
  });

const recordManualPayoutSchema = z.object({
  creatorId: z.string().uuid(),
  currency: z.string().length(3),
  amountCents: z.number().int().positive(),
  payoutReference: z.string().min(1).max(100),
  commissionIds: z.array(z.string().uuid()),
});

export const adminRecordManualPayoutServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof recordManualPayoutSchema>) =>
    recordManualPayoutSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("Unauthenticated");
    await requirePlatformAdmin(userId);

    const { data: creator, error: cErr } = await supabaseAdmin
      .from("creator_profiles")
      .select("id, display_name, email")
      .eq("id", data.creatorId)
      .single();

    if (cErr || !creator) throw new Error("Creator not found.");

    const now = new Date().toISOString();

    // Insert payout record
    const { data: payout, error: pErr } = await supabaseAdmin
      .from("creator_payouts")
      .insert({
        creator_id: data.creatorId,
        currency: data.currency.toUpperCase(),
        amount_cents: data.amountCents,
        status: "paid",
        payout_reference: data.payoutReference.trim(),
        commission_ids: data.commissionIds,
        requested_at: now,
        approved_at: now,
        approved_by: userId,
        paid_at: now,
      })
      .select("*")
      .single();

    if (pErr) throw new Error(pErr.message);

    // Update the associated commissions to 'paid'
    if (data.commissionIds.length > 0) {
      await supabaseAdmin
        .from("creator_commissions")
        .update({
          status: "paid",
          paid_at: now,
          updated_at: now,
        })
        .in("id", data.commissionIds)
        .eq("creator_id", data.creatorId);
    }

    // Send confirmation email
    try {
      const emailContent = renderCreatorPayoutApprovedEmail({
        displayName: creator.display_name,
        amountFormatted: `${(data.amountCents / 100).toFixed(2)} ${data.currency}`,
        reference: data.payoutReference,
      });
      await sendEmail({
        to: creator.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (e) {
      console.error("[Creator] Failed to send payout email:", e);
    }

    // Platform audit log
    await supabaseAdmin.from("platform_audit_logs").insert({
      actor_id: userId,
      action: "creator.payout_recorded",
      entity_type: "creator_payout",
      entity_id: payout.id,
      metadata: {
        creator_id: data.creatorId,
        amount_cents: data.amountCents,
        currency: data.currency,
        reference: data.payoutReference,
        commission_count: data.commissionIds.length,
      },
    });

    return { payout };
  });

// ─────────────────────────────────────────────
// 15. Server-side Commission Trigger
// ─────────────────────────────────────────────

export async function triggerCreatorCommissionForPayment(
  subscriptionPaymentId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc("generate_creator_commission", {
      p_subscription_payment_id: subscriptionPaymentId,
    });

    if (error) {
      console.error("[Creator] generate_creator_commission RPC error:", error);
      return null;
    }

    return (data as string) || null;
  } catch (err) {
    console.error("[Creator] Exception in triggerCreatorCommissionForPayment:", err);
    return null;
  }
}

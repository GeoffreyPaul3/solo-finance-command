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

      if (existing && existing.creator_id) {
        return {
          recorded: true,
          creatorId: existing.creator_id,
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
  creatorCode: z.string().optional(),
  campaignId: z.string().uuid().optional(),
  anonymousSessionId: z.string().optional(),
});

export const recordCreatorSignupServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof recordCreatorSignupSchema>) =>
    recordCreatorSignupSchema.parse(data),
  )
  .handler(async ({ data }) => {
    let targetCreatorId = data.creatorId || null;

    if (!targetCreatorId && data.creatorCode) {
      const code = data.creatorCode.trim().toLowerCase();
      const { data: creator } = await supabaseAdmin
        .from("creator_profiles")
        .select("id")
        .eq("referral_code", code)
        .eq("creator_status", "active")
        .maybeSingle();

      if (creator) {
        targetCreatorId = creator.id;
      }
    }

    // 1. Check if user is already attributed to a creator
    const { data: alreadyAttributed } = await supabaseAdmin
      .from("referral_attributions")
      .select("id, status, creator_id")
      .eq("referred_user_id", data.userId)
      .maybeSingle();

    if (alreadyAttributed && alreadyAttributed.creator_id) {
      return { success: true, status: alreadyAttributed.status, alreadyLinked: true };
    }

    // 2. Find attribution candidate by anonymousSessionId
    let candidateId: string | null = alreadyAttributed?.id || null;

    if (!candidateId && data.anonymousSessionId) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: sessionCandidate } = await supabaseAdmin
        .from("referral_attributions")
        .select("id, creator_id, status")
        .eq("anonymous_session_id", data.anonymousSessionId)
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
          creator_id: targetCreatorId,
          ...(data.campaignId ? { campaign_id: data.campaignId } : {}),
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
// 1d. Record Creator Workspace Activation
// ─────────────────────────────────────────────

const recordCreatorActivationSchema = z.object({
  userId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const recordCreatorActivationServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof recordCreatorActivationSchema>) =>
    recordCreatorActivationSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const nowIso = new Date().toISOString();
    const { data: attr } = await supabaseAdmin
      .from("referral_attributions")
      .select("id, status, creator_id, referred_workspace_id")
      .or(`referred_workspace_id.eq.${data.workspaceId},referred_user_id.eq.${data.userId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attr) {
      await supabaseAdmin
        .from("referral_attributions")
        .update({
          referred_workspace_id: data.workspaceId,
          status: attr.status === "visited" || attr.status === "signed_up" ? "activated" : attr.status,
          activated_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", attr.id);
      return { success: true };
    }
    return { success: false, reason: "No attribution found" };
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

    // Check if user already has an active creator profile
    const existing = await getCreatorProfileForUser(userId);
    if (existing) {
      if (existing.application_status === "approved" || existing.creator_status === "active") {
        throw new Error("You are already an approved SoloOS Creator.");
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

    // Insert creator profile — auto-approved, instantly active
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
        application_status: "approved",
        creator_status: "active",
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

    // Send welcome / activated email
    try {
      const origin = process.env["APP_URL"] || "https://solofinance.app";
      const emailContent = renderCreatorApplicationApprovedEmail({
        displayName: profile.display_name,
        publicHandle: profile.public_handle,
        referralLink: `${origin}/c/${profile.referral_code}`,
        dashboardLink: `${origin}/creator`,
      });
      await sendEmail({
        to: profile.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (e) {
      console.error("[Creator] Failed to send activation email:", e);
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
  .validator((data: { authToken?: string | undefined }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated: Please sign in.");

    const profile = await getCreatorProfileForUser(userId);
    if (!profile) {
      return { isCreator: false as const, profile: null };
    }

    // Auto-promote any legacy pending application to approved and active
    if (profile && (profile.application_status === "pending" || !profile.creator_status)) {
      const now = new Date().toISOString();
      await supabaseAdmin
        .from("creator_profiles")
        .update({
          application_status: "approved",
          creator_status: "active",
          approved_at: now,
          updated_at: now,
        })
        .eq("id", profile.id);
      profile.application_status = "approved";
      profile.creator_status = "active";
      profile.approved_at = now;

      // Ensure default vanity campaign exists
      const { data: existingCamp } = await supabaseAdmin
        .from("creator_campaigns")
        .select("id")
        .eq("creator_id", profile.id)
        .maybeSingle();

      if (!existingCamp) {
        await supabaseAdmin.from("creator_campaigns").insert({
          creator_id: profile.id,
          name: "Main Channel (Default)",
          campaign_code: profile.public_handle,
          platform: profile.primary_platform,
          destination_path: "/",
          status: "active",
        });
      }
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
  .validator((data: { authToken?: string | undefined }) => data)
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
  authToken: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  applicationStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  creatorStatus: z.enum(["active", "suspended", "closed"]).optional(),
  search: z.string().optional(),
});

export const adminListCreatorsServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminListCreatorsSchema>) => adminListCreatorsSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
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
  authToken: z.string().optional(),
  creatorId: z.string().uuid(),
});

export const adminGetCreatorDetailsServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminGetCreatorSchema>) => adminGetCreatorSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
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
  authToken: z.string().optional(),
  creatorId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  adminNote: z.string().max(500).optional(),
});

export const adminReviewCreatorApplicationServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof reviewApplicationSchema>) => reviewApplicationSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
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
          dashboardLink: `${origin}/creator`,
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
  authToken: z.string().optional(),
  creatorId: z.string().uuid(),
  status: z.enum(["active", "suspended", "closed"]),
  reason: z.string().max(500).optional(),
});

export const adminUpdateCreatorStatusServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof updateCreatorStatusSchema>) =>
    updateCreatorStatusSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
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
  authToken: z.string().optional(),
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
    const userId = await getAuthenticatedUserId(data.authToken);
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
  authToken: z.string().optional(),
  commissionId: z.string().uuid(),
  decision: z.enum(["approved", "reversed"]),
  reason: z.string().max(500).optional(),
});

export const adminReviewCommissionServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminReviewCommissionSchema>) =>
    adminReviewCommissionSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
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
  authToken: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "approved", "processing", "paid", "failed", "cancelled"]).optional(),
  creatorId: z.string().uuid().optional(),
});

export const adminListPayoutsServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminListPayoutsSchema>) => adminListPayoutsSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
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
  authToken: z.string().optional(),
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
    const userId = await getAuthenticatedUserId(data.authToken);
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

const triggerCommissionSchema = z.object({
  subscriptionPaymentId: z.string().uuid(),
});

export const triggerCreatorCommissionForPaymentServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof triggerCommissionSchema>) => triggerCommissionSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { data: rpcData, error } = await supabaseAdmin.rpc("generate_creator_commission", {
        p_subscription_payment_id: data.subscriptionPaymentId,
      });

      if (error) {
        console.error("[Creator] generate_creator_commission RPC error:", error);
        return { commissionId: null };
      }

      return { commissionId: (rpcData as string) || null };
    } catch (err) {
      console.error("[Creator] Exception in triggerCreatorCommissionForPayment:", err);
      return { commissionId: null };
    }
  });

export async function triggerCreatorCommissionForPayment(
  subscriptionPaymentId: string,
): Promise<string | null> {
  const res = await triggerCreatorCommissionForPaymentServerFn({
    data: { subscriptionPaymentId },
  });
  return res.commissionId;
}

// ─────────────────────────────────────────────
// 16. Creator: Update Payout Details (Malawi)
// ─────────────────────────────────────────────

const mobileMoneySchema = z.object({
  payoutMethod: z.literal("mobile_money"),
  mobileMoneyProvider: z.enum(["airtel", "tnm"]),
  mobileMoneyNumber: z.string().min(9).max(15),
  mobileMoneyAccountName: z.string().min(2).max(100),
});

const bankPayoutSchema = z.object({
  payoutMethod: z.literal("bank"),
  bankName: z.string().min(2).max(100),
  bankAccountNumber: z.string().min(4).max(50),
  bankAccountName: z.string().min(2).max(100),
  bankBranch: z.string().max(100).optional(),
});

const updatePayoutDetailsSchema = z
  .object({
    authToken: z.string().optional(),
    country: z.literal("MW"),
    phone: z.string().max(20).optional(),
    city: z.string().max(100).optional(),
  })
  .and(z.discriminatedUnion("payoutMethod", [mobileMoneySchema, bankPayoutSchema]));

export const updateCreatorPayoutDetailsServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof updatePayoutDetailsSchema>) =>
    updatePayoutDetailsSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated: Please sign in.");

    const profile = await getCreatorProfileForUser(userId);
    if (!profile || profile.creator_status !== "active") {
      throw new Error("Forbidden: Only active creators can update payout details.");
    }

    const now = new Date().toISOString();

    const base = {
      country: data.country,
      phone: data.phone?.trim() || null,
      city: data.city?.trim() || null,
      payout_method: data.payoutMethod,
      payout_details_updated_at: now,
      updated_at: now,
    };

    let specific: Record<string, string | null> = {};

    if (data.payoutMethod === "mobile_money") {
      specific = {
        mobile_money_provider: data.mobileMoneyProvider,
        mobile_money_number: data.mobileMoneyNumber.trim(),
        mobile_money_account_name: data.mobileMoneyAccountName.trim(),
        bank_name: null,
        bank_account_number: null,
        bank_account_name: null,
        bank_branch: null,
      };
    } else {
      specific = {
        mobile_money_provider: null,
        mobile_money_number: null,
        mobile_money_account_name: null,
        bank_name: data.bankName.trim(),
        bank_account_number: data.bankAccountNumber.trim(),
        bank_account_name: data.bankAccountName.trim(),
        bank_branch: data.bankBranch?.trim() || null,
      };
    }

    const { data: updated, error } = await supabaseAdmin
      .from("creator_profiles")
      .update({ ...base, ...specific })
      .eq("id", profile.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("platform_audit_logs").insert({
      actor_id: userId,
      action: "creator.payout_details_updated",
      entity_type: "creator_profile",
      entity_id: profile.id,
      metadata: { payout_method: data.payoutMethod, country: data.country },
    });

    return { profile: updated };
  });

// ─────────────────────────────────────────────
// 17. Brand & Media Kit: Public Listing
// ─────────────────────────────────────────────

export const getBrandAssetsServerFn = createServerFn({ method: "GET" }).handler(async () => {
  const { data: assets, error } = await supabaseAdmin
    .from("creator_assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return { assets: assets ?? [] };
});

// ─────────────────────────────────────────────
// 18. Admin: Manage Brand & Media Kit Assets
// ─────────────────────────────────────────────

const adminAddBrandAssetSchema = z.object({
  authToken: z.string().optional(),
  assetType: z.enum([
    "logo",
    "screenshot",
    "social_graphic",
    "video",
    "copy_template",
    "content_idea",
    "product_description",
    "campaign_asset",
  ]),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  url: z.string().url().max(1000),
  status: z.enum(["active", "archived"]).default("active"),
});

export const adminAddBrandAssetServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminAddBrandAssetSchema>) =>
    adminAddBrandAssetSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated");
    await requirePlatformAdmin(userId);

    const { data: asset, error } = await supabaseAdmin
      .from("creator_assets")
      .insert({
        asset_type: data.assetType,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        url: data.url.trim(),
        status: data.status,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("platform_audit_logs").insert({
      actor_id: userId,
      action: "admin.brand_asset_added",
      entity_type: "creator_asset",
      entity_id: asset.id,
      metadata: { title: data.title, asset_type: data.assetType },
    });

    return { asset };
  });

const adminDeleteBrandAssetSchema = z.object({
  authToken: z.string().optional(),
  assetId: z.string().uuid(),
});

export const adminDeleteBrandAssetServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminDeleteBrandAssetSchema>) =>
    adminDeleteBrandAssetSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated");
    await requirePlatformAdmin(userId);

    const { error } = await supabaseAdmin
      .from("creator_assets")
      .delete()
      .eq("id", data.assetId);

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("platform_audit_logs").insert({
      actor_id: userId,
      action: "admin.brand_asset_deleted",
      entity_type: "creator_asset",
      entity_id: data.assetId,
      metadata: {},
    });

    return { success: true };
  });

const adminUpdateBrandAssetSchema = z.object({
  authToken: z.string().optional(),
  assetId: z.string().uuid(),
  assetType: z.enum([
    "logo",
    "screenshot",
    "social_graphic",
    "video",
    "copy_template",
    "content_idea",
    "product_description",
    "campaign_asset",
  ]).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  url: z.string().url().max(1000).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export const adminUpdateBrandAssetServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminUpdateBrandAssetSchema>) =>
    adminUpdateBrandAssetSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated");
    await requirePlatformAdmin(userId);

    const updates: {
      updated_at: string;
      title?: string;
      description?: string | null;
      url?: string;
      status?: string;
      asset_type?: string;
    } = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) updates.title = data.title.trim();
    if (data.description !== undefined) updates.description = data.description.trim() || null;
    if (data.url !== undefined) updates.url = data.url.trim();
    if (data.status !== undefined) updates.status = data.status;
    if (data.assetType !== undefined) updates.asset_type = data.assetType;

    const { data: asset, error } = await supabaseAdmin
      .from("creator_assets")
      .update(updates)
      .eq("id", data.assetId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { asset };
  });

// ─────────────────────────────────────────────
// 19. Admin: Get Creator Payout Details
// ─────────────────────────────────────────────

const adminGetCreatorPayoutDetailsSchema = z.object({
  authToken: z.string().optional(),
  creatorId: z.string().uuid(),
});

export const adminGetCreatorPayoutDetailsServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof adminGetCreatorPayoutDetailsSchema>) =>
    adminGetCreatorPayoutDetailsSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated");
    await requirePlatformAdmin(userId);

    const { data: profile, error } = await supabaseAdmin
      .from("creator_profiles")
      .select(
        `id, display_name, public_handle, email, payout_method, mobile_money_provider,
         mobile_money_number, mobile_money_account_name, bank_name, bank_account_number,
         bank_account_name, bank_branch, country, phone, city, payout_details_updated_at`,
      )
      .eq("id", data.creatorId)
      .single();

    if (error) throw new Error(error.message);
    return { profile };
  });


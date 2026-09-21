import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  generateReferralCode,
  isReferralStatusTransitionValid,
  isSelfReferral,
  isWorkspaceActivated,
  REFERRAL_ATTRIBUTION_WINDOW_MS,
  validateReferralCode,
  type ReferralStatus,
} from "@/domain/referrals";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

async function verifyWorkspaceMembership(userId: string | null, workspaceId: string) {
  if (!userId) {
    throw new Error("Unauthenticated: Please sign in.");
  }
  const { data, error } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Forbidden: You do not have access to this workspace.");
  }
  return data.role;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Get or Create Referral Profile
// ─────────────────────────────────────────────────────────────────────────────

const getReferralProfileSchema = z.object({
  workspaceId: z.string().uuid(),
  authToken: z.string().optional(),
});

export const getReferralProfileServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof getReferralProfileSchema>) =>
    getReferralProfileSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated: Please sign in.");
    await verifyWorkspaceMembership(userId, data.workspaceId);

    // Try to fetch existing profile
    const { data: existing } = await supabaseAdmin
      .from("workspace_referral_profiles")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    if (existing) return { profile: existing };

    // Get workspace name to generate code
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("name")
      .eq("id", data.workspaceId)
      .single();

    const referralCode = generateReferralCode(ws?.name ?? "SOLO");

    const { data: created, error } = await supabaseAdmin
      .from("workspace_referral_profiles")
      .insert({
        workspace_id: data.workspaceId,
        referral_code: referralCode,
        created_by: userId,
      })
      .select()
      .single();

    if (error || !created) {
      throw new Error("Failed to create referral profile.");
    }

    return { profile: created };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 2. Get Referral Attribution Funnel
// ─────────────────────────────────────────────────────────────────────────────

const getReferralFunnelSchema = z.object({
  workspaceId: z.string().uuid(),
  authToken: z.string().optional(),
});

export const getReferralFunnelServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof getReferralFunnelSchema>) => getReferralFunnelSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated: Please sign in.");
    await verifyWorkspaceMembership(userId, data.workspaceId);

    // Get referral profile first
    const { data: profile } = await supabaseAdmin
      .from("workspace_referral_profiles")
      .select("referral_code")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    if (!profile) return { attributions: [], funnel: null };

    const { data: attributions, error } = await supabaseAdmin
      .from("referral_attributions")
      .select("*")
      .eq("referral_code", profile.referral_code)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const rows = attributions ?? [];
    const totalClicks = rows.length;
    const totalSignups = rows.filter((r) =>
      ["signed_up", "activated", "converted"].includes(r.status),
    ).length;
    const totalActivated = rows.filter((r) => ["activated", "converted"].includes(r.status)).length;
    const totalConverted = rows.filter((r) => r.status === "converted").length;

    return {
      attributions: rows,
      funnel: {
        totalClicks,
        totalSignups,
        totalActivated,
        totalConverted,
        conversionRatePercent:
          totalClicks > 0 ? Math.round((totalConverted / totalClicks) * 1000) / 10 : 0,
      },
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 3. Record Referral Landing (public, anonymous, 30-day first-touch enforced)
// ─────────────────────────────────────────────────────────────────────────────

const recordReferralLandingSchema = z.object({
  referralCode: z.string().min(2).max(32),
  anonymousSessionId: z.string().optional(),
});

export const recordReferralLandingServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof recordReferralLandingSchema>) =>
    recordReferralLandingSchema.parse(data),
  )
  .handler(async ({ data }) => {
    if (!validateReferralCode(data.referralCode)) {
      return { recorded: false, reason: "Invalid referral code format." };
    }

    const cleanCode = data.referralCode.toUpperCase();

    // Look up referral profile
    const { data: profile } = await supabaseAdmin
      .from("workspace_referral_profiles")
      .select("id, workspace_id")
      .eq("referral_code", cleanCode)
      .maybeSingle();

    if (!profile) {
      return { recorded: false, reason: "Referral code not found." };
    }

    // First-touch check: if this session already has an active attribution (< 30 days), preserve it
    if (data.anonymousSessionId) {
      const thirtyDaysAgo = new Date(Date.now() - REFERRAL_ATTRIBUTION_WINDOW_MS).toISOString();
      const { data: existing } = await supabaseAdmin
        .from("referral_attributions")
        .select("id, referral_code, created_at")
        .eq("anonymous_session_id", data.anonymousSessionId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Active first-touch attribution wins!
        return {
          recorded: true,
          activeCode: existing.referral_code,
          isFirstTouchPreserved: existing.referral_code !== cleanCode,
        };
      }
    }

    // Insert new first-touch attribution record
    await supabaseAdmin.from("referral_attributions").insert({
      referral_code: cleanCode,
      referrer_workspace_id: profile.workspace_id,
      anonymous_session_id: data.anonymousSessionId || null,
      status: "visited",
      landing_at: new Date().toISOString(),
    });

    // Log distribution event
    await supabaseAdmin.from("distribution_events").insert({
      workspace_id: profile.workspace_id,
      event_type: "referral_clicked",
      referral_code: cleanCode,
      source: "public_referral_landing",
      metadata: { anonymousSessionId: data.anonymousSessionId || null },
    });

    return { recorded: true, activeCode: cleanCode, isFirstTouchPreserved: false };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 4. Record Referral Signup (transitions visited -> signed_up)
// ─────────────────────────────────────────────────────────────────────────────

const recordReferralSignupSchema = z.object({
  userId: z.string().uuid(),
  referralCode: z.string().optional(),
  anonymousSessionId: z.string().optional(),
  authToken: z.string().optional(),
});

export const recordReferralSignupServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof recordReferralSignupSchema>) =>
    recordReferralSignupSchema.parse(data),
  )
  .handler(async ({ data }) => {
    // 1. Check if user already has an attributed record
    const { data: alreadyAttributed } = await supabaseAdmin
      .from("referral_attributions")
      .select("id, status, referral_code")
      .eq("referred_user_id", data.userId)
      .maybeSingle();

    if (alreadyAttributed) {
      return { success: true, status: alreadyAttributed.status, alreadyLinked: true };
    }

    // 2. Find matching attribution candidate (session first, then referralCode)
    let candidateId: string | null = null;
    let targetReferralCode: string | null = null;
    let referrerWorkspaceId: string | null = null;

    if (data.anonymousSessionId) {
      const thirtyDaysAgo = new Date(Date.now() - REFERRAL_ATTRIBUTION_WINDOW_MS).toISOString();
      const { data: sessionCandidate } = await supabaseAdmin
        .from("referral_attributions")
        .select("id, referral_code, referrer_workspace_id, status")
        .eq("anonymous_session_id", data.anonymousSessionId)
        .eq("status", "visited")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (sessionCandidate) {
        candidateId = sessionCandidate.id;
        targetReferralCode = sessionCandidate.referral_code;
        referrerWorkspaceId = sessionCandidate.referrer_workspace_id;
      }
    }

    // Fallback to code match if no candidate from session
    if (!candidateId && data.referralCode && validateReferralCode(data.referralCode)) {
      const cleanCode = data.referralCode.toUpperCase();
      const { data: profile } = await supabaseAdmin
        .from("workspace_referral_profiles")
        .select("workspace_id")
        .eq("referral_code", cleanCode)
        .maybeSingle();

      if (profile) {
        targetReferralCode = cleanCode;
        referrerWorkspaceId = profile.workspace_id;
      }
    }

    if (!targetReferralCode || !referrerWorkspaceId) {
      return { success: false, reason: "No matching active referral attribution found." };
    }

    // 3. Self-referral prevention: check if user owns or belongs to referrer workspace
    const { data: referrerMembership } = await supabaseAdmin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", referrerWorkspaceId)
      .eq("user_id", data.userId)
      .maybeSingle();

    if (referrerMembership) {
      return {
        success: false,
        reason: "Self-referral blocked: User is member of referrer workspace.",
      };
    }

    const nowIso = new Date().toISOString();

    if (candidateId) {
      // Update existing visited attribution
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
      // Create fresh signed_up attribution
      const { data: newRow } = await supabaseAdmin
        .from("referral_attributions")
        .insert({
          referral_code: targetReferralCode,
          referrer_workspace_id: referrerWorkspaceId,
          referred_user_id: data.userId,
          anonymous_session_id: data.anonymousSessionId || null,
          status: "signed_up",
          landing_at: nowIso,
          signup_at: nowIso,
        })
        .select("id")
        .single();

      candidateId = newRow?.id || null;
    }

    // Log distribution event
    await supabaseAdmin.from("distribution_events").insert({
      workspace_id: referrerWorkspaceId,
      actor_user_id: data.userId,
      event_type: "referral_signup",
      referral_code: targetReferralCode,
      source: "auth_signup",
      metadata: { attributionId: candidateId },
    });

    return { success: true, status: "signed_up" as const, referralCode: targetReferralCode };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 5. Evaluate Referral Activation (>=1 financial account AND >=1 transaction)
// ─────────────────────────────────────────────────────────────────────────────

const evaluateReferralActivationSchema = z.object({
  workspaceId: z.string().uuid(),
  authToken: z.string().optional(),
});

export const evaluateReferralActivationServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof evaluateReferralActivationSchema>) =>
    evaluateReferralActivationSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    await verifyWorkspaceMembership(userId, data.workspaceId);

    // 1. Authoritative account and transaction counts
    const [{ count: accountsCount }, { count: txCount }] = await Promise.all([
      supabaseAdmin
        .from("financial_accounts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", data.workspaceId),
      supabaseAdmin
        .from("financial_transactions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", data.workspaceId),
    ]);

    const numAccounts = accountsCount || 0;
    const numTransactions = txCount || 0;
    const activated = isWorkspaceActivated(numAccounts, numTransactions);

    if (!activated) {
      return {
        activated: false,
        accountsCount: numAccounts,
        transactionsCount: numTransactions,
        message: "Activation requires at least 1 financial account and 1 transaction.",
      };
    }

    // 2. Find attribution linked to this workspace or creator user
    let { data: attribution } = await supabaseAdmin
      .from("referral_attributions")
      .select("id, referrer_workspace_id, status, referral_code, referred_user_id")
      .eq("referred_workspace_id", data.workspaceId)
      .maybeSingle();

    if (!attribution && userId) {
      const { data: userAttribution } = await supabaseAdmin
        .from("referral_attributions")
        .select("id, referrer_workspace_id, status, referral_code, referred_user_id")
        .eq("referred_user_id", userId)
        .is("referred_workspace_id", null)
        .maybeSingle();

      attribution = userAttribution;
    }

    if (!attribution) {
      return {
        activated: true,
        accountsCount: numAccounts,
        transactionsCount: numTransactions,
        attributed: false,
      };
    }

    // Check self-referral
    if (attribution.referrer_workspace_id === data.workspaceId) {
      return {
        activated: true,
        accountsCount: numAccounts,
        transactionsCount: numTransactions,
        attributed: false,
      };
    }

    // Idempotent progression: only upgrade if currently signed_up
    if (
      attribution.status === "signed_up" &&
      isReferralStatusTransitionValid(attribution.status, "activated")
    ) {
      const nowIso = new Date().toISOString();
      await supabaseAdmin
        .from("referral_attributions")
        .update({
          status: "activated",
          referred_workspace_id: data.workspaceId,
          activated_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", attribution.id);

      await supabaseAdmin.from("distribution_events").insert({
        workspace_id: attribution.referrer_workspace_id,
        actor_user_id: userId,
        event_type: "referral_activated",
        referral_code: attribution.referral_code,
        source: "workspace_activation",
        metadata: { referredWorkspaceId: data.workspaceId },
      });

      return {
        activated: true,
        attributed: true,
        status: "activated" as const,
        accountsCount: numAccounts,
        transactionsCount: numTransactions,
      };
    }

    return {
      activated: true,
      attributed: true,
      status: attribution.status as ReferralStatus,
      accountsCount: numAccounts,
      transactionsCount: numTransactions,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 6. Evaluate Referral Conversion (active paid subscription from Phase 9)
// ─────────────────────────────────────────────────────────────────────────────

const evaluateReferralConversionSchema = z.object({
  workspaceId: z.string().uuid(),
  authToken: z.string().optional(),
});

export const evaluateReferralConversionServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof evaluateReferralConversionSchema>) =>
    evaluateReferralConversionSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    await verifyWorkspaceMembership(userId, data.workspaceId);

    // Authoritative subscription check from Phase 9 schema
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status, plan_id")
      .eq("workspace_id", data.workspaceId)
      .eq("status", "active")
      .neq("plan_id", "free")
      .maybeSingle();

    const isPaidActive = Boolean(sub);

    if (!isPaidActive) {
      return { converted: false, reason: "No active paid subscription found." };
    }

    // Find attribution for this workspace
    const { data: attribution } = await supabaseAdmin
      .from("referral_attributions")
      .select("id, referrer_workspace_id, status, referral_code")
      .eq("referred_workspace_id", data.workspaceId)
      .maybeSingle();

    if (!attribution) {
      return { converted: true, attributed: false };
    }

    // Idempotent progression: only upgrade if currently signed_up or activated
    if (
      (attribution.status === "activated" || attribution.status === "signed_up") &&
      isReferralStatusTransitionValid(attribution.status as ReferralStatus, "converted")
    ) {
      const nowIso = new Date().toISOString();
      await supabaseAdmin
        .from("referral_attributions")
        .update({
          status: "converted",
          converted_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", attribution.id);

      await supabaseAdmin.from("distribution_events").insert({
        workspace_id: attribution.referrer_workspace_id,
        actor_user_id: userId,
        event_type: "referral_converted",
        referral_code: attribution.referral_code,
        source: "subscription_payment",
        metadata: { referredWorkspaceId: data.workspaceId, planId: sub?.plan_id },
      });

      return { converted: true, attributed: true, status: "converted" as const };
    }

    return { converted: true, attributed: true, status: attribution.status as ReferralStatus };
  });

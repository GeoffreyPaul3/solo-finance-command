import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  generateReferralCode,
  isSelfReferral,
  validateReferralCode,
} from "@/domain/referrals";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getAuthenticatedUserId(authToken?: string): Promise<string | null> {
  if (authToken) {
    try {
      const { data } = await supabaseAdmin.auth.getUser(authToken);
      if (data?.user) return data.user.id;
    } catch { /* ignore */ }
  }
  const { data } = await supabase.auth.getUser();
  if (data?.user) return data.user.id;
  const { data: sd } = await supabase.auth.getSession();
  if (sd.session?.user) return sd.session.user.id;
  return null;
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
  .validator((data: z.infer<typeof getReferralFunnelSchema>) =>
    getReferralFunnelSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    if (!userId) throw new Error("Unauthenticated: Please sign in.");

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
    const totalSignups = rows.filter(r => ["signed_up", "activated", "converted"].includes(r.status)).length;
    const totalActivated = rows.filter(r => ["activated", "converted"].includes(r.status)).length;
    const totalConverted = rows.filter(r => r.status === "converted").length;

    return {
      attributions: rows,
      funnel: {
        totalClicks,
        totalSignups,
        totalActivated,
        totalConverted,
        conversionRatePercent: totalClicks > 0 ? Math.round((totalConverted / totalClicks) * 1000) / 10 : 0,
      },
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 3. Record Referral Landing (public, anonymous)
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

    // Look up referral profile
    const { data: profile } = await supabaseAdmin
      .from("workspace_referral_profiles")
      .select("id, workspace_id")
      .eq("referral_code", data.referralCode.toUpperCase())
      .maybeSingle();

    if (!profile) {
      return { recorded: false, reason: "Referral code not found." };
    }

    // Insert first-touch attribution record (idempotent — if anon session already exists, skip)
    if (data.anonymousSessionId) {
      const { data: existing } = await supabaseAdmin
        .from("referral_attributions")
        .select("id")
        .eq("referral_code", data.referralCode.toUpperCase())
        .eq("anonymous_session_id", data.anonymousSessionId)
        .maybeSingle();

      if (existing) return { recorded: true }; // already recorded
    }

    await supabaseAdmin.from("referral_attributions").insert({
      referral_code: data.referralCode.toUpperCase(),
      referrer_workspace_id: profile.workspace_id,
      anonymous_session_id: data.anonymousSessionId || null,
      status: "visited",
      landing_at: new Date().toISOString(),
    });

    // Log distribution event
    await supabaseAdmin.from("distribution_events").insert({
      workspace_id: profile.workspace_id,
      event_type: "referral_clicked",
      referral_code: data.referralCode.toUpperCase(),
      source: "public_referral_landing",
      metadata: { anonymousSessionId: data.anonymousSessionId || null },
    });

    return { recorded: true };
  });

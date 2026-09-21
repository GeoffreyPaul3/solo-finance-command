import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  buildRedactedArtifactSnapshot,
  generateSecureShareToken,
  isArtifactAccessible,
  validateShareTokenFormat,
  type ArtifactStatus,
  type ArtifactType,
  type ArtifactVisibility,
} from "@/domain/shareable-artifacts";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { sendEmailSafely } from "@/lib/email/send";

async function getAuthenticatedUserId(authToken?: string): Promise<string | null> {
  if (authToken) {
    try {
      const { data } = await supabaseAdmin.auth.getUser(authToken);
      if (data?.user) return data.user.id;
    } catch {
      // Ignore invalid auth token
    }
  }
  const { data } = await supabase.auth.getUser();
  if (data?.user) return data.user.id;
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user.id;
  return null;
}

async function verifyWorkspaceRole(
  userId: string | null,
  workspaceId: string,
  allowedRoles: string[] = ["owner", "admin", "finance", "manager"],
) {
  if (!userId) {
    throw new Error("Unauthenticated: Please sign in.");
  }
  const { data, error } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data || !allowedRoles.includes(data.role)) {
    throw new Error("Forbidden: You do not have permission to manage shares in this workspace.");
  }
  return data.role;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Create Share Artifact
// ─────────────────────────────────────────────────────────────────────────────

const createShareArtifactSchema = z.object({
  workspaceId: z.string().uuid(),
  artifactType: z.enum([
    "financial_brief",
    "cashflow_report",
    "profitability_report",
    "client_report",
    "project_report",
    "tax_report",
    "invoice",
  ]),
  sourceEntityType: z.enum(["invoice", "client", "project", "workspace", "report"]),
  sourceEntityId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  visibility: z.enum(["workspace_only", "unlisted"]).default("unlisted"),
  accessConfig: z
    .object({
      hideNotes: z.boolean().optional(),
      hideLineItemPricing: z.boolean().optional(),
      hideAttentionSignals: z.boolean().optional(),
      customHeaderNote: z.string().max(500).optional(),
    })
    .default({}),
  expiresInDays: z.number().int().min(1).max(365).optional().nullable(),
  sourceData: z.record(z.unknown()),
  authToken: z.string().optional(),
});

export const createShareArtifactServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof createShareArtifactSchema>) =>
    createShareArtifactSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    await verifyWorkspaceRole(userId, data.workspaceId);

    // Compute expiration date if requested
    let expiresAt: string | null = null;
    if (data.expiresInDays) {
      const exp = new Date();
      exp.setDate(exp.getDate() + data.expiresInDays);
      expiresAt = exp.toISOString();
    }

    // Generate cryptographic 32-byte URL-safe token
    const shareToken = generateSecureShareToken();

    // Freeze redacted immutable snapshot
    const immutableSnapshot = buildRedactedArtifactSnapshot(
      data.artifactType as ArtifactType,
      data.sourceData,
      data.accessConfig,
    );

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("shareable_artifacts")
      .insert({
        workspace_id: data.workspaceId,
        created_by: userId,
        artifact_type: data.artifactType,
        source_entity_type: data.sourceEntityType,
        source_entity_id: data.sourceEntityId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        share_token: shareToken,
        visibility: data.visibility,
        status: "active",
        snapshot_data: immutableSnapshot as unknown as Json,
        access_config: data.accessConfig as unknown as Json,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      console.error("[Share Engine] Failed to insert shareable artifact:", insertErr);
      throw new Error("Failed to create shareable link. Please try again.");
    }

    // Log distribution event
    await supabaseAdmin.from("distribution_events").insert({
      workspace_id: data.workspaceId,
      actor_user_id: userId,
      event_type: "share_created",
      artifact_id: inserted.id,
      source: "app",
      metadata: {
        artifactType: data.artifactType,
        visibility: data.visibility,
        expiresAt,
      },
    });

    return {
      success: true,
      artifactId: inserted.id,
      shareToken: inserted.share_token,
      shareUrl: `/share/${inserted.share_token}`,
      title: inserted.title,
      visibility: inserted.visibility,
      expiresAt: inserted.expires_at,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 2. Revoke Share Artifact
// ─────────────────────────────────────────────────────────────────────────────

const revokeShareArtifactSchema = z.object({
  workspaceId: z.string().uuid(),
  artifactId: z.string().uuid(),
  authToken: z.string().optional(),
});

export const revokeShareArtifactServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof revokeShareArtifactSchema>) =>
    revokeShareArtifactSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    await verifyWorkspaceRole(userId, data.workspaceId);

    const { data: updated, error } = await supabaseAdmin
      .from("shareable_artifacts")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.artifactId)
      .eq("workspace_id", data.workspaceId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error("Artifact not found or could not be revoked.");
    }

    await supabaseAdmin.from("distribution_events").insert({
      workspace_id: data.workspaceId,
      actor_user_id: userId,
      event_type: "share_revoked",
      artifact_id: updated.id,
      source: "app",
      metadata: { revokedAt: updated.revoked_at },
    });

    return { success: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 3. Get Public Share Artifact (Recipient lookup)
// ─────────────────────────────────────────────────────────────────────────────

const getPublicShareArtifactSchema = z.object({
  shareToken: z.string().min(20).max(128),
  anonymousSessionId: z.string().optional(),
});

export const getPublicShareArtifactServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof getPublicShareArtifactSchema>) =>
    getPublicShareArtifactSchema.parse(data),
  )
  .handler(async ({ data }) => {
    if (!validateShareTokenFormat(data.shareToken)) {
      return {
        found: false,
        reason: "This share link is no longer available.",
      };
    }

    // Look up artifact using admin client (bypasses RLS to find unlisted share)
    const { data: artifact, error } = await supabaseAdmin
      .from("shareable_artifacts")
      .select(
        `
        id,
        workspace_id,
        title,
        description,
        artifact_type,
        status,
        visibility,
        snapshot_data,
        access_config,
        view_count,
        expires_at,
        revoked_at,
        created_at
      `,
      )
      .eq("share_token", data.shareToken)
      .maybeSingle();

    if (error || !artifact) {
      return {
        found: false,
        reason: "This share link is no longer available.",
      };
    }

    // Check accessibility
    const accessCheck = isArtifactAccessible(
      {
        status: artifact.status as ArtifactStatus,
        visibility: artifact.visibility as ArtifactVisibility,
        expires_at: artifact.expires_at,
        revoked_at: artifact.revoked_at,
      },
      new Date(),
    );

    if (!accessCheck.accessible) {
      return {
        found: false,
        reason: accessCheck.reason || "This share link is no longer available.",
      };
    }

    // Atomic server-side view count increment via RPC
    try {
      await supabaseAdmin.rpc("increment_artifact_view", {
        p_share_token: data.shareToken,
      });
    } catch {
      // Fallback update if RPC not present
      await supabaseAdmin
        .from("shareable_artifacts")
        .update({
          view_count: (artifact.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq("id", artifact.id);
    }

    // Fetch workspace name for attribution without leaking internal metadata
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("name, currency")
      .eq("id", artifact.workspace_id)
      .maybeSingle();

    // Log public view event
    await supabaseAdmin.from("distribution_events").insert({
      workspace_id: artifact.workspace_id,
      event_type: "share_viewed",
      artifact_id: artifact.id,
      anonymous_session_id: data.anonymousSessionId || null,
      source: "shared_artifact",
      metadata: {
        artifactType: artifact.artifact_type,
      },
    });

    return {
      found: true,
      artifact: {
        id: artifact.id,
        title: artifact.title,
        description: artifact.description,
        artifactType: artifact.artifact_type,
        snapshotData: artifact.snapshot_data,
        accessConfig: artifact.access_config,
        createdAt: artifact.created_at,
        expiresAt: artifact.expires_at,
        workspaceName: ws?.name || "SoloOS Workspace",
        workspaceCurrency: ws?.currency || "MWK",
      },
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 4. Send Share Email
// ─────────────────────────────────────────────────────────────────────────────

const sendShareEmailSchema = z.object({
  workspaceId: z.string().uuid(),
  artifactId: z.string().uuid(),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  customMessage: z.string().max(500).optional(),
  authToken: z.string().optional(),
});

export const sendShareEmailServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof sendShareEmailSchema>) => sendShareEmailSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    await verifyWorkspaceRole(userId, data.workspaceId);

    const { data: artifact } = await supabaseAdmin
      .from("shareable_artifacts")
      .select("title, artifact_type, share_token, workspace_id")
      .eq("id", data.artifactId)
      .eq("workspace_id", data.workspaceId)
      .single();

    if (!artifact) throw new Error("Artifact not found.");

    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("name")
      .eq("id", data.workspaceId)
      .single();

    const origin = process.env["APP_URL"] || "https://solofinance.app";
    const shareUrl = `${origin}/share/${artifact.share_token}`;

    const subject = `${ws?.name || "SoloOS"}: Shared Financial View — ${artifact.title}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 18px; font-weight: bold; color: #0f172a;">SoloOS</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #0f172a;">
          ${artifact.title}
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          ${data.recipientName ? `Hi ${data.recipientName},<br/><br/>` : ""}${ws?.name || "A collaborator"} has shared a secure, read-only financial view with you.
        </p>
        ${
          data.customMessage
            ? `<div style="padding: 12px 16px; background-color: #f8fafc; border-left: 3px solid #0284c7; border-radius: 4px; margin: 16px 0; font-size: 14px; color: #334155;">${data.customMessage}</div>`
            : ""
        }
        <div style="margin: 28px 0;">
          <a href="${shareUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; text-decoration: none; display: inline-block;">
            View Shared Artifact
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          This secure link was dispatched via SoloOS Financial Operating System. Link: <a href="${shareUrl}" style="color: #64748b;">${shareUrl}</a>
        </p>
      </div>
    `;

    const idempotencyKey = `share-email-${artifact.share_token}-${data.recipientEmail}-${Date.now()}`;
    const result = await sendEmailSafely({
      to: data.recipientEmail,
      subject,
      html,
      idempotencyKey,
      template: "shared_artifact_dispatch",
    });

    if (!result.sent) {
      throw new Error(result.error || "Failed to dispatch share email.");
    }

    await supabaseAdmin.from("distribution_events").insert({
      workspace_id: data.workspaceId,
      actor_user_id: userId,
      event_type: "share_email_sent",
      artifact_id: data.artifactId,
      metadata: { recipient: data.recipientEmail },
    });

    return { success: true };
  });

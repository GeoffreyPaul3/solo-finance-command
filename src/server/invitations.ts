import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { getWorkspaceEntitlements } from "@/domain/entitlements";
import { sendEmailSafely } from "@/lib/email/send";
import { renderInvitationEmail } from "@/lib/email/templates";

// ─────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (data?.user) return data.user.id;
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user.id;
  throw new Error("Unauthenticated: Please sign in to manage invitations.");
}

/** Asserts the caller is an owner or admin of the given workspace. */
async function assertCallerIsWorkspaceAdmin(callerId: string, workspaceId: string): Promise<void> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", callerId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Forbidden: You are not a member of this workspace.");
  }
  if (data.role !== "owner" && data.role !== "admin") {
    throw new Error("Forbidden: Only workspace owners and admins can manage invitations.");
  }
}

const inviteMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["owner", "admin", "finance", "manager", "viewer"]),
  origin: z.string().url(),
});

export const inviteMemberServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof inviteMemberSchema>) => inviteMemberSchema.parse(data))
  .handler(async ({ data }) => {
    // Security Rule #1: Verify caller is authenticated and an admin/owner of the workspace
    const callerId = await getCurrentUserId();
    await assertCallerIsWorkspaceAdmin(callerId, data.workspaceId);

    // 1. Check if user is already in workspace
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", data.email.toLowerCase().trim())
      .maybeSingle();

    if (userProfile) {
      const { data: existingMember } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", data.workspaceId)
        .eq("user_id", userProfile.id)
        .maybeSingle();

      if (existingMember) {
        throw new Error("This user is already a member of this workspace.");
      }
    }

    // 2. Fetch workspace & inviter info
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name, created_by, plan")
      .eq("id", data.workspaceId)
      .single();

    // Architectural Rule #5: Enforce plan member limits server-side
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id, status, cancel_at_period_end, current_period_end")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    const entitlements = getWorkspaceEntitlements(workspace?.plan, sub);

    const { count: memberCount } = await supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", data.workspaceId);

    const { count: pendingInviteCount } = await supabase
      .from("workspace_invitations")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", data.workspaceId)
      .eq("status", "pending");

    const totalAllocated = (memberCount ?? 0) + (pendingInviteCount ?? 0);

    if (totalAllocated >= entitlements.maxTeamMembers) {
      throw new Error(
        `Team member limit reached (${entitlements.maxTeamMembers} member${entitlements.maxTeamMembers === 1 ? "" : "s"} on the ${entitlements.displayName} plan). Please upgrade your subscription to invite more team members.`,
      );
    }

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    const inviterId = currentUser?.id || workspace?.created_by;

    if (!inviterId) {
      throw new Error("Unable to identify inviter user.");
    }

    // 3. Generate token & 7-day expiration
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invitation, error: insertErr } = await supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: data.workspaceId,
        email: data.email.toLowerCase().trim(),
        role: data.role,
        token,
        invited_by: inviterId,
        expires_at: expiresAt,
        status: "pending",
      })
      .select("*")
      .single();

    if (insertErr) {
      throw new Error(`Failed to create invitation: ${insertErr.message}`);
    }

    // 4. Send email with secure invitation link (NO emailed passwords)
    const inviteUrl = `${data.origin.replace(/\/$/, "")}/join?token=${token}`;
    const emailTemplate = renderInvitationEmail({
      workspaceName: workspace?.name || "Workspace",
      inviterName: currentUser?.email || "A team administrator",
      role: data.role.toUpperCase(),
      inviteUrl,
    });

    await sendEmailSafely({
      to: data.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      idempotencyKey: `invite_${invitation.id}`,
      template: "workspace_invitation",
    });

    return {
      success: true,
      invitation,
      inviteUrl,
    };
  });

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  userId: z.string().uuid(),
});

export const acceptInvitationServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof acceptInvitationSchema>) => acceptInvitationSchema.parse(data))
  .handler(async ({ data }) => {
    // 1. Fetch invitation
    const { data: invitation, error: fetchErr } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("token", data.token)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchErr || !invitation) {
      throw new Error("Invitation not found or is no longer valid.");
    }

    if (new Date() > new Date(invitation.expires_at)) {
      await supabase
        .from("workspace_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      throw new Error("This invitation has expired. Please request a new invitation.");
    }

    // 2. Add user to workspace_members
    const { error: memberErr } = await supabase.from("workspace_members").upsert(
      {
        workspace_id: invitation.workspace_id,
        user_id: data.userId,
        role: invitation.role,
      },
      { onConflict: "workspace_id,user_id" },
    );

    if (memberErr) {
      throw new Error(`Failed to join workspace: ${memberErr.message}`);
    }

    // 3. Mark invitation as accepted
    await supabase
      .from("workspace_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    return {
      success: true,
      workspaceId: invitation.workspace_id,
    };
  });

export const revokeInvitationServerFn = createServerFn({ method: "POST" })
  .validator((data: { invitationId: string }) => data)
  .handler(async ({ data }) => {
    // Security Rule #1: Verify the caller is authenticated and an admin/owner of the workspace
    const callerId = await getCurrentUserId();

    // Fetch the invitation to determine which workspace it belongs to
    const { data: invitation, error: fetchErr } = await supabase
      .from("workspace_invitations")
      .select("workspace_id")
      .eq("id", data.invitationId)
      .maybeSingle();

    if (fetchErr || !invitation) {
      throw new Error("Invitation not found.");
    }

    await assertCallerIsWorkspaceAdmin(callerId, invitation.workspace_id);

    const { error } = await supabase
      .from("workspace_invitations")
      .update({ status: "revoked" })
      .eq("id", data.invitationId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

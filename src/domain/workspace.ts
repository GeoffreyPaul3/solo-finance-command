import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceSettings = Database["public"]["Tables"]["workspace_settings"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"];

export type Membership = {
  role: AppRole;
  workspace: Workspace;
};

/** Ordered least → most privileged. Authorization is ALSO enforced by RLS. */
export const ROLE_ORDER: AppRole[] = ["viewer", "manager", "finance", "admin", "owner"];

export const ROLE_LABEL: Record<AppRole, string> = {
  owner: "Owner",
  admin: "Admin",
  finance: "Finance",
  manager: "Manager",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTION: Record<AppRole, string> = {
  owner: "Full access, including workspace configuration and ownership.",
  admin: "Full access to data and workspace configuration.",
  finance: "Can record and manage financial operations and settings.",
  manager: "Can manage clients, projects and day-to-day operations.",
  viewer: "Read-only access to the workspace.",
};

export function roleAtLeast(role: AppRole | null | undefined, minimum: AppRole): boolean {
  if (!role) return false;
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(minimum);
}

/** Can this role change workspace configuration? */
export function canManageWorkspace(role: AppRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Can this role change financial settings (tax, buffer, invoicing defaults)? */
export function canManageFinancialSettings(role: AppRole | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "finance";
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("The record could not be found.");
  return result.data;
}

export const profileQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const membershipsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["memberships", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Membership[]> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("role, workspaces:workspace_id(*)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? [])
        .filter((row) => row.workspaces !== null)
        .map((row) => ({ role: row.role, workspace: row.workspaces as Workspace }));
    },
  });

export const workspaceSettingsQueryOptions = (workspaceId: string | undefined) =>
  queryOptions({
    queryKey: ["workspace-settings", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<WorkspaceSettings | null> => {
      const { data, error } = await supabase
        .from("workspace_settings")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const workspaceMembersQueryOptions = (workspaceId: string | undefined) =>
  queryOptions({
    queryKey: ["workspace-members", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const auditLogQueryOptions = (workspaceId: string | undefined, limit = 20) =>
  queryOptions({
    queryKey: ["audit-logs", workspaceId, limit],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

// ---- Mutations -------------------------------------------------------------

export type CreateWorkspaceInput = {
  name: string;
  businessType?: string | null;
  country?: string | null;
  timezone: string;
  currency: string;
  fiscalYearStartMonth: number;
  taxReservePercent: number;
  defaultPaymentTermsDays: number;
  operatingBuffer: number;
};

/**
 * Creates the workspace, its settings, the owner membership and an audit entry
 * in a single atomic server-side operation.
 */
export async function createWorkspace(input: CreateWorkspaceInput): Promise<string> {
  const { data, error } = await supabase.rpc("create_workspace", {
    _name: input.name,
    _business_type: input.businessType ?? undefined,
    _country: input.country ?? undefined,
    _timezone: input.timezone,
    _currency: input.currency,
    _fiscal_year_start_month: input.fiscalYearStartMonth,
    _tax_reserve_percent: input.taxReservePercent,
    _default_payment_terms_days: input.defaultPaymentTermsDays,
    _operating_buffer: input.operatingBuffer,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export type ProfileInput = {
  userId: string;
  email: string | null;
  fullName: string;
  phone?: string | null;
  profession?: string | null;
  markOnboarded?: boolean;
};

export async function upsertProfile(input: ProfileInput): Promise<Profile> {
  return unwrap<Profile>(
    await supabase
      .from("profiles")
      .upsert(
        {
          id: input.userId,
          email: input.email,
          full_name: input.fullName.trim(),
          phone: input.phone?.trim() || null,
          profession: input.profession || null,
          ...(input.markOnboarded ? { onboarded_at: new Date().toISOString() } : {}),
        },
        { onConflict: "id" },
      )
      .select("*")
      .single(),
  );
}

export async function updateWorkspace(
  workspaceId: string,
  patch: Partial<Pick<Workspace, "name" | "business_type" | "country" | "timezone" | "currency" | "fiscal_year_start_month">>,
): Promise<Workspace> {
  const workspace = unwrap<Workspace>(
    await supabase.from("workspaces").update(patch).eq("id", workspaceId).select("*").single(),
  );
  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "workspace.updated",
    _entity_type: "workspace",
    _entity_id: workspaceId,
    _metadata: patch as never,
  });
  return workspace;
}

export async function updateWorkspaceSettings(
  workspaceId: string,
  patch: Partial<
    Pick<
      WorkspaceSettings,
      | "tax_mode"
      | "tax_reserve_percent"
      | "operating_buffer"
      | "default_payment_terms_days"
      | "invoice_number_prefix"
      | "invoice_notes"
      | "payment_instructions"
      | "target_hourly_rate"
      | "target_margin_percent"
      | "desired_monthly_income"
    >
  >,
): Promise<WorkspaceSettings> {
  const settings = unwrap<WorkspaceSettings>(
    await supabase
      .from("workspace_settings")
      .update(patch)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single(),
  );
  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "workspace_settings.updated",
    _entity_type: "workspace_settings",
    _entity_id: workspaceId,
    _metadata: patch as never,
  });
  return settings;
}

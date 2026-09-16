import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ============================================================================
// Core Types
// ============================================================================

export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];

export type ProjectWithClient = Project & {
  client?: Client | null;
};

// ============================================================================
// Display & Enumeration Constants
// ============================================================================

export const PROJECT_STATUSES: ProjectStatus[] = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "archived",
];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const createProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Project name is required")
      .max(200, "Project name cannot exceed 200 characters"),
    clientId: z.string().uuid("Invalid client").optional().nullable(),
    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable(),
    status: z
      .enum(["planning", "active", "on_hold", "completed", "archived"] as const)
      .default("planning"),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    budget: z.coerce.number().min(0, "Budget cannot be negative").optional().nullable(),
    budgetCurrency: z
      .string()
      .trim()
      .length(3, "Budget currency must be a 3-letter code")
      .toUpperCase()
      .optional()
      .nullable(),
    notes: z.string().trim().max(2000, "Notes cannot exceed 2000 characters").optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "Start date must be on or before end date",
      path: ["endDate"],
    },
  )
  .refine(
    (data) => {
      if (data.budget !== undefined && data.budget !== null && !data.budgetCurrency) {
        return false;
      }
      return true;
    },
    {
      message: "Budget currency is required when a budget is set",
      path: ["budgetCurrency"],
    },
  );

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Project name is required")
      .max(200, "Project name cannot exceed 200 characters")
      .optional(),
    clientId: z.string().uuid("Invalid client").optional().nullable(),
    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable(),
    status: z.enum(["planning", "active", "on_hold", "completed", "archived"] as const).optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    budget: z.coerce.number().min(0, "Budget cannot be negative").optional().nullable(),
    budgetCurrency: z
      .string()
      .trim()
      .length(3, "Budget currency must be a 3-letter code")
      .toUpperCase()
      .optional()
      .nullable(),
    notes: z.string().trim().max(2000, "Notes cannot exceed 2000 characters").optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "Start date must be on or before end date",
      path: ["endDate"],
    },
  );

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// Helper to unwrap Supabase results
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("Resource not found");
  return result.data;
}

// ============================================================================
// Query Options
// ============================================================================

export interface ProjectFilters {
  status?: (ProjectStatus | "all") | undefined;
  clientId?: string | undefined;
  search?: string | undefined;
}

export function projectsQueryOptions(workspaceId: string, filters: ProjectFilters = {}) {
  return queryOptions({
    queryKey: ["projects", workspaceId, filters],
    queryFn: async () => {
      let query = supabase
        .from("projects")
        .select("*, client:clients(*)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.clientId) {
        query = query.eq("client_id", filters.clientId);
      }

      if (filters.search && filters.search.trim()) {
        const term = filters.search.trim();
        query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as ProjectWithClient[];
    },
    enabled: Boolean(workspaceId),
  });
}

export function projectQueryOptions(workspaceId: string, projectId: string) {
  return queryOptions({
    queryKey: ["project", workspaceId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, client:clients(*)")
        .eq("workspace_id", workspaceId)
        .eq("id", projectId)
        .single();

      if (error) throw new Error(error.message);
      return data as ProjectWithClient;
    },
    enabled: Boolean(workspaceId && projectId),
  });
}

// ============================================================================
// Mutations
// ============================================================================

export async function createProject(
  workspaceId: string,
  input: CreateProjectInput,
): Promise<Project> {
  const validated = createProjectSchema.parse(input);

  const { data: user } = await supabase.auth.getUser();

  const insertPayload = {
    workspace_id: workspaceId,
    client_id: validated.clientId || null,
    name: validated.name,
    description: validated.description || null,
    status: validated.status ?? "planning",
    start_date: validated.startDate || null,
    end_date: validated.endDate || null,
    budget: validated.budget !== undefined && validated.budget !== null ? validated.budget : null,
    budget_currency: validated.budgetCurrency || null,
    notes: validated.notes || null,
    created_by: user.user?.id ?? null,
  };

  const project = unwrap<Project>(
    await supabase.from("projects").insert(insertPayload).select("*").single(),
  );

  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "project.created",
    _entity_type: "project",
    _entity_id: project.id,
    _metadata: { name: project.name, status: project.status } as never,
  });

  return project;
}

export async function updateProject(
  workspaceId: string,
  projectId: string,
  patch: UpdateProjectInput,
): Promise<Project> {
  const validated = updateProjectSchema.parse(patch);

  const updatePayload: Database["public"]["Tables"]["projects"]["Update"] = {};
  if (validated.name !== undefined) updatePayload.name = validated.name;
  if (validated.clientId !== undefined) updatePayload.client_id = validated.clientId || null;
  if (validated.description !== undefined)
    updatePayload.description = validated.description || null;
  if (validated.status !== undefined) updatePayload.status = validated.status;
  if (validated.startDate !== undefined) updatePayload.start_date = validated.startDate || null;
  if (validated.endDate !== undefined) updatePayload.end_date = validated.endDate || null;
  if (validated.budget !== undefined) updatePayload.budget = validated.budget;
  if (validated.budgetCurrency !== undefined)
    updatePayload.budget_currency = validated.budgetCurrency || null;
  if (validated.notes !== undefined) updatePayload.notes = validated.notes || null;

  const project = unwrap<Project>(
    await supabase
      .from("projects")
      .update(updatePayload)
      .eq("workspace_id", workspaceId)
      .eq("id", projectId)
      .select("*")
      .single(),
  );

  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "project.updated",
    _entity_type: "project",
    _entity_id: projectId,
    _metadata: updatePayload as never,
  });

  return project;
}

export async function updateProjectStatus(
  workspaceId: string,
  projectId: string,
  status: ProjectStatus,
): Promise<Project> {
  const project = unwrap<Project>(
    await supabase
      .from("projects")
      .update({ status })
      .eq("workspace_id", workspaceId)
      .eq("id", projectId)
      .select("*")
      .single(),
  );

  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "project.status_changed",
    _entity_type: "project",
    _entity_id: projectId,
    _metadata: { status } as never,
  });

  return project;
}

export async function archiveProject(workspaceId: string, projectId: string): Promise<Project> {
  return updateProjectStatus(workspaceId, projectId, "archived");
}

export async function deleteProject(
  workspaceId: string,
  projectId: string,
): Promise<{ id: string }> {
  // Relational integrity checks
  const [{ count: invoiceCount }, { count: expenseCount }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId),
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId),
  ]);

  const conflicts: string[] = [];
  if (invoiceCount && invoiceCount > 0) conflicts.push(`${invoiceCount} invoice(s)`);
  if (expenseCount && expenseCount > 0) conflicts.push(`${expenseCount} expense(s)`);

  if (conflicts.length > 0) {
    throw new Error(
      `Cannot delete project with linked records (${conflicts.join(", ")}). Please archive the project or reassign linked records first.`,
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("workspace_id", workspaceId)
    .eq("id", projectId)
    .maybeSingle();

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", projectId);

  if (error) throw new Error(error.message);

  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "project.deleted",
    _entity_type: "project",
    _entity_id: projectId,
    _metadata: { name: project?.name ?? null } as never,
  });

  return { id: projectId };
}

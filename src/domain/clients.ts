import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ============================================================================
// Core Types
// ============================================================================

export type ClientStatus = Database["public"]["Enums"]["client_status"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];

export type ClientWithProjectsCount = Client & {
  projects?: { count: number }[];
};

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const createClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Client name is required")
    .max(200, "Client name cannot exceed 200 characters"),
  companyName: z
    .string()
    .trim()
    .max(200, "Company name cannot exceed 200 characters")
    .optional()
    .nullable(),
  email: z.string().trim().email("Invalid email address").optional().nullable().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(50, "Phone number cannot exceed 50 characters")
    .optional()
    .nullable(),
  address: z.string().trim().max(500, "Address cannot exceed 500 characters").optional().nullable(),
  notes: z.string().trim().max(2000, "Notes cannot exceed 2000 characters").optional().nullable(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Client name is required")
    .max(200, "Client name cannot exceed 200 characters")
    .optional(),
  companyName: z
    .string()
    .trim()
    .max(200, "Company name cannot exceed 200 characters")
    .optional()
    .nullable(),
  email: z.string().trim().email("Invalid email address").optional().nullable().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(50, "Phone number cannot exceed 50 characters")
    .optional()
    .nullable(),
  address: z.string().trim().max(500, "Address cannot exceed 500 characters").optional().nullable(),
  notes: z.string().trim().max(2000, "Notes cannot exceed 2000 characters").optional().nullable(),
  status: z.enum(["active", "archived"] as const).optional(),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

// Helper to unwrap Supabase results
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("Resource not found");
  return result.data;
}

// ============================================================================
// Query Options
// ============================================================================

export interface ClientFilters {
  status?: (ClientStatus | "all") | undefined;
  search?: string | undefined;
}

export function clientsQueryOptions(workspaceId: string, filters: ClientFilters = {}) {
  return queryOptions({
    queryKey: ["clients", workspaceId, filters],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*, projects(count)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.search && filters.search.trim()) {
        const term = filters.search.trim();
        query = query.or(`name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as ClientWithProjectsCount[];
    },
    enabled: Boolean(workspaceId),
  });
}

export function clientQueryOptions(workspaceId: string, clientId: string) {
  return queryOptions({
    queryKey: ["client", workspaceId, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, projects(*)")
        .eq("workspace_id", workspaceId)
        .eq("id", clientId)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: Boolean(workspaceId && clientId),
  });
}

// ============================================================================
// Mutations
// ============================================================================

export async function createClient(workspaceId: string, input: CreateClientInput): Promise<Client> {
  const validated = createClientSchema.parse(input);

  const { data: user } = await supabase.auth.getUser();

  const insertPayload = {
    workspace_id: workspaceId,
    name: validated.name,
    company_name: validated.companyName || null,
    email: validated.email ? validated.email : null,
    phone: validated.phone || null,
    address: validated.address || null,
    notes: validated.notes || null,
    status: "active" as const,
    created_by: user.user?.id ?? null,
  };

  const client = unwrap<Client>(
    await supabase.from("clients").insert(insertPayload).select("*").single(),
  );

  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "client.created",
    _entity_type: "client",
    _entity_id: client.id,
    _metadata: { name: client.name } as never,
  });

  return client;
}

export async function updateClient(
  workspaceId: string,
  clientId: string,
  patch: UpdateClientInput,
): Promise<Client> {
  const validated = updateClientSchema.parse(patch);

  const updatePayload: Database["public"]["Tables"]["clients"]["Update"] = {};
  if (validated.name !== undefined) updatePayload.name = validated.name;
  if (validated.companyName !== undefined)
    updatePayload.company_name = validated.companyName || null;
  if (validated.email !== undefined) updatePayload.email = validated.email ? validated.email : null;
  if (validated.phone !== undefined) updatePayload.phone = validated.phone || null;
  if (validated.address !== undefined) updatePayload.address = validated.address || null;
  if (validated.notes !== undefined) updatePayload.notes = validated.notes || null;
  if (validated.status !== undefined) updatePayload.status = validated.status;

  const client = unwrap<Client>(
    await supabase
      .from("clients")
      .update(updatePayload)
      .eq("workspace_id", workspaceId)
      .eq("id", clientId)
      .select("*")
      .single(),
  );

  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "client.updated",
    _entity_type: "client",
    _entity_id: clientId,
    _metadata: updatePayload as never,
  });

  return client;
}

export async function archiveClient(workspaceId: string, clientId: string): Promise<Client> {
  const client = unwrap<Client>(
    await supabase
      .from("clients")
      .update({ status: "archived" })
      .eq("workspace_id", workspaceId)
      .eq("id", clientId)
      .select("*")
      .single(),
  );

  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "client.archived",
    _entity_type: "client",
    _entity_id: clientId,
    _metadata: { status: "archived" } as never,
  });

  return client;
}

export async function unarchiveClient(workspaceId: string, clientId: string): Promise<Client> {
  const client = unwrap<Client>(
    await supabase
      .from("clients")
      .update({ status: "active" })
      .eq("workspace_id", workspaceId)
      .eq("id", clientId)
      .select("*")
      .single(),
  );

  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "client.unarchived",
    _entity_type: "client",
    _entity_id: clientId,
    _metadata: { status: "active" } as never,
  });

  return client;
}

export async function deleteClient(workspaceId: string, clientId: string): Promise<{ id: string }> {
  // Relational integrity checks
  const [{ count: projectCount }, { count: invoiceCount }, { count: expenseCount }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId),
      supabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId),
    ]);

  const conflicts: string[] = [];
  if (projectCount && projectCount > 0) conflicts.push(`${projectCount} project(s)`);
  if (invoiceCount && invoiceCount > 0) conflicts.push(`${invoiceCount} invoice(s)`);
  if (expenseCount && expenseCount > 0) conflicts.push(`${expenseCount} expense(s)`);

  if (conflicts.length > 0) {
    throw new Error(
      `Cannot delete client with linked records (${conflicts.join(", ")}). Please archive the client or reassign linked records first.`,
    );
  }

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("workspace_id", workspaceId)
    .eq("id", clientId)
    .maybeSingle();

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", clientId);

  if (error) throw new Error(error.message);

  await supabase.rpc("write_audit_log", {
    _workspace_id: workspaceId,
    _action: "client.deleted",
    _entity_type: "client",
    _entity_id: clientId,
    _metadata: { name: client?.name ?? null } as never,
  });

  return { id: clientId };
}

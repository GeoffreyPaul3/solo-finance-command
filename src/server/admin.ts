import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────
// Guards
// ─────────────────────────────────────────────

async function assertPlatformAdmin(userId: string) {
  const { data, error } = await supabase
    .from("platform_admin_roles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Forbidden: platform admin access required");
  }
}

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (data?.user) return data.user.id;
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user.id;
  throw new Error("Unauthenticated: Please ensure you are signed in as an administrator.");
}

// ─────────────────────────────────────────────
// Platform Dashboard Stats
// ─────────────────────────────────────────────

export async function adminDashboardFn() {
  const userId = await getCurrentUserId();
  await assertPlatformAdmin(userId);

  const [workspacesResult, usersResult, subscriptionsResult, paymentsResult, supportResult] =
    await Promise.all([
      supabase.from("workspaces").select("id", { count: "exact", head: true }),
      supabase.from("workspace_members").select("user_id", { count: "exact", head: true }),
      supabase
        .from("subscriptions")
        .select("id, plan_id, status", { count: "exact" })
        .eq("status", "active"),
      supabase
        .from("subscription_payments")
        .select(
          "expected_amount_cents, expected_currency, verified_amount_cents, verified_currency, status",
        )
        .eq("status", "successful"),
      supabase
        .from("support_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
    ]);

  // Revenue breakdown
  let mwkRevenueMajor = 0;
  let usdRevenueMajor = 0;
  for (const p of paymentsResult.data ?? []) {
    const amount = Number(p.verified_amount_cents || p.expected_amount_cents) / 100;
    const cur = (p.verified_currency || p.expected_currency || "").toUpperCase();
    if (cur === "MWK") mwkRevenueMajor += amount;
    else if (cur === "USD") usdRevenueMajor += amount;
  }

  // Plan distribution
  const planCounts: Record<string, number> = { free: 0, solo: 0, pro: 0 };
  for (const s of subscriptionsResult.data ?? []) {
    const tier = s.plan_id as string;
    planCounts[tier] = (planCounts[tier] ?? 0) + 1;
  }

  return {
    workspaceCount: workspacesResult.count ?? 0,
    userCount: usersResult.count ?? 0,
    activeSubscriptionCount: subscriptionsResult.count ?? 0,
    openSupportCount: supportResult.count ?? 0,
    mwkRevenueMajor,
    usdRevenueMajor,
    planCounts,
  };
}

// ─────────────────────────────────────────────
// Users List
// ─────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
});

export async function adminListUsersFn({ data }: { data: z.infer<typeof paginationSchema> }) {
  const validated = paginationSchema.parse(data);
  const userId = await getCurrentUserId();
  await assertPlatformAdmin(userId);

  const { page, pageSize, search } = validated;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("workspace_members")
    .select(
      `
      user_id,
      role,
      created_at,
      workspace_id,
      workspaces(name)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("workspaces.name", `%${search}%`);
  }

  const { data: members, count, error } = await query;
  if (error) throw new Error(error.message);

  // Fetch profiles to show human-readable names and emails instead of raw UUIDs
  const memberList = members ?? [];
  const userIds = Array.from(new Set(memberList.map((m) => m.user_id)));
  let profileMap = new Map<string, { full_name: string | null; email: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (profiles) {
      profileMap = new Map(profiles.map((p) => [p.id, { full_name: p.full_name, email: p.email }]));
    }
  }

  const enrichedMembers = memberList.map((m) => ({
    ...m,
    profile: profileMap.get(m.user_id) ?? null,
  }));

  return { members: enrichedMembers, total: count ?? 0, page, pageSize };
}

// ─────────────────────────────────────────────
// Workspaces List
// ─────────────────────────────────────────────

export async function adminListWorkspacesFn({ data }: { data: z.infer<typeof paginationSchema> }) {
  const validated = paginationSchema.parse(data);
  const userId = await getCurrentUserId();
  await assertPlatformAdmin(userId);

  const { page, pageSize, search } = validated;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("workspaces")
    .select(
      `
      id, name, created_at, created_by, currency, plan, status,
      subscriptions(plan_id, status)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data: workspaces, count, error } = await query;
  if (error) throw new Error(error.message);

  return { workspaces: workspaces ?? [], total: count ?? 0, page, pageSize };
}

// ─────────────────────────────────────────────
// Subscriptions List
// ─────────────────────────────────────────────

export async function adminListSubscriptionsFn({
  data,
}: {
  data: z.infer<typeof paginationSchema>;
}) {
  const validated = paginationSchema.parse(data);
  const userId = await getCurrentUserId();
  await assertPlatformAdmin(userId);

  const { page, pageSize } = validated;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const {
    data: subscriptions,
    count,
    error,
  } = await supabase
    .from("subscriptions")
    .select(
      `
      id, workspace_id, plan_id, status, currency,
      current_period_start, current_period_end, canceled_at, created_at,
      workspaces(id, name, currency)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return { subscriptions: subscriptions ?? [], total: count ?? 0, page, pageSize };
}

// ─────────────────────────────────────────────
// Revenue / Payments
// ─────────────────────────────────────────────

export async function adminListPaymentsFn({ data }: { data: z.infer<typeof paginationSchema> }) {
  const validated = paginationSchema.parse(data);
  const userId = await getCurrentUserId();
  await assertPlatformAdmin(userId);

  const { page, pageSize } = validated;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const {
    data: payments,
    count,
    error,
  } = await supabase
    .from("subscription_payments")
    .select(
      `
      id, workspace_id, subscription_id, status,
      expected_amount_cents, expected_currency,
      verified_amount_cents, verified_currency,
      tx_ref, provider_ref,
      created_at, verified_at,
      workspaces(id, name, currency)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return { payments: payments ?? [], total: count ?? 0, page, pageSize };
}

// ─────────────────────────────────────────────
// Support Requests
// ─────────────────────────────────────────────

const supportListSchema = paginationSchema.extend({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
});

export async function adminListSupportRequestsFn({
  data,
}: {
  data: z.infer<typeof supportListSchema>;
}) {
  const validated = supportListSchema.parse(data);
  const userId = await getCurrentUserId();
  await assertPlatformAdmin(userId);

  const { page, pageSize, status } = validated;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("support_requests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);

  const { data: requests, count, error } = await query;
  if (error) throw new Error(error.message);

  return { requests: requests ?? [], total: count ?? 0, page, pageSize };
}

export async function adminUpdateSupportRequestFn({
  data,
}: {
  data: { id: string; status: "open" | "in_progress" | "resolved" | "closed" };
}) {
  const validated = z
    .object({
      id: z.string().uuid(),
      status: z.enum(["open", "in_progress", "resolved", "closed"]),
    })
    .parse(data);

  const userId = await getCurrentUserId();
  await assertPlatformAdmin(userId);

  const { error } = await supabase
    .from("support_requests")
    .update({
      status: validated.status,
    })
    .eq("id", validated.id);

  if (error) throw new Error(error.message);
  return { success: true };
}

// ─────────────────────────────────────────────
// Platform Audit Logs
// ─────────────────────────────────────────────

const auditListSchema = paginationSchema.extend({
  entityType: z.string().optional(),
  search: z.string().optional(),
});

export async function adminListAuditLogsFn({ data }: { data: z.infer<typeof auditListSchema> }) {
  const validated = auditListSchema.parse(data);
  const userId = await getCurrentUserId();
  await assertPlatformAdmin(userId);

  const { page, pageSize, entityType, search } = validated;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, actor_id, metadata, created_at, workspace_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (entityType) query = query.eq("entity_type", entityType);
  if (search) query = query.ilike("action", `%${search}%`);

  const { data: logs, count, error } = await query;
  if (error) throw new Error(error.message);

  return { logs: logs ?? [], total: count ?? 0, page, pageSize };
}

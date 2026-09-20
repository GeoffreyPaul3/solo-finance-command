import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import {
  aiCfoResponseSchema,
  AI_CFO_SYSTEM_PROMPT,
  buildDeterministicFinancialContext,
  getUnavailableAiCfoResult,
  type AiCfoResult,
  type FinancialContextParams,
} from "@/domain/ai-cfo";
import { getWorkspaceEntitlements } from "@/domain/entitlements";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAiProvider } from "@/lib/ai";

// ─────────────────────────────────────────────
// Auth helpers (server-side only)
// ─────────────────────────────────────────────

async function getAuthenticatedUserId(authToken?: string): Promise<string> {
  if (authToken) {
    try {
      const { data } = await supabaseAdmin.auth.getUser(authToken);
      if (data?.user) return data.user.id;
    } catch {
      // Ignore invalid auth token errors
    }
  }

  try {
    const req = getRequest();
    const authHeader = req?.headers?.get?.("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      if (token) {
        const { data } = await supabaseAdmin.auth.getUser(token);
        if (data?.user) return data.user.id;
      }
    }
  } catch {
    // getRequest may not be available in non-SSR/test execution contexts
  }

  const { data } = await supabase.auth.getUser();
  if (data?.user) return data.user.id;
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user.id;

  throw new Error("Unauthenticated: Please sign in to use AI CFO.");
}

async function verifyWorkspaceMember(userId: string, workspaceId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Forbidden: You are not an authorized member of this workspace.");
  }
}

export interface AskAiCfoPayload {
  workspaceId: string;
  question: string;
  context: FinancialContextParams;
  authToken?: string | undefined;
}

export const askAiCfoServerFn = createServerFn({ method: "POST" })
  .validator((data: AskAiCfoPayload) => data)
  .handler(async ({ data }): Promise<AiCfoResult> => {
    // Security Rule #1: Verify caller is authenticated and a workspace member
    const callerId = await getAuthenticatedUserId(data.authToken);
    await verifyWorkspaceMember(callerId, data.workspaceId);

    // Architectural Rule #5: Server-side entitlement enforcement
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("plan")
      .eq("id", data.workspaceId)
      .maybeSingle();

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_id, status, cancel_at_period_end, current_period_end")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    const entitlements = getWorkspaceEntitlements(ws?.plan, sub);
    if (!entitlements.canUseAiCfo) {
      return {
        status: "error",
        isAvailable: false,
        errorMessage:
          "AI CFO is a premium feature available on Solo and Pro plans. Please upgrade your subscription to consult your AI CFO.",
      };
    }

    const provider = getAiProvider();

    if (!provider.isConfigured()) {
      return getUnavailableAiCfoResult();
    }

    try {
      const contextStr = buildDeterministicFinancialContext(data.context);
      const userPrompt = `FINANCIAL CONTEXT (DETERMINISTIC FACTS):\n${contextStr}\n\nUSER QUESTION / FOCUS:\n${data.question}\n\nAnalyze the financial context above and address the user's question. Remember to ground every number strictly in the provided context. Return valid JSON matching the schema: summary, key_points, risks, opportunities, recommended_actions (title, description, action_type, suggested_route), metric_references (label, value). Note: for suggested_route in recommended_actions, only use exact SoloOS routes starting with /app: /app/cash, /app/invoices, /app/payments, /app/expenses, /app/obligations, /app/taxes, /app/goals, /app/forecast, /app/calendar, /app/follow-ups, /app/clients, /app/projects, /app/profitability, /app/insights, /app/analytics, /app/reports, or /app.`;

      const rawResponse = await provider.generateStructuredResponse({
        systemPrompt: AI_CFO_SYSTEM_PROMPT,
        userPrompt,
        temperature: 0.2,
      });

      const validated = aiCfoResponseSchema.parse(rawResponse);

      return {
        status: "ready",
        response: validated,
        isAvailable: true,
      };
    } catch (err: unknown) {
      console.error("[AI CFO Error]:", err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while consulting AI CFO.";
      return {
        status: "error",
        isAvailable: true,
        errorMessage: errorMsg,
      };
    }
  });

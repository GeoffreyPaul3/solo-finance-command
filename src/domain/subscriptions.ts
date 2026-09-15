import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SubscriptionPlan = Database["public"]["Tables"]["subscription_plans"]["Row"];
export type SubscriptionPrice = Database["public"]["Tables"]["subscription_prices"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type SubscriptionPayment = Database["public"]["Tables"]["subscription_payments"]["Row"];

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("Record not found");
  return result.data;
}

export const subscriptionPlansQueryOptions = () =>
  queryOptions({
    queryKey: ["subscription_plans"],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("id");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const subscriptionPricesQueryOptions = () =>
  queryOptions({
    queryKey: ["subscription_prices"],
    queryFn: async (): Promise<SubscriptionPrice[]> => {
      const { data, error } = await supabase
        .from("subscription_prices")
        .select("*")
        .eq("is_active", true)
        .order("amount_cents");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const workspaceSubscriptionQueryOptions = (workspaceId: string | undefined) =>
  queryOptions({
    queryKey: ["workspace_subscription", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<Subscription | null> => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
  });

export const workspacePaymentsQueryOptions = (workspaceId: string | undefined) =>
  queryOptions({
    queryKey: ["workspace_payments", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<SubscriptionPayment[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export function getDaysRemainingInPeriod(currentPeriodEnd: string, now: Date = new Date()): number {
  const end = new Date(currentPeriodEnd);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

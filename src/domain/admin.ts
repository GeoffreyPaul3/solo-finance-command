import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PlatformAdminRole = Database["public"]["Tables"]["platform_admin_roles"]["Row"];

export const platformAdminRoleQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["platform_admin_role", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<PlatformAdminRole | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("platform_admin_roles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        // If not admin, RLS may deny or return empty
        return null;
      }
      return data;
    },
  });

export interface AdminRevenueBreakdown {
  totalMwkMajor: number;
  totalUsdMajor: number;
  mwkTransactionCount: number;
  usdTransactionCount: number;
  payments: Database["public"]["Tables"]["subscription_payments"]["Row"][];
}

export const adminRevenueQueryOptions = () =>
  queryOptions({
    queryKey: ["admin_revenue"],
    queryFn: async (): Promise<AdminRevenueBreakdown> => {
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("status", "successful")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      let totalMwkMajor = 0;
      let totalUsdMajor = 0;
      let mwkTransactionCount = 0;
      let usdTransactionCount = 0;

      for (const p of data ?? []) {
        const amount = Number(p.verified_amount_cents || p.expected_amount_cents) / 100;
        const cur = (p.verified_currency || p.expected_currency).toUpperCase();
        if (cur === "MWK") {
          totalMwkMajor += amount;
          mwkTransactionCount++;
        } else if (cur === "USD") {
          totalUsdMajor += amount;
          usdTransactionCount++;
        }
      }

      return {
        totalMwkMajor,
        totalUsdMajor,
        mwkTransactionCount,
        usdTransactionCount,
        payments: data ?? [],
      };
    },
  });

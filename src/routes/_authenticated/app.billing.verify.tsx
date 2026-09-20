import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { useWorkspace } from "@/components/app/workspace-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { verifyPaymentServerFn } from "@/server/subscriptions";

const verifySearchSchema = z.object({
  tx_ref: z.string().optional(),
  status: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/app/billing/verify")({
  validateSearch: verifySearchSchema,
  head: () => ({
    meta: [{ title: "Verifying Subscription | SoloOS" }, { name: "robots", content: "noindex" }],
  }),
  component: BillingVerifyPage,
});

function BillingVerifyPage() {
  const search = useSearch({ from: "/_authenticated/app/billing/verify" });
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{
    status: string;
    message?: string;
    planId?: string;
  } | null>(null);

  useEffect(() => {
    async function verify() {
      const txRef = search.tx_ref;
      if (!txRef) {
        setLoading(false);
        setResult({
          status: "failed",
          message: "No transaction reference (tx_ref) provided in redirect URL.",
        });
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const authToken = sessionData.session?.access_token;
        const res = await verifyPaymentServerFn({
          data: {
            txRef,
            workspaceId: workspace.id,
            authToken,
          },
        });

        setResult(res);
        if (res.status === "successful") {
          await queryClient.invalidateQueries({ queryKey: ["workspace_subscription"] });
          await queryClient.invalidateQueries({ queryKey: ["memberships"] });
          await queryClient.invalidateQueries({ queryKey: ["workspace_payments"] });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setResult({
          status: "failed",
          message: msg,
        });
      } finally {
        setLoading(false);
      }
    }

    void verify();
  }, [search.tx_ref, workspace.id, queryClient]);

  return (
    <div className="mx-auto max-w-lg py-16">
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-2">
            {loading ? (
              <Loader2 className="size-12 animate-spin text-primary" />
            ) : result?.status === "successful" ? (
              <CheckCircle2 className="size-12 text-emerald-500" />
            ) : result?.status === "mismatch" ? (
              <ShieldAlert className="size-12 text-amber-500" />
            ) : (
              <XCircle className="size-12 text-destructive" />
            )}
          </div>
          <CardTitle className="text-xl">
            {loading
              ? "Verifying Payment with PayChangu..."
              : result?.status === "successful"
                ? "Subscription Activated!"
                : result?.status === "mismatch"
                  ? "Reconciliation Mismatch Detected"
                  : "Payment Verification Unsuccessful"}
          </CardTitle>
          <CardDescription>
            {loading
              ? "Reconciling your transaction reference with provider records..."
              : result?.status === "successful"
                ? `Your workspace is now upgraded to SoloOS ${result.planId?.toUpperCase()}.`
                : result?.message || "We could not confirm payment completion."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {search.tx_ref && (
            <p className="text-xs font-mono text-muted-foreground bg-muted/40 p-2 rounded">
              Reference: {search.tx_ref}
            </p>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <Button asChild variant="default">
              <Link to="/app/settings" search={{ tab: "billing" }}>
                Go to Billing Settings
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app">Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

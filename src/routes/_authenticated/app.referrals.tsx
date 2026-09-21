import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Gift,
  Link2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/components/app/workspace-context";
import { supabase } from "@/integrations/supabase/client";
import { getReferralFunnelServerFn, getReferralProfileServerFn } from "@/server/referrals";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/referrals")({
  component: ReferralsPage,
});

const DEFAULT_STATUS_META = { label: "Visited", color: "text-blue-500" };
const STATUS_META: Record<string, { label: string; color: string }> = {
  visited: DEFAULT_STATUS_META,
  signed_up: { label: "Signed Up", color: "text-amber-500" },
  activated: { label: "Activated", color: "text-emerald-500" },
  converted: { label: "Converted", color: "text-primary" },
};

function FunnelStep({
  label,
  value,
  total,
  color,
  accent,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  accent?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className={cn("rounded-xl border p-5 space-y-3", accent && "border-primary/30 bg-primary/5")}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Badge variant={accent ? "default" : "secondary"} className="text-xs">
          {pct}%
        </Badge>
      </div>
      <p className={cn("text-3xl font-bold", color)}>{value}</p>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            accent ? "bg-primary" : "bg-current",
          )}
          style={{ width: `${pct}%`, color: "inherit" }}
        />
      </div>
    </div>
  );
}

function ReferralsPage() {
  const { workspace } = useWorkspace();
  const workspaceId = workspace.id;
  const [copySuccess, setCopySuccess] = useState(false);

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["referral-profile", workspaceId],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return getReferralProfileServerFn({
        data: { workspaceId, authToken: session?.access_token },
      });
    },
    enabled: !!workspaceId,
  });

  const { data: funnelData, isLoading: funnelLoading } = useQuery({
    queryKey: ["referral-funnel", workspaceId],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return getReferralFunnelServerFn({
        data: { workspaceId, authToken: session?.access_token },
      });
    },
    enabled: !!workspaceId,
  });

  const referralCode = profileData?.profile?.referral_code ?? null;
  const referralUrl = referralCode ? `${window.location.origin}/r/${referralCode}` : null;

  const funnel = funnelData?.funnel;
  const attributions = funnelData?.attributions ?? [];

  function copyReferralLink() {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopySuccess(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopySuccess(false), 2500);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referral Engine</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Share SoloOS and watch your referrals move through the conversion funnel.
        </p>
      </div>

      {/* Referral Link */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="size-5 text-primary" />
            Your Unique Referral Link
          </CardTitle>
          <CardDescription>
            Share this link with other independent operators and freelancers. Your referrals are
            tracked via first-touch attribution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileLoading ? (
            <div className="h-12 bg-muted/50 animate-pulse rounded-lg" />
          ) : referralUrl ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 rounded-lg border bg-background px-4 py-3 font-mono text-sm text-muted-foreground break-all">
                {referralUrl}
              </div>
              <Button
                id="copy-referral-link-btn"
                onClick={copyReferralLink}
                className={cn(
                  "shrink-0 gap-2",
                  copySuccess && "bg-emerald-500 hover:bg-emerald-600",
                )}
              >
                {copySuccess ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load referral link.</p>
          )}
          {referralCode && (
            <p className="text-xs text-muted-foreground">
              Referral Code:{" "}
              <code className="font-mono font-semibold text-foreground">{referralCode}</code>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Funnel Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Conversion Funnel</h2>
          {funnel && (
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="size-3" />
              {funnel.conversionRatePercent}% conversion rate
            </Badge>
          )}
        </div>
        {funnelLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-muted/50 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : funnel ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FunnelStep
              label="Visited"
              value={funnel.totalClicks}
              total={funnel.totalClicks}
              color="text-blue-500"
            />
            <FunnelStep
              label="Signed Up"
              value={funnel.totalSignups}
              total={funnel.totalClicks}
              color="text-amber-500"
            />
            <FunnelStep
              label="Activated"
              value={funnel.totalActivated}
              total={funnel.totalClicks}
              color="text-emerald-500"
            />
            <FunnelStep
              label="Converted"
              value={funnel.totalConverted}
              total={funnel.totalClicks}
              color="text-primary"
              accent
            />
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center">
              <Users className="size-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium">No referral data yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Share your referral link to start tracking.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Attributions */}
      {attributions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Recent Referrals</h2>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Visited
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Signed Up
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Activated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attributions.slice(0, 20).map((attr) => {
                  const sm = STATUS_META[attr.status] ?? DEFAULT_STATUS_META;
                  return (
                    <tr key={attr.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(attr.landing_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={cn("text-xs", sm.color)}>
                          {sm.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {attr.signup_at
                          ? new Date(attr.signup_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {attr.activated_at
                          ? new Date(attr.activated_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            How Referrals Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Share Your Link",
                desc: "Share your unique referral URL with other independent operators.",
              },
              {
                step: "2",
                title: "They Visit",
                desc: "First-touch attribution is recorded. 30-day attribution window.",
              },
              {
                step: "3",
                title: "They Sign Up",
                desc: "Referral advances to 'Signed Up' when they create an account.",
              },
              {
                step: "4",
                title: "They Activate",
                desc: "Advances to 'Activated' when they connect accounts + transactions.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="size-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            <strong>Attribution model:</strong> First-touch. One attribution record per referred
            workspace. Self-referrals are prevented. Attribution window: 30 days from first click.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

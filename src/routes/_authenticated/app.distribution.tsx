import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Eye,
  FileText,
  Link2,
  Mail,
  Share2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/components/app/workspace-context";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/distribution")({
  component: DistributionAnalyticsPage,
});

const EVENT_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  share_created: { label: "Share Created", icon: Link2, color: "text-primary" },
  share_viewed: { label: "Share Viewed", icon: Eye, color: "text-blue-500" },
  share_link_copied: { label: "Link Copied", icon: Share2, color: "text-cyan-500" },
  share_revoked: { label: "Share Revoked", icon: FileText, color: "text-muted-foreground" },
  share_expired: { label: "Share Expired", icon: FileText, color: "text-muted-foreground" },
  share_email_sent: { label: "Email Sent", icon: Mail, color: "text-indigo-500" },
  recipient_cta_clicked: { label: "CTA Clicked", icon: TrendingUp, color: "text-emerald-500" },
  referral_clicked: { label: "Referral Click", icon: Users, color: "text-amber-500" },
  referral_signup: { label: "Referral Signup", icon: Users, color: "text-amber-600" },
  referral_activated: { label: "Referral Activated", icon: Users, color: "text-emerald-500" },
  referral_converted: { label: "Referral Converted", icon: Zap, color: "text-primary" },
  tool_used: { label: "Tool Used", icon: BarChart3, color: "text-purple-500" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DistributionAnalyticsPage() {
  const { workspace } = useWorkspace();
  const workspaceId = workspace.id;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["distribution-events", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_events")
        .select("id, event_type, created_at, source, metadata")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const { data: artifacts = [] } = useQuery({
    queryKey: ["share-artifacts-stats", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shareable_artifacts")
        .select("id, artifact_type, status, view_count, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  // Aggregate event type counts
  const eventCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] ?? 0) + 1;
    return acc;
  }, {});

  const totalViews = artifacts.reduce((sum, a) => sum + (a.view_count ?? 0), 0);
  const activeArtifacts = artifacts.filter(a => a.status === "active").length;
  const shareCreated = eventCounts["share_created"] ?? 0;
  const emailsSent = eventCounts["share_email_sent"] ?? 0;
  const referralClicks = eventCounts["referral_clicked"] ?? 0;
  const ctaClicks = eventCounts["recipient_cta_clicked"] ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Distribution Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track how your financial artifacts are reaching the world and driving discovery.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Active Links", value: activeArtifacts, icon: Link2, color: "text-primary" },
          { label: "Total Views", value: totalViews, icon: Eye, color: "text-blue-500" },
          { label: "Shares Created", value: shareCreated, icon: Share2, color: "text-cyan-500" },
          { label: "Emails Sent", value: emailsSent, icon: Mail, color: "text-indigo-500" },
          { label: "Referral Clicks", value: referralClicks, icon: Users, color: "text-amber-500" },
          { label: "CTA Clicks", value: ctaClicks, icon: TrendingUp, color: "text-emerald-500" },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="pt-4 pb-3">
              <m.icon className={cn("size-4 mb-1.5", m.color)} />
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Event type breakdown */}
      {Object.keys(eventCounts).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="size-4 text-primary" />Event Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(eventCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const meta = EVENT_META[type] ?? { label: type, icon: Activity, color: "text-muted-foreground" };
                  const Icon = meta.icon;
                  const maxCount = Math.max(...Object.values(eventCounts));
                  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Icon className={cn("size-3.5", meta.color)} />
                          {meta.label}
                        </span>
                        <span className="font-mono font-semibold">{count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", meta.color.replace("text-", "bg-"))} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent events */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Recent Distribution Events</h2>
        {isLoading && <div className="text-sm text-muted-foreground py-8 text-center">Loading events…</div>}
        {!isLoading && events.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <Activity className="size-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm">No distribution events yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create share links and share your referral link to see events here.</p>
            </CardContent>
          </Card>
        )}
        {events.slice(0, 30).map(event => {
          const meta = EVENT_META[event.event_type] ?? { label: event.event_type, icon: Activity, color: "text-muted-foreground" };
          const Icon = meta.icon;
          return (
            <div key={event.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border hover:bg-muted/20 transition-colors">
              <div className={cn("size-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0")}>
                <Icon className={cn("size-3.5", meta.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{meta.label}</p>
                {event.source && <p className="text-xs text-muted-foreground">via {event.source}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{formatDate(event.created_at)}</p>
                {event.metadata && Object.keys(event.metadata as object).length > 0 && (
                  <Badge variant="outline" className="text-[10px] mt-0.5">
                    {Object.keys(event.metadata as object)[0]}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

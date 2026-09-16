import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  CreditCard,
  DollarSign,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminDashboardFn } from "@/server/admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [{ title: "Platform Analytics | SoloOS Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminAnalyticsPage,
});

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn("rounded-lg p-2 shrink-0", accent ?? "bg-primary/10 text-primary")}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280",
  solo: "#3b82f6",
  pro: "#10b981",
};

function AdminAnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_dashboard_stats"],
    queryFn: () => adminDashboardFn(),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">
          Failed to load analytics: {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  const {
    workspaceCount,
    userCount,
    activeSubscriptionCount,
    openSupportCount,
    mwkRevenueMajor,
    usdRevenueMajor,
    planCounts,
  } = data;

  const planChartData = Object.entries(planCounts).map(([plan, count]) => ({
    label: plan.charAt(0).toUpperCase() + plan.slice(1),
    count,
    color: PLAN_COLORS[plan] ?? "#6b7280",
  }));

  const revenueData = [
    ...(mwkRevenueMajor > 0 ? [{ currency: "MWK", amount: mwkRevenueMajor }] : []),
    ...(usdRevenueMajor > 0 ? [{ currency: "USD", amount: usdRevenueMajor }] : []),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real-time platform metrics derived directly from the database.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Workspaces"
          value={workspaceCount.toLocaleString()}
          sub="All registered"
          icon={Building2}
          accent="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          label="Members"
          value={userCount.toLocaleString()}
          sub="Workspace members"
          icon={Users}
          accent="bg-violet-500/10 text-violet-500"
        />
        <StatCard
          label="Active Subscriptions"
          value={activeSubscriptionCount.toLocaleString()}
          sub="Paying customers"
          icon={CreditCard}
          accent="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          label="Open Support"
          value={openSupportCount.toLocaleString()}
          sub="Awaiting response"
          icon={Users}
          accent={
            openSupportCount > 0
              ? "bg-amber-500/10 text-amber-500"
              : "bg-muted text-muted-foreground"
          }
        />
      </div>

      {/* Revenue by currency */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="size-4 text-primary" />
              Revenue by Currency
            </CardTitle>
            <CardDescription className="text-xs">
              Verified payment totals — MWK and USD never aggregated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No verified payments recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {revenueData.map((r) => (
                  <div
                    key={r.currency}
                    className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {r.currency}
                      </Badge>
                    </div>
                    <span className="font-mono text-lg font-bold text-emerald-500">
                      {r.currency}{" "}
                      {r.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              Active Subscription Mix
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of active subscriptions by plan tier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {planChartData.every((p) => p.count === 0) ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No active subscriptions yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={planChartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [String(v), "Workspaces"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {planChartData.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pie breakdown */}
      {planChartData.some((p) => p.count > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tier Composition</CardTitle>
            <CardDescription className="text-xs">
              Share of workspaces on each plan tier (active subscriptions only).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={planChartData.filter((p) => p.count > 0)}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {planChartData.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [String(v), "Workspaces"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

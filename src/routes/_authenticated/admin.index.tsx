import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  HelpCircle,
  Loader2,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminDashboardFn } from "@/server/admin";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
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
          Failed to load dashboard metrics:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Platform Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          High-level metrics, revenue collection, and platform operational health.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Workspaces</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaceCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered tenant workspaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platform Users
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Total workspace memberships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscriptions
            </CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptionCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Paid accounts in active standing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Support
            </CardTitle>
            <HelpCircle className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openSupportCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Tickets awaiting response</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Separation: MWK & USD */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Verified Subscription Revenue</h2>
            <p className="text-xs text-muted-foreground">
              MWK and USD are strictly independent ledgers. No conversion is applied.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/revenue">View Revenue Details</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-semibold text-foreground">
                  🇲🇼 Malawi Kwacha (MWK)
                </CardDescription>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                  MWK Ledger
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">
                MWK {mwkRevenueMajor.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total verified payments processed via PayChangu MWK
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-semibold text-foreground">
                  🌐 US Dollars (USD)
                </CardDescription>
                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600">
                  USD Ledger
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">
                $
                {usdRevenueMajor.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total verified payments processed in USD
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subscription Breakdown & Quick Links */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription Plan Distribution</CardTitle>
            <CardDescription>Breakdown of active workspace subscriptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-muted-foreground" />
                <span className="text-sm font-medium">Free Tier</span>
              </div>
              <span className="text-sm font-semibold">{planCounts["free"] ?? 0}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-primary" />
                <span className="text-sm font-medium">Solo Tier (MWK 14k / $8)</span>
              </div>
              <span className="text-sm font-semibold">{planCounts["solo"] ?? 0}</span>
            </div>
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-amber-500" />
                <span className="text-sm font-medium">Pro Tier (MWK 21k / $12)</span>
              </div>
              <span className="text-sm font-semibold">{planCounts["pro"] ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Administrative Operations</CardTitle>
            <CardDescription>Direct navigation to operational management</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline" className="justify-start gap-2 h-auto py-2.5">
              <Link to="/admin/workspaces">
                <Building2 className="size-4 text-primary" />
                <span>Workspaces</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2 h-auto py-2.5">
              <Link to="/admin/users">
                <Users className="size-4 text-primary" />
                <span>User Memberships</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2 h-auto py-2.5">
              <Link to="/admin/subscriptions">
                <CreditCard className="size-4 text-primary" />
                <span>Subscriptions</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2 h-auto py-2.5">
              <Link to="/admin/payments">
                <Banknote className="size-4 text-primary" />
                <span>Reconciliation</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="justify-start gap-2 h-auto py-2.5 sm:col-span-2"
            >
              <Link to="/admin/support">
                <HelpCircle className="size-4 text-amber-500" />
                <span>Support Queue ({openSupportCount} open)</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

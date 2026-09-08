import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  DollarSign,
  FolderGit2,
  Info,
  Lightbulb,
  Receipt,
  Wallet,
} from "lucide-react";

import { useWorkspace } from "@/components/app/workspace-context";
import {
  insightsQueryOptions,
  type Insight,
  type InsightCategory,
  type InsightSeverity,
} from "@/domain/insights";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/insights")({
  component: InsightsPage,
});

const CATEGORY_LABELS: Record<InsightCategory, { label: string; icon: typeof Lightbulb }> = {
  receivables: { label: "Receivables", icon: Receipt },
  cash: { label: "Cash & Accounts", icon: Wallet },
  expenses: { label: "Expenses", icon: DollarSign },
  profitability: { label: "Profitability", icon: Lightbulb },
  clients: { label: "Clients", icon: Building2 },
  projects: { label: "Projects", icon: FolderGit2 },
};

const SEVERITY_CONFIG: Record<
  InsightSeverity,
  { label: string; badgeClass: string; icon: typeof Info }
> = {
  warning: {
    label: "Action Required",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/20",
    icon: AlertCircle,
  },
  attention: {
    label: "Attention",
    badgeClass: "bg-amber-500/15 text-amber-500 border-amber-500/20",
    icon: AlertTriangle,
  },
  info: {
    label: "Observation",
    badgeClass: "bg-muted text-muted-foreground border-border/50",
    icon: Info,
  },
};

function InsightsPage() {
  const { workspace } = useWorkspace();
  const [selectedCategory, setSelectedCategory] = useState<InsightCategory | "all">("all");
  const [selectedSeverity, setSelectedSeverity] = useState<InsightSeverity | "all">("all");

  const insightsQuery = useQuery(insightsQueryOptions(workspace.id));
  const allInsights = insightsQuery.data ?? [];

  const filteredInsights = allInsights.filter((item) => {
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
    if (selectedSeverity !== "all" && item.severity !== selectedSeverity) return false;
    return true;
  });

  const warningCount = allInsights.filter((i) => i.severity === "warning").length;
  const attentionCount = allInsights.filter((i) => i.severity === "attention").length;
  const infoCount = allInsights.filter((i) => i.severity === "info").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Page Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Financial Insights</h1>
            <Badge variant="outline" className="text-xs">
              Evidence-Based
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Deterministic observations derived from your authoritative financial ledger. No
            speculation.
          </p>
        </div>
      </header>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Action Items
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-destructive flex items-center justify-between">
              {warningCount}
              <AlertCircle className="h-5 w-5 text-destructive/70" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Conditions requiring immediate operational response.
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Attention Notes
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-500 flex items-center justify-between">
              {attentionCount}
              <AlertTriangle className="h-5 w-5 text-amber-500/70" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Upcoming milestones or concentration risks.
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Observations
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-between">
              {infoCount}
              <Info className="h-5 w-5 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Spending patterns and project milestone data.
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            All Categories ({allInsights.length})
          </button>
          {(Object.keys(CATEGORY_LABELS) as InsightCategory[]).map((cat) => {
            const count = allInsights.filter((i) => i.category === cat).length;
            if (count === 0) return null;
            const config = CATEGORY_LABELS[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                <config.icon className="h-3.5 w-3.5" />
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1">
          {(["all", "warning", "attention", "info"] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSelectedSeverity(sev)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                selectedSeverity === sev
                  ? "bg-secondary text-secondary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Insights List */}
      {insightsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 rounded-lg border border-border/40 bg-muted/20 animate-pulse"
            />
          ))}
        </div>
      ) : filteredInsights.length === 0 ? (
        <Card className="border-border/60 border-dashed text-center py-12">
          <CardContent className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-semibold">No Active Observations</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {allInsights.length === 0
                ? "Your financial records are healthy. As you invoice clients, record expenses, and reconcile accounts, evidence-based alerts and insights will appear here."
                : "No insights match your selected filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInsights.map((insight) => {
            const sev = SEVERITY_CONFIG[insight.severity];
            const cat = CATEGORY_LABELS[insight.category];
            const CatIcon = cat?.icon ?? Lightbulb;

            return (
              <Card
                key={insight.id}
                className={cn(
                  "border-border/60 transition-colors hover:border-border",
                  insight.severity === "warning" && "border-destructive/30 bg-destructive/[0.02]",
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn("text-xs font-semibold", sev.badgeClass)}
                      >
                        {sev.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CatIcon className="h-3 w-3" />
                        {cat?.label}
                      </span>
                      {insight.currency && (
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {insight.currency}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-base font-semibold pt-1">{insight.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.description}
                  </p>
                  {insight.action && (
                    <div className="pt-2">
                      <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Link to={insight.action.to}>
                          {insight.action.label}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

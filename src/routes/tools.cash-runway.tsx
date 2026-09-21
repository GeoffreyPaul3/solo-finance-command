import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calculator,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { calculatePublicCashRunway } from "@/domain/free-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/cash-runway")({
  head: () => ({
    meta: [
      { title: "Cash Runway Calculator | SoloOS Free Tools" },
      {
        name: "description",
        content:
          "Calculate how many months your current cash balance can sustain your business burn rate.",
      },
    ],
  }),
  component: CashRunwayPage,
});

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

const STATUS_CONFIG = {
  critical: {
    label: "Critical",
    color: "text-destructive",
    bg: "border-destructive/30 bg-destructive/5",
    icon: AlertTriangle,
  },
  tight: {
    label: "Tight",
    color: "text-amber-500",
    bg: "border-amber-500/30 bg-amber-500/5",
    icon: TrendingDown,
  },
  healthy: {
    label: "Healthy",
    color: "text-emerald-500",
    bg: "border-emerald-500/30 bg-emerald-500/5",
    icon: TrendingUp,
  },
  strong: {
    label: "Strong",
    color: "text-primary",
    bg: "border-primary/30 bg-primary/5",
    icon: TrendingUp,
  },
};

function CashRunwayPage() {
  const [currentCash, setCurrentCash] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [upcomingObligations, setUpcomingObligations] = useState("");
  const [expectedCollections, setExpectedCollections] = useState("");
  const [calculated, setCalculated] = useState(false);

  const result = calculatePublicCashRunway({
    currentCash: parseFloat(currentCash) || 0,
    monthlyOperatingExpenses: parseFloat(monthlyExpenses) || 0,
    upcomingObligations: parseFloat(upcomingObligations) || 0,
    expectedCollections: parseFloat(expectedCollections) || 0,
  });

  const sc = STATUS_CONFIG[result.status];
  const StatusIcon = sc.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/tools">
            <Button variant="ghost" size="sm" id="back-to-tools">
              <ArrowLeft className="size-4 mr-1" />
              Tools
            </Button>
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-sm font-medium">Cash Runway Calculator</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <TrendingUp className="size-5 text-cyan-500" />
            </div>
            <h1 className="text-2xl font-bold">Cash Runway Calculator</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Calculate how long your cash can sustain your current burn rate.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                id: "current-cash",
                label: "Current Cash Balance",
                value: currentCash,
                set: setCurrentCash,
                hint: "Total cash on hand today",
              },
              {
                id: "monthly-expenses",
                label: "Monthly Operating Expenses",
                value: monthlyExpenses,
                set: setMonthlyExpenses,
                hint: "Average monthly burn rate",
              },
              {
                id: "upcoming-obligations",
                label: "Upcoming Lump-Sum Obligations",
                value: upcomingObligations,
                set: setUpcomingObligations,
                hint: "One-time costs due soon",
              },
              {
                id: "expected-collections",
                label: "Expected Collections",
                value: expectedCollections,
                set: setExpectedCollections,
                hint: "Invoice payments expected soon",
              },
            ].map((f) => (
              <div key={f.id} className="space-y-1.5">
                <Label htmlFor={f.id}>{f.label}</Label>
                <MoneyInput id={f.id} value={f.value} onChange={f.set} placeholder="0.00" />
                <p className="text-xs text-muted-foreground">{f.hint}</p>
              </div>
            ))}
            <Button id="calculate-runway" className="w-full" onClick={() => setCalculated(true)}>
              <Calculator className="size-4 mr-2" />
              Calculate Runway
            </Button>
          </CardContent>
        </Card>

        {calculated && (
          <Card className={cn("border-2", sc.bg)}>
            <CardContent className="py-6 space-y-5">
              <div className="flex items-center gap-3">
                <StatusIcon className={cn("size-6", sc.color)} />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                    Cash Runway
                  </p>
                  <p className={cn("text-3xl font-bold", sc.color)}>
                    {result.isInfinite ? "Infinite" : `${result.runwayMonths} months`}
                  </p>
                </div>
                <span
                  className={cn(
                    "ml-auto px-3 py-1 rounded-full text-sm font-semibold",
                    sc.color,
                    "bg-current/10",
                  )}
                >
                  {sc.label}
                </span>
              </div>
              <div className="space-y-2 border rounded-lg p-4 bg-background/60">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Breakdown
                </p>
                {[
                  ["Current Cash", fmt(parseFloat(currentCash) || 0)],
                  ["− Upcoming Obligations", fmt(parseFloat(upcomingObligations) || 0)],
                  ["+ Expected Collections", fmt(parseFloat(expectedCollections) || 0)],
                  ["= Net Available Cash", fmt(result.netAvailableCash)],
                  ["÷ Monthly Burn", fmt(parseFloat(monthlyExpenses) || 0)],
                ].map(([k = "", v = ""]) => (
                  <div
                    key={k}
                    className={cn(
                      "flex justify-between text-sm",
                      k.startsWith("=") && "font-semibold border-t pt-2 mt-1",
                    )}
                  >
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg bg-muted/40 p-3">
                <Info className="size-3.5 shrink-0 mt-0.5" />
                <span>{result.disclaimer}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-3">
          <p className="text-sm font-semibold">Track runway automatically with real account data</p>
          <p className="text-xs text-muted-foreground">
            SoloOS connects your accounts and updates cash runway in real-time.
          </p>
          <Link to="/auth" search={{ mode: "signup" as const }}>
            <Button size="sm" id="runway-cta">
              Get Started Free <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

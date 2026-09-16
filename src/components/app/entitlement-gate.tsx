import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlanTier } from "@/lib/payments/pricing";

export interface EntitlementGateProps {
  title: string;
  description: string;
  requiredPlan: "solo" | "pro";
  features: string[];
}

export function EntitlementGate({
  title,
  description,
  requiredPlan,
  features,
}: EntitlementGateProps) {
  const planLabel = requiredPlan === "pro" ? "Pro Plan" : "Solo Plan";

  return (
    <div className="flex min-h-[460px] items-center justify-center p-6">
      <Card className="max-w-lg border-primary/20 bg-card/80 shadow-lg backdrop-blur-sm">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="size-6" />
          </div>
          <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="size-3.5" />
            <span>Available on {planLabel}</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {title}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Included in {planLabel}:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-foreground">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link to="/app">Back to Dashboard</Link>
            </Button>
            <Button asChild size="sm" className="w-full sm:w-auto gap-1.5 shadow-sm">
              <Link to="/app/settings" search={{ tab: "billing" }}>
                <span>Upgrade to {planLabel}</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

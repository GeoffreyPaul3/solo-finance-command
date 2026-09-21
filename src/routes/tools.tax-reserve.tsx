import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, ArrowRight, Calculator, Info, Shield } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Slider } from "@/components/ui/slider";
import { calculatePublicTaxReserve } from "@/domain/free-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/tax-reserve")({
  head: () => ({
    meta: [
      { title: "Tax Reserve Planner | SoloOS Free Tools" },
      {
        name: "description",
        content:
          "Plan your tax reserve based on estimated taxable income and your planning rate. Not a tax calculation — a planning estimate.",
      },
    ],
  }),
  component: TaxReservePage,
});

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function TaxReservePage() {
  const [taxableAmount, setTaxableAmount] = useState("");
  const [ratePercent, setRatePercent] = useState(25);
  const [calculated, setCalculated] = useState(false);

  const result = calculatePublicTaxReserve({
    estimatedTaxableAmount: parseFloat(taxableAmount) || 0,
    planningRatePercent: ratePercent,
  });

  const reservePct =
    result.estimatedTaxableAmount > 0
      ? Math.round((result.estimatedReserveAmount / result.estimatedTaxableAmount) * 100)
      : 0;

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
          <span className="text-sm font-medium">Tax Reserve Planner</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Shield className="size-5 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold">Tax Reserve Planner</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Plan how much to set aside for taxes based on your estimated taxable income.
          </p>
        </div>

        {/* Disclaimer banner */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Planning estimate only.</strong> This is not a tax
            liability calculation and does not account for country-specific tax rules, deductions,
            or exemptions. Consult a qualified tax professional for authoritative advice.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="taxable-amount">Estimated Taxable Amount</Label>
              <MoneyInput
                id="taxable-amount"
                value={taxableAmount}
                onChange={setTaxableAmount}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Your estimated taxable income or revenue for the period
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Planning Rate</Label>
                <span className="text-xl font-bold font-mono text-primary">{ratePercent}%</span>
              </div>
              <Slider
                id="tax-rate-slider"
                min={5}
                max={60}
                step={1}
                value={[ratePercent]}
                onValueChange={([v]) => {
                  if (v !== undefined) setRatePercent(v);
                }}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5% (low estimate)</span>
                <span>60% (high estimate)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose a rate based on your estimated effective tax rate. Common ranges: 15–30% for
                sole traders, 25–40% for higher-income self-employed.
              </p>
            </div>
            <Button
              id="calculate-tax-reserve"
              className="w-full"
              onClick={() => setCalculated(true)}
            >
              <Calculator className="size-4 mr-2" />
              Calculate Reserve
            </Button>
          </CardContent>
        </Card>

        {calculated && (
          <Card className="border-rose-500/30 bg-rose-500/5">
            <CardContent className="py-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-background/70 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Set Aside
                  </p>
                  <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
                    {fmt(result.estimatedReserveAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {reservePct}% of taxable amount
                  </p>
                </div>
                <div className="rounded-lg border bg-background/70 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Effective Take-Home
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {fmt(result.effectiveTakeHome)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {100 - reservePct}% retained
                  </p>
                </div>
              </div>

              {/* Visual split */}
              <div className="space-y-2">
                <div className="h-4 rounded-full overflow-hidden flex">
                  <div className="bg-rose-500 transition-all" style={{ width: `${reservePct}%` }} />
                  <div className="bg-emerald-500 flex-1" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-rose-500 inline-block" />
                    Tax Reserve ({reservePct}%)
                  </span>
                  <span className="flex items-center gap-1">
                    Take-Home ({100 - reservePct}%)
                    <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg bg-muted/40 p-3">
                <Info className="size-3.5 shrink-0 mt-0.5" />
                <span>{result.disclaimer}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-3">
          <p className="text-sm font-semibold">Track your tax reserve automatically in SoloOS</p>
          <p className="text-xs text-muted-foreground">
            SoloOS automatically tracks your tax reserve against real revenue and reminds you to set
            aside funds.
          </p>
          <Link to="/auth" search={{ mode: "signup" as const }}>
            <Button size="sm" id="tax-reserve-cta">
              Get Started Free <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

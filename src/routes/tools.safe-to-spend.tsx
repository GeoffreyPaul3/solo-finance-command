import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Calculator, Info, Zap } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculatePublicSafeToSpend } from "@/domain/free-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/safe-to-spend")({
  head: () => ({
    meta: [
      { title: "Safe-to-Spend Estimator | SoloOS Free Tools" },
      { name: "description", content: "Estimate how much cash you can safely spend today after accounting for tax reserves, obligations, and operating buffers." },
    ],
  }),
  component: SafeToSpendPage,
});

function NumInput({
  id, label, value, onChange, hint,
}: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0.00"
        className="font-mono"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function SafeToSpendPage() {
  const [liquidCash, setLiquidCash] = useState("");
  const [taxReserve, setTaxReserve] = useState("");
  const [upcomingObligations, setUpcomingObligations] = useState("");
  const [operatingBuffer, setOperatingBuffer] = useState("");
  const [expectedCollections, setExpectedCollections] = useState("");
  const [calculated, setCalculated] = useState(false);

  const result = calculatePublicSafeToSpend({
    liquidCash: parseFloat(liquidCash) || 0,
    taxReserve: parseFloat(taxReserve) || 0,
    upcomingObligations: parseFloat(upcomingObligations) || 0,
    operatingBuffer: parseFloat(operatingBuffer) || 0,
    expectedCollections: parseFloat(expectedCollections) || 0,
  });

  const isPositive = result.estimatedSafeToSpend > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/tools">
            <Button variant="ghost" size="sm" id="back-to-tools"><ArrowLeft className="size-4 mr-1" />Tools</Button>
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-sm font-medium">Safe-to-Spend Estimator</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Zap className="size-5 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold">Safe-to-Spend Estimator</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Estimate how much cash you can safely spend today. Enter your inputs — all calculations happen in your browser.
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Your Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <NumInput id="liquid-cash" label="Current Liquid Cash" value={liquidCash} onChange={setLiquidCash} hint="Total cash in business accounts today" />
            <NumInput id="tax-reserve" label="Tax Reserve Set Aside" value={taxReserve} onChange={setTaxReserve} hint="Amount already reserved for taxes" />
            <NumInput id="upcoming-obligations" label="Upcoming Obligations" value={upcomingObligations} onChange={setUpcomingObligations} hint="Bills, subscriptions, payroll due soon" />
            <NumInput id="operating-buffer" label="Operating Buffer" value={operatingBuffer} onChange={setOperatingBuffer} hint="Minimum cash cushion you want to maintain" />
            <NumInput id="expected-collections" label="Expected Collections" value={expectedCollections} onChange={setExpectedCollections} hint="Invoices or payments you expect to receive soon" />
            <Button
              id="calculate-safe-to-spend"
              className="w-full"
              onClick={() => setCalculated(true)}
            >
              <Calculator className="size-4 mr-2" />
              Calculate Safe-to-Spend
            </Button>
          </CardContent>
        </Card>

        {calculated && (
          <Card className={cn("border-2", isPositive ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5")}>
            <CardContent className="py-6 space-y-5">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">
                  Estimated Safe-to-Spend (Planning Estimate)
                </p>
                <p className={cn("text-4xl font-bold", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                  {fmt(result.estimatedSafeToSpend)}
                </p>
              </div>
              <div className="space-y-2 border rounded-lg p-4 bg-background/60">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Breakdown</p>
                {[
                  ["Liquid Cash", fmt(parseFloat(liquidCash) || 0)],
                  ["− Tax Reserve", fmt(parseFloat(taxReserve) || 0)],
                  ["− Upcoming Obligations", fmt(parseFloat(upcomingObligations) || 0)],
                  ["− Operating Buffer", fmt(parseFloat(operatingBuffer) || 0)],
                  ["= Net Available", fmt(result.netAvailableCash)],
                  ["+ Expected Collections", fmt(parseFloat(expectedCollections) || 0)],
                ].map(([k = "", v = ""]) => (
                  <div key={k} className={cn("flex justify-between text-sm", k.startsWith("=") && "font-semibold border-t pt-2 mt-1")}>
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
          <p className="text-sm font-semibold">Get this calculated automatically from your real accounts</p>
          <p className="text-xs text-muted-foreground">SoloOS connects to your financial accounts and updates safe-to-spend in real-time.</p>
          <Link to="/auth" search={{ mode: "signup" } as any}>
            <Button size="sm" id="safe-to-spend-cta">
              Get Started Free <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

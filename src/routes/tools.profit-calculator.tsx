import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, Calculator, Info } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencySelect } from "@/components/ui/currency-select";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { calculatePublicProfit } from "@/domain/free-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/profit-calculator")({
  head: () => ({
    meta: [
      { title: "Profit Margin Calculator | SoloOS Free Tools" },
      {
        name: "description",
        content:
          "Calculate gross and net profit margins from your revenue, direct expenses, and operating costs.",
      },
    ],
  }),
  component: ProfitCalculatorPage,
});

function fmt(n: number, currency: string) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}

function MarginBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const safeP = Math.max(0, Math.min(100, pct));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-semibold", pct >= 0 ? color : "text-destructive")}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 0 ? color.replace("text-", "bg-") : "bg-destructive",
          )}
          style={{ width: `${safeP}%` }}
        />
      </div>
    </div>
  );
}

function ProfitCalculatorPage() {
  const [currency, setCurrency] = useState("USD");
  const [revenue, setRevenue] = useState("");
  const [directExpenses, setDirectExpenses] = useState("");
  const [operatingExpenses, setOperatingExpenses] = useState("");
  const [taxReserve, setTaxReserve] = useState("");
  const [calculated, setCalculated] = useState(false);

  const result = calculatePublicProfit({
    revenue: parseFloat(revenue) || 0,
    directExpenses: parseFloat(directExpenses) || 0,
    operatingExpenses: parseFloat(operatingExpenses) || 0,
    taxPlanningReserve: parseFloat(taxReserve) || 0,
  });

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
          <span className="text-sm font-medium">Profit Margin Calculator</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <BarChart3 className="size-5 text-purple-500" />
            </div>
            <h1 className="text-2xl font-bold">Profit Margin Calculator</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Calculate gross and net profit margins from your business economics.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pc-currency">Currency</Label>
              <CurrencySelect id="pc-currency" value={currency} onChange={setCurrency} />
            </div>
            {[
              {
                id: "revenue",
                label: "Total Revenue",
                value: revenue,
                set: setRevenue,
                hint: "Total income from all sources",
              },
              {
                id: "direct-expenses",
                label: "Direct Expenses (COGS)",
                value: directExpenses,
                set: setDirectExpenses,
                hint: "Costs directly tied to delivering your service/product",
              },
              {
                id: "operating-expenses",
                label: "Operating Expenses (OPEX)",
                value: operatingExpenses,
                set: setOperatingExpenses,
                hint: "Overhead: rent, software, staff, marketing",
              },
              {
                id: "tax-reserve",
                label: "Tax Planning Reserve",
                value: taxReserve,
                set: setTaxReserve,
                hint: "Amount set aside for estimated taxes",
              },
            ].map((f) => (
              <div key={f.id} className="space-y-1.5">
                <Label htmlFor={f.id}>{f.label}</Label>
                <MoneyInput
                  id={f.id}
                  value={f.value}
                  onChange={f.set}
                  placeholder="0.00"
                  currency={currency}
                />
                <p className="text-xs text-muted-foreground">{f.hint}</p>
              </div>
            ))}
            <Button id="calculate-profit" className="w-full" onClick={() => setCalculated(true)}>
              <Calculator className="size-4 mr-2" />
              Calculate Profit
            </Button>
          </CardContent>
        </Card>

        {calculated && (
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardContent className="py-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Revenue",
                    value: fmt(result.revenue, currency),
                    color: "text-foreground",
                  },
                  {
                    label: "Total Expenses",
                    value: fmt(result.totalExpenses, currency),
                    color: "text-muted-foreground",
                  },
                  {
                    label: "Gross Profit",
                    value: fmt(result.grossProfit, currency),
                    color: result.grossProfit >= 0 ? "text-emerald-600" : "text-destructive",
                  },
                  {
                    label: "Net Profit",
                    value: fmt(result.netProfit, currency),
                    color:
                      result.netProfit >= 0
                        ? "text-primary font-bold"
                        : "text-destructive font-bold",
                  },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                    <p className={cn("text-lg font-semibold font-mono", m.color)}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <MarginBar
                  label="Gross Margin"
                  pct={result.grossMarginPercent}
                  color="text-emerald-500"
                />
                <MarginBar
                  label="Net Margin"
                  pct={result.netMarginPercent}
                  color="text-purple-500"
                />
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg bg-muted/40 p-3">
                <Info className="size-3.5 shrink-0 mt-0.5" />
                <span>{result.disclaimer}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-3">
          <p className="text-sm font-semibold">Track profitability with real data in SoloOS</p>
          <p className="text-xs text-muted-foreground">
            Automated P&L, per-client and per-project profitability from your real accounts.
          </p>
          <Link to="/auth" search={{ mode: "signup" as const }}>
            <Button size="sm" id="profit-cta">
              Get Started Free <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

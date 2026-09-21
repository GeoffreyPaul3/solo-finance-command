import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Calculator, FileText, Info } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencySelect } from "@/components/ui/currency-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { calculatePublicInvoiceProfit } from "@/domain/free-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/invoice-profit")({
  head: () => ({
    meta: [
      { title: "Invoice Profit Estimator | SoloOS Free Tools" },
      {
        name: "description",
        content:
          "Estimate profit on your invoices after direct costs, project overhead, and payment processing fees.",
      },
    ],
  }),
  component: InvoiceProfitPage,
});

function fmt(n: number, currency: string) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}

function InvoiceProfitPage() {
  const [currency, setCurrency] = useState("USD");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [directCosts, setDirectCosts] = useState("");
  const [projectCosts, setProjectCosts] = useState("");
  const [feePercent, setFeePercent] = useState("2.9");
  const [calculated, setCalculated] = useState(false);

  const result = calculatePublicInvoiceProfit({
    invoiceAmount: parseFloat(invoiceAmount) || 0,
    directCosts: parseFloat(directCosts) || 0,
    projectCosts: parseFloat(projectCosts) || 0,
    processingFeePercent: parseFloat(feePercent) || 0,
  });

  const isProfit = result.estimatedProfit >= 0;

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
          <span className="text-sm font-medium">Invoice Profit Estimator</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <FileText className="size-5 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold">Invoice Profit Estimator</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Estimate how much profit you actually keep on each invoice.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ip-currency">Currency</Label>
              <CurrencySelect id="ip-currency" value={currency} onChange={setCurrency} />
            </div>
            {[
              {
                id: "invoice-amount",
                label: "Invoice Amount",
                value: invoiceAmount,
                set: setInvoiceAmount,
                hint: "Total amount billed to client",
              },
              {
                id: "direct-costs",
                label: "Direct Costs (Labour / COGS)",
                value: directCosts,
                set: setDirectCosts,
                hint: "Wages, subcontractors, materials for this invoice",
              },
              {
                id: "project-costs",
                label: "Project Overhead",
                value: projectCosts,
                set: setProjectCosts,
                hint: "Shared costs allocated to this project",
              },
              {
                id: "fee-percent",
                label: "Payment Processing Fee (%)",
                value: feePercent,
                set: setFeePercent,
                hint: "e.g. 2.9% for Stripe. Enter 0 if no fee.",
              },
            ].map((f) => (
              <div key={f.id} className="space-y-1.5">
                <Label htmlFor={f.id}>{f.label}</Label>
                {f.id === "fee-percent" ? (
                  <Input
                    id={f.id}
                    type="number"
                    min="0"
                    step="any"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder="0.00"
                    className="font-mono"
                  />
                ) : (
                  <MoneyInput
                    id={f.id}
                    value={f.value}
                    onChange={f.set}
                    placeholder="0.00"
                    currency={currency}
                  />
                )}
                <p className="text-xs text-muted-foreground">{f.hint}</p>
              </div>
            ))}
            <Button
              id="calculate-invoice-profit"
              className="w-full"
              onClick={() => setCalculated(true)}
            >
              <Calculator className="size-4 mr-2" />
              Calculate Profit
            </Button>
          </CardContent>
        </Card>

        {calculated && (
          <Card
            className={cn(
              "border-2",
              isProfit
                ? "border-blue-500/30 bg-blue-500/5"
                : "border-destructive/30 bg-destructive/5",
            )}
          >
            <CardContent className="py-6 space-y-5">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">
                  Estimated Profit
                </p>
                <p
                  className={cn(
                    "text-4xl font-bold",
                    isProfit ? "text-blue-600 dark:text-blue-400" : "text-destructive",
                  )}
                >
                  {fmt(result.estimatedProfit, currency)}
                </p>
                <p
                  className={cn("text-sm mt-1", isProfit ? "text-emerald-600" : "text-destructive")}
                >
                  {result.profitMarginPercent.toFixed(1)}% margin
                </p>
              </div>
              <div className="space-y-2 border rounded-lg p-4 bg-background/60">
                {[
                  ["Invoice Amount", fmt(result.invoiceAmount, currency)],
                  ["− Direct Costs", fmt(parseFloat(directCosts) || 0, currency)],
                  ["− Project Overhead", fmt(parseFloat(projectCosts) || 0, currency)],
                  [`− Processing Fee (${feePercent}%)`, fmt(result.processingFeeAmount, currency)],
                  ["= Total Costs", fmt(result.totalCost, currency)],
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
          <p className="text-sm font-semibold">Track per-invoice profitability automatically</p>
          <p className="text-xs text-muted-foreground">
            SoloOS tracks actual profit on every invoice as costs are recorded.
          </p>
          <Link to="/auth" search={{ mode: "signup" as const }}>
            <Button size="sm" id="invoice-profit-cta">
              Get Started Free <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

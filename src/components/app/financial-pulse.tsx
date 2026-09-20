import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  PiggyBank,
  Receipt,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyValue } from "@/components/ui/money-value";
import { Progress } from "@/components/ui/progress";
import type { FinancialPulse } from "@/domain/financial-pulse";
import type { SoloOSFinancialHealth } from "@/domain/financial-health";
import { cn } from "@/lib/utils";

interface FinancialPulseProps {
  pulse: FinancialPulse;
  health: SoloOSFinancialHealth;
  className?: string;
}

export function FinancialPulseCard({ pulse, health, className }: FinancialPulseProps) {
  const [showFormula, setShowFormula] = useState(false);

  const statusBadgeVariant =
    pulse.status === "healthy"
      ? "default"
      : pulse.status === "attention"
        ? "secondary"
        : pulse.status === "critical"
          ? "destructive"
          : "outline";

  const healthRatingColor =
    health.rating === "strong"
      ? "text-emerald-500"
      : health.rating === "stable"
        ? "text-teal-400"
        : health.rating === "needs_attention"
          ? "text-amber-500"
          : health.rating === "vulnerable"
            ? "text-rose-500"
            : "text-muted-foreground";

  return (
    <Card className={cn("overflow-hidden border-border/80 shadow-sm", className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="size-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                Financial Pulse
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time liquidity, reserve integrity, and financial health
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusBadgeVariant} className="text-[11px] capitalize font-medium">
              {pulse.statusLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Core Financial Pulse Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* Liquid Cash */}
          <div className="rounded-lg border border-border/60 bg-surface/50 p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Wallet className="size-3 text-muted-foreground/70" />
              Cash
            </span>
            <div className="mt-1.5 truncate">
              <MoneyValue value={pulse.liquidCash} currency={pulse.currency} size="lg" />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/80 truncate">Verified balances</p>
          </div>

          {/* Safe-to-Spend */}
          <div className="rounded-lg border border-border/60 bg-surface/50 p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="size-3 text-primary" />
              Safe-to-Spend
            </span>
            <div className="mt-1.5 truncate">
              <MoneyValue
                value={pulse.safeToSpend}
                currency={pulse.currency}
                size="lg"
                className={
                  pulse.safeToSpend < 0 ? "text-destructive font-bold" : "text-primary font-bold"
                }
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/80 truncate">
              After reserves & bills
            </p>
          </div>

          {/* Receivables */}
          <div className="rounded-lg border border-border/60 bg-surface/50 p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Receipt className="size-3 text-muted-foreground/70" />
              Receivables
            </span>
            <div className="mt-1.5 truncate">
              <MoneyValue
                value={pulse.outstandingReceivables}
                currency={pulse.currency}
                size="lg"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/80 truncate">
              Unpaid client invoices
            </p>
          </div>

          {/* Upcoming Obligations */}
          <div className="rounded-lg border border-border/60 bg-surface/50 p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Banknote className="size-3 text-muted-foreground/70" />
              Commitments
            </span>
            <div className="mt-1.5 truncate">
              <MoneyValue value={pulse.upcomingObligations} currency={pulse.currency} size="lg" />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/80 truncate">
              Upcoming obligations
            </p>
          </div>

          {/* Tax Reserve */}
          <div className="rounded-lg border border-border/60 bg-surface/50 p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <PiggyBank className="size-3 text-muted-foreground/70" />
              Tax Reserve
            </span>
            <div className="mt-1.5 truncate">
              <MoneyValue value={pulse.actualTaxReserve} currency={pulse.currency} size="lg" />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/80 truncate">
              {pulse.taxReserveFundedPercent}% of target
            </p>
          </div>

          {/* Current Period Profit */}
          <div className="rounded-lg border border-border/60 bg-surface/50 p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Scale className="size-3 text-muted-foreground/70" />
              Net Movement
            </span>
            <div className="mt-1.5 truncate">
              <MoneyValue
                value={pulse.currentPeriodProfit}
                currency={pulse.currency}
                size="lg"
                className={
                  pulse.currentPeriodProfit >= 0
                    ? "text-emerald-500 font-bold"
                    : "text-destructive font-bold"
                }
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/80 truncate">
              Income minus expenses
            </p>
          </div>
        </div>

        {/* SoloOS Financial Health Assessment Section */}
        <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  SoloOS Financial Health
                </span>
                <span className={cn("text-xs font-bold", healthRatingColor)}>
                  • {health.ratingLabel}
                </span>
                {health.score !== null && (
                  <Badge variant="outline" className="font-mono text-xs ml-1">
                    {health.score} / 100
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{health.summary}</p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFormula(!showFormula)}
              className="self-start sm:self-auto text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <Info className="size-3.5" />
              {showFormula ? "Hide Formula" : "Inspect Formula"}
              {showFormula ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </Button>
          </div>

          {/* Evaluated Health Reasons */}
          <div className="mt-3.5 grid gap-2 sm:grid-cols-2 border-t border-border/50 pt-3">
            {health.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                {reason.type === "positive" ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <span
                  className={
                    reason.type === "positive"
                      ? "text-foreground/90"
                      : "text-amber-600 dark:text-amber-400 font-medium"
                  }
                >
                  {reason.text}
                </span>
              </div>
            ))}
          </div>

          {/* Expanded Dimension Score Breakdown */}
          {showFormula && (
            <div className="mt-4 space-y-3 rounded-lg border border-border/60 bg-surface/70 p-3.5 text-xs">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                Transparent Formula Dimensions
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {health.dimensions.map((dim) => (
                  <div key={dim.id} className="space-y-1 rounded border border-border/40 p-2">
                    <div className="flex justify-between font-medium">
                      <span>{dim.name}</span>
                      <span className="font-mono">
                        {dim.score} / {dim.maxScore} pts
                      </span>
                    </div>
                    <Progress value={(dim.score / dim.maxScore) * 100} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">{dim.description}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/80 italic pt-1 border-t border-border/40">
                {health.disclaimer}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

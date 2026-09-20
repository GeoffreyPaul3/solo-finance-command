import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Lightbulb,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyValue } from "@/components/ui/money-value";
import type { SoloOSFinancialBrief } from "@/domain/financial-brief";
import { cn } from "@/lib/utils";

interface FinancialBriefProps {
  brief: SoloOSFinancialBrief;
  className?: string;
}

export function FinancialBriefCard({ brief, className }: FinancialBriefProps) {
  return (
    <Card className={cn("overflow-hidden border-border/80 shadow-sm", className)}>
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/15">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                Financial Brief
              </CardTitle>
              <CardDescription className="text-xs">
                Deterministic executive briefing: positions, signals, and attention triggers
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-xs font-medium self-start sm:self-auto bg-surface"
          >
            {brief.headline}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* Core Position Summary Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 rounded-lg border border-border/60 bg-surface/40 p-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Safe-to-Spend
            </span>
            <div className="mt-1 truncate">
              <MoneyValue
                value={brief.safeToSpend}
                currency={brief.currency}
                size="md"
                className={
                  brief.safeToSpend < 0 ? "text-destructive font-bold" : "text-primary font-bold"
                }
              />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Liquid Cash
            </span>
            <div className="mt-1 truncate">
              <MoneyValue value={brief.liquidCash} currency={brief.currency} size="md" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Receivables
            </span>
            <div className="mt-1 truncate">
              <MoneyValue value={brief.receivables} currency={brief.currency} size="md" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Tax Reserve
            </span>
            <div className="mt-1 truncate">
              <MoneyValue value={brief.actualTaxReserve} currency={brief.currency} size="md" />
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Commitments
            </span>
            <div className="mt-1 truncate">
              <MoneyValue value={brief.upcomingObligations} currency={brief.currency} size="md" />
            </div>
          </div>
        </div>

        {/* Two Columns: What Needs Attention vs Positive Signals */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* What Needs Attention */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-500" aria-hidden />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                What Needs Attention
              </h4>
            </div>

            {brief.attentionSignals.length === 0 ? (
              <div className="rounded-lg border border-border/50 bg-surface/30 p-4 text-xs text-muted-foreground">
                No immediate risks, overdue invoices, or reserve shortfalls detected.
              </div>
            ) : (
              <div className="space-y-2.5">
                {brief.attentionSignals.map((sig) => (
                  <div
                    key={sig.id}
                    className="flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">{sig.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {sig.detail}
                      </p>
                    </div>
                    {sig.actionRoute && sig.actionLabel && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] shrink-0 self-start sm:self-auto gap-1"
                      >
                        <Link to={sig.actionRoute}>
                          {sig.actionLabel}
                          <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Positive Signals */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-500" aria-hidden />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Positive Signals
              </h4>
            </div>

            {brief.positiveSignals.length === 0 ? (
              <div className="rounded-lg border border-border/50 bg-surface/30 p-4 text-xs text-muted-foreground">
                Record new invoices and payments to surface positive trends and runway indicators.
              </div>
            ) : (
              <div className="space-y-2.5">
                {brief.positiveSignals.map((sig) => (
                  <div
                    key={sig.id}
                    className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs"
                  >
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">{sig.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {sig.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

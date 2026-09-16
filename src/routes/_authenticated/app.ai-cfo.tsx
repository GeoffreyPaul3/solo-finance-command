import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Loader2,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  WifiOff,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { EntitlementGate } from "@/components/app/entitlement-gate";
import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { recentAiCfoInteractionsQueryOptions, type AiCfoResult } from "@/domain/ai-cfo";
import { safeToSpendQueryOptions, type SafeToSpendBreakdown } from "@/domain/cashflow";
import { obligationsListQueryOptions } from "@/domain/obligations";
import { taxSummaryQueryOptions, type TaxSummaryRow } from "@/domain/tax-reserve";
import { invoicesQueryOptions } from "@/domain/invoices";
import { askAiCfoServerFn, type AskAiCfoPayload } from "@/server/ai-cfo";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/ai-cfo")({
  head: () => ({
    meta: [
      { title: "AI CFO | SoloOS" },
      {
        name: "description",
        content:
          "Your AI Chief Financial Officer — structured financial analysis grounded in your real data.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AiCfoPage,
});

const SUGGESTED_QUESTIONS = [
  "What is my current financial health and what should I focus on?",
  "Am I on track with tax savings? What's my risk?",
  "What are my biggest financial risks right now?",
  "How is my cashflow likely to look over the next 30 days?",
  "What actions should I take to improve my financial position?",
];

function AiCfoPage() {
  const { entitlements } = useWorkspace();

  if (!entitlements.canUseAiCfo) {
    return (
      <EntitlementGate
        title="AI CFO"
        description="Get structured financial analysis grounded strictly in your real ledger data. The AI explains — your deterministic metrics calculate."
        requiredPlan="solo"
        features={[
          "Ask questions about your financial health in plain language",
          "Risk identification based on your actual data",
          "Cash flow forecasting from real transactions",
          "Recommended actions grounded in your numbers",
          "Session history and interaction log",
        ]}
      />
    );
  }

  return <AiCfoContent />;
}

function AiCfoContent() {
  const { workspace } = useWorkspace();
  const [question, setQuestion] = useState("");
  const [lastResult, setLastResult] = useState<AiCfoResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pre-fetch deterministic metrics to pass as context
  const stsQuery = useQuery(safeToSpendQueryOptions(workspace.id));
  const taxQuery = useQuery(taxSummaryQueryOptions(workspace.id));
  const obligationsQuery = useQuery(
    obligationsListQueryOptions(workspace.id, { status: "upcoming" }),
  );
  const invoicesQuery = useQuery(invoicesQueryOptions(workspace.id, { status: "sent" }));
  const historyQuery = useQuery(recentAiCfoInteractionsQueryOptions(workspace.id, 5));

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const unpaidInvoices = (invoicesQuery.data ?? []).filter(
        (inv) => inv.status === "sent" || inv.status === "partially_paid",
      );
      const activeObligations = (obligationsQuery.data ?? []).filter(
        (o) => o.status === "upcoming" || o.status === "due" || o.status === "overdue",
      );

      const payload: AskAiCfoPayload = {
        workspaceId: workspace.id,
        question: q,
        context: {
          workspaceName: workspace.name,
          primaryCurrency: workspace.currency ?? "USD",
          safeToSpend: stsQuery.data ?? [],
          taxSummary: taxQuery.data ?? [],
          upcomingObligationsTotal: activeObligations.reduce((sum, o) => sum + Number(o.amount), 0),
          upcomingObligationsCount: activeObligations.length,
          unpaidReceivablesTotal: unpaidInvoices.reduce(
            (sum, inv) => sum + Number(inv.amount_due ?? inv.total),
            0,
          ),
          unpaidReceivablesCount: unpaidInvoices.length,
        },
      };

      return askAiCfoServerFn({ data: payload });
    },
    onSuccess: (result) => {
      setLastResult(result);
      if (result.status === "error") {
        toast.error(result.errorMessage ?? "AI CFO encountered an error");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reach AI CFO");
    },
  });

  const contextReady = !stsQuery.isLoading && !taxQuery.isLoading && !obligationsQuery.isLoading;

  function handleAsk() {
    const q = question.trim();
    if (!q) return;
    askMutation.mutate(q);
  }

  function handleSuggestedQuestion(q: string) {
    setQuestion(q);
    textareaRef.current?.focus();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      {/* Header */}
      <header className="border-b border-border/60 pb-6">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Intelligence · AI CFO
          </span>
        </div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          AI CFO
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Structured financial analysis grounded strictly in your real data. The AI explains — your
          deterministic metrics calculate.
        </p>
      </header>

      {/* Context loading notice */}
      {!contextReady && (
        <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin shrink-0" />
          Loading your financial context…
        </div>
      )}

      {/* Context snapshot (ready state) */}
      {contextReady && !lastResult && (
        <ContextSnapshot
          stsData={stsQuery.data ?? []}
          taxData={taxQuery.data ?? []}
          obligationsCount={(obligationsQuery.data ?? []).length}
          invoicesCount={
            (invoicesQuery.data ?? []).filter(
              (i) => i.status === "sent" || i.status === "partially_paid",
            ).length
          }
          primaryCurrency={workspace.currency ?? "USD"}
        />
      )}

      {/* Ask box */}
      <div className="space-y-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            id="ai-cfo-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAsk();
              }
            }}
            placeholder="Ask your AI CFO anything about your financial situation…"
            rows={3}
            className="resize-none pr-28"
          />
          <Button
            id="ai-cfo-ask"
            onClick={handleAsk}
            disabled={!question.trim() || askMutation.isPending || !contextReady}
            className="absolute bottom-3 right-3 gap-1.5"
            size="sm"
          >
            {askMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {askMutation.isPending ? "Analyzing…" : "Ask"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          <kbd className="rounded border border-border px-1 py-0.5 font-mono text-xs">⌘</kbd>{" "}
          <kbd className="rounded border border-border px-1 py-0.5 font-mono text-xs">↵</kbd> to
          submit · Numbers come from your data, not AI
        </p>

        {/* Suggested questions */}
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSuggestedQuestion(q)}
              className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Sparkles className="size-3 shrink-0" />
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {lastResult && <AiCfoResultView result={lastResult} />}

      {/* History */}
      {!lastResult && (historyQuery.data?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <MessageSquare className="size-4" />
            Recent Questions
          </h2>
          <div className="space-y-2">
            {(historyQuery.data ?? []).map((interaction) => (
              <div
                key={interaction.id}
                className="rounded-lg border border-border/40 bg-card p-4 text-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium text-foreground line-clamp-2">{interaction.question}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(interaction.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Context snapshot ─────────────────────────────────────────────────────────

function ContextSnapshot({
  stsData,
  taxData,
  obligationsCount,
  invoicesCount,
  primaryCurrency,
}: {
  stsData: SafeToSpendBreakdown[];
  taxData: TaxSummaryRow[];
  obligationsCount: number;
  invoicesCount: number;
  primaryCurrency: string;
}) {
  const primarySts = stsData.find((s) => s.isPrimaryCurrency) ?? stsData[0];
  const primaryTax = taxData.find((t) => t.isPrimaryCurrency) ?? taxData[0];

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-5 space-y-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <CheckCircle2 className="size-3.5 text-emerald-500" />
        Context loaded — your data is ready
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {primarySts && (
          <>
            <ContextTile
              label="Safe to Spend"
              value={formatMoney(primarySts.currentSafeToSpend, primaryCurrency)}
            />
            <ContextTile
              label="Liquid Cash"
              value={formatMoney(primarySts.liquidCash, primaryCurrency)}
            />
          </>
        )}
        {primaryTax && (
          <ContextTile
            label="Tax Reserve"
            value={formatMoney(primaryTax.trackedTaxReserve, primaryCurrency)}
          />
        )}
        <ContextTile label="Active Obligations" value={String(obligationsCount)} />
        <ContextTile label="Unpaid Invoices" value={String(invoicesCount)} />
      </div>
    </div>
  );
}

function ContextTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/60 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

// ─── Result view ──────────────────────────────────────────────────────────────

function AiCfoResultView({ result }: { result: AiCfoResult }) {
  if (!result.isAvailable || result.status === "unavailable") {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/30 p-8 text-center space-y-3">
        <WifiOff className="mx-auto size-10 text-muted-foreground/40" />
        <p className="font-semibold text-foreground">AI CFO Unavailable</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {result.errorMessage ??
            "No AI provider API key is configured. Your deterministic financial data is fully available — only the AI layer is off."}
        </p>
        <p className="text-xs text-muted-foreground">
          Set <code className="font-mono bg-muted px-1 rounded">GEMINI_API_KEY</code> (or another
          configured provider key) to enable AI analysis.
        </p>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
        <AlertCircle className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-sm">AI CFO encountered an error</p>
          <p className="text-xs opacity-80">{result.errorMessage}</p>
        </div>
      </div>
    );
  }

  const response = result.response;
  if (!response) return null;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="size-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            AI CFO Analysis
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{response.summary}</p>
      </div>

      {/* Metric references */}
      {response.metric_references.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {response.metric_references.map((m, i) => (
            <Badge key={i} variant="secondary" className="text-xs gap-1">
              <span className="text-muted-foreground">{m.label}:</span>
              <span className="font-semibold">{m.value}</span>
            </Badge>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Key points */}
        {response.key_points.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Lightbulb className="size-4 text-amber-500" />
                Key Observations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {response.key_points.map((pt, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p className="text-foreground leading-snug">{pt}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Risks */}
        {response.risks.length > 0 && (
          <Card className="border-amber-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldAlert className="size-4 text-amber-600" />
                Risks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {response.risks.map((risk, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <p className="text-foreground leading-snug">{risk}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Opportunities */}
        {response.opportunities.length > 0 && (
          <Card className="border-emerald-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="size-4 text-emerald-600" />
                Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {response.opportunities.map((opp, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <p className="text-foreground leading-snug">{opp}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommended actions */}
      {response.recommended_actions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recommended Actions
          </h3>
          {response.recommended_actions.map((action, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-lg border border-border/50 bg-card p-4"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground">{action.title}</p>
                <p className="mt-1 text-sm text-muted-foreground leading-snug">
                  {action.description}
                </p>
              </div>
              {action.suggested_route && (
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Link2,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPublicShareArtifactServerFn } from "@/server/share";
import { cn } from "@/lib/utils";

// No auth required – this is the public share recipient page.
export const Route = createFileRoute("/share/$token")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: PublicSharePage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function getAnonSessionId() {
  const key = "solos_anon_session";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// ─── Artifact Renderers ───────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  accent?: boolean | undefined;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        accent ? "border-primary/30 bg-primary/5" : "border-border bg-card",
      )}
    >
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
        {label}
      </p>
      <p className={cn("text-xl font-bold", accent ? "text-primary" : "text-foreground")}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function InvoiceArtifactView({
  data,
  currency,
}: {
  data: Record<string, unknown>;
  currency: string;
}) {
  const fields = data as {
    clientName?: string;
    invoiceNumber?: string;
    issueDate?: string;
    dueDate?: string;
    totalAmount?: number;
    status?: string;
    lineItems?: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
    notes?: string;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {fields.clientName && <MetricCard label="Client" value={fields.clientName} />}
        {fields.invoiceNumber && <MetricCard label="Invoice #" value={fields.invoiceNumber} />}
        {fields.issueDate && <MetricCard label="Issued" value={formatDate(fields.issueDate)} />}
        {fields.totalAmount != null && (
          <MetricCard
            label="Total Amount"
            value={formatCurrency(fields.totalAmount, currency)}
            accent
          />
        )}
      </div>
      {fields.lineItems && fields.lineItems.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Description
                </th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Qty</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fields.lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="py-3 px-4">{item.description}</td>
                  <td className="py-3 px-4 text-right text-muted-foreground">{item.quantity}</td>
                  <td className="py-3 px-4 text-right font-medium">
                    {formatCurrency(item.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30">
              <tr>
                <td className="py-3 px-4 font-semibold" colSpan={2}>
                  Total
                </td>
                <td className="py-3 px-4 text-right font-bold text-primary">
                  {formatCurrency(fields.totalAmount ?? 0, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {fields.notes && (
        <div className="rounded-lg bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
          <p className="text-sm">{fields.notes}</p>
        </div>
      )}
    </div>
  );
}

function FinancialBriefView({
  data,
  currency,
}: {
  data: Record<string, unknown>;
  currency: string;
}) {
  const d = data as {
    totalRevenue?: number;
    totalExpenses?: number;
    netProfit?: number;
    netMarginPercent?: number;
    cashBalance?: number;
    outstandingInvoices?: number;
    overdueInvoices?: number;
    periodLabel?: string;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {d.totalRevenue != null && (
          <MetricCard label="Total Revenue" value={formatCurrency(d.totalRevenue, currency)} />
        )}
        {d.totalExpenses != null && (
          <MetricCard label="Total Expenses" value={formatCurrency(d.totalExpenses, currency)} />
        )}
        {d.netProfit != null && (
          <MetricCard
            label="Net Profit"
            value={formatCurrency(d.netProfit, currency)}
            sub={d.netMarginPercent != null ? `${d.netMarginPercent}% margin` : undefined}
            accent={d.netProfit > 0}
          />
        )}
        {d.cashBalance != null && (
          <MetricCard label="Cash Balance" value={formatCurrency(d.cashBalance, currency)} />
        )}
        {d.outstandingInvoices != null && (
          <MetricCard
            label="Outstanding Invoices"
            value={formatCurrency(d.outstandingInvoices, currency)}
          />
        )}
        {d.overdueInvoices != null && d.overdueInvoices > 0 && (
          <MetricCard label="Overdue" value={formatCurrency(d.overdueInvoices, currency)} />
        )}
      </div>
    </div>
  );
}

function GenericReportView({
  data,
  currency,
}: {
  data: Record<string, unknown>;
  currency: string;
}) {
  const entries = Object.entries(data).filter(([, v]) => v != null && typeof v !== "object");
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {entries.map(([k, v]) => (
        <MetricCard
          key={k}
          label={k
            .replace(/([A-Z])/g, " $1")
            .replace(/_/g, " ")
            .trim()}
          value={
            (typeof v === "number" && k.toLowerCase().includes("amount")) ||
            k.toLowerCase().includes("revenue") ||
            k.toLowerCase().includes("profit") ||
            k.toLowerCase().includes("cash")
              ? formatCurrency(v as number, currency)
              : String(v)
          }
        />
      ))}
    </div>
  );
}

function ArtifactRenderer({
  type,
  data,
  currency,
}: {
  type: string;
  data: Record<string, unknown>;
  currency: string;
}) {
  if (type === "invoice") return <InvoiceArtifactView data={data} currency={currency} />;
  if (type === "financial_brief") return <FinancialBriefView data={data} currency={currency} />;
  return <GenericReportView data={data} currency={currency} />;
}

const DEFAULT_ARTIFACT_LABEL = { label: "Invoice", icon: FileText, color: "text-blue-500" };
const ARTIFACT_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  invoice: DEFAULT_ARTIFACT_LABEL,
  financial_brief: { label: "Financial Brief", icon: TrendingUp, color: "text-emerald-500" },
  cashflow_report: { label: "Cash Flow Report", icon: Zap, color: "text-cyan-500" },
  profitability_report: { label: "Profitability", icon: BarChart3, color: "text-purple-500" },
  client_report: { label: "Client Report", icon: Users, color: "text-orange-500" },
  project_report: { label: "Project Report", icon: FileText, color: "text-indigo-500" },
  tax_report: { label: "Tax Report", icon: Shield, color: "text-rose-500" },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type ArtifactPayload = {
  id: string;
  title: string;
  description?: string | null;
  artifactType: string;
  snapshotData: Record<string, unknown>;
  accessConfig: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string | null;
  workspaceName: string;
  workspaceCurrency: string;
};

function PublicSharePage() {
  const { token } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [artifact, setArtifact] = useState<ArtifactPayload | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function load() {
      try {
        let anonSessionId: string | undefined;
        try {
          anonSessionId = getAnonSessionId();
        } catch {
          /* no localStorage in SSR */
        }
        const result = await getPublicShareArtifactServerFn({
          data: { shareToken: token, anonymousSessionId: anonSessionId },
        });
        if (result.found && result.artifact) {
          setArtifact(result.artifact as ArtifactPayload);
        } else {
          setErrorReason(result.reason ?? "This share link is no longer available.");
        }
      } catch {
        setErrorReason("Unable to load shared artifact. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading shared artifact…</p>
      </div>
    );
  }

  if (errorReason || !artifact) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <AlertTriangle className="size-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-2">Link Unavailable</h1>
            <p className="text-sm text-muted-foreground">{errorReason}</p>
          </div>
          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Powered by SoloOS Financial Operating System
            </p>
            <Button variant="outline" asChild size="sm" id="explore-from-error">
              <a href="/">
                Explore SoloOS <ArrowRight className="size-3.5 ml-1.5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const meta = ARTIFACT_LABELS[artifact.artifactType] ?? DEFAULT_ARTIFACT_LABEL;
  const Icon = meta.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-6 rounded bg-primary/10 flex items-center justify-center">
              <Link2 className="size-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">SoloOS</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-xs text-muted-foreground">Secure Financial Share</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-1.5 gap-1">
              <Shield className="size-2.5" />
              Encrypted
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Artifact Header */}
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "size-12 rounded-xl border bg-muted/50 flex items-center justify-center shrink-0",
              )}
            >
              <Icon className={cn("size-5", meta.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className="text-[10px]">
                  {meta.label}
                </Badge>
                {artifact.expiresAt && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Clock className="size-2.5" />
                    Expires {formatDate(artifact.expiresAt)}
                  </Badge>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold">{artifact.title}</h1>
              {artifact.description && (
                <p className="text-sm text-muted-foreground mt-1.5">{artifact.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>
                  Shared by <strong>{artifact.workspaceName}</strong>
                </span>
                <span>·</span>
                <span>Created {formatDate(artifact.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Security notice */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-muted-foreground">
              This is an <strong className="text-foreground">immutable read-only snapshot</strong>.
              Financial records in SoloOS are unchanged. Link cannot be indexed by search engines.
            </p>
          </div>
        </div>

        <Separator />

        {/* Artifact Content */}
        <ArtifactRenderer
          type={artifact.artifactType}
          data={(artifact.snapshotData ?? {}) as Record<string, unknown>}
          currency={
            (artifact.snapshotData?.["currency"] as string) || artifact.workspaceCurrency || "USD"
          }
        />

        <Separator />

        {/* CTA — SoloOS acquisition */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
          <CardContent className="py-8">
            <div className="max-w-lg mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                <Zap className="size-3" />
                Powered by SoloOS
              </div>
              <h2 className="text-lg sm:text-xl font-bold">
                Run your entire business finances in one command center
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                This financial view was created with SoloOS — the financial operating system built
                for independent operators. Invoices, cash flow, tax reserve, and live financial
                intelligence.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button asChild size="lg" id="recipient-cta-get-started">
                  <a href="/auth?mode=signup">
                    Get Started Free
                    <ArrowRight className="size-4 ml-2" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" id="recipient-cta-learn-more">
                  <a href="/">
                    Learn More
                    <ExternalLink className="size-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-8 space-y-1">
          <p>This secure link is private and cannot be indexed by search engines.</p>
          <p>
            <a
              href="/privacy"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            {" · "}
            <a
              href="/terms"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

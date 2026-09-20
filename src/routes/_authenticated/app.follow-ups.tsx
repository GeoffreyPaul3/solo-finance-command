import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Zap,
} from "lucide-react";

import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { invoicesQueryOptions } from "@/domain/invoices";
import {
  classifyFollowUpInvoices,
  type ActionableFollowUp,
  type FollowUpUrgency,
} from "@/domain/follow-ups";
import { supabase } from "@/integrations/supabase/client";
import { sendInvoiceReminderEmailServerFn } from "@/server/invoices";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/follow-ups")({
  head: () => ({
    meta: [
      { title: "Invoice Follow-ups | SoloOS" },
      {
        name: "description",
        content:
          "SoloOS Invoice Follow-up Center: review overdue and approaching-due invoices and send payment reminders to clients.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FollowUpsPage,
});

// ─── Urgency display config ───────────────────────────────────────────────────

const URGENCY_CONFIG: Record<
  FollowUpUrgency,
  { label: string; bg: string; color: string; borderColor: string }
> = {
  critical: {
    label: "Critical",
    bg: "bg-rose-500/10",
    color: "text-rose-500",
    borderColor: "border-rose-500/25",
  },
  warning: {
    label: "Overdue",
    bg: "bg-amber-500/10",
    color: "text-amber-600",
    borderColor: "border-amber-500/25",
  },
  attention: {
    label: "Attention",
    bg: "bg-blue-500/10",
    color: "text-blue-500",
    borderColor: "border-blue-500/25",
  },
  normal: {
    label: "Current",
    bg: "bg-muted/50",
    color: "text-muted-foreground",
    borderColor: "border-border",
  },
};

// ─── Reminder Dialog ──────────────────────────────────────────────────────────

function SendReminderDialog({
  followUp,
  workspaceId,
  onClose,
}: {
  followUp: ActionableFollowUp | null;
  workspaceId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [customMessage, setCustomMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!followUp) throw new Error("No invoice selected");

      if (!followUp.clientEmail) {
        throw new Error(
          "No email address on record for this client. Please update the client profile with a valid email before sending.",
        );
      }

      const { data: session } = await supabase.auth.getSession();
      const authToken = session.session?.access_token;

      // Determine reminder type from follow-up classification
      const reminderTypeMap: Record<
        ActionableFollowUp["suggestedAction"],
        "upcoming" | "due" | "overdue" | "escalation" | "standard"
      > = {
        send_escalation: "escalation",
        send_gentle_reminder: "overdue",
        send_upcoming_reminder: "upcoming",
        view: "standard",
      };

      return sendInvoiceReminderEmailServerFn({
        data: {
          workspaceId,
          invoiceId: followUp.invoiceId,
          recipientEmail: followUp.clientEmail,
          clientName: followUp.clientName,
          customMessage: customMessage.trim() || undefined,
          reminderType: reminderTypeMap[followUp.suggestedAction],
          authToken,
        },
      });
    },
    onSuccess: () => {
      setSuccess(true);
      qc.invalidateQueries({ queryKey: ["invoice-reminders", workspaceId] });
      // Also invalidate the invoices query so follow-up list refreshes
      qc.invalidateQueries({ queryKey: ["invoices", workspaceId] });
    },
    onError: (e: Error) => {
      setError(e.message);
    },
  });

  const handleClose = () => {
    setCustomMessage("");
    setError(null);
    setSuccess(false);
    mutation.reset();
    onClose();
  };

  if (!followUp) return null;

  const urgencyCfg = URGENCY_CONFIG[followUp.urgency];

  return (
    <Dialog open={Boolean(followUp)} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            {followUp.suggestedAction === "send_escalation"
              ? "Prepare Escalation Notice"
              : followUp.suggestedAction === "send_upcoming_reminder"
                ? "Prepare Advance Notice"
                : "Prepare Payment Reminder"}
          </DialogTitle>
          <DialogDescription>
            A reminder will be sent to{" "}
            <strong className="text-foreground">{followUp.clientName}</strong> for invoice{" "}
            <strong className="text-foreground">{followUp.invoiceNumber}</strong>.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="size-10 text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">Reminder Sent</p>
            <p className="text-xs text-muted-foreground">
              The reminder has been dispatched and recorded in the audit trail.
            </p>
            <Button onClick={handleClose} className="mt-2" id="close-reminder-success">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Invoice summary */}
            <div
              className={cn(
                "rounded-lg border p-3.5 text-sm",
                urgencyCfg.bg,
                urgencyCfg.borderColor,
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{followUp.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Due: {followUp.dueDate} ·{" "}
                    <span className={cn("font-medium", urgencyCfg.color)}>
                      {followUp.urgencyLabel}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground tabular-nums">
                    {formatMoney(followUp.amountDue, followUp.currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">outstanding</p>
                </div>
              </div>
            </div>

            {/* Recipient */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Recipient</Label>
              {followUp.clientEmail ? (
                <p className="text-sm font-medium text-foreground">{followUp.clientEmail}</p>
              ) : (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600">
                  <AlertTriangle className="size-3.5 inline mr-1" />
                  No email address on record for this client. Please update the client profile
                  before sending.
                </div>
              )}
            </div>

            {/* Custom message */}
            <div className="space-y-1.5">
              <Label htmlFor="custom-message" className="text-xs text-muted-foreground">
                Additional Message (optional)
              </Label>
              <Textarea
                id="custom-message"
                placeholder="Add a personal note to include with the standard reminder template..."
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                maxLength={2000}
              />
              <p className="text-[10px] text-muted-foreground">
                This message will be appended to the standard payment reminder email.
              </p>
            </div>

            {/* Throttle warning */}
            {followUp.isThrottled && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600">
                <AlertTriangle className="size-3.5 inline mr-1" />A reminder was sent for this
                invoice within the last 24 hours. You may continue, but the system will reject
                duplicates sent within the same window.
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !followUp.clientEmail}
                id="send-reminder-btn"
              >
                {mutation.isPending ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Send className="size-3.5 mr-1.5" />
                )}
                Send Reminder
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Follow-up Card ───────────────────────────────────────────────────────────

function FollowUpCard({
  item,
  canMutate,
  onSendReminder,
}: {
  item: ActionableFollowUp;
  canMutate: boolean;
  onSendReminder: (item: ActionableFollowUp) => void;
}) {
  const urgencyCfg = URGENCY_CONFIG[item.urgency];

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 space-y-3 transition-shadow duration-200 hover:shadow-sm",
        urgencyCfg.borderColor,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{item.invoiceNumber}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                urgencyCfg.bg,
                urgencyCfg.color,
              )}
            >
              {item.urgencyLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.clientName}
            {item.clientEmail && <span className="ml-1 opacity-60">· {item.clientEmail}</span>}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold text-foreground tabular-nums">
            {formatMoney(item.amountDue, item.currency)}
          </p>
          <p className="text-[10px] text-muted-foreground">outstanding</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          Due: {item.dueDate}
        </span>
        {item.lastReminderSentAt && (
          <span className="flex items-center gap-1">
            <Mail className="size-3" />
            Last sent: {new Date(item.lastReminderSentAt).toLocaleDateString()}
          </span>
        )}
        {item.isThrottled && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 text-amber-500 border-amber-500/30"
          >
            Sent 24h ago
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        {canMutate && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-7 text-xs"
            onClick={() => onSendReminder(item)}
            id={`send-reminder-${item.invoiceId}`}
          >
            <Send className="size-3" />
            {item.suggestedActionLabel}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 h-7 text-xs text-muted-foreground"
          asChild
        >
          <Link to="/app/invoices/$invoiceId" params={{ invoiceId: item.invoiceId }}>
            <ExternalLink className="size-3" />
            View Invoice
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ─── Last Reminder Query ──────────────────────────────────────────────────────

function useInvoiceLastReminders(workspaceId: string) {
  return useQuery({
    queryKey: ["invoice-reminders", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<Record<string, string>> => {
      // Fetch most recent reminder per invoice
      const { data, error } = await supabase
        .from("invoice_reminders")
        .select("invoice_id, sent_at")
        .eq("workspace_id", workspaceId)
        .order("sent_at", { ascending: false });

      if (error) throw new Error(error.message);

      // Dedupe by invoice_id — keep most recent
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        if (row.invoice_id && !map[row.invoice_id]) {
          map[row.invoice_id] = row.sent_at;
        }
      }
      return map;
    },
  });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function FollowUpsPage() {
  const { workspace, role } = useWorkspace();
  const canMutate = ["owner", "admin", "finance", "manager"].includes(role ?? "");

  const [selectedFollowUp, setSelectedFollowUp] = useState<ActionableFollowUp | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "overdue" | "approaching_due" | "high_value"
  >("all");

  const invoicesQuery = useQuery(invoicesQueryOptions(workspace.id, { status: "all" }));
  const remindersQuery = useInvoiceLastReminders(workspace.id);
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);

  const followUps = useMemo(() => {
    const invoices = invoicesQuery.data ?? [];
    const lastReminders = remindersQuery.data ?? {};

    const candidates = invoices
      .filter(
        (inv) => inv.status !== "cancelled" && inv.status !== "draft" && inv.status !== "paid",
      )
      .map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        clientId: inv.client_id ?? "",
        clientName: inv.client?.name ?? "Unknown Client",
        clientEmail: inv.client?.email ?? null,
        currency: inv.currency,
        total: Number(inv.total),
        amountPaid: Number(inv.amount_paid),
        amountDue: Number(inv.amount_due),
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        status: inv.status,
        lastReminderSentAt: lastReminders[inv.id] ?? null,
      }));

    return classifyFollowUpInvoices(candidates, today);
  }, [invoicesQuery.data, remindersQuery.data, today]);

  const filteredFollowUps = useMemo(() => {
    if (categoryFilter === "all") return followUps;
    return followUps.filter((f) => f.category === categoryFilter);
  }, [followUps, categoryFilter]);

  // Summary counts
  const criticalCount = followUps.filter((f) => f.urgency === "critical").length;
  const overdueCount = followUps.filter((f) => f.category === "overdue").length;
  const approachingCount = followUps.filter((f) => f.category === "approaching_due").length;
  const totalDue = followUps.reduce((acc, f) => acc + f.amountDue, 0);
  const primaryCurrency = workspace.currency ?? "USD";

  const isLoading = invoicesQuery.isLoading || remindersQuery.isLoading;

  const categoryFilters = [
    { value: "all" as const, label: "All", count: followUps.length },
    { value: "overdue" as const, label: "Overdue", count: overdueCount },
    {
      value: "approaching_due" as const,
      label: "Approaching Due",
      count: approachingCount,
    },
    {
      value: "high_value" as const,
      label: "High Value",
      count: followUps.filter((f) => f.category === "high_value").length,
    },
  ];

  return (
    <div className="mx-auto max-w-[1000px] space-y-8 pb-20">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70 mb-2">
            <Zap className="size-3.5" />
            Receivables
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Invoice Follow-ups
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Overdue and approaching-due invoices requiring attention. Send reminders directly from
            here — each dispatch is recorded in the audit trail.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["invoices", workspace.id] });
            qc.invalidateQueries({ queryKey: ["invoice-reminders", workspace.id] });
          }}
          id="refresh-followups-btn"
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </header>

      {/* Summary stats */}
      {!isLoading && followUps.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Needing Action",
              value: followUps.length,
              color: followUps.length > 0 ? "text-amber-500" : "text-foreground",
            },
            {
              label: "Critical / Overdue",
              value: criticalCount,
              color: criticalCount > 0 ? "text-rose-500" : "text-foreground",
            },
            {
              label: "Approaching Due",
              value: approachingCount,
              color: approachingCount > 0 ? "text-blue-500" : "text-foreground",
            },
            {
              label: `Total Outstanding`,
              value: formatMoney(totalDue, primaryCurrency),
              color: totalDue > 0 ? "text-amber-500" : "text-emerald-500",
              isText: true,
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] text-muted-foreground truncate">{stat.label}</p>
              <p className={cn("text-xl font-bold tabular-nums mt-0.5 truncate", stat.color)}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categoryFilters.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setCategoryFilter(opt.value)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150",
              categoryFilter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
            aria-pressed={categoryFilter === opt.value}
          >
            {opt.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0 text-[10px] tabular-nums",
                categoryFilter === opt.value ? "bg-white/20" : "bg-foreground/10",
              )}
            >
              {opt.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : filteredFollowUps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <CheckCircle2 className="size-10 text-emerald-400/60 mb-3" />
          <p className="text-sm font-medium text-foreground">
            {followUps.length === 0
              ? "No invoices require follow-up"
              : `No ${categoryFilter} invoices`}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {followUps.length === 0
              ? "All outstanding invoices are in good standing."
              : `Switch the filter above to see other follow-up categories.`}
          </p>
          <Button variant="outline" size="sm" className="mt-4 gap-1.5" asChild>
            <Link to="/app/invoices">
              <ExternalLink className="size-3.5" />
              View All Invoices
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFollowUps.map((item) => (
            <FollowUpCard
              key={item.invoiceId}
              item={item}
              canMutate={canMutate}
              onSendReminder={setSelectedFollowUp}
            />
          ))}
        </div>
      )}

      {/* Operational note */}
      {filteredFollowUps.length > 0 && (
        <div className="rounded-lg border border-dashed border-border/60 p-4">
          <p className="text-[11px] text-muted-foreground/70 flex items-start gap-1.5">
            <Info className="size-3.5 flex-shrink-0 mt-0.5" />
            Each reminder sent is rate-limited to once per invoice per 24 hours to prevent
            accidental duplicate sends. All dispatched reminders are recorded in the Invoice Audit
            Trail. The system will reject a duplicate send within the same window with an explicit
            error.
          </p>
        </div>
      )}

      {/* Reminder Dialog */}
      <SendReminderDialog
        followUp={selectedFollowUp}
        workspaceId={workspace.id}
        onClose={() => setSelectedFollowUp(null)}
      />
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { EntitlementGate } from "@/components/app/entitlement-gate";
import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auditLogQueryOptions } from "@/domain/workspace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail | SoloOS" },
      {
        name: "description",
        content: "Workspace audit trail — a chronological log of all significant actions.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { entitlements } = useWorkspace();

  if (!entitlements.canAccessAudit) {
    return (
      <EntitlementGate
        title="Audit Trail"
        description="A tamper-evident chronological log of every significant action taken in your workspace — essential for compliance and governance."
        requiredPlan="pro"
        features={[
          "Complete action log across all entities",
          "Filter by entity type (invoices, clients, users…)",
          "Search by actor, entity ID, or action",
          "Secure metadata inspection (sensitive fields redacted)",
          "Pagination for large audit histories",
        ]}
      />
    );
  }

  return <AuditContent />;
}

// Safe display of audit metadata — never expose internal secrets or PII
function sanitizeMetadata(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  // Omit sensitive-sounding keys
  const BLOCKED = new Set(["password", "token", "secret", "key", "hash", "jwt", "api_key"]);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !BLOCKED.has(k.toLowerCase())));
}

const ENTITY_TYPE_OPTIONS = [
  "all",
  "client",
  "project",
  "invoice",
  "payment",
  "expense",
  "financial_account",
  "financial_transaction",
  "workspace",
  "subscription",
  "user",
] as const;

type EntityTypeFilter = (typeof ENTITY_TYPE_OPTIONS)[number];

const ENTITY_TYPE_LABELS: Record<EntityTypeFilter, string> = {
  all: "All Types",
  client: "Clients",
  project: "Projects",
  invoice: "Invoices",
  payment: "Payments",
  expense: "Expenses",
  financial_account: "Accounts",
  financial_transaction: "Transactions",
  workspace: "Workspace",
  subscription: "Subscriptions",
  user: "Users",
};

const PAGE_SIZE = 50;

function actionColor(action: string): string {
  if (action.includes("created") || action.includes("unarchived")) return "text-emerald-500";
  if (action.includes("archived") || action.includes("cancelled")) return "text-amber-500";
  if (action.includes("deleted") || action.includes("reversed")) return "text-destructive";
  if (action.includes("paid") || action.includes("verified")) return "text-blue-500";
  return "text-muted-foreground";
}

type AuditLog = {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  metadata: unknown;
  created_at: string;
  workspace_id: string;
};

function AuditContent() {
  const { workspace } = useWorkspace();

  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<EntityTypeFilter>("all");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Fetch a generous batch; filter client-side for responsiveness
  const auditQuery = useQuery(auditLogQueryOptions(workspace.id, 500));
  const allLogs = (auditQuery.data ?? []) as AuditLog[];

  // Apply filters
  const filtered = allLogs.filter((log) => {
    const matchesEntity = entityFilter === "all" || log.entity_type === entityFilter;
    const matchesSearch =
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.entity_id?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (log.actor_id?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchesEntity && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Chronological log of all significant workspace actions. Read-only.
          </p>
        </div>
        {!auditQuery.isLoading && (
          <Badge variant="secondary" className="self-start sm:self-auto font-mono text-xs">
            {filtered.length} events
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search actions, entity IDs…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 text-sm"
          />
        </div>
        <Select
          value={entityFilter}
          onValueChange={(v) => {
            setEntityFilter(v as EntityTypeFilter);
            setPage(0);
          }}
        >
          <SelectTrigger className="h-9 w-48 text-xs">
            <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {ENTITY_TYPE_LABELS[opt]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {auditQuery.isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {auditQuery.isError && (
        <Card className="border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Failed to load audit trail: {auditQuery.error?.message}
        </Card>
      )}

      {!auditQuery.isLoading && !auditQuery.isError && (
        <>
          {filtered.length === 0 ? (
            <Card className="border-dashed p-10 text-center">
              <Clock className="mx-auto size-10 text-muted-foreground/50" />
              <h3 className="mt-3 text-base font-semibold">
                {search || entityFilter !== "all" ? "No matching events" : "No audit events yet"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                {search || entityFilter !== "all"
                  ? "Try adjusting your search or filter."
                  : "Audit events are recorded automatically as you use SoloOS."}
              </p>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {paginated.map((log) => {
                      const meta = sanitizeMetadata(log.metadata);
                      const isExpanded = expandedId === log.id;
                      const hasMeta = meta && Object.keys(meta).length > 0;

                      return (
                        <div
                          key={log.id}
                          className={cn(
                            "group transition-colors",
                            hasMeta && "cursor-pointer hover:bg-muted/30",
                          )}
                          onClick={() => {
                            if (hasMeta) setExpandedId(isExpanded ? null : log.id);
                          }}
                        >
                          <div className="flex items-start gap-3 px-4 py-3">
                            {/* Timeline indicator */}
                            <div className="mt-0.5 shrink-0">
                              <div className="size-2 rounded-full bg-primary/40 mt-1.5" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={cn(
                                      "text-xs font-mono font-semibold",
                                      actionColor(log.action),
                                    )}
                                  >
                                    {log.action}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-mono capitalize"
                                  >
                                    {log.entity_type}
                                  </Badge>
                                </div>
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                                  {new Date(log.created_at).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              {log.entity_id && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
                                  ID: {log.entity_id}
                                </p>
                              )}

                              {/* Expandable metadata */}
                              {hasMeta && (
                                <div className="flex items-center gap-1 mt-1">
                                  {isExpanded ? (
                                    <ChevronDown className="size-3 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="size-3 text-muted-foreground" />
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
                                    {isExpanded ? "Hide" : "Show"} details
                                  </span>
                                </div>
                              )}

                              {isExpanded && meta && (
                                <pre className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground overflow-x-auto">
                                  {JSON.stringify(meta, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                  <span className="text-xs">
                    {safePage * PAGE_SIZE + 1}–
                    {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={safePage === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

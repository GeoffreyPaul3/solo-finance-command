import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminListAuditLogsFn } from "@/server/admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [{ title: "Platform Audit Log | SoloOS Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminAuditPage,
});

const ENTITY_OPTIONS = [
  { value: "all", label: "All Entities" },
  { value: "workspace", label: "Workspace" },
  { value: "user", label: "User / Member" },
  { value: "subscription", label: "Subscription" },
  { value: "invoice", label: "Invoice" },
  { value: "payment", label: "Payment" },
  { value: "expense", label: "Expense" },
  { value: "client", label: "Client" },
  { value: "project", label: "Project" },
];

function sanitizeMetadata(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const BLOCKED = new Set(["password", "token", "secret", "key", "hash", "jwt", "api_key"]);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !BLOCKED.has(k.toLowerCase())));
}

function getActionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  const a = action.toLowerCase();
  if (a.includes("delete") || a.includes("archive") || a.includes("cancel") || a.includes("fail")) {
    return "destructive";
  }
  if (
    a.includes("create") ||
    a.includes("upgrade") ||
    a.includes("complete") ||
    a.includes("paid")
  ) {
    return "default";
  }
  if (a.includes("update") || a.includes("change") || a.includes("edit")) {
    return "secondary";
  }
  return "outline";
}

function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | number | null>(null);

  const queryEntity = entityType === "all" ? undefined : entityType;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin_audit_logs", page, pageSize, search, queryEntity],
    queryFn: () =>
      adminListAuditLogsFn({
        data: {
          page,
          pageSize,
          search: search.trim() || undefined,
          entityType: queryEntity,
        },
      }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Platform Audit Trail
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable, cross-workspace platform security and audit log for compliance & governance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="relative sm:col-span-8">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by action name (e.g. subscription.upgraded)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="sm:col-span-4">
          <Select
            value={entityType}
            onValueChange={(val) => {
              setEntityType(val);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <Filter className="mr-2 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Filter entity type" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Log Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <span>Audit Records ({total})</span>
              </CardTitle>
              <CardDescription>
                Chronological security ledger of platform mutations and transactions.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <ShieldAlert className="size-10 stroke-1 text-muted-foreground/50 mb-3" />
              <p className="text-base font-medium text-foreground">No audit events found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                No platform activity matched your current search and entity filter criteria.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const isExpanded = expandedRow === log.id;
                    const meta = sanitizeMetadata(log.metadata);
                    const hasMeta = meta && Object.keys(meta).length > 0;

                    return (
                      <>
                        <TableRow
                          key={log.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/40 transition-colors",
                            isExpanded && "bg-muted/30",
                          )}
                          onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="size-3 text-muted-foreground/70" />
                              {new Date(log.created_at).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getActionVariant(log.action)}
                              className="font-mono text-[11px] font-medium"
                            >
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="capitalize text-xs font-medium text-foreground">
                                {log.entity_type}
                              </span>
                              {log.entity_id && (
                                <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {log.entity_id.slice(0, 8)}…
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.workspace_id ? (
                              <div>
                                <span className="text-xs font-medium text-foreground">
                                  {(log as {workspace_name?: string|null}).workspace_name ?? "—"}
                                </span>
                                <div className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">
                                  {log.workspace_id}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60 italic text-xs">System</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.actor_id ? (
                              <div>
                                <span className="text-xs font-medium text-foreground">
                                  {(log as {actor_name?: string|null}).actor_name ?? "Unknown"}
                                </span>
                                <div className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">
                                  {log.actor_id}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60 italic text-xs">System</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {hasMeta && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground"
                              >
                                <ChevronDown
                                  className={cn(
                                    "size-3.5 transition-transform",
                                    isExpanded && "rotate-180",
                                  )}
                                />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && hasMeta && (
                          <TableRow key={`${log.id}-details`} className="bg-muted/20">
                            <TableCell colSpan={6} className="p-3">
                              <div className="rounded-md border border-border/60 bg-card p-3">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                  Event Metadata
                                </p>
                                <pre className="font-mono text-xs text-foreground/90 overflow-x-auto p-2 rounded bg-muted/50 max-h-48">
                                  {JSON.stringify(meta, null, 2)}
                                </pre>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span>{" "}
            to{" "}
            <span className="font-medium text-foreground">{Math.min(page * pageSize, total)}</span>{" "}
            of <span className="font-medium text-foreground">{total}</span> entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 gap-1"
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <span className="text-xs">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 gap-1"
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

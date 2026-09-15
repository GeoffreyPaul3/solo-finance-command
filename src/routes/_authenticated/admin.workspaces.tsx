import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminListWorkspacesFn } from "@/server/admin";

export const Route = createFileRoute("/_authenticated/admin/workspaces")({
  component: AdminWorkspacesPage,
});

function AdminWorkspacesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_workspaces", page, search],
    queryFn: () => adminListWorkspacesFn({ data: { page, pageSize, search: search || undefined } }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Tenant Workspaces
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Directory of all registered workspaces, owner identifiers, and subscription standing.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <span>Workspaces ({data?.total ?? 0})</span>
          </CardTitle>
          <CardDescription>
            Active database tenants with isolated row-level security boundaries.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load workspaces: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          ) : (data?.workspaces.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No workspaces found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Creator ID</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.workspaces.map((ws) => {
                  const sub = (ws as Record<string, unknown>)["subscriptions"] as {
                    plan_id?: string;
                    status?: string;
                  } | null;
                  const planTier = sub?.plan_id ?? "free";
                  const subStatus = sub?.status ?? "none";

                  return (
                    <TableRow key={ws.id}>
                      <TableCell className="font-semibold text-sm">{ws.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {ws.currency}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              planTier === "pro"
                                ? "default"
                                : planTier === "solo"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="capitalize text-xs font-semibold"
                          >
                            {planTier}
                          </Badge>
                          {subStatus !== "none" && (
                            <span className="text-[10px] text-muted-foreground uppercase font-mono">
                              ({subStatus})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[160px]">
                        {ws.created_by}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(ws.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 p-4">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

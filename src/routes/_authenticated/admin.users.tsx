import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Search, Users } from "lucide-react";
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
import { adminListUsersFn } from "@/server/admin";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

/** Returns a Tailwind class string for the plan badge. */
function getPlanBadgeClass(plan: string | null | undefined): string {
  switch (plan) {
    case "pro":
      return "border-violet-500/50 bg-violet-500/10 text-violet-600 dark:text-violet-400";
    case "solo":
      return "border-sky-500/50 bg-sky-500/10 text-sky-600 dark:text-sky-400";
    default:
      return "border-border bg-muted/50 text-muted-foreground";
  }
}

function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_users", page, search],
    queryFn: () => adminListUsersFn({ data: { page, pageSize, search: search || undefined } }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Platform Users & Memberships
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse all user accounts and their associated workspace roles.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by workspace..."
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
            <Users className="size-4 text-primary" />
            <span>Workspace Memberships ({data?.total ?? 0})</span>
          </CardTitle>
          <CardDescription>Row-level view of users attached to tenant workspaces.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load users: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          ) : (data?.members.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No user memberships found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">User ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.members.map((m, idx) => {
                  const record = m as Record<string, unknown>;
                  const ws = record["workspaces"] as { name: string; plan?: string | null } | null;
                  const profile = record["profile"] as {
                    full_name: string | null;
                    email: string | null;
                  } | null;
                  const displayName = profile?.full_name || profile?.email || "Unnamed Operator";
                  const displayEmail = profile?.email;

                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-foreground">
                            {displayName}
                          </span>
                          {displayEmail && displayName !== displayEmail && (
                            <span className="text-xs text-muted-foreground">{displayEmail}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {ws?.name ?? "Unknown Workspace"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize text-xs font-semibold tracking-wide ${getPlanBadgeClass(ws?.plan)}`}
                        >
                          {ws?.plan ?? "free"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs font-medium">
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] text-muted-foreground/70">
                        <span title={m.user_id} className="cursor-default">
                          {m.user_id.slice(0, 8)}…{m.user_id.slice(-4)}
                        </span>
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

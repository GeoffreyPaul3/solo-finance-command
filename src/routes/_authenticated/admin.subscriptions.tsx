import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminListSubscriptionsFn } from "@/server/admin";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  component: AdminSubscriptionsPage,
});

function AdminSubscriptionsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_subscriptions", page],
    queryFn: () => adminListSubscriptionsFn({ data: { page, pageSize } }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Subscriptions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Active, past-due, and canceled workspace subscription entitlements.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            <span>Workspace Subscriptions ({data?.total ?? 0})</span>
          </CardTitle>
          <CardDescription>Historical and current subscription records.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load subscriptions:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </div>
          ) : (data?.subscriptions.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No subscription records found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Canceled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.subscriptions.map((s) => {
                  const ws = (s as Record<string, unknown>)["workspaces"] as {
                    name: string;
                  } | null;
                  const isCanceled = Boolean(s.canceled_at);

                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold text-sm">
                        {ws?.name ?? "Unknown Workspace"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.plan_id === "pro"
                              ? "default"
                              : s.plan_id === "solo"
                                ? "secondary"
                                : "outline"
                          }
                          className="capitalize font-semibold text-xs"
                        >
                          {s.plan_id}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={s.status === "active" ? "default" : "destructive"}
                          className="capitalize text-xs"
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {s.currency}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.current_period_start).toLocaleDateString()} —{" "}
                        {new Date(s.current_period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {isCanceled ? new Date(s.canceled_at!).toLocaleDateString() : "—"}
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
